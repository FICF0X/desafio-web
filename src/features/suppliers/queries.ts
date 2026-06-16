import { createClient } from '@/lib/supabase/server'
import type { Supplier } from './types'

/**
 * List all active suppliers ordered by name.
 */
export async function listSuppliers(): Promise<Supplier[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('suppliers')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[suppliers] listSuppliers error:', error.message, error.code)
    return []
  }

  return (data ?? []) as Supplier[]
}
