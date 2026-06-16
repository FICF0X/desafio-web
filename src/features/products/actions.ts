'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { productSchema, type ProductInput } from './schema'

// Postgres unique-violation error code
const PG_UNIQUE_VIOLATION = '23505'

export type ActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; field?: string }

/**
 * Create a new product.
 *
 * Re-validates server-side (trust boundary — client validation is UX only).
 * Maps Postgres 23505 to a friendly SKU conflict message.
 * On success, revalidates the products list cache.
 */
export async function createProduct(input: ProductInput): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: first?.message ?? 'Datos inválidos.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .insert([parsed.data])
    .select('id')
    .single()

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      return {
        ok: false,
        error: 'Ya existe un producto con este SKU.',
        field: 'sku',
      }
    }
    console.error('[products] createProduct error:', error.message, error.code)
    return { ok: false, error: 'Ocurrió un error. Inténtalo de nuevo.' }
  }

  revalidatePath('/products')
  return { ok: true, id: data.id as string }
}

/**
 * Update an existing product.
 *
 * Same trust boundary and 23505 mapping as createProduct.
 * On success, revalidates the products list cache.
 */
export async function updateProduct(
  id: string,
  input: ProductInput,
): Promise<ActionResult> {
  const parsed = productSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: first?.message ?? 'Datos inválidos.' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .update(parsed.data)
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    if (error.code === PG_UNIQUE_VIOLATION) {
      return {
        ok: false,
        error: 'Ya existe un producto con este SKU.',
        field: 'sku',
      }
    }
    console.error('[products] updateProduct error:', error.message, error.code)
    return { ok: false, error: 'Ocurrió un error. Inténtalo de nuevo.' }
  }

  revalidatePath('/products')
  return { ok: true, id: data.id as string }
}

/**
 * Toggle the is_active flag on a product (soft delete / re-enable).
 *
 * No redirect — callers (ProductsTable) use this as an inline action
 * and the page revalidates via revalidatePath.
 */
export async function toggleProductActive(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('products')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('id')
    .single()

  if (error) {
    console.error(
      '[products] toggleProductActive error:',
      error.message,
      error.code,
    )
    return { ok: false, error: 'Ocurrió un error. Inténtalo de nuevo.' }
  }

  revalidatePath('/products')
  return { ok: true, id: data.id as string }
}
