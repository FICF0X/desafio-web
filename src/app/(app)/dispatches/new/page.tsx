import { listDispatchableInvoices } from '@/features/dispatch/queries'
import { DispatchForm } from '@/features/dispatch/components/DispatchForm'

interface NewDispatchPageProps {
  searchParams: Promise<{ invoice?: string }>
}

export default async function NewDispatchPage({
  searchParams,
}: NewDispatchPageProps) {
  const { invoice } = await searchParams

  const dispatchableInvoices = await listDispatchableInvoices()

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Nuevo Despacho</h1>
          <p className="mt-1 text-muted-foreground">
            Selecciona una factura emitida para registrar su despacho.
          </p>
        </div>

        <DispatchForm
          dispatchableInvoices={dispatchableInvoices}
          defaultInvoiceId={invoice}
        />
      </div>
    </main>
  )
}
