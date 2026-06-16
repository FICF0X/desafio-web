import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { listGoodsReceipts } from '@/features/goods-receipts/queries'
import { GoodsReceiptsTable } from '@/features/goods-receipts/components/GoodsReceiptsTable'

export default async function GoodsReceiptsPage() {
  const receipts = await listGoodsReceipts()

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">
            Ingresos de Mercadería
          </h1>
          <Link href="/goods-receipts/new">
            <Button>Nuevo ingreso</Button>
          </Link>
        </div>

        <GoodsReceiptsTable rows={receipts} />
      </div>
    </main>
  )
}
