import { z } from 'zod'

export const supplierSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'El nombre del proveedor es obligatorio.' })
    .max(200, { message: 'El nombre no puede superar los 200 caracteres.' }),
  tax_id: z
    .string()
    .max(20, { message: 'El RUC no puede superar los 20 caracteres.' })
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email({ message: 'El correo electrónico no es válido.' })
    .optional()
    .or(z.literal('')),
  phone: z
    .string()
    .max(20, { message: 'El teléfono no puede superar los 20 caracteres.' })
    .optional()
    .or(z.literal('')),
})

export type SupplierInput = z.infer<typeof supplierSchema>
