import Link from 'next/link'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { STATUS_LABEL } from '../types'
import type { Dispatch, DispatchStatus } from '../types'

interface DispatchesTableProps {
  rows: Dispatch[]
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
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

export function DispatchesTable({ rows }: DispatchesTableProps) {
  if (rows.length === 0) {
    return (
      <div className="py-10 text-center">
        <p className="text-muted-foreground">No hay despachos registrados.</p>
        <div className="mt-4">
          <Link href="/dispatches/new">
            <Button variant="outline" size="sm">
              Nuevo despacho
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código</TableHead>
          <TableHead>Factura</TableHead>
          <TableHead>Cliente</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Fecha</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((dispatch) => (
          <TableRow
            key={dispatch.id}
            className="cursor-pointer hover:bg-muted/50"
          >
            <TableCell>
              <Link
                href={`/dispatches/${dispatch.id}`}
                className="font-mono text-xs font-medium hover:underline"
              >
                {dispatch.code}
              </Link>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {dispatch.invoices.code}
            </TableCell>
            <TableCell>{dispatch.invoices.customers.name}</TableCell>
            <TableCell>
              <StatusBadge status={dispatch.status} />
            </TableCell>
            <TableCell>{formatDate(dispatch.dispatch_date)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
