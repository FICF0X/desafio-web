/**
 * Purchase order types — hand-written to match DB row shapes exactly.
 */

/** Minimal supplier shape embedded in PO list/detail rows. */
export type SupplierRef = {
  name: string
}

/** Minimal product shape embedded in PO item rows. */
export type ProductRef = {
  name: string
}

/** PO header row — used in the list view (includes supplier join). */
export type PurchaseOrder = {
  id: string
  code: string
  supplier_id: string
  order_date: string
  status: 'pending' | 'received' | 'cancelled'
  notes: string | null
  total: number
  created_at: string
  updated_at: string
  suppliers: SupplierRef
}

/** PO line item row — includes product join for detail view. */
export type PurchaseOrderItem = {
  id: string
  purchase_order_id: string
  product_id: string
  quantity: number
  unit_cost: number
  subtotal: number
  created_at: string
  products: ProductRef
}

/** Full PO detail — header + supplier + items array. */
export type PurchaseOrderDetail = {
  id: string
  code: string
  supplier_id: string
  order_date: string
  status: 'pending' | 'received' | 'cancelled'
  notes: string | null
  total: number
  created_at: string
  updated_at: string
  suppliers: SupplierRef
  purchase_order_items: PurchaseOrderItem[]
}
