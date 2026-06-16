import { notFound } from 'next/navigation'
import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { getDispatch } from '@/features/dispatch/queries'
import { DispatchDetail } from '@/features/dispatch/components/DispatchDetail'

interface DispatchPageProps {
  params: Promise<{ id: string }>
}

export default async function DispatchPage({ params }: DispatchPageProps) {
  const { id } = await params

  const dispatch = await getDispatch(id)

  if (!dispatch) {
    notFound()
  }

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Detalle de Despacho
            </h1>
            <p className="mt-1 font-mono text-sm text-muted-foreground">
              {dispatch.code}
            </p>
          </div>
          <Link href="/dispatches">
            <Button variant="outline" size="sm">
              Volver al listado
            </Button>
          </Link>
        </div>

        <DispatchDetail dispatch={dispatch} />
      </div>
    </main>
  )
}
