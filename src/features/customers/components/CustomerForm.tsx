'use client'

import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createCustomer } from '../actions'
import { customerSchema } from '../schema'

type CustomerFormValues = z.input<typeof customerSchema>

export function CustomerForm() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<CustomerFormValues>({
    resolver: zodResolver(customerSchema),
    mode: 'onChange',
  })

  async function onSubmit(data: CustomerFormValues) {
    const result = await createCustomer(data)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    toast.success('Cliente creado correctamente.')
    reset()
    router.refresh()
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Nuevo cliente</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-name">Nombre *</Label>
            <Input
              id="customer-name"
              placeholder="Razón social o nombre completo"
              aria-invalid={errors.name ? true : undefined}
              disabled={isSubmitting}
              {...register('name')}
            />
            {errors.name && (
              <p className="text-xs text-destructive" role="alert">
                {errors.name.message}
              </p>
            )}
          </div>

          {/* Tipo de documento */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-doc-type">Tipo de documento (opcional)</Label>
            <Input
              id="customer-doc-type"
              placeholder="ej. RUC, DNI, CE"
              disabled={isSubmitting}
              {...register('doc_type')}
            />
          </div>

          {/* Número de documento */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-doc-number">Número de documento (opcional)</Label>
            <Input
              id="customer-doc-number"
              placeholder="ej. 20123456789"
              disabled={isSubmitting}
              {...register('doc_number')}
            />
          </div>

          {/* Correo */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-email">Correo electrónico (opcional)</Label>
            <Input
              id="customer-email"
              type="email"
              placeholder="cliente@empresa.pe"
              aria-invalid={errors.email ? true : undefined}
              disabled={isSubmitting}
              {...register('email')}
            />
            {errors.email && (
              <p className="text-xs text-destructive" role="alert">
                {errors.email.message}
              </p>
            )}
          </div>

          {/* Teléfono */}
          <div className="space-y-1.5">
            <Label htmlFor="customer-phone">Teléfono (opcional)</Label>
            <Input
              id="customer-phone"
              placeholder="ej. 01-2345678"
              disabled={isSubmitting}
              {...register('phone')}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? 'Guardando…' : 'Guardar cliente'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
