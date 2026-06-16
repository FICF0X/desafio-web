# Proposal: Orden de Compra (Module 3)

## Intent

The challenge requires registering purchase orders: a header, a supplier selection, and product line items. No supplier master exists yet, and Module 4 (Ingreso de Mercadería) depends on PO status to receive goods and increment stock. This change delivers PO creation/listing/detail and the minimal supplier support it needs.

## Scope

### In Scope
- `suppliers` minimal table + seed data + minimal list/create page (`/suppliers`).
- `purchase_orders` (header) + `purchase_order_items` (detail) tables with RLS (authenticated full access).
- Create PO: supplier select, line items (product picker + qty + unit cost), live total, persist.
- List POs and view PO detail.
- Stored header `total` updated by the create Server Action.

### Out of Scope (Non-goals)
- Editing/deleting a PO after creation (status is `pending` and immutable here).
- PO approval workflow, partial receipts (Module 4), PDF export, full supplier CRUD/edit.

## Capabilities

### New Capabilities
- `suppliers`: minimal supplier entity (read/create) for PO selection.
- `purchase-orders`: PO header + items lifecycle, totals, list, detail.

### Modified Capabilities
- None.

## Approach

Follow the existing feature-modular pattern (`src/features/<module>/` with `actions.ts`, `schema.ts`, `queries.ts`, `components/`). Mutations via Server Actions, reads via the Supabase server client. Two new features: `suppliers`, `purchase-orders`. Additive SQL migrations (`0002_suppliers.sql`, `0003_purchase_orders.sql`).

## Documented Assumptions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Suppliers | Minimal table + `/suppliers` list+create page, seeded | Brief allows assumptions; supporting entity, not a full module. A page beats inline (reusable, testable). |
| PO code | `OC-YYYY-NNNN` generated in create action via per-year count+1 | Human-friendly, no extra sequence object; acceptable for single-user 48h scope. |
| Totals | Stored `total` computed in create action (sum of subtotals) | No trigger complexity; PO is immutable post-create, so drift is impossible. |
| Edit policy | No edit/delete after create | Keeps scope tight; avoids recompute/audit logic. |
| Status lifecycle | `pending` → `received` → (`cancelled`) | Load-bearing for Module 4: it transitions `pending→received` and increments product stock. Documented here as the contract. |
| Referential integrity | Products soft-delete only; items `ON DELETE CASCADE` from header | Preserves PO history; products stay referenceable. |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/0002_suppliers.sql` | New | suppliers table + RLS + seed |
| `supabase/migrations/0003_purchase_orders.sql` | New | purchase_orders + purchase_order_items + RLS |
| `src/features/suppliers/` | New | list/create supplier |
| `src/features/purchase-orders/` | New | create/list/detail PO |
| `src/app/(app)/suppliers/`, `src/app/(app)/purchase-orders/` | New | protected routes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Concurrent PO code collision | Low | Single-user demo; `code` UNIQUE constraint surfaces conflict. |
| Status contract drift with Module 4 | Med | Status values documented here as the contract. |

## Rollback Plan

Migrations are additive only. Roll back by dropping the three new tables (`purchase_order_items`, `purchase_orders`, `suppliers`) and removing the new feature/route folders. No existing tables or columns are altered.

## Dependencies

- Module 2 `products` (exists, soft-delete). Module 4 depends on this change's status field.

## Success Criteria

- [ ] User can create a supplier and a PO with multiple line items and a correct total.
- [ ] PO list and detail render persisted data; status defaults to `pending`.
- [ ] All three tables enforce RLS for authenticated users; migrations apply cleanly on live Supabase.
