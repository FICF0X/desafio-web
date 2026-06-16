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
    name: 'Inicio de sesión',
    description: 'Autenticación y gestión de sesión',
    status: 'done' as const,
  },
  {
    name: 'Productos',
    description: 'Gestión del catálogo de productos',
    status: 'done' as const,
    href: '/products',
  },
  {
    name: 'Orden de Compra',
    description: 'Creación y seguimiento de órdenes de compra',
    status: 'done' as const,
    href: '/purchase-orders',
  },
  {
    name: 'Ingreso de Mercadería',
    description: 'Recepción de mercadería e ingreso a inventario',
    status: 'done' as const,
    href: '/goods-receipts',
  },
  {
    name: 'Facturación',
    description: 'Facturación y cobranza',
    status: 'done' as const,
    href: '/invoices',
  },
  {
    name: 'Despacho',
    description: 'Gestión de despachos y envíos',
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
          <h1 className="text-3xl font-bold tracking-tight">Panel</h1>
          <p className="mt-2 text-muted-foreground">
            Bienvenido de nuevo, <span className="font-medium">{user?.email}</span>
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
                        Listo
                      </span>
                    ) : (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        Próximamente
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
