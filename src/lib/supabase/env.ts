/**
 * Fail-fast environment accessor for Supabase configuration.
 *
 * Uses getter functions so the error is thrown when the value is first READ
 * (i.e., at actual Supabase client construction) rather than at module import
 * time. This keeps `next build` working even when env vars are not set in the
 * build environment — the error will surface the moment a real request tries
 * to create a Supabase client without credentials.
 */

function requireEnv(name: string): string {
  const value = process.env[name]
  if (!value || value.trim() === '') {
    throw new Error(
      `[Supabase] Missing required environment variable: "${name}". ` +
        `Set it in .env.local (local dev) or in your deployment platform's ` +
        `environment configuration. See .env.example for reference.`
    )
  }
  return value
}

/** Supabase project URL (NEXT_PUBLIC_SUPABASE_URL). */
export function getSupabaseUrl(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_URL')
}

/** Supabase anon key (NEXT_PUBLIC_SUPABASE_ANON_KEY). */
export function getSupabaseAnonKey(): string {
  return requireEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY')
}
