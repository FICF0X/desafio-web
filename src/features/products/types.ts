/**
 * Hand-written Product type matching the `products` table row shape exactly.
 * Supabase generated types are deferred as a future improvement (ADR-5).
 */
export type Product = {
  id: string
  sku: string
  name: string
  description: string | null
  unit_price: number
  stock_quantity: number
  unit_of_measure: string | null
  category: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
