import { listSuppliers } from '@/features/suppliers/queries'
import { listProducts } from '@/features/products/queries'
import { PurchaseOrderForm } from '@/features/purchase-orders/components/PurchaseOrderForm'

export default async function NewPurchaseOrderPage() {
  const [suppliers, products] = await Promise.all([
    listSuppliers(),
    listProducts(undefined, false), // active products only
  ])

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Nueva Orden de Compra</h1>
          <p className="mt-1 text-muted-foreground">
            Completa los datos de la orden y agrega los artículos.
          </p>
        </div>

        <PurchaseOrderForm suppliers={suppliers} products={products} />
      </div>
    </main>
  )
}
