import { z } from 'zod'

/**
 * Numeric helpers — copied from purchase-orders/schema.ts conventions.
 * Keep them local so invoicing has no cross-feature runtime dependency.
 */

const numericPositiveInt = z
  .union([z.string(), z.number()])
  .transform((val) => {
    if (val === '' || val === undefined || val === null) return undefined
    const n = Number(val)
    return isNaN(n) ? undefined : n
  })
  .pipe(
    z
      .number({ message: 'La cantidad es obligatoria.' })
      .int({ message: 'La cantidad debe ser un número entero.' })
      .positive({ message: 'La cantidad debe ser mayor a cero.' }),
  )

const numericNonNegative = z
  .union([z.string(), z.number()])
  .transform((val) => {
    if (val === '' || val === undefined || val === null) return undefined
    const n = Number(val)
    return isNaN(n) ? undefined : n
  })
  .pipe(
    z
      .number({ message: 'El precio unitario es obligatorio.' })
      .min(0, { message: 'El precio unitario no puede ser negativo.' }),
  )

export const invoiceItemSchema = z.object({
  product_id: z
    .string()
    .uuid({ message: 'Debe seleccionar un producto válido.' }),
  quantity: numericPositiveInt,
  unit_price: numericNonNegative,
})

export type InvoiceItemInput = z.infer<typeof invoiceItemSchema>

export const invoiceSchema = z
  .object({
    customer_id: z
      .string()
      .uuid({ message: 'Debe seleccionar un cliente válido.' }),
    invoice_date: z
      .string()
      .min(1, { message: 'La fecha de factura es obligatoria.' }),
    notes: z.string().optional(),
    items: z
      .array(invoiceItemSchema)
      .min(1, { message: 'Se requiere al menos un artículo.' }),
  })
  .refine(
    (data) => {
      const ids = data.items.map((i) => i.product_id)
      return ids.length === new Set(ids).size
    },
    {
      message: 'No se puede agregar el mismo producto dos veces en la misma factura.',
      path: ['items'],
    },
  )

export type InvoiceInput = z.infer<typeof invoiceSchema>
