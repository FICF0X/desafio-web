import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { Customer } from '../types'

interface CustomersTableProps {
  rows: Customer[]
}

export function CustomersTable({ rows }: CustomersTableProps) {
  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-muted-foreground">
        No hay clientes registrados.
      </p>
    )
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nombre</TableHead>
          <TableHead>Tipo Doc.</TableHead>
          <TableHead>Nro Doc.</TableHead>
          <TableHead>Correo</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((customer) => (
          <TableRow key={customer.id}>
            <TableCell className="font-medium">{customer.name}</TableCell>
            <TableCell>{customer.doc_type ?? '—'}</TableCell>
            <TableCell className="font-mono text-xs">
              {customer.doc_number ?? '—'}
            </TableCell>
            <TableCell>{customer.email ?? '—'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
