import { notFound } from 'next/navigation'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { getInvoice } from '@/features/invoicing/queries'
import { InvoiceDetail } from '@/features/invoicing/components/InvoiceDetail'

interface InvoicePageProps {
  params: Promise<{ id: string }>
}

export default async function InvoicePage({ params }: InvoicePageProps) {
  const { id } = await params

  const invoice = await getInvoice(id)

  if (!invoice) {
    notFound()
  }

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Detalle de Factura</h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">{invoice.code}</p>
          </div>
          <div className="flex items-center gap-2">
            {invoice.status === 'issued' && (
              <Link href={`/dispatches/new?invoice=${id}`}>
                <Button size="sm">Registrar despacho</Button>
              </Link>
            )}
            <Link href="/invoices">
              <Button variant="outline" size="sm">
                Volver al listado
              </Button>
            </Link>
          </div>
        </div>

        <InvoiceDetail invoice={invoice} />
      </div>
    </main>
  )
}
