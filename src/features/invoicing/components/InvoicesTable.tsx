import Link from 'next/link'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Invoice } from '../types'

interface InvoicesTableProps {
  rows: Invoice[]
}

function StatusBadge({ status }: { status: Invoice['status'] }) {
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

export function InvoicesTable({ rows }: InvoicesTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No hay facturas registradas.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Fecha</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead className="text-right">Total</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((invoice) => (
          <TableRow key={invoice.id}>
            <TableCell className="font-mono text-xs font-medium">
              <Link
                href={`/invoices/${invoice.id}`}
                className="text-primary underline-offset-4 hover:underline"
              >
                {invoice.code}
              </Link>
            </TableCell>
            <TableCell>{invoice.customers?.name ?? '—'}</TableCell>
            <TableCell>{invoice.invoice_date}</TableCell>
            <TableCell>
              <StatusBadge status={invoice.status} />
            </TableCell>
            <TableCell className="text-right font-medium">
              {formatCurrency(Number(invoice.total))}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
