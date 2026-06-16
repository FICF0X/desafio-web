# Tasks: Purchase Orders (Module 3)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1 200 |
| 400-line budget risk | High |
| Chained PRs recommended | No |
| Suggested split | Single PR, multiple work-unit commits |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

> Rationale: solo project, no reviewer; delivery strategy is `single-pr` with `exception-ok` scope. sdd-apply MUST use one PR with sequential work-unit commits (one commit per phase or logical unit) instead of separate PRs.

### Suggested Work Units (commits, NOT PRs)

| Unit | Goal | Commit message |
|------|------|----------------|
| WU-1 | Migration + seed + RPC | feat(db): add purchase_orders migration 0002 |
| WU-2 | Suppliers feature module | feat(suppliers): types, schema, queries, actions |
| WU-3 | Suppliers UI + routes | feat(suppliers): form, table, /suppliers pages |
| WU-4 | Purchase orders feature module | feat(purchase-orders): types, schema, queries, actions |
| WU-5 | Purchase orders components | feat(purchase-orders): form, table, detail components |
| WU-6 | Purchase orders routes + nav | feat(purchase-orders): pages, nav link, dashboard card |
| WU-7 | Manual verification | chore: add manual verification checklist |

---

## Phase 1: Database — Migration (Schema Change — run in Supabase SQL editor)

> FLAG: All items in this phase require running the migration in the Supabase dashboard or CLI (`supabase db push`). Do NOT skip.

- [x] 1.1 Create `supabase/migrations/0002_purchase_orders.sql`. Add `suppliers` table: `id uuid pk default gen_random_uuid()`, `name text not null`, `tax_id text`, `email text`, `phone text`, `is_active bool default true`, `created_at timestamptz default now()`, `updated_at timestamptz default now()`.
- [x] 1.2 In same file: add `updated_at` trigger on `suppliers` reusing existing `set_updated_at()` function.
- [x] 1.3 In same file: add RLS on `suppliers` — `ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY`; policies: `SELECT TO authenticated USING (true)`, `INSERT TO authenticated WITH CHECK (true)`, `UPDATE TO authenticated USING (true)`.
- [x] 1.4 In same file: add `purchase_orders` table: `id uuid pk`, `code text unique not null`, `supplier_id uuid not null references suppliers`, `order_date date not null default current_date`, `status text not null default 'pending' check (status in ('pending','received','cancelled'))`, `notes text`, `total numeric(12,2) not null default 0 check (total >= 0)`, `created_at`, `updated_at` + `set_updated_at` trigger.
- [x] 1.5 In same file: add RLS on `purchase_orders` — enable RLS; policies: `SELECT`, `INSERT`, `UPDATE` all TO authenticated USING/WITH CHECK (true).
- [x] 1.6 In same file: add `purchase_order_items` table: `id uuid pk`, `purchase_order_id uuid not null references purchase_orders on delete cascade`, `product_id uuid not null references products(id)`, `quantity int not null check (quantity > 0)`, `unit_cost numeric(12,2) not null check (unit_cost >= 0)`, `subtotal numeric(12,2) not null check (subtotal >= 0)`, `created_at`.
- [x] 1.7 In same file: add RLS on `purchase_order_items` — enable RLS; policies: `SELECT TO authenticated USING (true)`, `INSERT TO authenticated WITH CHECK (true)`. (No UPDATE policy — items are immutable post-creation.)
- [x] 1.8 In same file: seed 3 sample suppliers (e.g. "Distribuidora Lima SAC", "Proveedor Norte EIRL", "Comercial Sur S.A.") with `INSERT INTO suppliers (name, tax_id) VALUES (...)`.
- [x] 1.9 In same file: create plpgsql function `public.create_purchase_order(p_supplier_id uuid, p_order_date date, p_notes text, p_items jsonb) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER`. Body: (a) compute year from `p_order_date`; (b) count existing POs in same year + 1 → `v_seq`; (c) format code `'OC-' || year || '-' || lpad(v_seq::text,4,'0')`; (d) compute `v_total = sum(elem->>'quantity' * elem->>'unit_cost')` over `jsonb_array_elements(p_items)`; (e) INSERT into `purchase_orders` (all fields including code + total) → `v_id`; (f) loop `jsonb_array_elements(p_items)` and INSERT each into `purchase_order_items` with `subtotal = quantity * unit_cost`; (g) `RETURN v_id`.
- [ ] 1.10 Apply migration in Supabase: `supabase db push` or paste into SQL editor. Verify tables + function exist. [DB/CREDS — user must run this]

---

## Phase 2: Suppliers Feature Module

- [x] 2.1 Create `src/features/suppliers/types.ts`: export `Supplier` interface matching all columns of the `suppliers` table.
- [x] 2.2 Create `src/features/suppliers/schema.ts`: export `supplierSchema` (zod) — `name: z.string().min(1)`, `tax_id/email/phone: z.string().optional()`.
- [x] 2.3 Create `src/features/suppliers/queries.ts`: export `listSuppliers()` using Supabase server client — `select('*').from('suppliers').order('name')`. Return typed `Supplier[]`.
- [x] 2.4 Create `src/features/suppliers/actions.ts`: export Server Action `createSupplier(formData)` — parse with `supplierSchema.safeParse`, insert into `suppliers`, call `revalidatePath('/suppliers')`, return `{ ok, error? }`.

---

## Phase 3: Purchase Orders Feature Module

- [x] 3.1 Create `src/features/purchase-orders/types.ts`: export `PurchaseOrder` (all header columns + `supplier: { name }` joined), `PurchaseOrderItem` (all item columns + `product: { name }` joined), `PurchaseOrderDetail` (header + supplier + items array).
- [x] 3.2 Create `src/features/purchase-orders/schema.ts`: export `poItemSchema` (`product_id: z.string().uuid()`, `quantity: z.number().int().positive()`, `unit_cost: z.number().min(0)`); export `poSchema` (`supplier_id: uuid`, `order_date: z.string()`, `notes: z.string().optional()`, `items: z.array(poItemSchema).min(1, 'Se requiere al menos un artículo')`). Mirror existing string/number zod transform pattern used in products.
- [x] 3.3 Create `src/features/purchase-orders/queries.ts`: export `listPurchaseOrders()` — select all header columns + `suppliers(name)` join, order by `order_date desc, created_at desc`; export `getPurchaseOrder(id)` — select header + `suppliers(name)` + `purchase_order_items(*, products(name))` join, single row or null.
- [x] 3.4 Create `src/features/purchase-orders/actions.ts`: export Server Action `createPurchaseOrder(data)` — `poSchema.safeParse`, call `supabase.rpc('create_purchase_order', { p_supplier_id, p_order_date, p_notes, p_items: JSON.stringify(items) })`, `revalidatePath('/purchase-orders')`, return `{ ok, id }`. Export Server Action `cancelPurchaseOrder(id)` — fetch current status; if not `pending` return `{ ok: false, error: 'Solo se puede cancelar órdenes pendientes' }`; update `status = 'cancelled'`, `revalidatePath`.

---

## Phase 4: UI Components — Suppliers

- [x] 4.1 Create `src/features/suppliers/components/SupplierForm.tsx` (client component): RHF form bound to `supplierSchema`, fields: Nombre (required), RUC, Email, Teléfono. On submit calls `createSupplier` action. Show sonner toast on success/error. Redirect to `/suppliers` on success.
- [x] 4.2 Create `src/features/suppliers/components/SuppliersTable.tsx` (server component): receives `Supplier[]`, renders table columns "Nombre" + "RUC". Shows empty-state `<p>No hay proveedores registrados.</p>` when array is empty.

---

## Phase 5: UI Components — Purchase Orders

- [x] 5.1 Create `src/features/purchase-orders/components/PurchaseOrderForm.tsx` (client): RHF + `useFieldArray` for `items`. Supplier picker: native `<select>` styled with Tailwind, populated from `listSuppliers()` prop. Item rows: native `<select>` for product (from `listProducts` prop, active only), numeric inputs for `quantity` and `unit_cost`, read-only `subtotal` derived from `watch()`. "Agregar artículo" button appends row; each row has a remove button. Prevent adding duplicate product (disable already-selected product_ids in product pickers). Running total shown below items table. On submit calls `createPurchaseOrder`. Redirect to `/purchase-orders/[id]` on success. Show sonner toast on error.
- [x] 5.2 Create `src/features/purchase-orders/components/PurchaseOrdersTable.tsx` (server): receives `PurchaseOrder[]`, renders columns "Código", "Proveedor", "Fecha", "Estado", "Total". Empty-state: "No hay órdenes de compra.". Status values shown in Spanish (pending → "Pendiente", received → "Recibida", cancelled → "Anulada").
- [x] 5.3 Create `src/features/purchase-orders/components/PurchaseOrderDetail.tsx` (server): receives `PurchaseOrderDetail`. Renders header card (Código, Fecha, Estado, Notas, Total), supplier name, items table (Producto, Cantidad, Costo Unitario, Subtotal). Shows "Anular orden" button only if `status === 'pending'`; button is a client form calling `cancelPurchaseOrder(id)` action with sonner feedback.

---

## Phase 6: Routes and Navigation

- [x] 6.1 Create `src/app/(app)/suppliers/page.tsx` (async server): calls `listSuppliers()`, renders page heading "Proveedores", `<SuppliersTable>`, and inline `<SupplierForm>` (or link to `/suppliers/new`). Whichever layout — keep it one page.
- [x] 6.2 Create `src/app/(app)/purchase-orders/page.tsx` (async server): calls `listPurchaseOrders()`, renders heading "Órdenes de Compra", link/button "Nueva orden" → `/purchase-orders/new`, renders `<PurchaseOrdersTable>`.
- [x] 6.3 Create `src/app/(app)/purchase-orders/new/page.tsx` (async server): calls `listSuppliers()` and `listProducts(undefined, false)` (active products), passes both as props to `<PurchaseOrderForm>`. Heading "Nueva Orden de Compra".
- [x] 6.4 Create `src/app/(app)/purchase-orders/[id]/page.tsx` (async server): `const { id } = await params;` (Next 16 async params). Calls `getPurchaseOrder(id)`. If null, renders not-found state or calls `notFound()`. Otherwise renders `<PurchaseOrderDetail>`. Heading "Detalle de Orden".
- [x] 6.5 Add nav link "Órdenes de Compra" to the existing sidebar/nav component (identify the file and add the entry alongside existing module links). Add nav link "Proveedores" as well.
- [x] 6.6 Update the dashboard card or status list: change the "Orden de Compra" placeholder entry to "Listo" (or mark the relevant dashboard indicator to reflect Module 3 is complete).

---

## Phase 7: Manual Verification

> Vitest is not installed. All verification is manual click-through. Tag [CODE] or [DB].

- [ ] 7.1 [DB] After migration: open Supabase Table Editor, confirm tables `suppliers`, `purchase_orders`, `purchase_order_items` exist with correct columns. Confirm 3 seed suppliers appear. Confirm `create_purchase_order` function exists in Database → Functions.
- [ ] 7.2 [DB] RLS check: using the Supabase SQL editor with `anon` role, attempt `SELECT * FROM suppliers`; confirm 0 rows or policy error. Confirm `authenticated` role query succeeds.
- [ ] 7.3 [CODE] Navigate to `/suppliers`. Confirm seed suppliers appear. Submit form with empty name — confirm inline validation error. Submit with valid name — confirm redirect and new row in list.
- [ ] 7.4 [CODE] Navigate to `/purchase-orders/new`. Confirm supplier dropdown populated. Add two distinct line items, verify subtotals update live and running total is correct. Submit — confirm redirect to detail page.
- [ ] 7.5 [CODE] On detail page: confirm code matches `OC-YYYY-NNNN`, supplier name shown, both items listed with correct subtotals and total.
- [ ] 7.6 [CODE] Create a second PO in the same year. Confirm code is `OC-YYYY-0002` (sequential).
- [ ] 7.7 [CODE] On detail page of a pending PO: click "Anular orden". Confirm status updates to "Anulada". Confirm list reflects updated status.
- [ ] 7.8 [CODE] Attempt to add same product twice in PO form. Confirm the picker disables or prevents duplicate. Confirm only one line exists on detail page.
- [ ] 7.9 [CODE] Submit PO form with 0 items. Confirm error "Se requiere al menos un artículo". Submit with `quantity = 0`. Confirm inline quantity error. Submit with `quantity = 1.5` — confirm integer error.
- [ ] 7.10 [CODE] Log out and navigate directly to `/purchase-orders`. Confirm redirect to `/login`.
