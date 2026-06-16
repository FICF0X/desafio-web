import Link from 'next/link'
import {
  TrendingUp,
  Receipt,
  ShoppingCart,
  Truck,
  Package,
  BarChart3,
  AlertTriangle,
  Factory,
  Users,
} from 'lucide-react'

import { createClient } from '@/lib/supabase/server'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { getDashboardMetrics, getRecentInvoices } from '@/features/dashboard/queries'

const formatPEN = (n: number) =>
  new Intl.NumberFormat('es-PE', { style: 'currency', currency: 'PEN' }).format(n)

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('es-PE', { dateStyle: 'medium' }).format(new Date(iso))

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const [metrics, recentInvoices] = await Promise.all([
    getDashboardMetrics(),
    getRecentInvoices(5),
  ])

  return (
    <div className="p-8">
      <div className="mx-auto max-w-6xl space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panel</h1>
          <p className="mt-1 text-muted-foreground">
            Bienvenido,{' '}
            <span className="font-medium text-foreground">{user?.email}</span>
          </p>
        </div>

        {/* Metrics grid */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Resumen</h2>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            {/* Total Facturado */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-emerald-500/10 p-2">
                    <TrendingUp className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">Total Facturado</p>
                    <p className="text-xl font-bold leading-tight">{formatPEN(metrics.totalFacturado)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Facturas Emitidas */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-blue-500/10 p-2">
                    <Receipt className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">Facturas Emitidas</p>
                    <p className="text-xl font-bold leading-tight">{metrics.facturasEmitidas}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Órdenes Pendientes */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-amber-500/10 p-2">
                    <ShoppingCart className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">Órdenes Pendientes</p>
                    <p className="text-xl font-bold leading-tight">{metrics.ordenesPendientes}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Despachos en Camino */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-violet-500/10 p-2">
                    <Truck className="h-5 w-5 text-violet-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">Despachos en Camino</p>
                    <p className="text-xl font-bold leading-tight">{metrics.despachosEnCamino}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Productos Activos */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-sky-500/10 p-2">
                    <Package className="h-5 w-5 text-sky-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">Productos Activos</p>
                    <p className="text-xl font-bold leading-tight">{metrics.productosActivos}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock Total */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-indigo-500/10 p-2">
                    <BarChart3 className="h-5 w-5 text-indigo-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">Stock Total</p>
                    <p className="text-xl font-bold leading-tight">{metrics.stockTotal}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stock Bajo */}
            <Card>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div
                    className={
                      metrics.stockBajo > 0
                        ? 'rounded-lg bg-red-500/10 p-2'
                        : 'rounded-lg bg-muted p-2'
                    }
                  >
                    <AlertTriangle
                      className={
                        metrics.stockBajo > 0
                          ? 'h-5 w-5 text-red-600'
                          : 'h-5 w-5 text-muted-foreground'
                      }
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">Stock Bajo</p>
                    <p
                      className={
                        metrics.stockBajo > 0
                          ? 'text-xl font-bold leading-tight text-red-600'
                          : 'text-xl font-bold leading-tight'
                      }
                    >
                      {metrics.stockBajo}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clientes & Proveedores */}
            <Card>
              <CardContent className="p-5 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-teal-500/10 p-2">
                    <Users className="h-5 w-5 text-teal-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">Clientes</p>
                    <p className="text-xl font-bold leading-tight">{metrics.clientes}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-orange-500/10 p-2">
                    <Factory className="h-5 w-5 text-orange-600" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-xs text-muted-foreground">Proveedores</p>
                    <p className="text-xl font-bold leading-tight">{metrics.proveedores}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Recent invoices */}
        <div>
          <h2 className="mb-4 text-lg font-semibold">Actividad reciente</h2>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Fecha</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentInvoices.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Sin facturas recientes
                      </TableCell>
                    </TableRow>
                  ) : (
                    recentInvoices.map((inv) => (
                      <TableRow key={inv.id}>
                        <TableCell className="font-medium">
                          <Link
                            href={`/invoices/${inv.id}`}
                            className="text-primary underline-offset-4 hover:underline"
                          >
                            {inv.code}
                          </Link>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {inv.customer_name ?? '—'}
                        </TableCell>
                        <TableCell>{formatPEN(inv.total)}</TableCell>
                        <TableCell>
                          {inv.status === 'issued' ? (
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                              Emitida
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700 dark:bg-red-900/30 dark:text-red-400">
                              Anulada
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(inv.invoice_date)}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
