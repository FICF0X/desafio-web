# Tasks: Maestro de Productos (products-master)

## Review Workload Forecast

| Field | Value |
|-------|-------|
| Estimated changed lines | 550–700 |
| 400-line budget risk | High |
| Chained PRs recommended | Yes |
| Suggested split | PR 1: DB + feature module (types/schema/queries/actions) → PR 2: UI components + routes + nav |
| Delivery strategy | ask-on-risk |
| Chain strategy | pending |

Decision needed before apply: Yes
Chained PRs recommended: Yes
Chain strategy: pending
400-line budget risk: High

### Suggested Work Units

| Unit | Goal | Likely PR | Notes |
|------|------|-----------|-------|
| 1 | DB migration + feature module (types, schema, queries, actions) | PR 1 | [DB] requires live Supabase to validate; pure [CODE] is buildable offline |
| 2 | UI components + route pages + nav link | PR 2 | Depends on PR 1 types/schema/actions; no DB call needed to build |

---

## Phase 1: Database & Foundation [DB]

- [x] 1.1 [DB] Create `supabase/migrations/0001_products.sql`: `products` table with `uuid` PK, `sku unique`, `unit_price numeric(12,2) CHECK >= 0`, `stock_quantity integer DEFAULT 0 CHECK >= 0`, `is_active boolean DEFAULT true`, `created_at`/`updated_at`. Add `products_is_active_idx` index.
- [x] 1.2 [DB] Append `moddatetime` extension + `products_set_updated_at` trigger to the same migration file. Add plpgsql fallback comment if extension is unavailable. (Implemented as self-contained plpgsql trigger — no moddatetime extension dependency)
- [x] 1.3 [DB] Append `ALTER TABLE public.products ENABLE ROW LEVEL SECURITY` + three policies (`products_select_authenticated`, `products_insert_authenticated`, `products_update_authenticated`, all `TO authenticated`). No DELETE policy.
- [x] 1.4 [CODE] Create `src/features/products/types.ts`: hand-written `Product` type matching the table row shape exactly (id, sku, name, description, unit_price, stock_quantity, unit_of_measure, category, is_active, created_at, updated_at).

## Phase 2: Feature Module — Schema & Data Layer [CODE]

- [x] 2.1 [CODE] Create `src/features/products/schema.ts`: export `productSchema` (zod) and `ProductInput` inferred type. Fields: `sku` (min 1, max 64), `name` (min 1, max 200), `unit_price` (nonnegative, blank string now fails with "Unit price is required." — fixes W-01), `stock_quantity` (int nonnegative, default 0), optional `description`/`unit_of_measure`/`category`. (Used z.union+transform+pipe instead of z.coerce for zod v4 + @hookform/resolvers compatibility)
- [x] 2.2 [CODE] Create `src/features/products/queries.ts`: implement `listProducts(search?: string, showInactive?: boolean): Promise<Product[]>` — uses `createClient()`, orders by `name`, filters `is_active=true` only when `showInactive` is falsy (fixes C-01 verify finding), applies `.or('name.ilike.%q%,sku.ilike.%q%')` only when search is provided. Sanitizes search term to strip PostgREST metacharacters. Implement `getProduct(id: string): Promise<Product | null>`.
- [x] 2.3 [CODE] Create `src/features/products/actions.ts` (`'use server'`): define `ActionResult` type. Implement `createProduct(input: ProductInput)` — `productSchema.safeParse` → `createClient()` → insert → map `error.code === '23505'` to `{ ok: false, error: 'A product with this SKU already exists.', field: 'sku' }` → on success `revalidatePath('/products')` + return `{ ok: true, id }`.
- [x] 2.4 [CODE] Add `updateProduct(id: string, input: ProductInput)` to `actions.ts` — same flow as create but issues an update; same `23505` mapping; log unexpected errors server-side only.
- [x] 2.5 [CODE] Add `toggleProductActive(id: string, isActive: boolean)` to `actions.ts` — update `is_active` field; `revalidatePath('/products')`; return `ActionResult`.

## Phase 3: UI Components [CODE]

- [x] 3.1 [CODE] Create `src/features/products/components/product-form.tsx` (`'use client'`): RHF + `zodResolver(productSchema)`, shadcn `<Input>` / `<Label>` / `<Button>`, `mode: 'create' | 'edit'` prop, optional `initialValues: ProductInput`. On submit call `createProduct` or `updateProduct`; on `ok: false` show `sonner` toast and set field error on `sku` if `field === 'sku'`; on `ok: true` show `toast.success(...)` then `router.push('/products')` (fixes W-03). Uses `mode: 'onChange'` + `trigger()` on mount for edit mode so prefilled-valid form is immediately submittable (fixes W-02). Submit button disabled while form is invalid or submitting.
- [x] 3.2 [CODE] Create `src/features/products/components/products-table.tsx`: shadcn `<Table>` with columns SKU, Name, Unit Price, Stock, Status, Actions. Renders active/inactive badge. Toggle active button calls `toggleProductActive` (server action). Empty-state row when `rows.length === 0`.
- [x] 3.3 [CODE] Create `src/features/products/components/product-search.tsx` (`'use client'`): controlled `<Input>` that pushes `?q=` to the URL via `useRouter().replace` (no full navigation). Reads initial value from `searchParams.q`.

## Phase 4: Routes [CODE]

- [x] 4.1 [CODE] Create `src/app/(app)/products/page.tsx` (Server Component): read `searchParams.q` and `searchParams.show` (async, Next 16); when `show=inactive|all` pass `showInactive=true` to `listProducts`; render toggle button that switches between active-only and inactive views (fixes C-01 verify finding); render `<ProductSearch>`, "New Product" `<Button>` linking to `/products/new`, and `<ProductsTable rows={...}>`.
- [x] 4.2 [CODE] Create `src/app/(app)/products/new/page.tsx` (Server Component shell): render page title + `<ProductForm mode="create" />`.
- [x] 4.3 [CODE] Create `src/app/(app)/products/[id]/edit/page.tsx` (Server Component): call `getProduct(id)`. If `null`, call `notFound()`. Otherwise render `<ProductForm mode="edit" initialValues={...} />` with product id.

## Phase 5: Navigation & Optional Polish [CODE]

- [x] 5.1 [CODE] Added "Products" nav link to `src/app/(app)/layout.tsx` header. Also updated `src/app/(app)/page.tsx` dashboard: Productos card now links to `/products` and shows "Done" badge.

## Phase 6: Manual Verification [CREDS] / [CODE]

- [ ] 6.1 [DB][CREDS] Run `supabase/migrations/0001_products.sql` in the Supabase SQL editor. Confirm table appears in Table Editor, index exists, and RLS is enabled.
- [ ] 6.2 [CREDS] Sign in as an authenticated user. Navigate to `/products` — confirm empty state renders.
- [ ] 6.3 [CREDS] Click "New Product". Fill valid fields, submit. Confirm redirect to list and new row visible.
- [ ] 6.4 [CREDS] Attempt to create a second product with the same SKU. Confirm sonner toast "A product with this SKU already exists." appears and no row is created.
- [ ] 6.5 [CODE] Submit the new-product form with empty `name` or `sku`. Confirm inline validation errors appear and button stays disabled (no network call).
- [ ] 6.6 [CODE] Enter `unit_price = -1`. Confirm inline error "Price must be 0 or greater." before submit.
- [ ] 6.7 [CREDS] Click Edit on an existing product. Confirm form is pre-populated. Change a field, save. Confirm list reflects updated values.
- [ ] 6.8 [CREDS] Toggle "Disable" on an active product. Confirm it disappears from default active list. Confirm row still exists in Supabase Table Editor (`is_active = false`). Then click "Show inactive" to surface the row, click "Enable" to re-activate, confirm row reappears in active view (C-01 fix).
- [ ] 6.9 [CREDS] Log out and navigate directly to `/products`. Confirm redirect to `/login`.
- [ ] 6.10 [CREDS] Use the search input. Type partial name or SKU. Confirm filtered results. Clear input and confirm full list returns.
