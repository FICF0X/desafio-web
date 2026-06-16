import { createClient } from '@/lib/supabase/server'

export interface DashboardMetrics {
  productosActivos: number
  stockTotal: number
  stockBajo: number
  ordenesPendientes: number
  facturasEmitidas: number
  totalFacturado: number
  despachosEnCamino: number
  proveedores: number
  clientes: number
}

export async function getDashboardMetrics(): Promise<DashboardMetrics> {
  const supabase = await createClient()

  const [
    productosActivosResult,
    stockResult,
    stockBajoResult,
    ordenesPendientesResult,
    facturasEmitidasResult,
    totalFacturadoResult,
    despachosResult,
    proveedoresResult,
    clientesResult,
  ] = await Promise.all([
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true),
    supabase.from('products').select('stock_quantity').eq('is_active', true),
    supabase.from('products').select('*', { count: 'exact', head: true }).eq('is_active', true).lt('stock_quantity', 10),
    supabase.from('purchase_orders').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('invoices').select('*', { count: 'exact', head: true }).eq('status', 'issued'),
    supabase.from('invoices').select('total').eq('status', 'issued'),
    supabase.from('dispatches').select('*', { count: 'exact', head: true }).eq('status', 'in_transit'),
    supabase.from('suppliers').select('*', { count: 'exact', head: true }),
    supabase.from('customers').select('*', { count: 'exact', head: true }),
  ])

  const stockTotal = (stockResult.data ?? []).reduce(
    (sum: number, p: { stock_quantity: number | null }) => sum + (p.stock_quantity ?? 0),
    0,
  )

  const totalFacturado = (totalFacturadoResult.data ?? []).reduce(
    (sum: number, inv: { total: number | null }) => sum + (inv.total ?? 0),
    0,
  )

  return {
    productosActivos: productosActivosResult.count ?? 0,
    stockTotal,
    stockBajo: stockBajoResult.count ?? 0,
    ordenesPendientes: ordenesPendientesResult.count ?? 0,
    facturasEmitidas: facturasEmitidasResult.count ?? 0,
    totalFacturado,
    despachosEnCamino: despachosResult.count ?? 0,
    proveedores: proveedoresResult.count ?? 0,
    clientes: clientesResult.count ?? 0,
  }
}

export interface RecentInvoice {
  id: string
  code: string
  customer_name: string | null
  total: number
  status: 'issued' | 'cancelled'
  invoice_date: string
}

export async function getRecentInvoices(limit = 5): Promise<RecentInvoice[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('id, code, total, status, invoice_date, customers(name)')
    .order('invoice_date', { ascending: false })
    .limit(limit)

  if (error) {
    console.error('[dashboard] getRecentInvoices error:', error.message)
    return []
  }

  // Supabase infers joined relations as arrays; cast to unknown first
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((row: any) => ({
    id: row.id as string,
    code: row.code as string,
    total: (row.total as number | null) ?? 0,
    status: row.status as 'issued' | 'cancelled',
    invoice_date: row.invoice_date as string,
    // Supabase returns joined one-to-many as array even for FK relations
    customer_name: (Array.isArray(row.customers) ? row.customers[0]?.name : row.customers?.name) ?? null,
  }))
}
