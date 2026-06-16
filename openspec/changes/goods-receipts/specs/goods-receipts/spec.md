# Spec: goods-receipts

**Change:** goods-receipts (Module 4 — Ingreso de Mercadería)
**Capability:** goods-receipts
**RFC 2119 keywords apply throughout this document.**

---

## 1. Context and Invariants

This spec describes the delta introduced by Module 4.
All Module 2 and Module 3 invariants remain in force.

**Pre-existing invariants consumed by this module:**
- `products.stock_quantity` exists (Module 2).
- `purchase_orders.status` ENUM `pending | received | cancelled` exists (Module 3).
- `purchase_order_items` with `product_id` and `quantity` exists (Module 3).
- A PO created by Module 3 MUST have at least one item (Module 3 invariant — not re-enforced here).

---

## 2. Data Model (delta)

### 2.1 Table: `goods_receipts`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `code` | `text` | NOT NULL, UNIQUE — format `ING-YYYY-NNNN` |
| `purchase_order_id` | `uuid` | FK → `purchase_orders.id`, NOT NULL, UNIQUE |
| `receipt_date` | `date` | NOT NULL, default `current_date` |
| `notes` | `text` | nullable |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |
| `updated_at` | `timestamptz` | NOT NULL, default `now()` |

The `UNIQUE` constraint on `purchase_order_id` MUST be enforced at the database level.

### 2.2 Table: `goods_receipt_items`

| Column | Type | Constraints |
|---|---|---|
| `id` | `uuid` | PK, default `gen_random_uuid()` |
| `goods_receipt_id` | `uuid` | FK → `goods_receipts.id` ON DELETE CASCADE, NOT NULL |
| `product_id` | `uuid` | FK → `products.id`, NOT NULL |
| `quantity` | `integer` | NOT NULL, CHECK > 0 |
| `created_at` | `timestamptz` | NOT NULL, default `now()` |

### 2.3 RLS (Supabase)

- RLS MUST be enabled on both `goods_receipts` and `goods_receipt_items`.
- Policy: authenticated users MAY SELECT, INSERT on both tables.
- No UPDATE or DELETE policies are required (receipts are immutable once created).
- The `receive_purchase_order` RPC runs as SECURITY INVOKER; the calling authenticated user's RLS context applies. The authenticated role MUST therefore have INSERT on `goods_receipts` and `goods_receipt_items`, and UPDATE on `products` and `purchase_orders`.

### 2.4 RPC: `receive_purchase_order(p_purchase_order_id uuid, p_notes text)`

The function MUST execute as a single database transaction. It MUST:

1. Verify the target PO has `status = 'pending'`. If not, RAISE an exception with a descriptive message; the calling layer translates this to a user-visible Spanish message.
2. Generate `code` as `ING-{YYYY}-{NNNN}` where `YYYY` is the current year and `NNNN` is the zero-padded count of existing receipts in that year + 1.
3. Insert one row into `goods_receipts`.
4. Copy all rows from `purchase_order_items` where `purchase_order_id = p_purchase_order_id` into `goods_receipt_items` (same `product_id`, same `quantity`).
5. For each copied item, increment `products.stock_quantity` by the item's `quantity`.
6. Set `purchase_orders.status = 'received'` for the target PO.
7. Return the new `goods_receipts.id` and `code`.

If any step fails, the entire transaction MUST roll back. No partial state (stock incremented without status flipped, or receipt inserted without items) is permissible.

---

## 3. Requirements

### 3.1 Receive a Pending PO

**REQ-GR-01** — The system MUST allow an authenticated user to receive a pending PO in full through a "new receipt" flow.

**REQ-GR-02** — Upon confirmation, the system MUST invoke `receive_purchase_order` and produce exactly one `goods_receipts` row and N `goods_receipt_items` rows (one per `purchase_order_items` row for that PO).

**REQ-GR-03** — The generated receipt code MUST match the pattern `ING-{current year}-{zero-padded sequential number}`.

**REQ-GR-04** — `products.stock_quantity` MUST be incremented by the ordered quantity for every item in the PO. The increment is additive to whatever current stock exists.

**REQ-GR-05** — `purchase_orders.status` MUST be set to `'received'` upon successful receipt.

**REQ-GR-06** — All mutations in REQ-GR-02 through REQ-GR-05 MUST be atomic. Partial application is not permissible.

### 3.2 PO Receivability Guard

**REQ-GR-07** — Only POs with `status = 'pending'` MAY be received. The RPC MUST raise an exception for any other status.

**REQ-GR-08** — The new-receipt PO selector MUST only list POs with `status = 'pending'`. POs with `status = 'received'` or `status = 'cancelled'` MUST NOT appear.

**REQ-GR-09** — Attempting to receive a non-pending PO via the RPC MUST result in no data change (no stock increment, no receipt row, no status mutation).

### 3.3 One Receipt Per PO

**REQ-GR-10** — The `UNIQUE` constraint on `goods_receipts.purchase_order_id` MUST prevent more than one receipt per PO at the database level.

**REQ-GR-11** — When the uniqueness constraint or the pending-status check is violated, the UI MUST display a friendly, user-readable error message in Spanish explaining why the operation was rejected.

### 3.4 Stock Effect

**REQ-GR-12** — After a successful receive, the product list page MUST reflect updated `stock_quantity` values without requiring a manual refresh (next navigation to the page shows the new stock).

**REQ-GR-13** — If a product had `stock_quantity = 0` and the received PO item had `quantity = Q`, after receiving the product MUST show `stock_quantity = Q`.

### 3.5 List Goods Receipts

**REQ-GR-14** — A receipts list page MUST exist showing at minimum: receipt code, related PO code, receipt date.

**REQ-GR-15** — The list MUST be ordered most-recent first (by `receipt_date` DESC, then `created_at` DESC as tiebreaker).

**REQ-GR-16** — The list MUST be accessible only to authenticated users.

### 3.6 View Receipt Detail

**REQ-GR-17** — A receipt detail page MUST exist showing: receipt header (code, date, notes) and a table of items (product name, quantity received).

**REQ-GR-18** — The detail page MUST include a navigable link or reference to the source PO.

**REQ-GR-19** — The detail page MUST be accessible only to authenticated users.

### 3.7 Access Control

**REQ-GR-20** — All routes under the goods-receipts module MUST require an authenticated session. Unauthenticated requests MUST be redirected to the login page.

**REQ-GR-21** — Supabase RLS on `goods_receipts` and `goods_receipt_items` MUST restrict all data access to authenticated users. Unauthenticated reads and writes MUST be blocked at the database level.

---

## 4. Out of Scope

The following are explicitly excluded from this change and MUST NOT be implemented:

- Partial receipts (receiving less than the full ordered quantity).
- Multiple receipts per PO.
- Editing received quantities after the receipt is created.
- Reverting or cancelling a receipt (un-receive).
- Receiving POs with `status = 'cancelled'` or `status = 'received'`.
- A cancellation flow for purchase orders.
- The "Recibir mercadería" shortcut on the PO detail page (nice-to-have, not required).

---

## 5. Edge Cases

**EDGE-GR-01 — PO with zero items:** A PO with no `purchase_order_items` rows cannot exist in a correctly operating system (Module 3 requires at least one item). If such a PO were received, the RPC would insert a receipt header with no items and no stock change. This edge case is guarded by the Module 3 invariant and is not a failure mode this module needs to handle independently.

**EDGE-GR-02 — Concurrent receive attempts:** Two concurrent requests to receive the same PO will result in one succeeding and one failing due to the `UNIQUE` constraint on `purchase_order_id` or the `pending` status check. Only one receipt MUST ever be created. This is a low-risk scenario for the single-user demo context.

**EDGE-GR-03 — Negative or zero quantity items:** `goods_receipt_items.quantity` has a CHECK > 0 constraint. If `purchase_order_items` somehow contained invalid quantities, the RPC insert would fail and the entire transaction would roll back.

---

## 6. Acceptance Scenarios

### Scenario 1: Happy path — receive a pending PO

```
Given an authenticated user
  And a purchase order PO-001 with status "pending"
  And PO-001 has items: Product A qty 12, Product B qty 5
  And Product A has stock_quantity = 0
  And Product B has stock_quantity = 3

When the user navigates to New Receipt
  And selects PO-001 from the pending POs list
  And confirms the receipt

Then a goods_receipts row is created with code matching "ING-{year}-{NNNN}"
  And goods_receipt_items contains two rows: Product A qty 12, Product B qty 5
  And products.stock_quantity for Product A = 12
  And products.stock_quantity for Product B = 8
  And purchase_orders.status for PO-001 = "received"
  And PO-001 no longer appears in the pending POs selector
```

### Scenario 2: Attempt to receive an already-received PO

```
Given an authenticated user
  And a purchase order PO-002 with status "received"

When the user calls receive_purchase_order(PO-002)

Then the RPC raises an exception
  And no goods_receipt row is created
  And no stock_quantity is incremented
  And the UI displays a friendly Spanish error message
```

### Scenario 3: Attempt to receive a cancelled PO

```
Given an authenticated user
  And a purchase order PO-003 with status "cancelled"

When the user calls receive_purchase_order(PO-003)

Then the RPC raises an exception
  And no goods_receipt row is created
  And no stock_quantity is incremented
  And the UI displays a friendly Spanish error message
```

### Scenario 4: Pending PO selector excludes non-pending POs

```
Given purchase orders exist with statuses: pending (PO-010), received (PO-011), cancelled (PO-012)

When an authenticated user opens the New Receipt flow

Then the PO selector lists only PO-010
  And PO-011 and PO-012 are not listed
```

### Scenario 5: One receipt per PO enforced at DB level

```
Given a goods_receipt already exists for PO-005

When another goods_receipt insert is attempted with purchase_order_id = PO-005

Then the database rejects the insert with a UNIQUE constraint violation
  And no duplicate receipt exists
  And the UI displays a friendly Spanish error message
```

### Scenario 6: Atomicity — simulated partial failure

```
Given an authenticated user
  And a pending PO with valid items

When the RPC encounters any error after inserting the receipt header but before completing all items or stock updates

Then the entire transaction is rolled back
  And no goods_receipt row remains
  And no goods_receipt_items rows remain
  And stock_quantity values are unchanged
  And purchase_orders.status remains "pending"
```

### Scenario 7: Stock reflects received quantities in product list

```
Given Product X had stock_quantity = 0
  And a pending PO was received with Product X qty 12

When the user navigates to the product list

Then Product X shows stock_quantity = 12
```

### Scenario 8: Receipts list — ordering and content

```
Given three goods receipts with different receipt_dates

When an authenticated user navigates to the receipts list

Then receipts are ordered most-recent first
  And each row displays: receipt code, related PO code, receipt date
```

### Scenario 9: Receipt detail — header, items, PO link

```
Given a goods receipt GR-001 linked to PO-007
  And GR-001 has items: Product C qty 6

When an authenticated user navigates to the GR-001 detail page

Then the page displays the receipt code, receipt date, and notes
  And the items table shows Product C with quantity 6
  And a link to PO-007 is present and navigable
```

### Scenario 10: Unauthenticated access blocked

```
Given an unauthenticated session

When the user attempts to access any goods-receipts route

Then the user is redirected to the login page
  And no receipt data is exposed
```

### Scenario 11: RLS blocks unauthenticated DB reads

```
Given an unauthenticated Supabase session

When a SELECT is issued against goods_receipts or goods_receipt_items

Then RLS returns zero rows (no data exposed)
  And no error is thrown from the client perspective (empty result set)
```

---

## 7. Non-Requirements (explicit)

- The spec does not mandate UI component design, styling, or layout beyond functional presence of the data fields listed.
- The spec does not mandate pagination on the receipts list (nice-to-have).
- The spec does not mandate a supplier column on the receipts list (the PO code is sufficient to trace provenance).
- The ING code generation algorithm (count+1 per year) is an implementation detail of the RPC; the spec only mandates the `ING-YYYY-NNNN` format and uniqueness.
