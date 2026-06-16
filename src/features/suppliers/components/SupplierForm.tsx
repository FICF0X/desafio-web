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
import { createSupplier } from '../actions'
import { supplierSchema } from '../schema'

type SupplierFormValues = z.input<typeof supplierSchema>

export function SupplierForm() {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm<SupplierFormValues>({
    resolver: zodResolver(supplierSchema),
    mode: 'onChange',
  })

  async function onSubmit(data: SupplierFormValues) {
    const result = await createSupplier(data)

    if (!result.ok) {
      toast.error(result.error)
      return
    }

    toast.success('Proveedor creado correctamente.')
    reset()
    router.refresh()
  }

  return (
    <Card className="w-full max-w-xl">
      <CardHeader>
        <CardTitle>Nuevo proveedor</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier-name">Nombre *</Label>
            <Input
              id="supplier-name"
              placeholder="Razón social o nombre comercial"
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

          {/* RUC */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier-tax-id">RUC (opcional)</Label>
            <Input
              id="supplier-tax-id"
              placeholder="ej. 20123456789"
              disabled={isSubmitting}
              {...register('tax_id')}
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <Label htmlFor="supplier-email">Correo electrónico (opcional)</Label>
            <Input
              id="supplier-email"
              type="email"
              placeholder="proveedor@empresa.pe"
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
            <Label htmlFor="supplier-phone">Teléfono (opcional)</Label>
            <Input
              id="supplier-phone"
              placeholder="ej. 01-4512345"
              disabled={isSubmitting}
              {...register('phone')}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={isSubmitting || !isValid}>
              {isSubmitting ? 'Guardando…' : 'Guardar proveedor'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
