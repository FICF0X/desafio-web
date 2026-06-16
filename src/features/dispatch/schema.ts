import { z } from 'zod'

export const createDispatchSchema = z.object({
  invoice_id: z
    .string()
    .uuid({ message: 'Debe seleccionar una factura válida.' }),
  address: z.string().trim().max(500).optional(),
  carrier: z.string().trim().max(200).optional(),
  tracking_code: z.string().trim().max(200).optional(),
  notes: z.string().trim().max(500).optional(),
})

export type CreateDispatchInput = z.infer<typeof createDispatchSchema>
