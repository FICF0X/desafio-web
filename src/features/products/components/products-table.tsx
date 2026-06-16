'use client'

import Link from 'next/link'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toggleProductActive } from '../actions'
import type { Product } from '../types'

interface ProductsTableProps {
  rows: Product[]
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value)
}

export function ProductsTable({ rows }: ProductsTableProps) {
  async function handleToggle(id: string, currentActive: boolean) {
    const result = await toggleProductActive(id, !currentActive)
    if (!result.ok) {
      toast.error(result.error)
    }
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>SKU</TableHead>
          <TableHead>Nombre</TableHead>
          <TableHead>Precio unitario</TableHead>
          <TableHead>Stock</TableHead>
          <TableHead>Estado</TableHead>
          <TableHead>Acciones</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={6}
              className="py-10 text-center text-muted-foreground"
            >
              No se encontraron productos.
            </TableCell>
          </TableRow>
        ) : (
          rows.map((product) => (
            <TableRow key={product.id}>
              <TableCell className="font-mono text-xs">{product.sku}</TableCell>
              <TableCell>{product.name}</TableCell>
              <TableCell>{formatPrice(product.unit_price)}</TableCell>
              <TableCell>{product.stock_quantity}</TableCell>
              <TableCell>
                <span
                  className={
                    product.is_active
                      ? 'rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400'
                      : 'rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground'
                  }
                >
                  {product.is_active ? 'Activo' : 'Inactivo'}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <Link href={`/products/${product.id}/edit`}>
                    <Button size="sm" variant="outline">
                      Editar
                    </Button>
                  </Link>
                  <Button
                    size="sm"
                    variant={product.is_active ? 'destructive' : 'secondary'}
                    onClick={() => handleToggle(product.id, product.is_active)}
                  >
                    {product.is_active ? 'Desactivar' : 'Activar'}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
