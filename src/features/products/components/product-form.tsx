'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { toast } from 'sonner'
import { z } from 'zod'

import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createProduct, updateProduct } from '../actions'
import { productSchema, type ProductInput } from '../schema'

// Raw form values type — what HTML inputs actually emit before zod transforms them.
// z.input<typeof productSchema> gives us string|number for numeric fields (before transform).
type ProductFormValues = z.input<typeof productSchema>

interface ProductFormProps {
  mode: 'create' | 'edit'
  productId?: string
  initialValues?: Partial<ProductInput>
}

export function ProductForm({ mode, productId, initialValues }: ProductFormProps) {
  const router = useRouter()

  const {
    register,
    handleSubmit,
    setError,
    trigger,
    formState: { errors, isSubmitting, isValid },
  // Three-generic: TFieldValues (raw input), TContext, TTransformedValues (output after zod transform)
  } = useForm<ProductFormValues, unknown, ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: initialValues as ProductFormValues,
    // onChange: validates as the user types, so create form gates submit until valid.
    // For edit mode the prefilled values are validated on mount (via trigger() below),
    // which means the submit button is enabled immediately for a valid pre-filled form.
    mode: 'onChange',
  })

  // On edit, the form is pre-filled with valid data but isValid starts false because
  // onChange has not fired yet. Trigger a full validation pass on mount so the submit
  // button is enabled immediately when all prefilled fields are already valid.
  useEffect(() => {
    if (mode === 'edit') {
      void trigger()
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onSubmit(data: ProductInput) {
    const result =
      mode === 'create'
        ? await createProduct(data)
        : await updateProduct(productId!, data)

    if (!result.ok) {
      toast.error(result.error)
      if (result.field === 'sku') {
        setError('sku', { message: result.error })
      }
      return
    }

    const successMessage =
      mode === 'create' ? 'Producto creado correctamente.' : 'Producto actualizado correctamente.'
    toast.success(successMessage)

    // Success — navigate to product list
    router.push('/products')
  }

  const title = mode === 'create' ? 'Nuevo producto' : 'Editar producto'
  const submitLabel = mode === 'create' ? 'Crear producto' : 'Guardar cambios'

  return (
    <Card className="mx-auto w-full max-w-2xl">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          {/* SKU */}
          <div className="space-y-1.5">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              placeholder="ej. PROD-001"
              aria-invalid={errors.sku ? true : undefined}
              disabled={isSubmitting}
              {...register('sku')}
            />
            {errors.sku && (
              <p className="text-xs text-destructive" role="alert">
                {errors.sku.message}
              </p>
            )}
          </div>

          {/* Name */}
          <div className="space-y-1.5">
            <Label htmlFor="name">Nombre</Label>
            <Input
              id="name"
              placeholder="Nombre del producto"
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

          {/* Description */}
          <div className="space-y-1.5">
            <Label htmlFor="description">Descripción (opcional)</Label>
            <Input
              id="description"
              placeholder="Descripción breve"
              disabled={isSubmitting}
              {...register('description')}
            />
          </div>

          {/* Unit Price */}
          <div className="space-y-1.5">
            <Label htmlFor="unit_price">Precio unitario</Label>
            <Input
              id="unit_price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              aria-invalid={errors.unit_price ? true : undefined}
              disabled={isSubmitting}
              {...register('unit_price')}
            />
            {errors.unit_price && (
              <p className="text-xs text-destructive" role="alert">
                {errors.unit_price.message}
              </p>
            )}
          </div>

          {/* Stock Quantity */}
          <div className="space-y-1.5">
            <Label htmlFor="stock_quantity">Cantidad en stock</Label>
            <Input
              id="stock_quantity"
              type="number"
              step="1"
              min="0"
              placeholder="0"
              aria-invalid={errors.stock_quantity ? true : undefined}
              disabled={isSubmitting}
              {...register('stock_quantity')}
            />
            {errors.stock_quantity && (
              <p className="text-xs text-destructive" role="alert">
                {errors.stock_quantity.message}
              </p>
            )}
          </div>

          {/* Unit of Measure */}
          <div className="space-y-1.5">
            <Label htmlFor="unit_of_measure">Unidad de medida (opcional)</Label>
            <Input
              id="unit_of_measure"
              placeholder="ej. kg, unid., litros"
              disabled={isSubmitting}
              {...register('unit_of_measure')}
            />
          </div>

          {/* Category */}
          <div className="space-y-1.5">
            <Label htmlFor="category">Categoría (opcional)</Label>
            <Input
              id="category"
              placeholder="ej. Electrónica"
              disabled={isSubmitting}
              {...register('category')}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="submit"
              disabled={isSubmitting || !isValid}
            >
              {isSubmitting ? 'Guardando…' : submitLabel}
            </Button>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={() => router.push('/products')}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}
