'use client'

import { useTransition } from 'react'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cancelPurchaseOrder } from '../actions'
import type { PurchaseOrderDetail as PurchaseOrderDetailType } from '../types'

interface PurchaseOrderDetailProps {
  po: PurchaseOrderDetailType
}

const STATUS_LABELS: Record<PurchaseOrderDetailType['status'], string> = {
  pending: 'Pendiente',
  received: 'Recibida',
  cancelled: 'Anulada',
}

const STATUS_CLASSES: Record<PurchaseOrderDetailType['status'], string> = {
  pending:
    'rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  received:
    'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  cancelled:
    'rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground',
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value)
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function PurchaseOrderDetail({ po }: PurchaseOrderDetailProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  function handleCancel() {
    startTransition(async () => {
      const result = await cancelPurchaseOrder(po.id)
      if (!result.ok) {
        toast.error(result.error)
      } else {
        toast.success('Orden anulada correctamente.')
        router.refresh()
      }
    })
  }

  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="font-mono text-xl">{po.code}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {po.suppliers.name}
              </p>
            </div>
            <span className={STATUS_CLASSES[po.status]}>
              {STATUS_LABELS[po.status]}
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-muted-foreground">Fecha de orden</dt>
              <dd className="mt-0.5 font-medium">{formatDate(po.order_date)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total</dt>
              <dd className="mt-0.5 font-semibold text-base">{formatCurrency(po.total)}</dd>
            </div>
            {po.notes && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-muted-foreground">Notas</dt>
                <dd className="mt-0.5">{po.notes}</dd>
              </div>
            )}
          </dl>

          {po.status === 'pending' && (
            <div className="mt-6 border-t pt-4 flex items-center gap-3">
              <Link href={`/goods-receipts/new?po=${po.id}`}>
                <Button variant="default" size="sm">
                  Recibir mercadería
                </Button>
              </Link>
              <Button
                variant="destructive"
                size="sm"
                disabled={isPending}
                onClick={handleCancel}
              >
                {isPending ? 'Anulando…' : 'Anular orden'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Artículos</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Producto</TableHead>
                <TableHead className="w-24 text-right">Cantidad</TableHead>
                <TableHead className="w-32 text-right">Costo unitario</TableHead>
                <TableHead className="w-32 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {po.purchase_order_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>{item.products.name}</TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(item.unit_cost)}
                  </TableCell>
                  <TableCell className="text-right font-medium">
                    {formatCurrency(item.subtotal)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
