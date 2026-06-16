import { z } from 'zod'

export const loginSchema = z.object({
  email: z.string().email({ message: 'Ingresa un correo electrónico válido.' }),
  password: z
    .string()
    .min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' }),
})

export type LoginInput = z.infer<typeof loginSchema>
