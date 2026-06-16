# Customers Specification

## Purpose

Minimal customer master: list and create customers for use in invoice selection. Mirrors the suppliers scope from the purchase-orders module.

## Scope

### In Scope
- Customer list page (`/customers`).
- Customer create form (`name` required; `doc_type`, `doc_number`, `email`, `phone` optional).
- Seeded sample customers in migration.
- Authenticated-only access via route guard AND Supabase RLS.

### Out of Scope
- Edit / soft-delete customer.
- Full CRM fields (address, credit limit, contacts).
- RBAC / per-user customer ownership.

---

## Requirements

### Requirement: Create Customer

The system MUST persist a new customer when `name` is provided. `name` MUST NOT be empty. Optional fields (`doc_type`, `doc_number`, `email`, `phone`) MAY be omitted. The system SHOULD validate `email` format when provided.

#### Scenario: Happy path — customer created

- GIVEN the authenticated user is on the Create Customer page
- WHEN they fill in `name` and submit the form
- THEN the customer MUST be persisted to the `customers` table
- AND the user MUST be redirected to the customer list
- AND the new customer MUST appear in the list

#### Scenario: Missing name

- GIVEN the authenticated user is on the Create Customer page
- WHEN they submit the form with `name` left empty
- THEN an inline validation error MUST appear on the `name` field
- AND the form MUST NOT submit

#### Scenario: Optional fields are truly optional

- GIVEN the authenticated user submits only `name`
- WHEN the record is persisted
- THEN the row MUST be saved with `doc_number`, `email`, `phone` as NULL
- AND no validation error SHALL appear for the omitted fields

---

### Requirement: List Customers

The system MUST display all customers in a table with columns: `name`, `doc_type`, `doc_number`, `email`. An empty state MUST be shown when no customers exist.

#### Scenario: Populated list

- GIVEN at least one customer exists
- WHEN the authenticated user navigates to `/customers`
- THEN the table MUST render all customer rows

#### Scenario: Empty state

- GIVEN no customers exist
- WHEN the list renders
- THEN an empty-state message MUST be displayed

---

### Requirement: Access Control (RLS + Route Guard)

ALL customer operations MUST require an authenticated session. Supabase RLS on `customers` MUST restrict `SELECT` and `INSERT` to the `authenticated` role.

#### Scenario: Unauthenticated access blocked

- GIVEN a user has no valid session
- WHEN they navigate to `/customers`
- THEN `proxy.ts` middleware MUST redirect them to `/login`

#### Scenario: Unauthenticated DB access blocked by RLS

- GIVEN an HTTP request uses the `anon` role
- WHEN it attempts `SELECT` or `INSERT` on `customers`
- THEN Supabase RLS MUST deny the operation and return a permission error
