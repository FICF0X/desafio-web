# User Auth Specification

## Purpose

Defines the complete behavior of the authentication layer: login, session lifecycle,
route protection, logout, and first-admin provisioning. All other app features depend
on a known authenticated user produced by this module.

## Scope

### In Scope
- Email + password login form with validation.
- Supabase Auth sign-in and session persistence via `@supabase/ssr`.
- Route protection: proxy middleware + server-side guard (defense in depth).
- Logout and session teardown.
- First-admin provisioning (documented, not automated).

### Out of Scope
- Public self-registration.
- Password reset / email recovery.
- Social / OAuth providers and MFA.
- RBAC and per-table RLS data policies (deferred to data modules).

---

## Requirements

### Requirement: Login Form Validation

The login form MUST validate inputs client-side before submission using a zod schema
wired through react-hook-form. Inline validation errors MUST appear adjacent to the
offending field. Submission MUST be disabled while the form is invalid.

#### Scenario: Valid input passes validation

- GIVEN the user is on `/login`
- WHEN they enter a syntactically valid email and a non-empty password (≥ 8 chars)
- THEN inline validation errors MUST NOT be shown
- AND the form MUST allow submission

#### Scenario: Invalid email format

- GIVEN the user is on `/login`
- WHEN they enter a string that is not a valid email address in the email field
- THEN an inline error MUST appear below the email field (e.g. "Invalid email format")
- AND the form MUST NOT submit

#### Scenario: Empty password

- GIVEN the user is on `/login`
- WHEN they leave the password field blank and attempt to submit
- THEN an inline error MUST appear below the password field (e.g. "Password is required")
- AND the form MUST NOT submit

#### Scenario: Password below minimum length

- GIVEN the user is on `/login`
- WHEN they enter a password shorter than 8 characters
- THEN an inline error MUST appear (e.g. "Password must be at least 8 characters")
- AND the form MUST NOT submit

---

### Requirement: Successful Login

On valid credentials the system MUST authenticate the user via Supabase Auth, persist
the session via `@supabase/ssr` cookies, and redirect to the authenticated shell.

#### Scenario: Happy path login

- GIVEN the user is on `/login` and a matching account exists in Supabase Auth
- WHEN they submit valid email + password
- THEN Supabase Auth MUST return a session
- AND the session cookie MUST be set via `@supabase/ssr`
- AND the user MUST be redirected to `/` (or `/dashboard`)

#### Scenario: Concurrent access after login

- GIVEN the user has successfully logged in and a session cookie is set
- WHEN they navigate to any protected route
- THEN they MUST be granted access without re-authenticating

---

### Requirement: Failed Login — Error UX

Authentication failures MUST surface as a `sonner` toast with a clear, non-leaky
message. The error MUST NOT reveal whether the email address exists in the system.

#### Scenario: Wrong password

- GIVEN the user is on `/login`
- WHEN they submit a valid email with an incorrect password
- THEN a `sonner` toast MUST appear with a generic message (e.g. "Invalid credentials. Please try again.")
- AND the user MUST remain on `/login`
- AND the response MUST NOT indicate whether the email exists

#### Scenario: Non-existent account

- GIVEN the user submits an email that has no matching Supabase Auth account
- WHEN the Server Action resolves
- THEN a `sonner` toast MUST appear with the SAME generic message as a wrong-password failure
- AND no account-existence signal SHALL be included in the response

#### Scenario: Supabase / network error

- GIVEN the Supabase Auth endpoint is unreachable or returns an unexpected error
- WHEN the Server Action resolves
- THEN a `sonner` toast MUST appear with a fallback message (e.g. "Something went wrong. Please try again.")
- AND the error MUST be logged server-side without exposing stack traces to the client

---

### Requirement: Route Protection — Middleware Layer

`proxy.ts` (Next.js middleware) MUST intercept every request to app routes and redirect
unauthenticated requests to `/login`. This is the first defense layer; it MUST NOT be
the only one.

#### Scenario: Unauthenticated request to protected route

- GIVEN the user has no valid session cookie
- WHEN they navigate directly to any route under the authenticated shell (e.g. `/`, `/productos`)
- THEN `proxy.ts` MUST redirect the request to `/login` before the page renders

#### Scenario: Authenticated request passes middleware

- GIVEN the user has a valid session cookie refreshed by `proxy.ts`
- WHEN they navigate to a protected route
- THEN `proxy.ts` MUST allow the request to proceed to the layout

---

### Requirement: Route Protection — Server-Side Guard

The authenticated layout MUST call `getUser()` server-side and redirect to `/login` if
no user is returned. This is the second defense layer, providing defense in depth
against middleware bypass (e.g. misconfiguration, edge-case cookie race).

#### Scenario: Layout guard catches bypass

- GIVEN a request reaches the `(app)` layout with an invalid or missing session
  (middleware was bypassed or misconfigured)
- WHEN the layout calls `getUser()` via the Supabase server client
- THEN the layout MUST redirect to `/login` before rendering any protected content

#### Scenario: Valid session passes layout guard

- GIVEN `getUser()` returns a user object
- WHEN the layout renders
- THEN the authenticated shell MUST render and the user object MAY be passed to child components

---

### Requirement: Logout

The system MUST provide a logout mechanism that clears the Supabase session and
redirects the user to `/login`. Subsequent protected-route access MUST be blocked.

#### Scenario: Successful logout

- GIVEN the user is authenticated and triggers the logout action
- WHEN the logout Server Action executes
- THEN the Supabase session MUST be signed out
- AND the session cookie MUST be cleared
- AND the user MUST be redirected to `/login`

#### Scenario: Protected route after logout

- GIVEN the user has logged out
- WHEN they navigate directly to a previously accessible protected route
- THEN `proxy.ts` MUST redirect to `/login` (middleware guard fires)
- AND the server-side `getUser()` guard MUST also redirect if the request reaches the layout

---

### Requirement: First-Admin Provisioning

Because public self-registration is disabled, the first user MUST be provisioned out-
of-band. The provisioning method MUST be documented so any developer can reproduce it.

#### Scenario: Admin creates first user via dashboard

- GIVEN no users exist in the Supabase Auth project
- WHEN a developer opens the Supabase dashboard → Authentication → Users → Invite user
  (or runs the documented seed script)
- THEN a user account MUST be created with the provided email
- AND the developer MUST set or send a password before handing credentials to the operator

#### Scenario: Seed script alternative

- GIVEN `NEXT_PUBLIC_SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are set in `.env.local`
- WHEN the developer runs `node scripts/seed-admin.js`
- THEN a user MUST be created in Supabase Auth with the configured email + password
- AND the script MUST NOT be committed with real credentials

---

### Requirement: Supabase RLS Posture

Per-table RLS policies are out of scope for this iteration. However, the auth layer
MUST be implemented such that enabling RLS on data tables later requires no auth
changes. The Supabase session MUST be available server-side so future policies can
reference `auth.uid()`.

#### Scenario: RLS-ready session

- GIVEN the user is authenticated
- WHEN any server component or Server Action uses the Supabase server client
- THEN `auth.uid()` MUST resolve to the authenticated user's UUID in any future RLS policy
- AND no additional auth wiring SHALL be required when RLS is activated on data tables
