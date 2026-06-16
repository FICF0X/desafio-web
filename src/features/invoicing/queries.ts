import { createClient } from '@/lib/supabase/server'
import type { Invoice, InvoiceWithItems } from './types'

/**
 * List all invoices ordered by invoice_date descending,
 * with customer name joined.
 */
export async function listInvoices(): Promise<Invoice[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('*, customers(name)')
    .order('invoice_date', { ascending: false })

  if (error) {
    console.error('[invoicing] listInvoices error:', error.message, error.code)
    return []
  }

  return (data ?? []) as Invoice[]
}

/**
 * Fetch a single invoice with its items and product names.
 * Returns null if not found.
 */
export async function getInvoice(id: string): Promise<InvoiceWithItems | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('invoices')
    .select('*, customers(name), invoice_items(*, products(name))')
    .eq('id', id)
    .single()

  if (error) {
    if (error.code !== 'PGRST116') {
      console.error('[invoicing] getInvoice error:', error.message, error.code)
    }
    return null
  }

  return data as InvoiceWithItems
}
