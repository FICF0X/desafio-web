import Link from 'next/link'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { PurchaseOrder } from '../types'

interface PurchaseOrdersTableProps {
  rows: PurchaseOrder[]
}

const STATUS_LABELS: Record<PurchaseOrder['status'], string> = {
  pending: 'Pendiente',
  received: 'Recibida',
  cancelled: 'Anulada',
}

const STATUS_CLASSES: Record<PurchaseOrder['status'], string> = {
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

export function PurchaseOrdersTable({ rows }: PurchaseOrdersTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        No hay órdenes de compra.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((po) => (
          <TableRow key={po.id} className="cursor-pointer hover:bg-muted/50">
            <TableCell>
              <Link
                href={`/purchase-orders/${po.id}`}
                className="font-mono text-xs font-medium hover:underline"
              >
                {po.code}
              </Link>
            </TableCell>
            <TableCell>{po.suppliers.name}</TableCell>
            <TableCell>{formatDate(po.order_date)}</TableCell>
            <TableCell>
              <span className={STATUS_CLASSES[po.status]}>
                {STATUS_LABELS[po.status]}
              </span>
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(po.total)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
