# Proposal: Facturación (Module 5)

## Intent

Modules 2-4 fill inventory; nothing yet sells it. This change adds invoicing: pick a customer, add product lines, compute totals with IGV, and **decrement stock** on issue. The headline rule — an invoice CANNOT oversell: the RPC validates `stock_quantity >= quantity` per item and raises `INSUFFICIENT_STOCK` (rolling back the whole invoice) otherwise. This makes `stock_quantity` load-bearing in the outbound direction and feeds Module 6 (Despacho), which references issued invoices.

## Scope

### In Scope
- Minimal `customers` master (mirrors suppliers): table + seed + `/customers` list/create page.
- `invoices` (header) + `invoice_items` (detail) tables, all with RLS (authenticated full access).
- `create_invoice(p_customer_id, p_invoice_date, p_notes, p_items jsonb)` RPC (SECURITY INVOKER) — atomic: lock + validate stock, compute totals, generate `F-YYYY-NNNN`, insert, decrement stock.
- Invoicing module: list invoices, new-invoice flow (customer + line items with default-but-overridable unit price), invoice detail.
- IGV 18%: `subtotal + igv = total`, stored on the header.

### Out of Scope (Non-goals)
- **Cancel-with-stock-restore** — `cancelled` status reserved; a real system restores stock on cancel, deferred this iteration.
- Payment tracking, credit notes, PDF/print, invoice editing after issue, multi-currency, partial dispatch.

## Capabilities

### New Capabilities
- `customers`: minimal customer master — list + create, seeded samples.
- `invoicing`: issue an invoice — customer + lines, IGV totals, stock validation + decrement, all atomic.

### Modified Capabilities
- None. (`product-catalog` `stock_quantity` is consumed, not respecified — same as Module 4 consumed it inbound.)

## Approach

Reuse the feature-modular pattern (`src/features/customers/`, `src/features/invoicing/` with `actions.ts`, `schema.ts`, `queries.ts`, `components/`). Issue is a single Postgres RPC because stock check + decrement + header + items MUST be one transaction — PostgREST has no multi-statement transactions, so separate writes could decrement stock then fail on insert (or oversell under concurrency). The RPC takes `SELECT ... FOR UPDATE` on each product row, validates availability, computes line subtotals, `igv = round(subtotal*0.18, 2)`, `total`, generates the code, inserts header + items, decrements stock. Additive migration `0004_invoicing.sql` (customers + invoices + items + RPC).

## Documented Assumptions

| Topic | Decision | Rationale |
|-------|----------|-----------|
| Customer master | Minimal table, seeded, `/customers` page | Brief needs selection but no full CRM; mirrors suppliers scope. |
| IGV | Flat 18%, prices stored/entered NET (pre-IGV) | `products.unit_price` is the net sale price; Peru standard VAT. |
| Unit price | Default from `products.unit_price`, overridable per line | Supports discounts/negotiation without a separate price list. |
| Stock rule | `FOR UPDATE` + `stock_quantity >= quantity` per item, else `INSUFFICIENT_STOCK` | Prevents overselling under concurrency; whole invoice rolls back. |
| Atomicity | RPC SECURITY INVOKER, not Server Action | Check + decrement + insert are inseparable. |
| Status | `issued` / `cancelled`, default `issued` | Module 6 references issued; cancel-restore deferred (non-goal). |
| Code | `F-YYYY-NNNN` per-year count+1 in RPC | Mirrors `OC-`/`ING-` convention; no sequence object. |

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/0004_invoicing.sql` | New | customers + invoices + invoice_items + RLS + `create_invoice` RPC + seed |
| `src/features/customers/` | New | list + create |
| `src/features/invoicing/` | New | list/new/detail + create action |
| `src/app/(app)/customers/`, `src/app/(app)/invoices/` | New | protected routes |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Oversell under concurrency | Med | `FOR UPDATE` row lock + in-RPC check; all-or-nothing transaction. |
| IGV rounding mismatch | Low | `round(...,2)` on IGV; line subtotals exact (`quantity*unit_price`). |
| Stale stock after rollback | Low | Single transaction — no partial decrement persists. |

## Rollback Plan

Migration is additive only. Roll back via `DROP FUNCTION create_invoice`, then `DROP TABLE invoice_items, invoices, customers`. No existing tables/columns altered; `products` keeps its structure (only row values change at runtime, no rollback needed for the demo).

## Dependencies

- Module 2 `products` (`unit_price` net sale price, `stock_quantity`) — exists. No PO/receipt dependency.

## Success Criteria

- [ ] Issuing an invoice creates header + items, computes `subtotal + igv(18%) = total`, and decrements each product's stock.
- [ ] An item exceeding available stock raises `INSUFFICIENT_STOCK`; nothing persists (no partial decrement, no header).
- [ ] `/customers` lists/creates seeded customers; invoice list/detail render persisted data; migration applies cleanly on live Supabase.
