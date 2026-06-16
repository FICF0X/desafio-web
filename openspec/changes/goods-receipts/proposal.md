# Proposal: Ingreso de Mercadería (Module 4)

## Intent

Module 3 lets users register purchase orders that sit in `pending`. Nothing yet brings ordered goods into inventory: Module 2 only allowed setting `stock_quantity` manually. This change closes the inventory loop — receiving a pending PO records a goods receipt, increments product stock by the ordered quantities, and transitions the PO `pending → received`. This is the module that makes `stock_quantity` actually meaningful.

## Scope

### In Scope
- `goods_receipts` (header) + `goods_receipt_items` (detail) tables with RLS (authenticated full access).
- `receive_purchase_order(p_purchase_order_id, p_notes)` RPC (SECURITY INVOKER) — atomic receive.
- Goods-receipts module: list receipts, "new" flow (select a PENDING PO → read-only ordered items → confirm), view receipt detail.
- Side effect: increment `products.stock_quantity` per item and set PO `status = 'received'` inside the RPC.

### Out of Scope (Non-goals)
- **Partial receipts** — receiving less than ordered, or multiple receipts per PO (one receipt per PO, full quantities only).
- Editing received quantities or reverting a receipt; receiving `received`/`cancelled` POs.
- Cancellation flow (not part of this module). PO detail "Recibir mercadería" shortcut is a nice-to-have only.

## Capabilities

### New Capabilities
- `goods-receipts`: receive a pending PO in full — receipt header + items, stock increment, PO status transition.

### Modified Capabilities
- None. (`purchase-orders` status lifecycle was already defined as the contract in Module 3; this change consumes it, it does not change the spec.)

## Approach

Reuse the established feature-modular pattern (`src/features/goods-receipts/` with `actions.ts`, `schema.ts`, `queries.ts`, `components/`). The receive operation is a single Postgres RPC because stock + PO status + receipt header/items MUST all move together or not at all — PostgREST has no multi-statement transactions, so a Server Action issuing separate writes could leave stock incremented but status stale (or vice versa) on partial failure. The RPC validates `pending` (raises otherwise), generates `ING-YYYY-NNNN`, copies `purchase_order_items` into `goods_receipt_items`, increments stock, and flips status — one transaction. Additive migration `0003_goods_receipts.sql`.

## Documented Assumptions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Receipt granularity | FULL receipt only, one per PO | Tightest scope that closes the loop; partial/multi-receipt is the key deferred decision. |
| Uniqueness | `purchase_order_id` UNIQUE on header | Enforces one receipt per PO at the DB level, not just app logic. |
| Receivability | Only `pending` POs; RPC raises on others | Prevents double stock increment; idempotency guard. |
| Receipt code | `ING-YYYY-NNNN` per-year count+1 in RPC | Mirrors Module 3 `OC-` convention; no extra sequence object for 48h scope. |
| Atomicity | RPC SECURITY INVOKER, not Server Action | Stock + status + receipt are inseparable; even more critical than Module 3. |
| Stock | Increment by ordered quantity | This module is what makes `stock_quantity` load-bearing. |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/0003_goods_receipts.sql` | New | 2 tables + RLS + `receive_purchase_order` RPC |
| `src/features/goods-receipts/` | New | list/new/detail + receive action |
| `src/app/(app)/goods-receipts/` | New | protected routes |
| `src/app/(app)/purchase-orders/[id]/` | Modified (nice-to-have) | optional "Recibir mercadería" shortcut |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Double receive (concurrent) | Low | `purchase_order_id` UNIQUE + `pending` check in RPC; single-user demo. |
| RPC lacks needed grants | Low | SECURITY INVOKER relies on authenticated RLS: insert receipts/items, update products + POs (all granted). |
| Stock/status drift | Low | Single transaction in the RPC — all-or-nothing. |

## Rollback Plan

Migration is additive only. Roll back by `DROP FUNCTION receive_purchase_order` and dropping `goods_receipt_items` then `goods_receipts`. No existing tables or columns are altered; `products` and `purchase_orders` keep their structure (only row values change at runtime, which a rollback does not need to undo for the demo).

## Dependencies

- Module 3 `purchase_orders` `pending` status + `purchase_order_items` (exists). Module 2 `products.stock_quantity` (exists).

## Success Criteria

- [ ] Receiving a pending PO creates a receipt, increments each product's stock by the ordered quantity, and sets PO status to `received`.
- [ ] A `received` or `cancelled` PO cannot be received again (RPC raises; UI hides it).
- [ ] Receipts list and detail render persisted data; migration applies cleanly on live Supabase.
