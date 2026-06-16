import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { InvoiceWithItems } from '../types'

interface InvoiceDetailProps {
  invoice: InvoiceWithItems
}

function StatusBadge({ status }: { status: 'issued' | 'cancelled' }) {
  if (status === 'issued') {
    return (
      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
        Emitida
      </span>
    )
  }
  return (
    <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
      Anulada
    </span>
  )
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value)
}

export function InvoiceDetail({ invoice }: InvoiceDetailProps) {
  return (
    <div className="space-y-6">
      {/* Header card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Información general</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-x-8 gap-y-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted-foreground">Cliente</dt>
              <dd className="font-medium">{invoice.customers?.name ?? '—'}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Fecha</dt>
              <dd className="font-medium">{invoice.invoice_date}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Estado</dt>
              <dd>
                <StatusBadge status={invoice.status} />
              </dd>
            </div>
            {invoice.notes && (
              <div className="col-span-2 sm:col-span-4">
                <dt className="text-muted-foreground">Notas</dt>
                <dd className="font-medium">{invoice.notes}</dd>
              </div>
            )}
          </dl>
        </CardContent>
      </Card>

      {/* Line items */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Artículos</CardTitle>
        </CardHeader>
        <CardContent className="px-0 pb-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-6">Producto</TableHead>
                <TableHead className="text-right">Cant.</TableHead>
                <TableHead className="text-right">P. Unit.</TableHead>
                <TableHead className="pr-6 text-right">Subtotal</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoice.invoice_items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="pl-6 font-medium">
                    {item.products?.name ?? '—'}
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

      {/* Totals breakdown */}
      <div className="flex justify-end">
        <div className="w-64 space-y-1 text-sm">
          <div className="flex justify-between text-muted-foreground">
            <span>Subtotal:</span>
            <span>{formatCurrency(Number(invoice.subtotal))}</span>
          </div>
          <div className="flex justify-between text-muted-foreground">
            <span>IGV (18%):</span>
            <span>{formatCurrency(Number(invoice.igv))}</span>
          </div>
          <div className="flex justify-between border-t pt-1 text-base font-semibold">
            <span>Total:</span>
            <span>{formatCurrency(Number(invoice.total))}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
