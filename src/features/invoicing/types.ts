/**
 * Invoice types matching the `invoices` / `invoice_items` table shapes,
 * plus joined view types returned by Supabase select with relations.
 */

export type Invoice = {
  id: string
  code: string
  customer_id: string
  invoice_date: string
  status: 'issued' | 'cancelled'
  subtotal: number
  igv: number
  total: number
  notes: string | null
  created_at: string
  updated_at: string
  /** Populated when queried with `customers(name)` */
  customers?: { name: string } | null
}

export type InvoiceItem = {
  id: string
  invoice_id: string
  product_id: string
  quantity: number
  unit_price: number
  subtotal: number
  created_at: string
  /** Populated when queried with `products(name)` */
  products?: { name: string } | null
}

/** Invoice with nested items — returned by getInvoice() */
export type InvoiceWithItems = Invoice & {
  invoice_items: InvoiceItem[]
}
