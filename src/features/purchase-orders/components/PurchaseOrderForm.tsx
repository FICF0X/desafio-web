'use client'

import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm, useFieldArray, useWatch } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPurchaseOrder } from '../actions'
import { poSchema } from '../schema'
import type { Supplier } from '@/features/suppliers/types'
import type { Product } from '@/features/products/types'

// Raw input shape — what HTML elements emit before zod transforms
type PoFormValues = z.input<typeof poSchema>

interface PurchaseOrderFormProps {
  suppliers: Supplier[]
  products: Product[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value)
}

export function PurchaseOrderForm({ suppliers, products }: PurchaseOrderFormProps) {
  const router = useRouter()

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isSubmitting, isValid },
  } = useForm<PoFormValues, unknown, z.output<typeof poSchema>>({
    resolver: zodResolver(poSchema),
    defaultValues: {
      supplier_id: '',
      order_date: new Date().toISOString().split('T')[0],
      notes: '',
      items: [],
    },
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  // Watch all items to compute per-row subtotals and running total
  const watchedItems = useWatch({ control, name: 'items' }) ?? []

  function computeSubtotal(index: number): number {
    const item = watchedItems[index]
    if (!item) return 0
    const qty = Number(item.quantity)
    const cost = Number(item.unit_cost)
    if (isNaN(qty) || isNaN(cost)) return 0
    return qty * cost
  }

  const runningTotal = watchedItems.reduce((acc, item, idx) => {
    return acc + computeSubtotal(idx)
  }, 0)

  // Track which product_ids are already used to prevent duplicates
  const usedProductIds = new Set(
    watchedItems.map((i) => i?.product_id).filter(Boolean),
  )

  function addItem() {
    append({ product_id: '', quantity: '' as unknown as number, unit_cost: '' as unknown as number })
  }

  async function onSubmit(data: z.output<typeof poSchema>) {
    const result = await createPurchaseOrder(data)

    if (result && !result.ok) {
      toast.error(result.error)
    }
    // On success, createPurchaseOrder redirects server-side — no client redirect needed.
    // If redirect throws (Next.js redirect is a throw), it propagates automatically.
  }

  const hasItems = fields.length > 0

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Nueva Orden de Compra</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

          {/* Supplier */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier_id">Proveedor *</Label>
            <select
              id="supplier_id"
              disabled={isSubmitting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              {...register('supplier_id')}
            >
              <option value="">— Selecciona un proveedor —</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {errors.supplier_id && (
              <p className="text-xs text-destructive" role="alert">
                {errors.supplier_id.message}
              </p>
            )}
          </div>

          {/* Order date */}
          <div className="space-y-1.5">
            <Label htmlFor="order_date">Fecha de orden *</Label>
            <Input
              id="order_date"
              type="date"
              disabled={isSubmitting}
              aria-invalid={errors.order_date ? true : undefined}
              {...register('order_date')}
            />
            {errors.order_date && (
              <p className="text-xs text-destructive" role="alert">
                {errors.order_date.message}
              </p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes">Notas (opcional)</Label>
            <Input
              id="notes"
              placeholder="Observaciones u otros datos"
              disabled={isSubmitting}
              {...register('notes')}
            />
          </div>

          {/* Line items */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Artículos *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem} disabled={isSubmitting}>
                Agregar producto
              </Button>
            </div>

            {errors.items && !Array.isArray(errors.items) && (
              <p className="text-xs text-destructive" role="alert">
                {errors.items.message ?? errors.items.root?.message}
              </p>
            )}

            {fields.length === 0 && (
              <p className="rounded-md border border-dashed py-6 text-center text-sm text-muted-foreground">
                Agrega al menos un producto para continuar.
              </p>
            )}

            {fields.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs text-muted-foreground">
                      <th className="pb-2 pr-3 font-medium">Producto</th>
                      <th className="pb-2 pr-3 font-medium w-24">Cantidad</th>
                      <th className="pb-2 pr-3 font-medium w-28">Costo unit.</th>
                      <th className="pb-2 pr-3 font-medium w-28">Subtotal</th>
                      <th className="pb-2 font-medium w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fields.map((field, index) => {
                      const currentProductId = watchedItems[index]?.product_id
                      const selectedProduct = products.find(
                        (p) => p.id === currentProductId,
                      )
                      const subtotal = computeSubtotal(index)
                      const itemErrors = Array.isArray(errors.items)
                        ? errors.items[index]
                        : undefined

                      return (
                        <tr key={field.id} className="align-top">
                          {/* Product picker */}
                          <td className="py-2 pr-3">
                            <select
                              disabled={isSubmitting}
                              className="flex h-9 w-full min-w-[180px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                              {...register(`items.${index}.product_id`)}
                            >
                              <option value="">— Producto —</option>
                              {products.map((p) => (
                                <option
                                  key={p.id}
                                  value={p.id}
                                  disabled={
                                    usedProductIds.has(p.id) &&
                                    p.id !== currentProductId
                                  }
                                >
                                  {p.name}
                                  {usedProductIds.has(p.id) && p.id !== currentProductId
                                    ? ' (ya agregado)'
                                    : ''}
                                </option>
                              ))}
                            </select>
                            {itemErrors?.product_id && (
                              <p className="mt-0.5 text-xs text-destructive" role="alert">
                                {itemErrors.product_id.message}
                              </p>
                            )}
                            {selectedProduct && (
                              <p className="mt-1 text-xs text-muted-foreground">
                                Precio de venta ref.:{' '}
                                {formatCurrency(Number(selectedProduct.unit_price))}
                              </p>
                            )}
                          </td>

                          {/* Quantity */}
                          <td className="py-2 pr-3">
                            <Input
                              type="number"
                              step="1"
                              min="1"
                              placeholder="1"
                              disabled={isSubmitting}
                              aria-invalid={itemErrors?.quantity ? true : undefined}
                              {...register(`items.${index}.quantity`)}
                            />
                            {itemErrors?.quantity && (
                              <p className="mt-0.5 text-xs text-destructive" role="alert">
                                {itemErrors.quantity.message}
                              </p>
                            )}
                          </td>

                          {/* Unit cost */}
                          <td className="py-2 pr-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              disabled={isSubmitting}
                              aria-invalid={itemErrors?.unit_cost ? true : undefined}
                              {...register(`items.${index}.unit_cost`)}
                            />
                            {itemErrors?.unit_cost && (
                              <p className="mt-0.5 text-xs text-destructive" role="alert">
                                {itemErrors.unit_cost.message}
                              </p>
                            )}
                          </td>

                          {/* Subtotal (read-only) */}
                          <td className="py-2 pr-3">
                            <div className="flex h-9 items-center rounded-md border border-transparent bg-muted px-3 text-sm text-muted-foreground">
                              {formatCurrency(subtotal)}
                            </div>
                          </td>

                          {/* Remove row */}
                          <td className="py-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              disabled={isSubmitting}
                              onClick={() => remove(index)}
                              aria-label="Quitar artículo"
                            >
                              ✕
                            </Button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Running total */}
            {hasItems && (
              <div className="flex justify-end border-t pt-3">
                <span className="text-sm text-muted-foreground mr-4">Total:</span>
                <span className="text-sm font-semibold">{formatCurrency(runningTotal)}</span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !isValid || !hasItems}
            >
              {isSubmitting ? 'Registrando…' : 'Registrar orden'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => router.push('/purchase-orders')}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
