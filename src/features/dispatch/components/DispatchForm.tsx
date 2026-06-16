'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { createDispatch } from '../actions'
import type { DispatchableInvoice } from '../types'

interface DispatchFormProps {
  dispatchableInvoices: DispatchableInvoice[]
  defaultInvoiceId?: string
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value)
}

export function DispatchForm({
  dispatchableInvoices,
  defaultInvoiceId,
}: DispatchFormProps) {
  const [selectedId, setSelectedId] = useState<string>(
    defaultInvoiceId ?? '',
  )
  const [isPending, startTransition] = useTransition()

  if (dispatchableInvoices.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center">
        <p className="text-muted-foreground">
          No hay facturas emitidas pendientes de despacho.
        </p>
      </div>
    )
  }

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await createDispatch(formData)
      // redirect() throws internally on success, so we only reach here on error
      if (!result.ok) {
        toast.error(result.error)
      }
    })
  }

  return (
    <form action={handleSubmit} className="space-y-6">
      {/* Invoice selector */}
      <div className="space-y-2">
        <Label htmlFor="invoice_id">Factura</Label>
        <select
          id="invoice_id"
          name="invoice_id"
          value={selectedId}
          onChange={(e) => setSelectedId(e.target.value)}
          required
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="">Seleccionar factura…</option>
          {dispatchableInvoices.map((inv) => (
            <option key={inv.id} value={inv.id}>
              {inv.code} — {inv.customer_name} — {formatCurrency(inv.total)}
            </option>
          ))}
        </select>
      </div>

      {/* Dirección */}
      <div className="space-y-2">
        <Label htmlFor="address">Dirección (opcional)</Label>
        <input
          id="address"
          name="address"
          type="text"
          maxLength={500}
          placeholder="Dirección de entrega…"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Transportista */}
      <div className="space-y-2">
        <Label htmlFor="carrier">Transportista (opcional)</Label>
        <input
          id="carrier"
          name="carrier"
          type="text"
          maxLength={200}
          placeholder="Nombre del transportista o empresa…"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Código de seguimiento */}
      <div className="space-y-2">
        <Label htmlFor="tracking_code">Código de seguimiento (opcional)</Label>
        <input
          id="tracking_code"
          name="tracking_code"
          type="text"
          maxLength={200}
          placeholder="Número de guía o tracking…"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        />
      </div>

      {/* Notas */}
      <div className="space-y-2">
        <Label htmlFor="notes">Notas (opcional)</Label>
        <textarea
          id="notes"
          name="notes"
          rows={3}
          maxLength={500}
          placeholder="Observaciones sobre el despacho…"
          className="flex w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none"
        />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={!selectedId || isPending}>
        {isPending ? 'Registrando…' : 'Registrar despacho'}
      </Button>
    </form>
  )
}
