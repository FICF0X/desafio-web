import { z } from 'zod'

export const customerSchema = z.object({
  name: z
    .string()
    .min(1, { message: 'El nombre del cliente es obligatorio.' })
    .max(200, { message: 'El nombre no puede superar los 200 caracteres.' }),
  doc_type: z
    .string()
    .max(20, { message: 'El tipo de documento no puede superar los 20 caracteres.' })
    .optional()
    .or(z.literal('')),
  doc_number: z
    .string()
    .max(20, { message: 'El número de documento no puede superar los 20 caracteres.' })
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

export type CustomerInput = z.infer<typeof customerSchema>
