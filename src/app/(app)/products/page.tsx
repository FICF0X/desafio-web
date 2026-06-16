import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { ProductSearch } from '@/features/products/components/product-search'
import { ProductsTable } from '@/features/products/components/products-table'
import { listProducts } from '@/features/products/queries'

interface ProductsPageProps {
  searchParams: Promise<{ q?: string; show?: string }>
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { q, show } = await searchParams

  // show=inactive (or show=all) exposes inactive rows so the Enable button works.
  const showInactive = show === 'inactive' || show === 'all'
  const products = await listProducts(q, showInactive)

  // Build toggle href — preserves the current `q` search param.
  const toggleParams = new URLSearchParams()
  if (q) toggleParams.set('q', q)
  if (!showInactive) toggleParams.set('show', 'inactive')
  // When already showing inactive, omit `show` to return to active-only view.
  const toggleHref = `/products?${toggleParams.toString()}`

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Productos</h1>
            <p className="mt-1 text-muted-foreground">
              Administra tu catálogo de productos.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link href={toggleHref}>
              <Button variant="outline" size="sm">
                {showInactive ? 'Mostrar solo activos' : 'Mostrar inactivos'}
              </Button>
            </Link>
            <Link href="/products/new">
              <Button>Nuevo producto</Button>
            </Link>
          </div>
        </div>

        <div className="mb-4">
          <ProductSearch defaultValue={q ?? ''} />
        </div>

        <ProductsTable rows={products} />
      </div>
    </main>
  )
}
