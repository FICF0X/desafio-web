# Architecture

## Stack

- **Framework**: Next.js 16 (App Router)
- **Database / Auth**: Supabase (PostgreSQL + GoTrue)
- **Styling**: Tailwind CSS + shadcn/ui
- **Forms**: react-hook-form + Zod
- **Server state**: TanStack Query (client-side fetching only)
- **Language**: TypeScript strict

## Folder Structure

```
src/
├── app/                  # Next.js App Router pages and layouts
├── components/ui/        # shadcn/ui primitives (auto-generated, do not edit)
├── features/             # Feature modules (see src/features/README.md)
│   └── <feature>/
│       ├── components/   # Feature-scoped React components
│       ├── actions.ts    # Server Actions
│       ├── schema.ts     # Zod validation schemas
│       └── queries.ts    # Data fetching (server or TanStack Query hooks)
├── lib/
│   └── supabase/
│       ├── client.ts     # Browser client (createBrowserClient)
│       ├── server.ts     # Server client (createServerClient + async cookies)
│       └── middleware.ts # Session refresh helper (updateSession)
├── proxy.ts              # Route-level session management (Next.js 16 proxy convention)
└── types/                # Shared TypeScript types
```

## Why NOT Full Hexagonal Architecture

This is a 48-hour challenge. Full hexagonal (ports/adapters, use-case layer, repository interfaces) would be correct for a production system but adds boilerplate that slows velocity here. Instead we use a **feature-modular** approach: each feature owns its components, actions, schemas, and queries — enough separation to refactor toward hexagonal later without a full rewrite.

## Server Actions vs TanStack Query

| Use case | Approach |
|---|---|
| Mutations (create, update, delete) | Server Actions in `actions.ts` |
| Server-rendered data (initial page load) | Direct Supabase call in Server Component |
| Client-side dynamic fetching / caching | TanStack Query + client Supabase |

## Supabase SSR Auth

Session management uses `@supabase/ssr`. The proxy (`src/proxy.ts`) calls `updateSession()` on every request to refresh the Supabase session cookie — this is the Next.js 16 equivalent of `middleware.ts`. Server Components use `createClient()` from `src/lib/supabase/server.ts` (async cookies). Client Components use `createClient()` from `src/lib/supabase/client.ts` (browser client).

## Database Migrations

Migrations live in `supabase/migrations/`. Apply via Supabase SQL editor or `supabase db push`. One file per feature increment, prefixed with a zero-padded index (`0001_`, `0002_`, etc.).
