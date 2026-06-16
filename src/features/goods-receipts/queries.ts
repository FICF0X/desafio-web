import { createClient } from '@/lib/supabase/server'
import type {
  GoodsReceipt,
  GoodsReceiptDetail,
  PendingPurchaseOrderWithItems,
  PendingPoItem,
} from './types'

/**
 * List all goods receipts with PO code and supplier name, ordered most-recent first.
 */
export async function listGoodsReceipts(): Promise<GoodsReceipt[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('goods_receipts')
    .select('*, purchase_orders(code, suppliers(name))')
    .order('receipt_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      '[goods-receipts] listGoodsReceipts error:',
      error.message,
      error.code,
    )
    return []
  }

  return (data ?? []) as unknown as GoodsReceipt[]
}

/**
 * Fetch a single receipt with PO, supplier, and all line items (including product name).
 * Returns null if not found or on error.
 */
export async function getGoodsReceipt(
  id: string,
): Promise<GoodsReceiptDetail | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('goods_receipts')
    .select(
      '*, purchase_orders(code, suppliers(name)), goods_receipt_items(*, products(name))',
    )
    .eq('id', id)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error(
        '[goods-receipts] getGoodsReceipt error:',
        error.message,
        error.code,
      )
    }
    return null
  }

  return data as unknown as GoodsReceiptDetail
}

/** Raw shape returned by Supabase for the pending PO query. */
type RawPendingPo = {
  id: string
  code: string
  total: number
  suppliers: { name: string }
  purchase_order_items: Array<{
    product_id: string
    quantity: number
    products: { name: string }
  }>
}

/**
 * List all pending purchase orders with their items and product names.
 * Used by /goods-receipts/new to populate the receive form without extra round-trips.
 */
export async function listPendingPurchaseOrdersWithItems(): Promise<
  PendingPurchaseOrderWithItems[]
> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('purchase_orders')
    .select(
      'id, code, total, suppliers(name), purchase_order_items(product_id, quantity, products(name))',
    )
    .eq('status', 'pending')
    .order('order_date', { ascending: false })
    .order('created_at', { ascending: false })

  if (error) {
    console.error(
      '[goods-receipts] listPendingPurchaseOrdersWithItems error:',
      error.message,
      error.code,
    )
    return []
  }

  const rows = (data ?? []) as unknown as RawPendingPo[]

  return rows.map((po) => ({
    id: po.id,
    code: po.code,
    supplier_name: po.suppliers.name,
    total: po.total,
    items: po.purchase_order_items.map(
      (item): PendingPoItem => ({
        product_id: item.product_id,
        product_name: item.products.name,
        quantity: item.quantity,
      }),
    ),
  }))
}
