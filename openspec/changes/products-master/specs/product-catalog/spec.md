# Product Catalog Specification

## Purpose

Defines the complete behavior of the Products Master module: creating, editing, listing, searching, soft-deleting, and access-controlling products. This spec is the behavioral contract for the `products` table and the `src/features/products/` feature slice.

## Scope

### In Scope
- Product creation form with inline validation and toast feedback.
- Product edit form (pre-filled) with the same validation rules.
- Product list view with table layout and name/SKU search.
- Soft delete (`is_active` toggle) — no hard delete.
- Unique SKU enforcement with a friendly conflict error.
- Authenticated-only access enforced by route guard AND Supabase RLS.

### Out of Scope
- Hard delete (preserves referential integrity for future OC/Facturación).
- Bulk import, CSV upload, image upload.
- Categories as a separate CRUD entity.
- RBAC / per-user ownership.
- Stock mutation (owned by Ingreso de Mercadería module).
- Pagination (stretch goal — not required this iteration).

---

## Requirements

### Requirement: Create Product

The system MUST persist a new product when all required fields pass validation. Required fields are `name`, `sku`, and `unit_price`. `stock_quantity` MUST default to `0` when omitted. `unit_price` and `stock_quantity` MUST be non-negative. `sku` MUST be unique across all products.

#### Scenario: Happy path — valid product created

- GIVEN the authenticated user is on the Create Product page
- WHEN they fill in `name`, `sku`, `unit_price` (≥ 0) and submit the form
- THEN the product MUST be persisted to the `products` table
- AND the user MUST be redirected to the product list
- AND the new product MUST appear in the list

#### Scenario: Missing required field

- GIVEN the authenticated user is on the Create Product page
- WHEN they submit the form with `name`, `sku`, or `unit_price` left empty
- THEN an inline validation error MUST appear adjacent to each missing field
- AND the form MUST NOT submit

#### Scenario: Negative unit_price

- GIVEN the authenticated user is on the Create Product page
- WHEN they enter a negative value for `unit_price` and submit
- THEN an inline validation error MUST appear (e.g. "Price must be 0 or greater")
- AND the form MUST NOT submit

#### Scenario: Duplicate SKU

- GIVEN a product with SKU `"PROD-001"` already exists in the database
- WHEN the user submits a new product with SKU `"PROD-001"`
- THEN the Server Action MUST catch Postgres error code `23505`
- AND a `sonner` toast MUST appear with a friendly message (e.g. "SKU already exists. Please use a unique code.")
- AND the product row MUST NOT be created

#### Scenario: stock_quantity defaults to 0

- GIVEN the authenticated user submits a valid product without specifying `stock_quantity`
- WHEN the product is persisted
- THEN `stock_quantity` MUST be `0` in the database

---

### Requirement: Edit Product

The system MUST allow updating an existing product's fields. The form MUST be pre-filled with current values. SKU uniqueness MUST still be enforced on save. If the product ID does not exist the system MUST handle the case gracefully.

#### Scenario: Happy path — product updated

- GIVEN the authenticated user is on the Edit Product page for an existing product
- WHEN they change one or more fields and submit the form
- THEN the product MUST be updated in the `products` table
- AND the user MUST be redirected to the product list
- AND the updated values MUST be reflected in the list

#### Scenario: Form pre-filled with current values

- GIVEN the authenticated user navigates to the Edit Product page for product ID `X`
- WHEN the page renders
- THEN each form field MUST be pre-populated with the current persisted values of product `X`

#### Scenario: Duplicate SKU on edit

- GIVEN a different product already holds SKU `"PROD-002"`
- WHEN the user changes the current product's SKU to `"PROD-002"` and submits
- THEN the Server Action MUST catch Postgres error code `23505`
- AND a `sonner` toast MUST appear with the same friendly message as on create
- AND the update MUST NOT be persisted

#### Scenario: Product not found

- GIVEN the user navigates to the edit route for a product ID that does not exist
- WHEN the server resolves the route
- THEN the page MUST display a not-found state (e.g. redirect to `/products` with a toast, or render a 404 UI)
- AND no unhandled exception SHALL reach the client

---

### Requirement: List Products

The system MUST display all active products in a table with columns: `sku`, `name`, `unit_price`, `stock_quantity`, and `status` (active/inactive). The list MUST support filtering by `name` or `sku`. An empty state MUST be shown when no products match.

#### Scenario: Populated list

- GIVEN at least one product with `is_active = true` exists
- WHEN the authenticated user navigates to `/products`
- THEN the product table MUST render with at least the columns: SKU, Name, Unit Price, Stock, Status
- AND each row MUST correspond to a product record

#### Scenario: Search by name

- GIVEN products with names "Laptop" and "Monitor" exist
- WHEN the user types "Lap" in the search input
- THEN only rows matching "Lap" in `name` MUST be shown
- AND "Monitor" MUST NOT appear in the filtered result

#### Scenario: Search by SKU

- GIVEN a product with SKU `"LAP-001"` exists
- WHEN the user types `"LAP"` in the search input
- THEN the row for `"LAP-001"` MUST appear in the filtered result

#### Scenario: Empty state

- GIVEN no products exist (or the search query matches none)
- WHEN the list renders
- THEN an empty-state message MUST be displayed (e.g. "No products found")
- AND the table MUST NOT show blank rows

---

### Requirement: Soft Delete / Disable Product

The system MUST allow toggling a product's `is_active` flag to disable it. Disabled products MUST NOT appear in the default active list view. The database row MUST NOT be hard-deleted, preserving referential integrity for future modules.

#### Scenario: Disable an active product

- GIVEN an active product (`is_active = true`) is visible in the list
- WHEN the authenticated user toggles the disable control for that product
- THEN `is_active` MUST be set to `false` in the `products` table
- AND the product MUST no longer appear in the default active-products view
- AND the row MUST still exist in the database

#### Scenario: Re-enable a disabled product

- GIVEN a product with `is_active = false` exists
- WHEN the authenticated user re-enables it (e.g. via an "inactive" filter view or a toggle)
- THEN `is_active` MUST be set to `true`
- AND the product MUST reappear in the default active-products view

#### Scenario: Hard delete is impossible via UI

- GIVEN any authenticated user is on the products pages
- WHEN they interact with any product action
- THEN no UI control SHALL trigger a `DELETE` database operation on the `products` table

---

### Requirement: Validation UX

Client-side validation MUST use react-hook-form wired to a zod schema. Inline errors MUST appear adjacent to the offending field. Server-side errors (e.g. duplicate SKU from Postgres) MUST be surfaced as `sonner` toast notifications. The submit button MUST be disabled while the form is in an invalid state.

#### Scenario: Inline error on invalid field

- GIVEN the user has touched a required field and left it empty
- WHEN they move focus away from the field
- THEN an inline error message MUST appear below that field
- AND the submit button MUST be disabled

#### Scenario: Server error toast on DB conflict

- GIVEN a form submission reaches the Server Action and Postgres returns error `23505`
- WHEN the Server Action returns the error to the client
- THEN a `sonner` toast MUST appear with a user-readable conflict message
- AND the form MUST remain visible with current values so the user can correct and resubmit

---

### Requirement: Access Control (RLS + Route Guard)

ALL product operations (list, create, edit, toggle) MUST require an authenticated session. Defense is two-layered: (1) the `(app)` route group layout guard redirects unauthenticated users to `/login`; (2) Supabase RLS policies on the `products` table restrict `SELECT`, `INSERT`, and `UPDATE` to the `authenticated` role. Unauthenticated access MUST be impossible at both layers.

#### Scenario: Unauthenticated access to product list is blocked by route guard

- GIVEN a user has no valid session cookie
- WHEN they navigate directly to `/products`
- THEN the middleware (`proxy.ts`) MUST redirect them to `/login` before the page renders
- AND the `(app)` layout MUST also redirect if the middleware is bypassed

#### Scenario: Unauthenticated direct DB access is blocked by RLS

- GIVEN an HTTP request reaches Supabase using the `anon` role (no authenticated session)
- WHEN it attempts a `SELECT`, `INSERT`, or `UPDATE` on the `products` table
- THEN Supabase RLS MUST deny the operation and return a permission error
- AND no product data SHALL be returned or mutated

#### Scenario: Authenticated user can perform all product operations

- GIVEN a user has a valid `authenticated` Supabase session
- WHEN they perform any product operation (list, create, edit, toggle `is_active`)
- THEN the RLS policy MUST permit the operation
- AND the operation MUST complete successfully (subject to business-rule constraints above)
