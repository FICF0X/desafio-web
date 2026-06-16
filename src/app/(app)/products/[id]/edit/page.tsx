import { notFound } from 'next/navigation'

import { ProductForm } from '@/features/products/components/product-form'
import { getProduct } from '@/features/products/queries'
import type { ProductInput } from '@/features/products/schema'

interface EditProductPageProps {
  params: Promise<{ id: string }>
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { id } = await params
  const product = await getProduct(id)

  if (!product) {
    notFound()
  }

  // Map the Product row to the form's initial values shape
  const initialValues: ProductInput = {
    sku: product.sku,
    name: product.name,
    unit_price: product.unit_price,
    stock_quantity: product.stock_quantity,
    description: product.description ?? undefined,
    unit_of_measure: product.unit_of_measure ?? undefined,
    category: product.category ?? undefined,
  }

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <ProductForm
          mode="edit"
          productId={id}
          initialValues={initialValues}
        />
      </div>
    </main>
  )
}
