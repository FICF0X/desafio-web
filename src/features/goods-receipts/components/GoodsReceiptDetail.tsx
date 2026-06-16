import Link from 'next/link'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { GoodsReceiptDetail as GoodsReceiptDetailType } from '../types'

interface GoodsReceiptDetailProps {
  receipt: GoodsReceiptDetailType
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function GoodsReceiptDetail({ receipt }: GoodsReceiptDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="font-mono text-xl">{receipt.code}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {receipt.purchase_orders.suppliers.name}
              </p>
            </div>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
              Recibido
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Fecha de recepción</dt>
              <dd className="mt-0.5 font-medium">
                {formatDate(receipt.receipt_date)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Orden de compra</dt>
              <dd className="mt-0.5 font-medium font-mono text-xs">
                <Link
                  href={`/purchase-orders/${receipt.purchase_order_id}`}
                  className="hover:underline text-primary"
                >
                  {receipt.purchase_orders.code}
                </Link>
              </dd>
            </div>
            {receipt.notes && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-muted-foreground">Notas</dt>
                <dd className="mt-0.5">{receipt.notes}</dd>
              </div>
            )}
          </dl>

          <div className="mt-6 border-t pt-4">
            <Link href={`/purchase-orders/${receipt.purchase_order_id}`}>
              <Button variant="outline" size="sm">
                Ver orden de compra
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Artículos recibidos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="w-32 text-right">
                  Cantidad recibida
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {receipt.goods_receipt_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.products.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
