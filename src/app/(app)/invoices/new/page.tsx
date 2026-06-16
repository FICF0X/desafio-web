import { listCustomers } from '@/features/customers/queries'
import { listProducts } from '@/features/products/queries'
import { InvoiceForm } from '@/features/invoicing/components/InvoiceForm'

export default async function NewInvoicePage() {
  const [customers, products] = await Promise.all([
    listCustomers(),
    listProducts(), // returns active products only by default; includes unit_price via select('*')
  ])

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Nueva factura</h1>
          <p className="mt-1 text-muted-foreground">
            Completa los datos para emitir una nueva factura.
          </p>
        </div>

        <InvoiceForm customers={customers} products={products} />
      </div>
    </main>
  )
}
