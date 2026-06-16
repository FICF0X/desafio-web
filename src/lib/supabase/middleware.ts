import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

import { getSupabaseUrl, getSupabaseAnonKey } from './env'

/**
 * Routes accessible without authentication.
 *
 * All other routes redirect to /login when no session is present.
 * Keep this list minimal — add only truly public paths.
 */
const PUBLIC_PATHS = ['/login']

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(p + '/')
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Do not add code between createServerClient and
  // supabase.auth.getUser(). A simple mistake could make it very hard to debug
  // issues with users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Layer 1 redirect: unauthenticated request to a protected path.
  //
  // COOKIE PRESERVATION: We must NOT use NextResponse.redirect() directly —
  // it would discard the refreshed session cookies that @supabase/ssr wrote
  // into supabaseResponse. Instead, we build the redirect response and then
  // copy every cookie from supabaseResponse onto it so that the refreshed
  // tokens are preserved across the redirect.
  if (!user && !isPublicPath(request.nextUrl.pathname)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'

    const redirectResponse = NextResponse.redirect(loginUrl)

    // Copy all cookies from supabaseResponse (which carries the refreshed
    // session tokens written by setAll above) onto the redirect response.
    supabaseResponse.cookies.getAll().forEach((cookie) => {
      redirectResponse.cookies.set(cookie)
    })

    return redirectResponse
  }

  // IMPORTANT: You *must* return the supabaseResponse object as-is when the
  // user is authenticated (or on a public path). Returning a different response
  // would drop the refreshed cookies and log the user out.
  return supabaseResponse
}
