/**
 * Goods receipts types — hand-written to match DB row shapes exactly.
 */

/** Minimal purchase order shape embedded in receipt rows. */
export type PurchaseOrderRef = {
  code: string
  suppliers: {
    name: string
  }
}

/** Minimal product shape embedded in receipt item rows. */
export type ProductRef = {
  name: string
}

/** Receipt header row — used in the list view. */
export type GoodsReceipt = {
  id: string
  code: string
  purchase_order_id: string
  receipt_date: string
  notes: string | null
  created_at: string
  updated_at: string
  purchase_orders: PurchaseOrderRef
}

/** Receipt line item row — includes product join for detail view. */
export type GoodsReceiptItem = {
  id: string
  goods_receipt_id: string
  product_id: string
  quantity: number
  created_at: string
  products: ProductRef
}

/** Flattened row for the list table (joins resolved). */
export type GoodsReceiptListRow = {
  id: string
  code: string
  receipt_date: string
  po_code: string
  supplier_name: string
}

/** Full receipt detail — header + items array. */
export type GoodsReceiptDetail = {
  id: string
  code: string
  purchase_order_id: string
  receipt_date: string
  notes: string | null
  created_at: string
  updated_at: string
  purchase_orders: PurchaseOrderRef
  goods_receipt_items: GoodsReceiptItem[]
}

/** A single item within a pending purchase order (for the receive form). */
export type PendingPoItem = {
  product_id: string
  product_name: string
  quantity: number
}

/** A pending purchase order with its items — used to populate the receive form. */
export type PendingPurchaseOrderWithItems = {
  id: string
  code: string
  supplier_name: string
  total: number
  items: PendingPoItem[]
}
