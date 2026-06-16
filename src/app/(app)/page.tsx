import Link from 'next/link'

import { createClient } from '@/lib/supabase/server'
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

const modules = [
  {
    name: 'Login',
    description: 'Authentication and session management',
    status: 'done' as const,
  },
  {
    name: 'Productos',
    description: 'Product catalog management',
    status: 'done' as const,
    href: '/products',
  },
  {
    name: 'Orden de Compra',
    description: 'Purchase order creation and tracking',
    status: 'soon' as const,
  },
  {
    name: 'Ingreso de Mercadería',
    description: 'Goods receipt and inventory intake',
    status: 'soon' as const,
  },
  {
    name: 'Facturación',
    description: 'Invoicing and billing',
    status: 'soon' as const,
  },
  {
    name: 'Despacho',
    description: 'Dispatch and shipment management',
    status: 'soon' as const,
  },
]

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="mt-2 text-muted-foreground">
            Welcome back, <span className="font-medium">{user?.email}</span>
          </p>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => {
            const card = (
              <Card
                key={mod.name}
                className={
                  mod.status === 'soon'
                    ? 'opacity-60'
                    : 'cursor-pointer transition-shadow hover:shadow-md'
                }
              >
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{mod.name}</CardTitle>
                    {mod.status === 'done' ? (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                        Done
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Coming soon
                      </span>
                    )}
                  </div>
                  <CardDescription>{mod.description}</CardDescription>
                </CardHeader>
              </Card>
            )

            return 'href' in mod && mod.href ? (
              <Link key={mod.name} href={mod.href} className="block">
                {card}
              </Link>
            ) : (
              <div key={mod.name}>{card}</div>
            )
          })}
        </div>
      </div>
    </main>
  )
}
