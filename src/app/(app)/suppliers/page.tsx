import { listSuppliers } from '@/features/suppliers/queries'
import { SupplierForm } from '@/features/suppliers/components/SupplierForm'
import { SuppliersTable } from '@/features/suppliers/components/SuppliersTable'

export default async function SuppliersPage() {
  const suppliers = await listSuppliers()

  return (
    <main className="min-h-full bg-background p-8">
      <div className="mx-auto max-w-5xl space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Proveedores</h1>
          <p className="mt-1 text-muted-foreground">
            Administra los proveedores del sistema.
          </p>
        </div>

        <SuppliersTable rows={suppliers} />

        <SupplierForm />
      </div>
    </main>
  )
}
