# Proposal: Maestro de Productos (Module 2)

## Intent

Module 2 is the data backbone of the commercial system. The brief requires registro, edición y listado de productos. Every downstream module depends on products existing first: Orden de Compra references product lines, and Ingreso de Mercadería mutates each product's `stock_quantity`. Priority-2 in the 48h window — without a products master, modules 3+ have no entity to operate on.

## Scope

### In Scope
- `products` table in Supabase (Postgres) with authenticated-only RLS (read/insert/update).
- Create product: form (react-hook-form + zod) with inline + toast feedback.
- Edit product: same form, pre-filled; updates via Server Action.
- List products: shadcn `table` view with basic search/filter by name or SKU.
- Soft delete: `is_active` toggle (disable), never hard delete.
- Unique SKU enforced at DB level with a friendly conflict error.

### Out of Scope (Non-goals this iteration)
- Hard delete (data integrity — products may be referenced by future orders/invoices).
- Bulk import / CSV upload and image upload.
- Categories as a separate CRUD entity (category is plain text here).
- RBAC / per-user ownership (shared master, consistent with login non-goals).
- Stock mutation logic (owned by Ingreso de Mercadería; products only defines the column).
- Pagination (stretch — note only).

## Capabilities

### New Capabilities
- `products-master`: product create, edit, list, search, and soft-delete over an authenticated, RLS-gated `products` table.

### Modified Capabilities
- None.

## Approach

Mirror the established feature-modular pattern under `src/features/products/`: `schema.ts` (zod), `actions.ts` (Server Actions for create/update/toggle), `queries.ts` (RLS-scoped reads via `createClient()`), and `components/`. Mutations run as Server Actions; reads use the server Supabase client. The list lives in `(app)/products`, protected by the existing layout guard. An additive migration in `supabase/migrations/` creates the table, unique SKU constraint, `updated_at` trigger, and RLS policies (`authenticated` role only).

### Proposed Data Model (`products`) — field rationale
| Field | Type | Rationale |
|-------|------|-----------|
| `id` | uuid PK (default gen) | Stable opaque key for FKs from OC/Ingreso. |
| `sku` | text, UNIQUE NOT NULL | Business identifier; uniqueness prevents duplicate catalog entries. |
| `name` | text NOT NULL | Display/search field. |
| `description` | text NULL | Optional commercial detail. |
| `unit_price` | numeric(12,2) NOT NULL, >= 0 | Money with cents; CHECK forbids negatives. |
| `stock_quantity` | integer NOT NULL default 0, >= 0 | Defined here, mutated by Ingreso later. |
| `unit_of_measure` | text NOT NULL | Commercial necessity (un, kg, lt). |
| `category` | text NULL | Simple grouping without a separate entity. |
| `is_active` | boolean NOT NULL default true | Soft delete / enable-disable. |
| `created_at` / `updated_at` | timestamptz default now() | Auditing; `updated_at` via trigger. |

### Documented Assumptions
- The brief allows assumptions if documented; field set above targets a typical commercial master.
- RLS: any `authenticated` user may read/insert/update; no anon access, no ownership.
- Soft delete chosen over hard delete to protect referential integrity with future modules.
- Search is client-or-server filter by `name`/`sku`; pagination deferred as stretch.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `supabase/migrations/<ts>_products.sql` | New | Table, unique SKU, CHECKs, `updated_at` trigger, RLS policies |
| `src/features/products/` | New | `schema.ts`, `actions.ts`, `queries.ts`, `components/` |
| `src/app/(app)/products/page.tsx` | New | List route (guarded) |
| `src/app/(app)/products/new` + `[id]/edit` | New | Create / edit routes |
| `README.md` | Modified | Data model + decisions documented |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Unique SKU conflict surfaces as raw DB error | Med | Catch Postgres `23505`, map to friendly field error |
| Negative price/stock slips through | Low | zod validation + DB CHECK constraints (defense in depth) |
| RLS misconfig exposes data to anon | Low | Policies scoped to `authenticated` only; verify in tests |

## Rollback Plan

Additive migration only — no existing table altered. Roll back by `DROP TABLE products CASCADE` (or reverting the migration) and reverting the `src/features/products/` feature commit(s) plus the new `(app)/products` routes. No impact on Module 1 (auth) since nothing existing is modified.

## Dependencies

- Module 1 (login-supabase-auth) — `(app)` route guard and authenticated session must exist.
- Supabase project reachable with migrations applied.

## Success Criteria

- [ ] A new product persists and appears in the list.
- [ ] Editing a product updates its values.
- [ ] Duplicate SKU shows a clear, field-level error.
- [ ] Negative price/stock is rejected before submit and at DB level.
- [ ] Disabling a product hides/marks it without deleting the row.
- [ ] Anonymous (unauthenticated) access to products is denied by RLS.
