'use client'

import { useTransition } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'

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
import { advanceDispatchStatus } from '../actions'
import { STATUS_LABEL } from '../types'
import type { DispatchDetail as DispatchDetailType, DispatchStatus } from '../types'

interface DispatchDetailProps {
  dispatch: DispatchDetailType
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value)
}

function StatusBadge({ status }: { status: DispatchStatus }) {
  const colorMap: Record<DispatchStatus, string> = {
    pending:
      'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    in_transit:
      'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    delivered:
      'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  }

  return (
    <span
      className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorMap[status]}`}
    >
      {STATUS_LABEL[status]}
    </span>
  )
}

const ADVANCE_LABEL: Record<DispatchStatus, string | null> = {
  pending: 'Marcar en camino',
  in_transit: 'Marcar entregada',
  delivered: null,
}

export function DispatchDetail({ dispatch }: DispatchDetailProps) {
  const [isPending, startTransition] = useTransition()

  const advanceLabel = ADVANCE_LABEL[dispatch.status]

  function handleAdvance() {
    startTransition(async () => {
      const result = await advanceDispatchStatus(dispatch.id, dispatch.status)
      if (!result.ok) {
        toast.error(result.error)
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
              <CardTitle className="font-mono text-xl">{dispatch.code}</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                {dispatch.invoices.customers.name}
              </p>
            </div>
            <StatusBadge status={dispatch.status} />
          </div>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-3">
            <div>
              <dt className="text-muted-foreground">Fecha de despacho</dt>
              <dd className="mt-0.5 font-medium">
                {formatDate(dispatch.dispatch_date)}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Factura de origen</dt>
              <dd className="mt-0.5 font-mono text-xs font-medium">
                <Link
                  href={`/invoices/${dispatch.invoice_id}`}
                  className="text-primary hover:underline"
                >
                  {dispatch.invoices.code}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total factura</dt>
              <dd className="mt-0.5 font-medium">
                {formatCurrency(Number(dispatch.invoices.total))}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Dirección</dt>
              <dd className="mt-0.5 font-medium">
                {dispatch.address ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Transportista</dt>
              <dd className="mt-0.5 font-medium">
                {dispatch.carrier ?? '—'}
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Código de seguimiento</dt>
              <dd className="mt-0.5 font-mono text-xs font-medium">
                {dispatch.tracking_code ?? '—'}
              </dd>
            </div>
            {dispatch.notes && (
              <div className="col-span-2 sm:col-span-3">
                <dt className="text-muted-foreground">Notas</dt>
                <dd className="mt-0.5">{dispatch.notes}</dd>
              </div>
            )}
          </dl>

          {/* Status stepper */}
          <div className="mt-6 border-t pt-4 flex items-center gap-4">
            {advanceLabel !== null ? (
              <Button
                onClick={handleAdvance}
                disabled={isPending}
              >
                {isPending ? 'Actualizando…' : advanceLabel}
              </Button>
            ) : (
              <span className="rounded-full bg-emerald-100 px-3 py-1 text-sm font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                Entregada — estado final
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Invoice items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Artículos despachados</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Producto</TableHead>
                <TableHead className="text-right">Cantidad</TableHead>
                <TableHead className="text-right">Precio unit.</TableHead>
                <TableHead className="pr-6 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dispatch.invoices.invoice_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-6 font-medium">
                    {item.products.name}
                  </TableCell>
                  <TableCell className="text-right">{item.quantity}</TableCell>
                  <TableCell className="text-right">
                    {formatCurrency(Number(item.unit_price))}
                  </TableCell>
                  <TableCell className="pr-6 text-right">
                    {formatCurrency(Number(item.subtotal))}
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
