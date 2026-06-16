import { notFound } from 'next/navigation'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { getPurchaseOrder } from '@/features/purchase-orders/queries'
import { PurchaseOrderDetail } from '@/features/purchase-orders/components/PurchaseOrderDetail'

interface PurchaseOrderPageProps {
  params: Promise<{ id: string }>
}

export default async function PurchaseOrderPage({ params }: PurchaseOrderPageProps) {
  const { id } = await params

  const po = await getPurchaseOrder(id)

  if (!po) {
    notFound()
  }

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Detalle de Orden</h1>
            <p className="mt-1 text-muted-foreground font-mono text-sm">{po.code}</p>
          </div>
          <Link href="/purchase-orders">
            <Button variant="outline" size="sm">
              Volver al listado
            </Button>
          </Link>
        </div>

        <PurchaseOrderDetail po={po} />
      </div>
    </main>
  )
}
