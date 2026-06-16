import Link from 'next/link'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { logout } from '@/features/auth/actions'
import { Button } from '@/components/ui/button'

/**
 * Protected layout — Layer 2 auth guard (defense in depth).
 *
 * Layer 1: middleware (proxy.ts / updateSession) intercepts requests and
 * redirects unauthenticated users to /login before the request reaches here.
 *
 * Layer 2 (this file): calls getUser() server-side to confirm the session is
 * still valid. Protects against middleware matcher drift and TOCTOU issues.
 * If no user is returned, redirect to /login before any protected HTML renders.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b bg-card px-6 py-3">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <span className="text-sm font-medium text-foreground">
            Desafío Web
          </span>
          <nav className="flex items-center gap-4">
            <Link
              href="/products"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Productos
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground">{user.email}</span>
            <form action={logout}>
              <Button type="submit" variant="ghost" size="sm">
                Cerrar sesión
              </Button>
            </form>
          </div>
        </div>
      </header>
      <div className="flex-1">{children}</div>
    </div>
  )
}
