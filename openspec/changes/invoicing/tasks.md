# Tasks: Invoicing (Module 5)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 900–1 100 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1 — DB + customers feature → PR 2 — invoicing feature + UI → PR 3 — routes + nav wiring |
| Delivery strategy | single-pr (solo project, work-unit commits inside one PR) |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: Yes
Chain strategy: size-exception
400-line budget risk: High

> Solo project — single PR accepted with work-unit commits. No maintainer approval gate required.

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migration + customers feature | single-pr WU1 | Foundation; blocks all UI |
| 2 | Invoicing feature (types/schema/queries/actions) | single-pr WU2 | Depends on WU1 |
| 3 | Components (InvoiceForm, tables, detail) | single-pr WU3 | Depends on WU2 |
| 4 | Routes + nav wiring + dashboard card | single-pr WU4 | Depends on WU3 |
| 5 | Manual verification scenarios | single-pr WU5 | Depends on WU4; no Vitest installed |

---

## Phase 1: Database — Schema Change [FLAG: SCHEMA CHANGE]

- [x] 1.1 [DB] Create `supabase/migrations/0004_invoicing.sql` — customers table: `id uuid PK default gen_random_uuid()`, `name text NOT NULL`, `doc_type text`, `doc_number text`, `email text`, `phone text`, `is_active boolean default true`, `created_at`/`updated_at` timestamps; RLS enabled; `SELECT/INSERT` policy for `authenticated`; `set_updated_at()` trigger; 3–5 seed rows.
- [x] 1.2 [DB] Same migration — invoices table: `id uuid PK`, `code text UNIQUE NOT NULL`, `customer_id uuid FK→customers NOT NULL`, `invoice_date date default CURRENT_DATE`, `status text CHECK(issued,cancelled) default issued`, `subtotal/igv/total numeric(12,2) NOT NULL >=0`, `notes text`, timestamps; RLS authenticated; trigger.
- [x] 1.3 [DB] Same migration — invoice_items table: `id uuid PK`, `invoice_id uuid FK→invoices ON DELETE CASCADE`, `product_id uuid FK→products`, `quantity int CHECK(>0) NOT NULL`, `unit_price numeric(12,2) >=0 NOT NULL`, `subtotal numeric(12,2) >=0 NOT NULL`, `created_at`; RLS authenticated.
- [x] 1.4 [DB] Same migration — `create_invoice(p_customer_id uuid, p_invoice_date date, p_notes text, p_items jsonb) RETURNS uuid` plpgsql SECURITY INVOKER — body order: (a) loop items → `SELECT stock_quantity,name ... FOR UPDATE` → `RAISE 'INSUFFICIENT_STOCK:%',name` if short; (b) accumulate `subtotal`; (c) `igv=round(subtotal*0.18,2); total=subtotal+igv`; (d) `code='F-'||year||'-'||LPAD(count(*)+1,4,'0')`; (e) INSERT invoices header RETURNING id; (f) loop items INSERT invoice_items + UPDATE products stock; (g) RETURN id. `GRANT EXECUTE TO authenticated`.
- [ ] 1.5 [DB] Apply migration locally  ← USER ACTION REQUIRED: `supabase db reset` (or `supabase migration up`) and confirm no SQL errors.

## Phase 2: Customers Feature (Mirror Suppliers)

- [x] 2.1 [CODE] Create `src/features/customers/types.ts` — `Customer` interface: id, name, doc_type, doc_number, email, phone, is_active, created_at, updated_at.
- [x] 2.2 [CODE] Create `src/features/customers/schema.ts` — `customerSchema`: name required Spanish message; doc_type/doc_number/email(format validated)/phone optional or `z.literal('')`; export `CustomerInput`.
- [x] 2.3 [CODE] Create `src/features/customers/queries.ts` — `listCustomers()`: `supabase.from('customers').select('*').order('name')`.
- [x] 2.4 [CODE] Create `src/features/customers/actions.ts` — `createCustomer(formData)`: parse with `customerSchema`, insert row, `revalidatePath('/customers')`, redirect to `/customers`.
- [x] 2.5 [CODE] Create `src/features/customers/components/CustomerForm.tsx` — mirrors SupplierForm: react-hook-form + zodResolver, fields name/doc_type/doc_number/email/phone, Spanish labels and error messages.
- [x] 2.6 [CODE] Create `src/features/customers/components/CustomersTable.tsx` — table columns: Nombre, Tipo Doc., Nro Doc., Correo; empty-state row when no customers.

## Phase 3: Invoicing Feature

- [x] 3.1 [CODE] Create `src/features/invoicing/types.ts` — `Invoice` (all header columns + optional `customers: { name }` join); `InvoiceItem` (item columns + optional `products: { name }` join); `InvoiceWithItems` (Invoice + `invoice_items: InvoiceItem[]`).
- [x] 3.2 [CODE] Create `src/features/invoicing/schema.ts` — reuse `numericPositiveInt`/`numericNonNegative` helpers from purchase-orders/schema; `invoiceItemSchema` (product_id uuid, quantity, unit_price); `invoiceSchema`: customer_id uuid required (Spanish), invoice_date non-empty, notes optional, items array min 1; `.refine` rejects duplicate `product_id` with message `'No se puede agregar el mismo producto dos veces en la misma factura.'`; export `InvoiceInput`.
- [x] 3.3 [CODE] Create `src/features/invoicing/queries.ts` — `listInvoices()`: `select('*, customers(name)') .order('invoice_date', { ascending: false })`; `getInvoice(id)`: `select('*, customers(name), invoice_items(*, products(name))')`.
- [x] 3.4 [CODE] Create `src/features/invoicing/actions.ts` — `createInvoice(formData)`: Zod re-validate; `rpc('create_invoice', { p_customer_id, p_invoice_date, p_notes, p_items })`. On error: if `error.message.includes('INSUFFICIENT_STOCK')` extract product name and return `{ ok: false, error: 'Stock insuficiente para "<name>". Ajusta la cantidad.' }`; else generic error. On success: `revalidatePath('/invoices')` AND `revalidatePath('/products')`; `redirect('/invoices/' + id)`.

## Phase 4: Components

- [x] 4.1 [CODE] Create `src/features/invoicing/components/InvoiceForm.tsx` — `useFieldArray` for line items; customer `<select>` (Customer[]); per-row: product `<select>` (active products with unit_price), quantity input, unit_price input; `onChange` on product select: if `getValues('items.N.unit_price')` is empty/undefined call `setValue('items.N.unit_price', product.unit_price)` (default only, no clobber). Live per-row subtotal = qty × unit_price. Summary box: Subtotal / IGV 18% / Total computed via `useWatch`. Disable already-selected products in other rows (mirrors PO duplicate prevention).
- [x] 4.2 [CODE] Create `src/features/invoicing/components/InvoicesTable.tsx` — columns: Código, Cliente, Fecha, Estado, Total; empty-state row; status badge for `issued`/`cancelled`.
- [x] 4.3 [CODE] Create `src/features/invoicing/components/InvoiceDetail.tsx` — header card (customer, date, status, subtotal, IGV, total); items table (Producto, Cant., P. Unit., Subtotal).

## Phase 5: Routes

- [x] 5.1 [CODE] Create `src/app/(app)/customers/page.tsx` — server component; `await listCustomers()`; renders `CustomersTable` + "Nuevo cliente" button linking to `/customers/new`; authenticated via layout guard.
- [x] 5.2 [CODE] Create `src/app/(app)/customers/new/page.tsx` — renders `CustomerForm` with `createCustomer` action.
- [x] 5.3 [CODE] Create `src/app/(app)/invoices/page.tsx` — server component; `await listInvoices()`; renders `InvoicesTable` + "Nueva factura" button linking to `/invoices/new`.
- [x] 5.4 [CODE] Create `src/app/(app)/invoices/new/page.tsx` — server component; parallel-fetch `listCustomers()` and `listProducts({ activeOnly: true, includeUnitPrice: true })`; renders `InvoiceForm` with both datasets.
- [x] 5.5 [CODE] Create `src/app/(app)/invoices/[id]/page.tsx` — `const { id } = await params`; `await getInvoice(id)`; if null call `notFound()`; renders `InvoiceDetail`.

## Phase 6: Navigation Wiring

- [x] 6.1 [CODE] Modify `src/app/(app)/layout.tsx` — add `<Link href="/invoices">Facturación</Link>` nav item after "Ingreso de Mercadería".
- [x] 6.2 [CODE] Modify `src/app/(app)/page.tsx` — update Facturación dashboard card: set status to `'done'` and `href` to `/invoices`.

## Phase 7: Manual Verification [CODE]

- [ ] 7.1 [CODE] Scenario STOCK-HAPPY: create invoice for product with sufficient stock; verify `stock_quantity` decremented by sold qty in DB.
- [ ] 7.2 [CODE] Scenario STOCK-REJECT: create invoice requesting qty > stock; verify: RPC raises error naming the product; toast shows Spanish message with product name; no invoice row exists; stock unchanged.
- [ ] 7.3 [CODE] Scenario STOCK-PARTIAL: line 1 valid, line 2 oversold; verify no header, no items, no stock change on line 1's product.
- [ ] 7.4 [CODE] Scenario IGV-CORRECT: submit invoice with subtotal=100.00; verify igv=18.00, total=118.00 in DB and detail page.
- [ ] 7.5 [CODE] Scenario CUSTOMER-REQUIRED: submit form without customer; verify inline validation error, RPC not called.
- [ ] 7.6 [CODE] Scenario DUPLICATE-PRODUCT: add same product twice; verify inline validation error, RPC not called.
- [ ] 7.7 [CODE] Scenario DETAIL-READONLY: navigate to `/invoices/[id]`; verify all header fields and both line items render; no FK error for soft-deleted product if applicable.
