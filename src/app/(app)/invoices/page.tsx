import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { listInvoices } from '@/features/invoicing/queries'
import { InvoicesTable } from '@/features/invoicing/components/InvoicesTable'

export default async function InvoicesPage() {
  const invoices = await listInvoices()

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Facturación</h1>
            <p className="mt-1 text-muted-foreground">
              Emite y consulta facturas de venta.
            </p>
          </div>
          <Link href="/invoices/new">
            <Button>Nueva factura</Button>
          </Link>
        </div>

        <InvoicesTable rows={invoices} />
      </div>
    </main>
  )
}
