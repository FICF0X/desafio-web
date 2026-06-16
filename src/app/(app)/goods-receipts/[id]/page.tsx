import { notFound } from 'next/navigation'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { getGoodsReceipt } from '@/features/goods-receipts/queries'
import { GoodsReceiptDetail } from '@/features/goods-receipts/components/GoodsReceiptDetail'

interface GoodsReceiptPageProps {
  params: Promise<{ id: string }>
}

export default async function GoodsReceiptPage({
  params,
}: GoodsReceiptPageProps) {
  const { id } = await params

  const receipt = await getGoodsReceipt(id)

  if (!receipt) {
    notFound()
  }

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Detalle de Ingreso
            </h1>
            <p className="mt-1 text-muted-foreground font-mono text-sm">
              {receipt.code}
            </p>
          </div>
          <Link href="/goods-receipts">
            <Button variant="outline" size="sm">
              Volver al listado
            </Button>
          </Link>
        </div>

        <GoodsReceiptDetail receipt={receipt} />
      </div>
    </main>
  )
}
