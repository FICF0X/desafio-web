/**
 * Customer type matching the `customers` table row shape exactly.
 */
export type Customer = {
  id: string
  name: string
  doc_type: string | null
  doc_number: string | null
  email: string | null
  phone: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}
