import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Supplier } from '../types'

interface SuppliersTableProps {
  rows: Supplier[]
}

export function SuppliersTable({ rows }: SuppliersTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No hay proveedores registrados.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>RUC</TableHead>
          <TableHead>Correo</TableHead>
          <TableHead>Teléfono</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((supplier) => (
          <TableRow key={supplier.id}>
            <TableCell className="font-medium">{supplier.name}</TableCell>
            <TableCell className="font-mono text-xs">
              {supplier.tax_id ?? '—'}
            </TableCell>
            <TableCell>{supplier.email ?? '—'}</TableCell>
            <TableCell>{supplier.phone ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
