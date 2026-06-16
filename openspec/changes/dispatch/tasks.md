# Tasks: Dispatch (Module 6)

> **[DB] SCHEMA CHANGE FLAG** — Phase 1 includes a new Supabase migration.
> Apply it before running the app locally or in production.

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 420–520 |
| 400-line budget risk | Medium-High |
| Chained PRs recommended | No |
| Suggested split | Single PR with work-unit commits |
| Delivery strategy | single-pr (solo project, size:exception accepted) |
| Chain strategy | size-exception |

Decision needed before apply: No
Chained PRs recommended: No
Chain strategy: size-exception
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migration + feature module (types/schema/queries/actions) | PR 1 (only PR) | Foundation first; no UI deps yet |
| 2 | Components + routes + nav wiring | PR 1 (continued) | Depends on unit 1 |

---

## Phase 1: Database (Schema Change)

- [x] 1.1 **[DB]** Create `supabase/migrations/0005_dispatch.sql` — `dispatches` table with `id`, `code` UNIQUE, `invoice_id` NOT NULL UNIQUE FK→invoices, `dispatch_date` default `current_date`, `status` CHECK IN `('pending','in_transit','delivered')` default `'pending'`, nullable `address`/`carrier`/`tracking_code`/`notes`, `created_at`/`updated_at` timestamptz NOT NULL.
- [x] 1.2 **[DB]** In same migration: attach `set_updated_at()` trigger as `dispatches_set_updated_at` (BEFORE UPDATE, reuses existing function from 0001).
- [x] 1.3 **[DB]** In same migration: `ALTER TABLE … ENABLE ROW LEVEL SECURITY`, then create three RLS policies — `dispatches_select_authenticated` (SELECT), `dispatches_insert_authenticated` (INSERT), `dispatches_update_authenticated` (UPDATE) — all TO `authenticated`. No DELETE policy.
- [ ] 1.4 **[CREDS]** Apply migration in Supabase SQL editor (or `supabase migration up`) and verify table + policies appear in the Dashboard.

---

## Phase 2: Feature Module

- [x] 2.1 Create `src/features/dispatch/types.ts` — export `DispatchStatus`, `CustomerRef`, `InvoiceRef`, `ProductRef`, `DispatchInvoiceItem`, `Dispatch`, `DispatchListRow`, `DispatchDetail`, `DispatchableInvoice` as defined in design.
- [x] 2.2 Create `src/features/dispatch/schema.ts` — export `createDispatchSchema` (zod: `invoice_id` uuid required; optional trimmed string fields `address`/`carrier`/`tracking_code`/`notes`), `CreateDispatchInput`, and `NEXT_STATUS: Record<DispatchStatus, DispatchStatus | null>` map.
- [x] 2.3 Create `src/features/dispatch/queries.ts` — `listDispatches()`: select `*, invoices(code, total, customers(name))` ordered `dispatch_date DESC, created_at DESC`.
- [x] 2.4 In `queries.ts`: `getDispatch(id)`: select `*, invoices(code, total, customers(name), invoice_items(*, products(name)))` `.eq('id', id).single()`, return null on PGRST116.
- [x] 2.5 In `queries.ts`: `listDispatchableInvoices()`: select issued invoices embedding `dispatches(id)`, filter in JS where `dispatches` array is empty, map to `DispatchableInvoice` (flatten `customers.name → customer_name`).
- [x] 2.6 Create `src/features/dispatch/actions.ts` (`'use server'`) — `createDispatch(formData)`: parse with `createDispatchSchema`, count dispatches this year to generate `D-YYYY-NNNN`, INSERT, catch `23505` → friendly Spanish error (`"Esta factura ya tiene un despacho registrado."` for invoice constraint, generic otherwise), `revalidatePath('/dispatches')`, `redirect('/dispatches/${id}')`.
- [x] 2.7 In `actions.ts`: `advanceDispatchStatus(id, current)`: resolve `next = NEXT_STATUS[current]`, guard `null` (delivered) and invalid current with Spanish error, `UPDATE dispatches SET status=next WHERE id=id AND status=current`, check 0 rows updated → `"El estado del despacho cambió. Recarga la página."`, on success `revalidatePath` for list + detail, return `{ ok: true, status: next }`.

---

## Phase 3: Components

- [x] 3.1 Create `src/features/dispatch/components/DispatchForm.tsx` (client, `useTransition`) — `<select name="invoice_id">` of `DispatchableInvoice[]` with option label `{code} — {customer_name} — S/ {total}`; optional inputs for `address`, `carrier`, `tracking_code`, `notes`; submit button "Registrar despacho" / "Registrando…"; empty state `"No hay facturas emitidas pendientes de despacho."` when list is empty; `toast.error(result.error)` on `!result.ok`; accept `defaultInvoiceId?: string` prop for `?invoice=` preselect.
- [x] 3.2 Create `src/features/dispatch/components/DispatchesTable.tsx` — columns: Código (mono), Factura, Cliente, Estado (status badge), Fecha; rows link to `/dispatches/[id]`; empty state with "Nuevo despacho" CTA link; mirrors `GoodsReceiptsTable` structure.
- [x] 3.3 Create `src/features/dispatch/components/DispatchDetail.tsx` (client, `useTransition`) — three blocks: (1) header card with code, status badge, dispatch date, carrier/tracking_code/address/notes (show "—" for nulls), link to source invoice `/invoices/[invoice_id]`; (2) status stepper button: `pending` → "Marcar en camino", `in_transit` → "Marcar entregada", `delivered` → no button, terminal badge "Entregada"; button disabled while transition pending, `toast.error` on `!result.ok`; (3) read-only items table (Producto, Cantidad, Precio unit., Subtotal) from `invoice_items`.
- [x] 3.4 Define `STATUS_LABEL: Record<DispatchStatus, string>` map in feature (co-locate with components or in types): `pending → "Pendiente"`, `in_transit → "En camino"`, `delivered → "Entregada"`. Reference from table, detail, and stepper for consistency.

---

## Phase 4: Routes

- [x] 4.1 Create `src/app/(app)/dispatches/page.tsx` (Server Component) — call `listDispatches()`, render page header + "Nuevo despacho" button linking to `/dispatches/new`, render `<DispatchesTable>`.
- [x] 4.2 Create `src/app/(app)/dispatches/new/page.tsx` (Server Component) — `interface Props { searchParams: Promise<{ invoice?: string }> }`, await `searchParams`, call `listDispatchableInvoices()`, render `<DispatchForm dispatchableInvoices={…} defaultInvoiceId={invoice} />`.
- [x] 4.3 Create `src/app/(app)/dispatches/[id]/page.tsx` (Server Component) — `interface Props { params: Promise<{ id: string }> }`, `await params`, call `getDispatch(id)`, call `notFound()` if null, render `<DispatchDetail dispatch={…} />`.

---

## Phase 5: Navigation & Integration Wiring

- [x] 5.1 In `src/app/(app)/layout.tsx`: add `<Link href="/dispatches">Despacho</Link>` nav item after the "Facturación" link (same className pattern).
- [x] 5.2 In `src/app/(app)/page.tsx`: update "Despacho" module entry — set `status: 'done'`, add `href: '/dispatches'`.
- [x] 5.3 (Optional) In `src/app/(app)/invoices/[id]/page.tsx`: add a `<Link href={/dispatches/new?invoice=${dispatch.id}}>Registrar despacho</Link>` shortcut when invoice status is `issued` and has no dispatch — one-line add; skip if time-constrained.

---

## Phase 6: Manual Verification

> Vitest is NOT installed. All verification is manual [CODE] unless marked [DB]/[CREDS].

- [ ] 6.1 **[CODE]** Create dispatch from issued invoice → confirm redirect to detail page, code format `D-YYYY-NNNN`, status `Pendiente`.
- [ ] 6.2 **[CODE]** Reload `/dispatches/new` → used invoice no longer appears in selector.
- [ ] 6.3 **[CODE]** Advance dispatch: `Pendiente → En camino → Entregada` in two clicks; verify button label changes at each step.
- [ ] 6.4 **[CODE]** On `Entregada` dispatch detail: confirm no advance button is rendered.
- [ ] 6.5 **[CODE]** Submit create form for an already-dispatched invoice (simulate race via direct POST or duplicate tab) → confirm toast error `"Esta factura ya tiene un despacho registrado."`, no crash.
- [ ] 6.6 **[CODE]** Create dispatch with all optional fields blank → confirm row has `NULL` for address/carrier/tracking_code/notes; detail page shows "—" not `null`.
- [ ] 6.7 **[CODE]** Verify `stock_quantity` of any referenced product is unchanged after create and after each status advance (query Supabase dashboard directly).
- [ ] 6.8 **[DB]** Confirm RLS: unauthenticated Supabase client (anon key, no JWT) cannot SELECT/INSERT/UPDATE `dispatches` — check via Supabase Table Editor or REST call.
- [ ] 6.9 **[CODE]** Navigate to `/dispatches` and `/dispatches/new` without a session (clear cookies) → confirm redirect to `/login`.
