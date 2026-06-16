/**
 * Supplier type matching the `suppliers` table row shape exactly.
 */
export type Supplier = {
  id: string
  name: string
  tax_id: string | null
  email: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
