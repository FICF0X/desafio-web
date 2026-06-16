import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { CustomerForm } from '@/features/customers/components/CustomerForm'

export default function NewCustomerPage() {
  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/customers">
            <Button variant="outline" size="sm">
              Volver al listado
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Nuevo cliente</h1>
          </div>
        </div>

        <CustomerForm />
      </div>
    </main>
  )
}
