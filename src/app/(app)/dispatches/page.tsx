import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { listDispatches } from '@/features/dispatch/queries'
import { DispatchesTable } from '@/features/dispatch/components/DispatchesTable'

export default async function DispatchesPage() {
  const dispatches = await listDispatches()

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-3xl font-bold tracking-tight">Despachos</h1>
          <Link href="/dispatches/new">
            <Button>Nuevo despacho</Button>
          </Link>
        </div>

        <DispatchesTable rows={dispatches} />
      </div>
    </main>
  )
}
