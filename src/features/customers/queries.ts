import { createClient } from '@/lib/supabase/server'
import type { Customer } from './types'

/**
 * List all active customers ordered by name.
 */
export async function listCustomers(): Promise<Customer[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .select('*')
    .eq('is_active', true)
    .order('name', { ascending: true })

  if (error) {
    console.error('[customers] listCustomers error:', error.message, error.code)
    return []
  }

  return (data ?? []) as Customer[]
}
