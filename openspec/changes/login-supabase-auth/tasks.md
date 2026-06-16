# Tasks: login-supabase-auth

Change: `login-supabase-auth` · Project: `msvc-evaluacion-t1`
Generated from: `spec.md` (id 85) + `design.md` (id 86)

Legend:
- `[CODE]` — pure code, no Supabase credentials required to write
- `[CREDS]` — requires real Supabase credentials / live project to execute or verify
- `[DB]` — Supabase schema / DB change (seed / migration artifact)
- `[HIGH CARE]` — security-critical; must be reviewed before merge

Tasks are grouped by phase and numbered hierarchically. Sequential dependencies are noted
inline. Tasks within the same phase that share no dependency can be done in parallel.

---

## Phase 1 — Foundation (no Supabase calls, pure code)

These tasks have no sequential dependency on each other and can be authored in parallel.

### 1.1 Env accessor / fail-fast module `[CODE]`

**Spec:** ADR-6 (fail-fast env validation) · Design §8
**File:** `src/lib/supabase/env.ts` (new)

- [x] Create `src/lib/supabase/env.ts` that reads `NEXT_PUBLIC_SUPABASE_URL` and
      `NEXT_PUBLIC_SUPABASE_ANON_KEY` from `process.env`.
- [x] Throw a clear, actionable error at first import if either value is missing or empty:
      `"Missing env var: NEXT_PUBLIC_SUPABASE_URL — set it in .env.local"`.
      NOTE: implemented as lazy getters (not module-scope constants) so build passes without env vars.
- [x] Export the validated values as typed getter functions so downstream modules import from here
      instead of using bare `process.env`.
- [ ] Create `.env.example` at repo root documenting both keys with placeholder values and
      a comment pointing to Supabase dashboard → Settings → API.
      NOTE: blocked — shell tool denied writes to dotfiles at project root. Create manually.

**Verification (manual):** rename `.env.local` → `.env.local.bak`, start `next dev`, confirm
the error message appears immediately in the terminal instead of a cryptic auth failure.

---

### 1.2 Zod schema `[CODE]`

**Spec:** Requirement — Login Form Validation (all four scenarios)
**File:** `src/features/auth/schema.ts` (new)

- [x] Create `src/features/auth/` directory (remove `.gitkeep` from `src/features/`).
- [x] Write `loginSchema` with two fields:
  - `email`: `z.string().email("Invalid email format")`
  - `password`: `z.string().min(8, "Password must be at least 8 characters")`
- [x] Export `LoginInput` type inferred via `z.infer<typeof loginSchema>`.
- [x] No runtime dependencies beyond `zod` (already installed).

**Verification (manual):** import the schema in a temporary test file or the browser console,
call `loginSchema.safeParse(...)` with valid and invalid inputs, confirm messages match spec
scenarios.

---

## Phase 2 — Server Actions `[CODE]` + `[CREDS]` to execute

Depends on: Phase 1 (schema must exist for re-validation in actions).

### 2.1 `login` Server Action `[CODE]`

**Spec:** Requirement — Successful Login; Requirement — Failed Login — Error UX; ADR-5
**File:** `src/features/auth/actions.ts` (new)

- [x] Add `'use server'` directive at the top of the file.
- [x] Import `loginSchema` from `./schema` and `createClient` from `@/lib/supabase/server`.
- [x] Implement `login(input: LoginInput): Promise<{ ok: false; error: string } | never>`:
  - Re-validate `input` with `loginSchema.safeParse`; return `{ ok: false, error: "Invalid input" }`
    if parse fails (trust boundary — do not trust client).
  - Call `supabase.auth.signInWithPassword({ email, password })`.
  - On auth error: classify — if error code indicates invalid credentials, return
    `{ ok: false, error: "Invalid email or password. Please try again." }`. Any other error
    returns `{ ok: false, error: "Something went wrong. Please try again." }`. Log the raw
    Supabase error server-side (`console.error`) but do NOT forward it to the client.
  - On success: call `redirect('/')` (from `next/navigation`). No return value.
- [x] The function signature MUST use `LoginInput` so TypeScript enforces the shape at call
      sites.

`[CREDS]` **Verification:** with a live Supabase project, submit correct credentials → verify
redirect; submit wrong credentials → verify typed error object is returned.

---

### 2.2 `logout` Server Action `[CODE]`

**Spec:** Requirement — Logout (both scenarios)
**File:** `src/features/auth/actions.ts` (same file as 2.1)

- [x] Add `logout(): Promise<never>` to `actions.ts`:
  - Call `supabase.auth.signOut()`.
  - Call `redirect('/login')` (from `next/navigation`).
- [x] No parameters; no return value other than the redirect.

`[CREDS]` **Verification:** while logged in, call the action → confirm session cookie is
cleared and browser lands on `/login`; navigating back to `/` must redirect again.

---

## Phase 3 — Route Structure `[CODE]`

Depends on: Phase 1. Can run in parallel with Phase 2.

### 3.1 `(auth)` route group — login page `[CODE]`

**Spec:** Requirement — Login Form Validation; ADR-3
**Files:**
- `src/app/(auth)/login/page.tsx` (new)

- [x] Create directory `src/app/(auth)/login/`.
- [x] `page.tsx` is a Server Component (no `'use client'`).
- [x] Import and render `<LoginForm />` from `@/features/auth/components/LoginForm`.
- [x] Optional guard (recommended): call `createClient()` + `supabase.auth.getUser()`; if a
      user is already authenticated, call `redirect('/')` to avoid showing login to authed users.
- [x] Move the current `src/app/page.tsx` and `src/app/layout.tsx` content is NOT touched
      here — that's Phase 4.

---

### 3.2 `(app)` route group — protected layout `[CODE]` `[HIGH CARE]`

**Spec:** Requirement — Route Protection — Server-Side Guard; Requirement — Logout; ADR-2; ADR-3
**Files:**
- `src/app/(app)/layout.tsx` (new)
- `src/app/(app)/page.tsx` (new, replaces the current root `page.tsx` in effect)

- [x] Create directory `src/app/(app)/`.
- [x] `layout.tsx` is a Server Component:
  - Import `createClient` from `@/lib/supabase/server`.
  - Call `const { data: { user } } = await supabase.auth.getUser()`.
  - If `!user`, call `redirect('/login')`.
  - Render a minimal authenticated shell: header with user email (`user.email`) and a logout
    form `<form action={logout}><button type="submit">Sign out</button></form>`.
  - Render `{children}` below the header.
- [x] `page.tsx` is a Server Component:
  - Display a landing placeholder — e.g. a heading confirming login succeeded and cards for
    future modules. Can be adapted from the existing `src/app/page.tsx` content.
- [x] The existing `src/app/page.tsx` MUST be replaced / deleted (or moved here) so `/` is
      served by `(app)/page.tsx` through the protected layout. Confirm no duplicate `page.tsx`
      files exist at the same route segment.

`[HIGH CARE]` The `getUser()` guard here is Layer 2 protection. If it is missing or returns
before the redirect, protected content could render. Review carefully.

---

## Phase 4 — Middleware Redirect `[CODE]` `[HIGH CARE]`

Depends on: Phase 3 (route groups must exist so redirect targets are valid).

### 4.1 Add unauthenticated redirect to `updateSession` `[CODE]` `[HIGH CARE]`

**Spec:** Requirement — Route Protection — Middleware Layer; Design §2 (Modified — proxy.ts)
**File:** `src/lib/supabase/middleware.ts` (modify existing)

- [x] After the `await supabase.auth.getUser()` call, add the redirect block — did NOT add
      code between `createServerClient` and `getUser()`.
- [x] Define the public path allowlist: `['/login']`. Asset paths are already excluded by
      the matcher in `proxy.ts`, but `/login` must be explicitly allowed here to prevent
      redirect loops.
- [x] Implemented cookie-preserving redirect: builds NextResponse.redirect then copies all
      cookies from supabaseResponse onto the redirect response via `supabaseResponse.cookies.getAll().forEach(c => redirectResponse.cookies.set(c))`.
      NOTE: used cookie-copy approach instead of `{ headers: supabaseResponse.headers }` —
      the cookie-copy approach is more explicit and correct per @supabase/ssr guidance.
- [x] The existing final `return supabaseResponse` remains as authenticated pass-through.
- [x] Did NOT remove or reorder the `supabaseResponse` reassignment inside `setAll`.

`[HIGH CARE]` Critical invariants to verify:
1. Navigating to `/login` when unauthenticated → page loads (no redirect loop).
2. Navigating to `/` when unauthenticated → redirects to `/login`.
3. After login, navigating to `/` → page loads (cookies are present and valid).
4. The redirect response carries the `Set-Cookie` headers from `supabaseResponse` — inspect
   network tab if in doubt.

`[CREDS]` Steps 2, 3, and 4 require a live Supabase session to execute.

---

## Phase 5 — LoginForm Client Component `[CODE]`

Depends on: Phase 1 (schema), Phase 2 (actions must be importable). Can start once 1.2 and
2.1 are complete.

### 5.1 `LoginForm` component `[CODE]`

**Spec:** Requirement — Login Form Validation (all scenarios); Requirement — Failed Login — Error UX
**File:** `src/features/auth/components/LoginForm.tsx` (new)

- [x] Create `src/features/auth/components/` directory.
- [x] Add `'use client'` directive.
- [x] Import all required modules (useForm, zodResolver, schema, actions, shadcn ui, sonner).
- [x] Wire `useForm<LoginInput>` with `resolver: zodResolver(loginSchema)`.
- [x] The submit handler calls `login(data)`; if `{ ok: false, error }` → `toast.error(error)`.
- [x] Render structure inside a `<Card>` with email + password fields, inline error paragraphs.
- [x] The `Button` is disabled while `formState.isSubmitting` is true.

**Verification (manual):**
- Submit with empty fields → inline errors appear on both fields.
- Submit with invalid email → inline error below email field.
- Submit with password < 8 chars → inline error below password field.
- Submit with valid inputs → button disables, action fires.

---

## Phase 6 — First-Admin Provisioning `[DB]` `[CREDS]`

Can be authored in parallel with all other phases (it is an independent artifact).

### 6.1 `supabase/seed.sql` — admin user insert `[DB]` `[CREDS]`

**Spec:** Requirement — First-Admin Provisioning (both scenarios); Design §6 (ADR-4)
**File:** `supabase/seed.sql` (new)

`[DB]` **This task inserts directly into the `auth.users` table. Only run in a
local Supabase dev instance or a designated staging project. NEVER run against production.**

- [x] Create `supabase/seed.sql`.
- [x] Insert one confirmed admin user into `auth.users` with all required fields:
      email_confirmed_at=NOW(), encrypted_password=crypt/gen_salt, ON CONFLICT DO NOTHING.
- [x] Prominent SQL comment at top: "DEVELOPMENT SEED — change credentials before any non-local deployment".
- [ ] Update `README.md` with seed instructions and default credentials — deferred to user
      (README update is documentation, not blocking build/runtime).

`[CREDS]` **Verification:** run `supabase db reset` locally (requires `supabase` CLI and
local Docker). Then run `next dev`, navigate to `/login`, enter `admin@example.com` /
`ChangeMe2024!`, confirm redirect to `/`.

---

## Phase 7 — Integration Wire-up & Cleanup `[CODE]`

Depends on: Phases 3, 4, 5 complete. Run last to confirm everything composes correctly.

### 7.1 Update existing infra clients to use the env accessor `[CODE]`

**File:** `src/lib/supabase/client.ts`, `src/lib/supabase/server.ts`, `src/lib/supabase/middleware.ts`

- [x] Replace raw `process.env.NEXT_PUBLIC_SUPABASE_URL!` and
      `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!` with getter functions from
      `@/lib/supabase/env`. This removes the `!` non-null assertions and activates the
      fail-fast behavior from task 1.1.
- [x] Confirmed TypeScript compiles — `npm run build` passes with zero errors.

---

### 7.2 Remove or relocate the old root `page.tsx` `[CODE]`

**Files:** `src/app/page.tsx` (delete or verify superseded)

- [x] Verified that `src/app/(app)/page.tsx` is the page served at `/` (build confirms `ƒ /`).
- [x] Deleted `src/app/page.tsx` — no duplicate route conflict.
- [x] Confirmed `src/app/layout.tsx` (root layout with `<Toaster />`) remains in place.

---

### 7.3 Manual end-to-end verification checklist `[CREDS]`

No Vitest is installed (noted in design §9). Verify all spec scenarios by clicking through:

- [ ] **Login Form Validation**
  - Submit with empty email + empty password → two inline errors appear.
  - Enter `not-an-email` in email field → inline error "Invalid email format".
  - Enter password `abc123` (7 chars) → inline error "Password must be at least 8 characters".
  - Enter valid email + valid password → no inline errors, button is active.

- [ ] **Successful Login**
  - Enter seed admin credentials → redirect to `/` (authenticated shell renders).
  - Open a new tab, navigate to `/dashboard` or any `(app)/` route → access granted without re-login.

- [ ] **Failed Login — Error UX**
  - Enter valid email + wrong password → `sonner` toast "Invalid email or password. Please try again."
  - Enter non-existent email + any password → same generic toast (no distinction).
  - Simulate network error if possible (e.g. wrong Supabase URL in env) → toast "Something went wrong."

- [ ] **Route Protection — Middleware**
  - While logged out, navigate directly to `/` → redirected to `/login`.
  - After login, navigate to `/` → access granted.

- [ ] **Route Protection — Server-Side Guard**
  - (Hard to test in isolation without bypassing middleware; confirm by disabling the middleware
    redirect block temporarily and verifying the layout guard still redirects.)

- [ ] **Logout**
  - Click "Sign out" → redirected to `/login`.
  - Navigate back to `/` (browser back or direct URL) → redirected to `/login` again.

---

## Dependency Graph (sequential requirements)

```
1.1 (env accessor) ──┐
                     ├──► 2.1 (login action) ──┐
1.2 (schema) ────────┤                          ├──► 5.1 (LoginForm) ──► 7.x (wire-up)
                     └──► 2.2 (logout action) ──┘         ▲
                                                           │
3.1 ((auth)/login page) ──────────────────────────────────┘
3.2 ((app)/layout + page) ──► 4.1 (middleware redirect)

6.1 (seed.sql) ── independent, parallel with all
```

Phases 1–3 can be written (code) without live Supabase credentials. Phase 4, 6, and 7.3
require credentials to verify; they can be coded first and verified together.

---

## Review Workload Forecast

| Metric | Estimate |
|--------|----------|
| New files | 8 (`env.ts`, `schema.ts`, `actions.ts`, `LoginForm.tsx`, `(auth)/login/page.tsx`, `(app)/layout.tsx`, `(app)/page.tsx`, `seed.sql`) |
| Modified files | 3 (`middleware.ts`, `client.ts`, `server.ts`) + `README.md` + `.env.example` |
| Estimated changed lines | ~250–300 (no large files; most files are 30–60 lines each) |
| 400-line budget risk | Low |
| Chained PRs recommended | No — fits comfortably in a single PR |
| High-care tasks | 2 (middleware redirect 4.1; protected layout guard 3.2) |
| DB/schema tasks | 1 (seed.sql — flag for reviewer awareness) |
| Decision needed before apply | No |

All tasks are completable in a single focused session. The two `[HIGH CARE]` items (middleware
and layout guard) should be the last things reviewed before merge.
