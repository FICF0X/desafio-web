import { ProductForm } from '@/features/products/components/product-form'

export default function NewProductPage() {
  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <ProductForm mode="create" />
      </div>
    </main>
  )
}
