import { z } from 'zod'

/**
 * Zod v4 + @hookform/resolvers compatible approach:
 * Numeric fields accept string OR number inputs (matching what <input type="number"> emits
 * — either a string from the raw HTML or a number from defaultValues) and transform
 * to number in the output. This satisfies the resolver's type constraint where
 * z.input<T> must extend FieldValues (Record<string, any>).
 */

const numericPrice = z
  .union([z.string(), z.number()])
  .transform((val) => {
    // Blank string is NOT the same as the number 0 — require explicit input.
    if (typeof val === 'string' && val.trim() === '') return undefined
    const n = Number(val)
    return isNaN(n) ? undefined : n
  })
  .pipe(
    z
      .number({ message: 'Unit price is required.' })
      .nonnegative({ message: 'Price must be 0 or greater.' }),
  )

const numericQty = z
  .union([z.string(), z.number()])
  .transform((val) => {
    if (val === '' || val === undefined || val === null) return 0
    const n = Number(val)
    return isNaN(n) ? 0 : Math.floor(n)
  })
  .pipe(
    z
      .number({ message: 'Stock quantity must be a number.' })
      .int({ message: 'Stock quantity must be a whole number.' })
      .nonnegative({ message: 'Stock quantity cannot be negative.' }),
  )

export const productSchema = z.object({
  sku: z
    .string()
    .min(1, { message: 'SKU is required.' })
    .max(64, { message: 'SKU must be 64 characters or fewer.' }),
  name: z
    .string()
    .min(1, { message: 'Name is required.' })
    .max(200, { message: 'Name must be 200 characters or fewer.' }),
  unit_price: numericPrice,
  stock_quantity: numericQty.optional().default(0),
  description: z.string().optional(),
  unit_of_measure: z.string().optional(),
  category: z.string().optional(),
})

export type ProductInput = z.infer<typeof productSchema>
