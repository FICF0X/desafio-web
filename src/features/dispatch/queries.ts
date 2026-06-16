import { createClient } from '@/lib/supabase/server'
import type {
  Dispatch,
  DispatchDetail,
  DispatchableInvoice,
} from './types'

/**
 * List all dispatches with invoice code, customer name and status,
 * ordered most-recent first.
 */
export async function listDispatches(): Promise<Dispatch[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dispatches')
    .select('*, invoices(code, total, customers(name))')
    .order('dispatch_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      '[dispatch] listDispatches error:',
      error.message,
      error.code,
    )
    return []
  }

  return (data ?? []) as unknown as Dispatch[]
}

/**
 * Fetch a single dispatch with invoice, customer, and invoice line items.
 * Returns null if not found or on error.
 */
export async function getDispatch(id: string): Promise<DispatchDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dispatches')
    .select(
      '*, invoices(code, total, customers(name), invoice_items(*, products(name)))',
    )
    .eq('id', id)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error(
        '[dispatch] getDispatch error:',
        error.message,
        error.code,
      )
    }
    return null
  }

  return data as unknown as DispatchDetail
}

/**
 * Raw shape returned by Supabase for the issued-invoices query.
 * NOTE: because dispatches.invoice_id is UNIQUE, PostgREST treats the
 * dispatches embed as a one-to-one relationship and returns a single object
 * (or null) rather than an array — so we must handle all three shapes.
 */
type RawIssuedInvoice = {
  id: string
  code: string
  total: number
  customers: { name: string } | { name: string }[] | null
  dispatches: { id: string } | { id: string }[] | null
}

/**
 * List all issued invoices that do NOT yet have a dispatch.
 * PostgREST does not support NOT EXISTS, so we left-embed dispatches(id)
 * and filter in JS where the array is empty — mirrors the
 * listPendingPurchaseOrdersWithItems pattern from goods-receipts.
 */
export async function listDispatchableInvoices(): Promise<
  DispatchableInvoice[]
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('id, code, total, customers(name), dispatches(id)')
    .eq('status', 'issued')
    .order('invoice_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      '[dispatch] listDispatchableInvoices error:',
      error.message,
      error.code,
    )
    return []
  }

  const rows = (data ?? []) as unknown as RawIssuedInvoice[]

  // A dispatch is "absent" when the embed is null or an empty array.
  const hasNoDispatch = (d: RawIssuedInvoice['dispatches']): boolean =>
    d == null || (Array.isArray(d) && d.length === 0)

  // customers may come back as an object (to-one) or array depending on
  // how PostgREST resolves the relationship.
  const customerName = (c: RawIssuedInvoice['customers']): string => {
    if (c == null) return ''
    return Array.isArray(c) ? (c[0]?.name ?? '') : c.name
  }

  // Keep only invoices that have no dispatch yet
  return rows
    .filter((inv) => hasNoDispatch(inv.dispatches))
    .map((inv) => ({
      id: inv.id,
      code: inv.code,
      customer_name: customerName(inv.customers),
      total: inv.total,
    }))
}
