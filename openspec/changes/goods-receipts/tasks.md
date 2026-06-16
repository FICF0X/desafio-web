# Tasks: Ingreso de Mercadería (Module 4)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550–700 (11 new files + 2 modified) |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 (DB + feature layer) → PR 2 (UI + routes + nav) |
| Delivery strategy | single-pr |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

> Solo project, single PR with work-unit commits — maintainer exception already accepted.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migration + feature layer (types, schema, queries, actions) | Combined PR | Must run migration in Supabase first [DB] |
| 2 | Components + routes + nav/dashboard wire-up | Combined PR | Depends on Unit 1 types being present |

---

## Phase 1: Database — [SCHEMA CHANGE — run in Supabase dashboard first]

- [x] 1.1 Create `supabase/migrations/0003_goods_receipts.sql`: define `goods_receipts` table (id uuid PK, code text UNIQUE NOT NULL, purchase_order_id uuid NOT NULL UNIQUE FK→purchase_orders, receipt_date date NOT NULL DEFAULT current_date, notes text, created_at/updated_at timestamptz, set_updated_at trigger).
- [x] 1.2 In same migration, define `goods_receipt_items` table (id uuid PK, goods_receipt_id uuid NOT NULL FK→goods_receipts ON DELETE CASCADE, product_id uuid NOT NULL FK→products, quantity int NOT NULL CHECK(quantity>0), created_at timestamptz).
- [x] 1.3 In same migration, enable RLS on both tables; add `authenticated` SELECT + INSERT policies on both; add UPDATE policy on `goods_receipts` only (required for the trigger to update updated_at).
- [x] 1.4 In same migration, write plpgsql function `receive_purchase_order(p_purchase_order_id uuid, p_notes text) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER` with body order: (a) `SELECT ... FOR UPDATE` → raise 'Orden de compra no encontrada' if NULL, raise 'La orden no está pendiente' if status<>'pending'; (b) generate `ING-YYYY-NNNN` via EXTRACT(YEAR) + count+1; (c) INSERT goods_receipts RETURNING id; (d) INSERT goods_receipt_items SELECT FROM purchase_order_items WHERE purchase_order_id; (e) UPDATE products stock_quantity += qty JOIN purchase_order_items; (f) UPDATE purchase_orders SET status='received'; (g) RETURN v_id.
- [x] 1.5 In same migration, add `GRANT EXECUTE ON FUNCTION receive_purchase_order TO authenticated`.
- [ ] **[DB]** Apply migration in Supabase dashboard (SQL editor) before running the app.

## Phase 2: Feature Layer

- [x] 2.1 Create `src/features/goods-receipts/types.ts`: export `GoodsReceipt`, `GoodsReceiptItem`, `GoodsReceiptListRow` (code, receipt_date, po_code, supplier_name), `GoodsReceiptDetail` (header + items with product_name), `PendingPurchaseOrderWithItems` (po id, code, supplier name, items array with product_id, product_name, quantity).
- [x] 2.2 Create `src/features/goods-receipts/schema.ts`: export `receiveSchema = z.object({ purchase_order_id: z.string().uuid(), notes: z.string().trim().max(500).optional() })`.
- [x] 2.3 Create `src/features/goods-receipts/queries.ts`: `listGoodsReceipts()` (join purchase_orders+suppliers, order receipt_date DESC, created_at DESC); `getGoodsReceipt(id)` (header + items joined to products + PO); `listPendingPurchaseOrdersWithItems()` (status='pending' POs joined with their items+product names — used by /goods-receipts/new server page).
- [x] 2.4 Create `src/features/goods-receipts/actions.ts`: `receiveGoodsReceipt(formData)` — re-validate with `receiveSchema.safeParse`; call `supabase.rpc('receive_purchase_order', { p_purchase_order_id, p_notes })`; map RPC error 'no está pendiente' → "La orden ya fue recibida o no está pendiente.", unique violation code 23505 → "Esta orden ya tiene un ingreso registrado.", fallback → generic Spanish message; on success call `revalidatePath('/goods-receipts')`, `revalidatePath('/products')`, `revalidatePath('/purchase-orders')`, then `redirect('/goods-receipts/' + id)`.

## Phase 3: UI Components

- [x] 3.1 Create `src/features/goods-receipts/components/GoodsReceiptForm.tsx` (client component): `<select>` listing pending POs (label: `{code} — {supplier} — S/ {total}`); on change shows that PO's items read-only (producto, cantidad pedida) rendered from props (no extra fetch); optional notes textarea; "Confirmar recepción" submit button; empty-state message "No hay órdenes pendientes por recibir" when pendingPOs array is empty.
- [x] 3.2 Create `src/features/goods-receipts/components/GoodsReceiptsTable.tsx` (server component): renders list table with columns: Código Ingreso, Código OC, Proveedor, Fecha de Recepción; each row links to `/goods-receipts/[id]`.
- [x] 3.3 Create `src/features/goods-receipts/components/GoodsReceiptDetail.tsx` (server component): receipt header card (código, fecha, notas); items table (producto, cantidad recibida); link back to source PO `/purchase-orders/[po_id]`.

## Phase 4: Routes

- [x] 4.1 Create `src/app/(app)/goods-receipts/page.tsx`: server page — calls `listGoodsReceipts()`; renders page heading "Ingresos de Mercadería", "Nuevo ingreso" button linking to `/goods-receipts/new`, and `<GoodsReceiptsTable>`.
- [x] 4.2 Create `src/app/(app)/goods-receipts/new/page.tsx`: server page — calls `listPendingPurchaseOrdersWithItems()`; renders heading "Nuevo Ingreso de Mercadería" and `<GoodsReceiptForm pendingPOs={...} />`.
- [x] 4.3 Create `src/app/(app)/goods-receipts/[id]/page.tsx`: server page — `const { id } = await params`; calls `getGoodsReceipt(id)`; if null call `notFound()`; renders `<GoodsReceiptDetail receipt={...} />`.

## Phase 5: Navigation & Dashboard Wire-Up

- [x] 5.1 Add nav link "Ingreso de Mercadería" in `src/app/(app)/layout.tsx` (after "Órdenes de Compra", same Link pattern as existing entries).
- [x] 5.2 Update "Ingreso de Mercadería" card in `src/app/(app)/page.tsx`: change `status` to `'done'` and add `href: '/goods-receipts'` to the modules array.

## Phase 6: Manual Verification [CODE] + [DB]

- [ ] 6.1 [DB] STOCK CHECK setup: note `stock_quantity` for at least one product in Supabase SQL editor before testing (`SELECT id, name, stock_quantity FROM products LIMIT 5`).
- [ ] 6.2 [CODE] Happy path: navigate to `/goods-receipts/new`, select a pending PO, confirm — verify redirect to detail page, receipt code matches `ING-{year}-{NNNN}`, PO status is now `received`.
- [ ] 6.3 [DB] Verify stock increment: re-run `SELECT id, name, stock_quantity FROM products` — confirm each received PO item's product increased by exactly its ordered quantity (covers Scenario 1 + Scenario 7, REQ-GR-04).
- [ ] 6.4 [CODE] Verify PO disappears from pending selector: navigate to `/goods-receipts/new` — the just-received PO MUST NOT appear in the `<select>` (REQ-GR-08).
- [ ] 6.5 [CODE] Re-receive guard: attempt to call the RPC again for the same PO (via SQL editor or a direct rpc call) — confirm Spanish error toast appears, no duplicate receipt in DB (Scenario 2, REQ-GR-07, REQ-GR-11).
- [ ] 6.6 [CODE] List ordering: create two more receipts on different dates — navigate to `/goods-receipts` and confirm most-recent first ordering (Scenario 8, REQ-GR-15).
- [ ] 6.7 [CODE] Detail view: click a receipt row — confirm header (code, date, notes), items table, and PO link render correctly (Scenario 9, REQ-GR-17, REQ-GR-18).
- [ ] 6.8 [CODE] Unauthenticated access: log out, navigate to `/goods-receipts` — confirm redirect to `/login` (Scenario 10, REQ-GR-20).
- [ ] 6.9 Run `npm run build` — confirm zero TypeScript / route errors.
