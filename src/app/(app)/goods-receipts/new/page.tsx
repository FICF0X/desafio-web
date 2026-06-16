import { listPendingPurchaseOrdersWithItems } from '@/features/goods-receipts/queries'
import { GoodsReceiptForm } from '@/features/goods-receipts/components/GoodsReceiptForm'

interface NewGoodsReceiptPageProps {
  searchParams: Promise<{ po?: string }>
}

export default async function NewGoodsReceiptPage({
  searchParams,
}: NewGoodsReceiptPageProps) {
  const { po } = await searchParams

  const pendingOrders = await listPendingPurchaseOrdersWithItems()

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">
            Nuevo Ingreso de Mercadería
          </h1>
          <p className="mt-1 text-muted-foreground">
            Selecciona una orden de compra pendiente para registrar su recepción.
          </p>
        </div>

        <GoodsReceiptForm
          pendingOrders={pendingOrders}
          defaultPurchaseOrderId={po}
        />
      </div>
    </main>
  )
}
