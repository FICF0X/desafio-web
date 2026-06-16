import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { listPurchaseOrders } from '@/features/purchase-orders/queries'
import { PurchaseOrdersTable } from '@/features/purchase-orders/components/PurchaseOrdersTable'

export default async function PurchaseOrdersPage() {
  const orders = await listPurchaseOrders()

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Órdenes de Compra</h1>
            <p className="mt-1 text-muted-foreground">
              Gestiona las órdenes de compra a proveedores.
            </p>
          </div>
          <Link href="/purchase-orders/new">
            <Button>Nueva orden</Button>
          </Link>
        </div>

        <PurchaseOrdersTable rows={orders} />
      </div>
    </main>
  )
}
