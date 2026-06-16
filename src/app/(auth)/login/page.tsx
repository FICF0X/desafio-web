import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { LoginForm } from '@/features/auth/components/LoginForm'

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
    <main className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="flex w-full flex-col items-center gap-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight">Desafío Web</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Business management system
          </p>
        </div>
        <LoginForm />
      </div>
    </main>
  )
}
