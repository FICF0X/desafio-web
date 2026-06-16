# Dispatch Specification

## Purpose

Register the physical shipment of goods against an issued invoice, and track its delivery state through a forward-only lifecycle (`pending → in_transit → delivered`). This is the final module that closes the commercial cycle.

## Scope

### In Scope

- Create a dispatch from a single issued invoice (one dispatch per invoice).
- List dispatches: code, invoice code, customer, dispatch date, status; ordered newest-first.
- View dispatch detail: header + source invoice summary + invoice line items + status advance control.
- Advance delivery status forward-only: `pending → in_transit → delivered`.
- Dispatch code auto-generated as `D-YYYY-NNNN` (per-year sequence).
- RLS on `dispatches` restricted to the `authenticated` role.

### Out of Scope

- No stock effect — stock was already decremented at invoicing. Dispatch MUST NOT touch `stock_quantity`.
- No separate `dispatch_items` table — line items are read from `invoice_items` by reference.
- No partial dispatch or multi-package dispatch.
- No carrier API integration.
- No dispatch cancellation or reversal.
- No backward or skip status transitions (e.g., `pending → delivered` is forbidden).
- No `cancelled` status on dispatches.

---

## Data Contract

The `dispatches` table MUST have the following columns:

| Column          | Type         | Constraints                                                                         |
| --------------- | ------------ | ----------------------------------------------------------------------------------- |
| `id`            | `uuid`       | PK, default `gen_random_uuid()`                                                     |
| `code`          | `text`       | NOT NULL, UNIQUE, format `D-YYYY-NNNN`                                              |
| `invoice_id`    | `uuid`       | NOT NULL, UNIQUE, FK → `invoices(id)`                                               |
| `dispatch_date` | `date`       | NOT NULL, default `current_date`                                                    |
| `status`        | `text`       | NOT NULL, CHECK IN `('pending','in_transit','delivered')`, default `'pending'`      |
| `address`       | `text`       | NULLABLE — optional free-text delivery address                                      |
| `carrier`       | `text`       | NULLABLE — optional carrier name                                                    |
| `tracking_code` | `text`       | NULLABLE — optional tracking identifier                                             |
| `notes`         | `text`       | NULLABLE — optional free-text notes                                                 |
| `created_at`    | `timestamptz`| NOT NULL, default `now()`                                                           |
| `updated_at`    | `timestamptz`| NOT NULL, managed by `set_updated_at` trigger                                       |

The UNIQUE constraint on `invoice_id` enforces the one-dispatch-per-invoice rule at the database level.

---

## Requirements

### Requirement: Create Dispatch

The system MUST allow an authenticated user to create a dispatch from an issued invoice. The invoice selector MUST include ONLY invoices whose `status = 'issued'` AND that do NOT yet have a row in `dispatches` (i.e., `invoice_id` is not referenced by any existing dispatch). No other invoice status (e.g., `cancelled`) SHALL appear in the selector.

On submission, the system MUST insert one row into `dispatches` with:
- `code` assigned as `D-{current_year}-{zero-padded 4-digit sequence}` (per-year count, same algorithm as invoices).
- `invoice_id` set to the selected invoice.
- `status` set to `'pending'`.
- `dispatch_date` defaulting to today unless overridden.
- `address`, `carrier`, `tracking_code`, `notes` set from form input (all optional; NULL if blank).

Creating a dispatch MUST NOT modify any product's `stock_quantity`. The Server Action MUST be a single INSERT; no RPC is required because there is no multi-table atomic mutation.

If the INSERT violates the UNIQUE constraint on `invoice_id` (race condition), the system MUST surface a friendly Spanish error message to the user and MUST NOT crash. The user MUST remain on the create page with their inputs preserved.

#### Scenario: Happy path — dispatch created

- GIVEN the authenticated user is on the new dispatch page
- AND the invoice selector contains at least one eligible invoice (status `issued`, no existing dispatch)
- AND the user selects an invoice and optionally fills address/carrier/tracking_code/notes
- WHEN the user submits the form
- THEN one row MUST be inserted into `dispatches` with status `pending` and a unique `D-YYYY-NNNN` code
- AND NO product `stock_quantity` value MUST change
- AND the user MUST be redirected to the dispatch detail page for the newly created dispatch

#### Scenario: Invoice selector shows only eligible invoices

- GIVEN invoices exist with the following states:
  - Invoice A: status `issued`, no dispatch
  - Invoice B: status `issued`, dispatch already exists
  - Invoice C: status `cancelled`
- WHEN the new dispatch form loads the invoice selector
- THEN ONLY Invoice A MUST appear in the selector
- AND Invoice B and Invoice C MUST NOT appear

#### Scenario: Duplicate dispatch rejected (race condition)

- GIVEN Invoice A already has a dispatch (created by a concurrent request)
- WHEN the user submits the create form selecting Invoice A
- THEN the UNIQUE constraint violation MUST be caught by the Server Action
- AND the page MUST render a Spanish error message explaining that this invoice already has a dispatch
- AND no new row MUST be inserted into `dispatches`
- AND no product `stock_quantity` MUST change

#### Scenario: No eligible invoices available

- GIVEN all issued invoices already have a dispatch
- WHEN the new dispatch page loads
- THEN the invoice selector MUST be empty
- AND the form MUST display an informative Spanish message indicating there are no invoices available to dispatch

#### Scenario: Optional fields are nullable

- GIVEN the user submits the create form with only an invoice selected (all optional fields blank)
- WHEN the dispatch is created
- THEN `address`, `carrier`, `tracking_code`, and `notes` MUST be `NULL` in the persisted row
- AND the dispatch MUST be created successfully

---

### Requirement: No Stock Effect

Creating a dispatch or advancing its delivery status MUST NOT alter any value in `products.stock_quantity`. Stock decrement is the responsibility of the invoicing module (Module 5) and has already occurred. This is an explicit design invariant.

#### Scenario: Stock unchanged after dispatch creation

- GIVEN product "Laptop" has `stock_quantity = 3`
- AND an issued invoice references "Laptop" (qty 2)
- WHEN a dispatch is created for that invoice
- THEN `stock_quantity` for "Laptop" MUST remain `3`

#### Scenario: Stock unchanged after status advance

- GIVEN a dispatch is in status `in_transit`
- AND the referenced invoice line items include product "Monitor"
- WHEN the user advances the dispatch status to `delivered`
- THEN `stock_quantity` for "Monitor" MUST remain unchanged

---

### Requirement: Delivery Status Lifecycle

The delivery status MUST follow a strict forward-only progression: `pending → in_transit → delivered`.

The only allowed transitions are:

| Current status | Allowed next status |
| -------------- | ------------------- |
| `pending`      | `in_transit`        |
| `in_transit`   | `delivered`         |
| `delivered`    | _(terminal — no further transitions)_ |

The Server Action that advances the status MUST validate the transition before executing the UPDATE. If the requested next status is not the immediate next step (e.g., `pending → delivered`), or if the dispatch is already `delivered`, the Server Action MUST reject the request and return a Spanish error message. The UPDATE MUST NOT be executed.

The UI MUST offer only the single valid next status as an action button (e.g., "Marcar en tránsito" when `pending`, "Marcar entregado" when `in_transit`). When the dispatch is `delivered`, no advance control SHALL be rendered — the status is terminal.

#### Scenario: Advance from pending to in_transit

- GIVEN a dispatch exists with status `pending`
- WHEN the authenticated user activates the "Marcar en tránsito" control on the detail page
- THEN the Server Action MUST update `status` to `in_transit`
- AND `updated_at` MUST be refreshed by the `set_updated_at` trigger
- AND the detail page MUST re-render showing `in_transit`

#### Scenario: Advance from in_transit to delivered

- GIVEN a dispatch exists with status `in_transit`
- WHEN the authenticated user activates the "Marcar entregado" control
- THEN the Server Action MUST update `status` to `delivered`
- AND the detail page MUST re-render showing `delivered` with no further advance control

#### Scenario: Skip transition rejected (pending → delivered)

- GIVEN a dispatch exists with status `pending`
- WHEN the Server Action receives a request to set status to `delivered`
- THEN the Server Action MUST reject the transition
- AND MUST return a Spanish error message indicating the transition is invalid
- AND the `dispatches` row MUST retain `status = 'pending'`

#### Scenario: Backward transition rejected (in_transit → pending)

- GIVEN a dispatch exists with status `in_transit`
- WHEN the Server Action receives a request to set status to `pending`
- THEN the Server Action MUST reject the transition
- AND the `dispatches` row MUST retain `status = 'in_transit'`

#### Scenario: Terminal status — no advance control rendered

- GIVEN a dispatch exists with status `delivered`
- WHEN the authenticated user views the dispatch detail page
- THEN no status advance button or control MUST be rendered
- AND the status MUST be displayed as a read-only label

---

### Requirement: List Dispatches

The system MUST display a table of all dispatches ordered by `dispatch_date DESC` (most recent first). When two dispatches share the same date, ordering by `created_at DESC` MUST be used as a tiebreaker. An empty state MUST be displayed when no dispatches exist.

Required columns: dispatch code, invoice code, customer name, dispatch date, delivery status.

#### Scenario: Populated list ordered newest-first

- GIVEN dispatches D-2024-0002 (date 2024-06-15) and D-2024-0001 (date 2024-06-10) exist
- WHEN the authenticated user navigates to `/dispatch`
- THEN D-2024-0002 MUST appear before D-2024-0001

#### Scenario: Empty state

- GIVEN no dispatches exist
- WHEN the list page renders
- THEN an empty-state message MUST be displayed in Spanish
- AND no table rows MUST be rendered

#### Scenario: Customer name visible in list

- GIVEN a dispatch references an invoice belonging to customer "Empresa XYZ"
- WHEN the list renders
- THEN "Empresa XYZ" MUST appear in the customer column for that row

---

### Requirement: View Dispatch Detail

The dispatch detail page MUST display:

1. **Dispatch header**: code, status (as a styled badge), dispatch date, address, carrier, tracking_code, notes.
2. **Source invoice summary**: invoice code, customer name, invoice total.
3. **Invoice line items**: product name, quantity, unit_price, line subtotal — read from `invoice_items` joined to `products`.
4. **Status advance control**: a single action button showing the next valid status label (see Delivery Status Lifecycle). MUST NOT render when status is `delivered`.

All monetary values MUST be displayed in the same format used by the invoicing module (e.g., `S/ 1,234.56`).

#### Scenario: Detail page renders all sections

- GIVEN dispatch D-2024-0001 is `in_transit`, linked to invoice F-2024-0003 for customer "Bodega Norte", with 2 line items
- WHEN the authenticated user navigates to `/dispatch/[id]`
- THEN the dispatch header section MUST display code, status, date, and any optional metadata that is non-null
- AND the invoice summary MUST show F-2024-0003, "Bodega Norte", and the correct total
- AND the line items table MUST show both products with correct quantity and pricing
- AND a single "Marcar entregado" button MUST be rendered

#### Scenario: Null optional fields not shown as errors

- GIVEN a dispatch was created without address, carrier, tracking_code, or notes
- WHEN the detail page renders
- THEN null optional fields MUST be omitted or shown as "—" (em dash) rather than displaying `null` or crashing

#### Scenario: Detail page for delivered dispatch has no advance control

- GIVEN a dispatch with status `delivered`
- WHEN the detail page renders
- THEN no advance control button MUST be visible
- AND the status badge MUST indicate `delivered`

---

### Requirement: Access Control (RLS + Route Guard)

All dispatch operations (list, create, detail, advance status) MUST require an authenticated session. Supabase RLS on the `dispatches` table MUST permit SELECT, INSERT, and UPDATE ONLY to the `authenticated` role.

RLS policy names MUST follow the established project naming convention (matching the pattern used by `invoices` and other existing tables).

The `proxy.ts` middleware route guard already covers all `/dispatch/*` routes by virtue of the existing catch-all for `(app)` routes. No additional middleware rule is required — this MUST be verified, not assumed.

#### Scenario: Unauthenticated access to list redirected

- GIVEN a user has no valid Supabase session
- WHEN they navigate to `/dispatch`
- THEN `proxy.ts` middleware MUST redirect them to `/login`

#### Scenario: Unauthenticated access to create redirected

- GIVEN a user has no valid session
- WHEN they navigate to `/dispatch/new`
- THEN `proxy.ts` middleware MUST redirect them to `/login`

#### Scenario: RLS blocks anon role on dispatches

- GIVEN an HTTP request uses the Supabase `anon` role (no auth token)
- WHEN it attempts SELECT, INSERT, or UPDATE on `public.dispatches`
- THEN Supabase RLS MUST deny the operation and return a permission error
- AND no dispatch data MUST be returned or mutated

---

## Invariants

The following invariants MUST hold at all times and are not relaxed by any scenario:

1. **One dispatch per invoice**: `dispatches.invoice_id` is UNIQUE. No invoice SHALL have more than one dispatch row.
2. **Eligible invoice only**: A dispatch MAY only be created from an invoice with `status = 'issued'`.
3. **Forward-only lifecycle**: `status` transitions MUST be `pending → in_transit → delivered`. No other path is valid.
4. **No stock effect**: Dispatch operations MUST NOT touch `products.stock_quantity` under any circumstance.
5. **Terminal delivered**: A dispatch with `status = 'delivered'` MUST NOT be advanced further or reversed.
6. **No cancellation**: There is no cancelled status for dispatches. Cancellation is out of scope.
