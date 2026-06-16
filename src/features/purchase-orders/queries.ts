import { createClient } from '@/lib/supabase/server'
import type { PurchaseOrder, PurchaseOrderDetail } from './types'

/**
 * List all purchase orders with supplier name, ordered most-recent first.
 */
export async function listPurchaseOrders(): Promise<PurchaseOrder[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name)')
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      '[purchase-orders] listPurchaseOrders error:',
      error.message,
      error.code,
    )
    return []
  }

  return (data ?? []) as unknown as PurchaseOrder[]
}

/**
 * Fetch a single PO with supplier and all line items (including product name).
 * Returns null if not found or on error.
 */
export async function getPurchaseOrder(
  id: string,
): Promise<PurchaseOrderDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('purchase_orders')
    .select('*, suppliers(name), purchase_order_items(*, products(name))')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error(
        '[purchase-orders] getPurchaseOrder error:',
        error.message,
        error.code,
      )
    }
    return null
  }

  return data as unknown as PurchaseOrderDetail
}
