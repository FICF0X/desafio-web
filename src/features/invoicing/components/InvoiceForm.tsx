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
import { createInvoice } from '../actions'
import { invoiceSchema } from '../schema'
import type { Customer } from '@/features/customers/types'
import type { Product } from '@/features/products/types'

// Raw input shape — what HTML elements emit before zod transforms
type InvoiceFormValues = z.input<typeof invoiceSchema>

interface InvoiceFormProps {
  customers: Customer[]
  products: Product[]
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-PE', {
    style: 'currency',
    currency: 'PEN',
    minimumFractionDigits: 2,
  }).format(value)
}

export function InvoiceForm({ customers, products }: InvoiceFormProps) {
  const router = useRouter()

  const {
    register,
    control,
    handleSubmit,
    getValues,
    setValue,
    formState: { errors, isSubmitting, isValid },
  } = useForm<InvoiceFormValues, unknown, z.output<typeof invoiceSchema>>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      customer_id: '',
      invoice_date: new Date().toISOString().split('T')[0],
      notes: '',
      items: [],
    },
    mode: 'onChange',
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'items',
  })

  // Watch all items to compute per-row subtotals and summary
  const watchedItems = useWatch({ control, name: 'items' }) ?? []

  function computeLineSubtotal(index: number): number {
    const item = watchedItems[index]
    if (!item) return 0
    const qty = Number(item.quantity)
    const price = Number(item.unit_price)
    if (isNaN(qty) || isNaN(price)) return 0
    return qty * price
  }

  const subtotal = watchedItems.reduce((acc, _, idx) => acc + computeLineSubtotal(idx), 0)
  const igv = Math.round(subtotal * 0.18 * 100) / 100
  const total = subtotal + igv

  // Track which product_ids are already used to prevent duplicates
  const usedProductIds = new Set(
    watchedItems.map((i) => i?.product_id).filter(Boolean),
  )

  function addItem() {
    append({
      product_id: '',
      quantity: '' as unknown as number,
      unit_price: '' as unknown as number,
    })
  }

  function handleProductChange(index: number, productId: string) {
    // Default unit_price from the selected product only if the field is currently empty/untouched
    const currentPrice = getValues(`items.${index}.unit_price`)
    if (currentPrice === '' || currentPrice === undefined || currentPrice === null) {
      const product = products.find((p) => p.id === productId)
      if (product) {
        setValue(`items.${index}.unit_price`, product.unit_price as unknown as string, {
          shouldValidate: false,
          shouldDirty: false,
        })
      }
    }
  }

  async function onSubmit(data: z.output<typeof invoiceSchema>) {
    const result = await createInvoice(data)

    if (result && !result.ok) {
      toast.error(result.error)
    }
    // On success, createInvoice redirects server-side.
  }

  const hasItems = fields.length > 0

  return (
    <Card className="mx-auto w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Nueva Factura</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">

          {/* Customer */}
          <div className="space-y-1.5">
            <Label htmlFor="customer_id">Cliente *</Label>
            <select
              id="customer_id"
              disabled={isSubmitting}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
              {...register('customer_id')}
            >
              <option value="">— Selecciona un cliente —</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            {errors.customer_id && (
              <p className="text-xs text-destructive" role="alert">
                {errors.customer_id.message}
              </p>
            )}
          </div>

          {/* Invoice date */}
          <div className="space-y-1.5">
            <Label htmlFor="invoice_date">Fecha de factura *</Label>
            <Input
              id="invoice_date"
              type="date"
              disabled={isSubmitting}
              aria-invalid={errors.invoice_date ? true : undefined}
              {...register('invoice_date')}
            />
            {errors.invoice_date && (
              <p className="text-xs text-destructive" role="alert">
                {errors.invoice_date.message}
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
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addItem}
                disabled={isSubmitting}
              >
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
                      <th className="pb-2 pr-3 font-medium w-28">Precio unit.</th>
                      <th className="pb-2 pr-3 font-medium w-28">Subtotal</th>
                      <th className="pb-2 font-medium w-16"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {fields.map((field, index) => {
                      const currentProductId = watchedItems[index]?.product_id
                      const lineSubtotal = computeLineSubtotal(index)
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
                              {...register(`items.${index}.product_id`, {
                                onChange: (e) => handleProductChange(index, e.target.value),
                              })}
                            >
                              <option value="">— Producto —</option>
                              {products.map((p) => (
                                <option
                                  key={p.id}
                                  value={p.id}
                                  disabled={
                                    usedProductIds.has(p.id) && p.id !== currentProductId
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

                          {/* Unit price */}
                          <td className="py-2 pr-3">
                            <Input
                              type="number"
                              step="0.01"
                              min="0"
                              placeholder="0.00"
                              disabled={isSubmitting}
                              aria-invalid={itemErrors?.unit_price ? true : undefined}
                              {...register(`items.${index}.unit_price`)}
                            />
                            {itemErrors?.unit_price && (
                              <p className="mt-0.5 text-xs text-destructive" role="alert">
                                {itemErrors.unit_price.message}
                              </p>
                            )}
                          </td>

                          {/* Line subtotal (read-only) */}
                          <td className="py-2 pr-3">
                            <div className="flex h-9 items-center rounded-md border border-transparent bg-muted px-3 text-sm text-muted-foreground">
                              {formatCurrency(lineSubtotal)}
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

            {/* Summary box: Subtotal / IGV / Total */}
            {hasItems && (
              <div className="flex justify-end border-t pt-3">
                <div className="w-56 space-y-1 text-sm">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-muted-foreground">
                    <span>IGV (18%):</span>
                    <span>{formatCurrency(igv)}</span>
                  </div>
                  <div className="flex justify-between border-t pt-1 font-semibold">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !isValid || !hasItems}
            >
              {isSubmitting ? 'Emitiendo…' : 'Emitir factura'}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => router.push('/invoices')}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
