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

/** Raw shape returned by Supabase for the issued-invoices query. */
type RawIssuedInvoice = {
  id: string
  code: string
  total: number
  customers: { name: string }
  dispatches: Array<{ id: string }>
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

  // Keep only invoices that have no dispatch yet
  return rows
    .filter((inv) => inv.dispatches.length === 0)
    .map((inv) => ({
      id: inv.id,
      code: inv.code,
      customer_name: inv.customers.name,
      total: inv.total,
    }))
}
