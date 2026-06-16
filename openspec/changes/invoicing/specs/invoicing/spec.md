# Invoicing Specification

## Purpose

Issue sales invoices: select a customer, add line items with validated stock, compute IGV totals atomically, and decrement product stock on success.

## Scope

### In Scope
- Invoice list (`/invoices`): code, customer, date, status, total; ordered newest-first.
- New invoice flow: customer selection + line items + computed totals.
- Invoice detail view: header fields + line items.
- `create_invoice` RPC: atomic stock-check, stock-decrement, header + items insert.
- IGV 18% computed on header: `igv = round(subtotal * 0.18, 2)`, `total = subtotal + igv`.
- Invoice code: `F-YYYY-NNNN` (per-year sequence in RPC).
- Status: `issued` (default on creation). `cancelled` status reserved; no cancel action this iteration.

### Out of Scope
- Cancel invoice with stock restore.
- Payment tracking, credit notes, PDF/print.
- Invoice editing after issue.
- Multi-currency, partial dispatch.

---

## Requirements

### Requirement: Create Invoice

The system MUST atomically validate stock, insert invoice header + items, decrement stock, and return the new invoice. A customer (`customer_id`) MUST be selected. The invoice MUST have at least one line item. Each line item MUST reference a valid product, have `quantity > 0`, and a `unit_price ≥ 0` (defaulted from `products.unit_price`, overridable). The same product MUST NOT appear in more than one line item (duplicate product lines are forbidden). `line_subtotal = quantity * unit_price` (computed per line). Header `subtotal = SUM(line_subtotals)`, `igv = ROUND(subtotal * 0.18, 2)`, `total = subtotal + igv`. The operation MUST be all-or-nothing: if any step fails, NOTHING is persisted and stock is unchanged.

#### Scenario: Happy path — invoice issued

- GIVEN the authenticated user has selected a customer and added ≥1 line item with valid quantity and stock available
- WHEN they submit the new invoice form
- THEN `create_invoice` RPC MUST execute atomically
- AND header MUST be persisted with status `issued`, computed `subtotal`, `igv`, `total`, and code `F-YYYY-NNNN`
- AND each product's `stock_quantity` MUST decrease by the sold quantity
- AND the user MUST be redirected to the invoice detail page

#### Scenario: IGV calculation correctness

- GIVEN a single line item with `quantity=1`, `unit_price=100.00`
- WHEN the invoice is submitted
- THEN `subtotal` MUST equal `100.00`, `igv` MUST equal `18.00`, `total` MUST equal `118.00`

#### Scenario: IGV rounding

- GIVEN a line item producing `subtotal=100.005` (e.g., 3 × 33.335)
- WHEN the invoice is submitted
- THEN `igv` MUST equal `ROUND(subtotal * 0.18, 2)` with standard half-up rounding

#### Scenario: Missing customer

- GIVEN the user has not selected a customer
- WHEN they attempt to submit the invoice
- THEN the form MUST display an inline validation error on the customer field
- AND the RPC MUST NOT be called

#### Scenario: No line items

- GIVEN the user has selected a customer but added no line items
- WHEN they attempt to submit
- THEN the form MUST display a validation error requiring at least one item
- AND the RPC MUST NOT be called

#### Scenario: Duplicate product lines prevented

- GIVEN the user adds two line items for the same product
- WHEN they attempt to submit
- THEN the form MUST display a validation error identifying the duplicate product
- AND the RPC MUST NOT be called

---

### Requirement: Stock Availability Enforcement

Each line item quantity MUST NOT exceed the product's current `stock_quantity`. If ANY line item exceeds available stock, the ENTIRE invoice MUST be rejected atomically (no header persisted, no items persisted, no stock decremented). The error MUST identify the offending product by name in a user-readable Spanish message.

#### Scenario: Sufficient stock — invoice accepted

- GIVEN product "Laptop" has `stock_quantity = 5` and the line requests `quantity = 3`
- WHEN `create_invoice` executes with `SELECT ... FOR UPDATE` on the product row
- THEN the stock check MUST pass and the invoice MUST be issued
- AND `stock_quantity` MUST become `2` after commit

#### Scenario: Insufficient stock — invoice rejected

- GIVEN product "Monitor" has `stock_quantity = 2` and the line requests `quantity = 5`
- WHEN `create_invoice` executes the stock check
- THEN the RPC MUST raise `INSUFFICIENT_STOCK` and roll back the entire transaction
- AND `stock_quantity` for "Monitor" MUST remain `2`
- AND a Spanish error message MUST be surfaced identifying "Monitor" as the cause

#### Scenario: Partial insufficiency rolls back entire invoice

- GIVEN line 1 (Laptop, qty=2, stock=10) is valid AND line 2 (Monitor, qty=5, stock=2) is invalid
- WHEN `create_invoice` executes
- THEN the whole invoice MUST be rejected (no header, no items, no stock change for Laptop either)

---

### Requirement: List Invoices

The system MUST display a table of invoices ordered by `invoice_date DESC`. Columns: code, customer name, date, status, total. An empty state MUST be shown when no invoices exist.

#### Scenario: Populated list ordered newest-first

- GIVEN two invoices exist with different dates
- WHEN the authenticated user navigates to `/invoices`
- THEN the invoice with the more recent date MUST appear first

#### Scenario: Empty state

- GIVEN no invoices exist
- WHEN the list renders
- THEN an empty-state message MUST be displayed

---

### Requirement: View Invoice Detail

The system MUST render a detail page showing: header (customer, date, status, subtotal, igv, total) and a table of line items (product name, quantity, unit_price, line subtotal).

#### Scenario: Detail page renders correctly

- GIVEN an invoice with 2 line items was issued
- WHEN the authenticated user navigates to `/invoices/[id]`
- THEN all header fields MUST be displayed
- AND both line items MUST appear in the items table with correct values

---

### Requirement: Access Control (RLS + Route Guard)

ALL invoice and invoice-item operations MUST require an authenticated session. Supabase RLS on `invoices` and `invoice_items` MUST restrict all operations to the `authenticated` role. The `create_invoice` RPC runs as SECURITY INVOKER, inheriting the caller's RLS context.

#### Scenario: Unauthenticated access blocked

- GIVEN a user has no valid session
- WHEN they navigate to `/invoices` or `/invoices/new`
- THEN `proxy.ts` middleware MUST redirect them to `/login`

#### Scenario: Unauthenticated DB access blocked by RLS

- GIVEN an HTTP request uses the `anon` role
- WHEN it attempts any operation on `invoices` or `invoice_items`
- THEN Supabase RLS MUST deny the operation

---

### Requirement: Referential Integrity

Products MUST NOT be hard-deleted. The existing `is_active` soft-delete on `products` ensures that invoice history referencing discontinued products remains intact and resolvable.

#### Scenario: Invoice referencing a soft-deleted product remains readable

- GIVEN an invoice was issued for product "Laptop" which is subsequently soft-deleted (`is_active = false`)
- WHEN the authenticated user views the invoice detail
- THEN all line items including "Laptop" MUST still render with correct values
- AND no foreign-key error SHALL occur
