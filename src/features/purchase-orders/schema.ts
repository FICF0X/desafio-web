import { z } from 'zod'

/**
 * Zod v4 + @hookform/resolvers compatible numeric helpers.
 * Mirrors the string/number union + transform pattern from products/schema.ts.
 */

const numericPositiveInt = z
  .union([z.string(), z.number()])
  .transform((val) => {
    if (val === '' || val === undefined || val === null) return undefined
    const n = Number(val)
    // Keep the raw number (do NOT truncate) so .int() can reject decimals
    // like 1.5 with a proper validation message instead of silently rounding.
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
      .number({ message: 'El costo unitario es obligatorio.' })
      .min(0, { message: 'El costo unitario no puede ser negativo.' }),
  )

export const poItemSchema = z.object({
  product_id: z
    .string()
    .uuid({ message: 'Debe seleccionar un producto válido.' }),
  quantity: numericPositiveInt,
  unit_cost: numericNonNegative,
})

export type PoItemInput = z.infer<typeof poItemSchema>

export const poSchema = z
  .object({
    supplier_id: z
      .string()
      .uuid({ message: 'Debe seleccionar un proveedor válido.' }),
    order_date: z
      .string()
      .min(1, { message: 'La fecha de orden es obligatoria.' }),
    notes: z.string().optional(),
    items: z
      .array(poItemSchema)
      .min(1, { message: 'Se requiere al menos un artículo.' }),
  })
  .refine(
    (data) => {
      const ids = data.items.map((i) => i.product_id)
      return ids.length === new Set(ids).size
    },
    {
      message: 'No se puede agregar el mismo producto dos veces en la misma orden.',
      path: ['items'],
    },
  )

export type PoInput = z.infer<typeof poSchema>
