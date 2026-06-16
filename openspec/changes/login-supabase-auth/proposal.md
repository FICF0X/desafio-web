# Proposal: Login de usuarios (Supabase Auth)

## Intent

Module 1 is the backbone entry point: no app feature is reachable without authentication. The brief requires "usuario y contraseña" with "validación básica de acceso". We deliver this as the secure foundation the remaining commercial-management modules (Productos, Orden de Compra, etc.) build on. Priority-1 in the 48h window because every later module depends on a known authenticated user and gated routes.

## Scope

### In Scope
- `/login` page: email + password form (react-hook-form + zod), inline + toast error states.
- Supabase Auth sign-in via Server Action; session persisted through existing `@supabase/ssr` clients.
- Route protection: unauthenticated requests to app routes redirect to `/login` (middleware in `proxy.ts` + server-side `getUser()` guard).
- Logout Server Action and a minimal authenticated shell/dashboard landing.
- Documented first-user (admin) provisioning strategy.

### Out of Scope (Non-goals this iteration)
- Public sign-up / self-registration (internal system — users provisioned by admin).
- Password reset / email recovery flow.
- Social / OAuth providers and MFA.
- Roles & permissions (RBAC) and per-table RLS data policies (arrive with data modules).

## Capabilities

### New Capabilities
- `user-auth`: email+password login, session lifecycle, route protection, logout.

### Modified Capabilities
- None.

## Approach

Use **Supabase Auth (email + password)** instead of custom auth — it satisfies "validación de acceso" with a hardened, audited implementation and zero credential-handling code of our own. Sign-in/logout run as **Server Actions**; the already-wired `proxy.ts` refreshes sessions on every request. A server-side `getUser()` check in the protected layout enforces access server-side (not just middleware). Validation via zod schema; invalid-credential and network errors surface as `sonner` toasts.

### Documented Assumptions
- No public signup: the first admin user is created via the **Supabase dashboard** (or a `seed` script), documented in README. Reasonable per an internal commercial system.
- Auth gates app access now; **per-table RLS** is deferred to data modules but the posture is noted so policies are not forgotten.
- A minimal post-login landing is enough; full dashboard is later work.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `src/features/auth/` | New | components/, `actions.ts` (login/logout), `schema.ts` (zod) |
| `src/app/login/page.tsx` | New | Login route |
| `src/app/(app)/layout.tsx` | New | `getUser()` server guard + landing shell |
| `src/proxy.ts` | Modified | Add redirect-to-`/login` for unauthenticated app routes |
| `README.md` | Modified | First-user provisioning + auth decisions |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Middleware-only protection bypassable | Med | Enforce server-side `getUser()` in protected layout too |
| Misconfigured Supabase env on Vercel | Med | Document required env vars; fail fast with clear error |
| Generic auth errors confuse users | Low | Map known cases to friendly toast messages |

## Rollback Plan

Feature is additive and isolated under `src/features/auth/` plus new routes. Revert by reverting the feature commit(s): remove `/login`, the `(app)` guard, and the `proxy.ts` redirect block. No schema migrations are introduced, so no DB rollback needed; Supabase Auth users created during testing can be deleted from the dashboard.

## Dependencies

- Supabase project with Auth enabled and `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` configured.
- At least one seeded admin user before first login.

## Success Criteria

- [ ] Valid credentials log in and land on the authenticated shell.
- [ ] Invalid credentials show a clear error and never enter the app.
- [ ] Direct navigation to a protected route while logged out redirects to `/login`.
- [ ] Logout clears the session and re-protects routes.
- [ ] First-user provisioning is documented in README.
