import Link from 'next/link'

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { GoodsReceipt } from '../types'

interface GoodsReceiptsTableProps {
  rows: GoodsReceipt[]
}

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('es-PE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
}

export function GoodsReceiptsTable({ rows }: GoodsReceiptsTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-10 text-center text-muted-foreground">
        No hay ingresos de mercadería registrados.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Código Ingreso</TableHead>
          <TableHead>Código OC</TableHead>
          <TableHead>Proveedor</TableHead>
          <TableHead>Fecha de Recepción</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((receipt) => (
          <TableRow key={receipt.id} className="cursor-pointer hover:bg-muted/50">
            <TableCell>
              <Link
                href={`/goods-receipts/${receipt.id}`}
                className="font-mono text-xs font-medium hover:underline"
              >
                {receipt.code}
              </Link>
            </TableCell>
            <TableCell className="font-mono text-xs">
              {receipt.purchase_orders.code}
            </TableCell>
            <TableCell>{receipt.purchase_orders.suppliers.name}</TableCell>
            <TableCell>{formatDate(receipt.receipt_date)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
