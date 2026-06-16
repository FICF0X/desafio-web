import { createClient } from '@/lib/supabase/server'
import type { Product } from './types'

/**
 * Sanitize a search term for use inside a PostgREST `.or()` ilike pattern.
 *
 * PostgREST's filter syntax treats certain characters as metacharacters
 * inside the filter string itself (comma separates conditions, parentheses
 * group them). We strip those out so a crafted search term cannot escape
 * the ilike value and inject additional filter logic.
 *
 * The `%` wildcard is also stripped — we add our own controlled wildcards.
 */
function sanitizeSearch(term: string): string {
  // Remove PostgREST filter metacharacters: % , ( )
  return term.replace(/[%,()\s]+/g, ' ').trim()
}

export interface ListProductsOptions {
  search?: string
  /**
   * When true, returns BOTH active and inactive products so that
   * inactive rows are visible and can be re-enabled via the UI.
   * When false/undefined (default), only is_active=true rows are returned.
   */
  showInactive?: boolean
}

/**
 * List products, ordered by name.
 *
 * By default returns only is_active=true rows.
 * Pass `showInactive: true` to include inactive products (needed so the
 * Enable button can actually reach disabled rows).
 * When `search` is provided, applies a server-side ilike filter on
 * name OR sku — bookmarkable and RLS-safe (no client-side filtering).
 */
export async function listProducts(
  search?: string,
  showInactive?: boolean,
): Promise<Product[]> {
  const supabase = await createClient()

  let query = supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true })

  // Only filter by is_active when NOT showing inactive rows.
  if (!showInactive) {
    query = query.eq('is_active', true)
  }

  if (search && search.trim().length > 0) {
    const safe = sanitizeSearch(search)
    if (safe.length > 0) {
      query = query.or(`name.ilike.%${safe}%,sku.ilike.%${safe}%`)
    }
  }

  const { data, error } = await query

  if (error) {
    console.error('[products] listProducts error:', error.message, error.code)
    return []
  }

  return (data ?? []) as Product[]
}

/**
 * Fetch a single product by ID.
 * Returns null if not found or if an error occurs.
 */
export async function getProduct(id: string): Promise<Product | null> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('id', id)
    .single()

  if (error) {
    // PGRST116 = "row not found" — expected, not a server error
    if (error.code !== 'PGRST116') {
      console.error('[products] getProduct error:', error.message, error.code)
    }
    return null
  }

  return data as Product
}
