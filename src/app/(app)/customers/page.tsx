import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { listCustomers } from '@/features/customers/queries'
import { CustomersTable } from '@/features/customers/components/CustomersTable'

export default async function CustomersPage() {
  const customers = await listCustomers()

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Clientes</h1>
            <p className="mt-1 text-muted-foreground">
              Administra los clientes del sistema.
            </p>
          </div>
          <Link href="/customers/new">
            <Button>Nuevo cliente</Button>
          </Link>
        </div>

        <CustomersTable rows={customers} />
      </div>
    </main>
  )
}
