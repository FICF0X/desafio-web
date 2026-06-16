import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/features/auth/components/LoginForm'
import { LoginBackground } from '@/features/auth/components/LoginBackground'
import { ThemeToggle } from '@/components/theme-toggle'

export default async function LoginPage() {
  // If the user already has an active session, skip the login page
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/')
  }

  return (
    <>
      <LoginBackground />
      {/* Theme toggle — top-right corner */}
      <div className="absolute top-4 right-4 z-20">
        <ThemeToggle />
      </div>
      <main className="relative z-10 flex min-h-screen items-center justify-center p-4">
        <div className="flex w-full flex-col items-center gap-8">
          {/* App header */}
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-foreground drop-shadow-lg">
              Desafío Web
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Gestión comercial inteligente
            </p>
          </div>

          {/* Glassmorphism card wrapping the login form */}
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card/70 shadow-2xl backdrop-blur-md">
            <LoginForm />
          </div>
        </div>
      </main>
    </>
  )
}
