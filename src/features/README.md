# Features

Each feature lives in its own folder under `src/features/`.

Convention per feature:
- `components/` — React components scoped to this feature
- `actions.ts` — Server Actions
- `schema.ts` — Zod validation schemas
- `queries.ts` — Data fetching logic (server-side or TanStack Query hooks)
