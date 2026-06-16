'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { receiveGoodsReceipt } from '../actions'
import type { PendingPurchaseOrderWithItems } from '../types'

interface GoodsReceiptFormProps {
  pendingOrders: PendingPurchaseOrderWithItems[]
  defaultPurchaseOrderId?: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value)
}

export function GoodsReceiptForm({
  pendingOrders,
  defaultPurchaseOrderId,
}: GoodsReceiptFormProps) {
  const [selectedId, setSelectedId] = useState<string>(
    defaultPurchaseOrderId ?? '',
  )
  const [isPending, startTransition] = useTransition()

  const selectedOrder = pendingOrders.find((po) => po.id === selectedId) ?? null

  if (pendingOrders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-muted-foreground">
          No hay órdenes de compra pendientes por recibir.
        </p>
      </div>
    )
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await receiveGoodsReceipt(formData)
      // redirect() throws internally on success, so we only reach here on error
      if (!result.ok) {
        toast.error(result.error)
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Purchase order selector */}
      <div className="space-y-2">
        <Label htmlFor="purchase_order_id">Orden de compra</Label>
        <select
          id="purchase_order_id"
          name="purchase_order_id"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Seleccionar orden de compra…</option>
          {pendingOrders.map((po) => (
            <option key={po.id} value={po.id}>
              {po.code} — {po.supplier_name} — {formatCurrency(po.total)}
            </option>
          ))}
        </select>
      </div>

      {/* Read-only items preview */}
      {selectedOrder && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Artículos a recibir</p>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Producto</TableHead>
                  <TableHead className="w-32 text-right">
                    Cantidad pedida
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedOrder.items.map((item) => (
                  <TableRow key={item.product_id}>
                    <TableCell>{item.product_name}</TableCell>
                    <TableCell className="text-right">
                      {item.quantity}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Notes */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={500}
          placeholder="Observaciones sobre la recepción…"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      {/* Submit */}
      <Button
        type="submit"
        disabled={!selectedId || isPending}
      >
        {isPending ? 'Registrando…' : 'Confirmar recepción'}
      </Button>
    </form>
  )
}
