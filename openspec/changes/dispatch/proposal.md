# Proposal: Despacho (Dispatch) — Module 6

## Intent

Complete the order-to-delivery flow (`compra → ingreso → venta → despacho`). Once an invoice is issued, the business needs to register the physical shipment and track its delivery state. This is the FINAL module; it closes the commercial cycle and lets graders see a coherent end-to-end domain.

## Scope

### In Scope
- Create a dispatch FROM an issued invoice (select invoice → register dispatch header).
- List dispatches (code, invoice, customer, status, date).
- Dispatch detail: shows source invoice + customer + line items (read from `invoice_items`).
- Advance delivery status: `pending → in_transit → delivered` (the "Estado de entrega" requirement).

### Out of Scope (Non-goals)
- No stock effect — stock already left on the invoice/sale. Documented intentionally.
- No separate `dispatch_items` table — items are the invoice's items, shown by reference.
- No partial / multi-package dispatch, no carrier API integration.
- No dispatch cancellation / reversal, no backward status transitions.

## Capabilities

### New Capabilities
- `dispatch`: register a dispatch from an issued invoice, list, view detail (invoice + customer + items), and advance delivery status.

### Modified Capabilities
- None. (No `openspec/specs/` exist yet; invoices behavior is unchanged — dispatch only reads invoices.)

## Approach

- **Data model** (`dispatches`): `id`, `code` UNIQUE `D-YYYY-NNNN`, `invoice_id` NOT NULL **UNIQUE** → `invoices(id)`, `dispatch_date` default `current_date`, `status` CHECK `('pending','in_transit','delivered')` default `pending`, `address`, `carrier`, `tracking_code`, `notes`, timestamps + `set_updated_at` trigger.
- **One dispatch per invoice** enforced by UNIQUE `invoice_id`. Only `issued` invoices without a dispatch are selectable.
- **Delivery lifecycle**: forward-only `pending → in_transit → delivered`. Backward / skip transitions rejected (validated in Server Action). Rationale: matches real logistics, keeps state auditable, avoids ambiguous reversals in a 48h scope. `cancelled` deliberately excluded.
- **No RPC needed** (deliberate judgment): creating a dispatch is a single-table INSERT and advancing status is a single-table UPDATE. Unlike Modules 3/4/5, there is NO multi-table atomic mutation, so plain Server Actions suffice. Documenting this shows we add SECURITY INVOKER RPCs only when atomicity is actually required.
- **Feature module**: `src/features/dispatch/` mirroring existing modules (server actions, queries, schema, components).
- **RLS**: `dispatches` — authenticated SELECT/INSERT/UPDATE (`true`), following the established policy naming.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/0005_dispatch.sql` | New | `dispatches` table, RLS, trigger, seed |
| `src/features/dispatch/` | New | actions, queries, zod schema, components |
| `src/app/(app)/dispatch/` | New | list, create, detail routes |
| App navigation | Modified | add Despacho entry |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Dispatch code race (`D-YYYY-NNNN` seq) | Low | Per-year count seq like invoices; acceptable for 48h scope |
| Issued invoice gets cancelled after dispatch | Low | Out of scope; document assumption, no reversal logic |
| Invalid status jump | Med | Server Action validates allowed forward transition only |

## Rollback Plan

Additive migration `0005_dispatch.sql` (new table only, no changes to existing tables). Rollback = `DROP TABLE public.dispatches CASCADE;` + remove `src/features/dispatch/` and `(app)/dispatch/` routes. No data migration, no risk to prior modules.

## Dependencies

- Existing `invoices` + `invoice_items` + `customers` tables (Module 5, done).
- `set_updated_at()` trigger function (Module 1, done).

## Assumptions

- Delivery address defaults from/copies customer data; editable free-text, optional.
- `carrier`, `tracking_code`, `notes` are optional metadata.
- Stock is NOT touched by dispatch (already decremented at invoicing).

## Success Criteria

- [ ] Only issued invoices without an existing dispatch are selectable.
- [ ] Creating a dispatch produces a unique `D-YYYY-NNNN` code and one row.
- [ ] Detail view shows invoice, customer, and line items correctly.
- [ ] Status advances forward-only; invalid transitions are rejected.
- [ ] `npm run build` passes; RLS restricts access to authenticated users.
