/**
 * Dispatch feature types — hand-written to match DB row shapes exactly.
 */

/** Allowed dispatch lifecycle statuses. */
export type DispatchStatus = 'pending' | 'in_transit' | 'delivered'

/** Forward-only status transition map. null means terminal (no next step). */
export const NEXT_STATUS: Record<DispatchStatus, DispatchStatus | null> = {
  pending: 'in_transit',
  in_transit: 'delivered',
  delivered: null,
}

/** Spanish display labels for each dispatch status. */
export const STATUS_LABEL: Record<DispatchStatus, string> = {
  pending: 'Pendiente',
  in_transit: 'En camino',
  delivered: 'Entregada',
}

/** Minimal customer shape embedded in joins. */
export type CustomerRef = {
  name: string
}

/** Minimal invoice shape embedded in list rows. */
export type InvoiceRef = {
  code: string
  total: number
  customers: CustomerRef
}

/** Minimal product shape embedded in invoice item rows. */
export type ProductRef = {
  name: string
}

/** Invoice line item with product name — used in dispatch detail. */
export type DispatchInvoiceItem = {
  id: string
  invoice_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
  products: ProductRef
}

/** Invoice shape with items — embedded in dispatch detail. */
export type InvoiceRefWithItems = {
  code: string
  total: number
  customers: CustomerRef
  invoice_items: DispatchInvoiceItem[]
}

/** Raw dispatch row returned by Supabase (list query). */
export type Dispatch = {
  id: string
  code: string
  invoice_id: string
  dispatch_date: string
  status: DispatchStatus
  address: string | null
  carrier: string | null
  tracking_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
  invoices: InvoiceRef
}

/** Flattened row for the list table (joins resolved). */
export type DispatchListRow = {
  id: string
  code: string
  dispatch_date: string
  invoice_code: string
  customer_name: string
  status: DispatchStatus
}

/** Full dispatch detail — header + invoice items. */
export type DispatchDetail = {
  id: string
  code: string
  invoice_id: string
  dispatch_date: string
  status: DispatchStatus
  address: string | null
  carrier: string | null
  tracking_code: string | null
  notes: string | null
  created_at: string
  updated_at: string
  invoices: InvoiceRefWithItems
}

/** An issued invoice with no dispatch — shown in the DispatchForm selector. */
export type DispatchableInvoice = {
  id: string
  code: string
  customer_name: string
  total: number
}
