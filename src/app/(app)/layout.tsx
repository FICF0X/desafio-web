import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/features/shell/Sidebar'

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
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Slim topbar */}
        <header className="flex h-14 shrink-0 items-center border-b bg-card px-6">
          <span className="text-sm text-muted-foreground">{user.email}</span>
        </header>
        {/* Scrollable content */}
        <main className="flex-1 overflow-y-auto bg-background">
          {children}
        </main>
      </div>
    </div>
  )
}
