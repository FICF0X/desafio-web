import { z } from 'zod'

export const receiveSchema = z.object({
  purchase_order_id: z
    .string()
    .uuid({ message: 'Debe seleccionar una orden de compra válida.' }),
  notes: z.string().trim().max(500).optional(),
})

export type ReceiveInput = z.infer<typeof receiveSchema>
