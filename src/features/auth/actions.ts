'use server'

import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { loginSchema, type LoginInput } from './schema'

// Safe, non-leaky message for any auth failure.
// Must not reveal whether the email exists in the system.
const GENERIC_AUTH_ERROR = 'Invalid email or password. Please try again.'
const GENERIC_SERVER_ERROR =
  'Something went wrong. Please try again in a moment.'

export type LoginResult = { ok: false; error: string }

/**
 * Login Server Action.
 *
 * Re-validates input server-side (trust boundary — client validation
 * is UX only). Maps all Supabase auth errors to safe generic messages.
 * Logs raw errors server-side without forwarding them to the client.
 */
export async function login(input: LoginInput): Promise<LoginResult | never> {
  // Trust-boundary re-validation
  const parsed = loginSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: GENERIC_AUTH_ERROR }
  }

  const supabase = await createClient()

  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  })

  if (error) {
    // Log the raw error server-side only — never forward to client
    console.error('[auth] signInWithPassword error:', error.message, error.code)

    // Classify error: invalid credentials vs. unexpected server/network error
    const isCredentialError =
      error.message.toLowerCase().includes('invalid login credentials') ||
      error.message.toLowerCase().includes('email not confirmed') ||
      error.status === 400 ||
      error.status === 401

    return {
      ok: false,
      error: isCredentialError ? GENERIC_AUTH_ERROR : GENERIC_SERVER_ERROR,
    }
  }

  // Success: redirect to the authenticated shell
  redirect('/')
}

/**
 * Logout Server Action.
 *
 * Signs out the current session and redirects to /login.
 * Session cookies are cleared by @supabase/ssr on signOut.
 */
export async function logout(): Promise<never> {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}
