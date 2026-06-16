'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'
import { supplierSchema, type SupplierInput } from './schema'

export type SupplierActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; field?: string }

/**
 * Create a new supplier.
 *
 * Re-validates server-side (trust boundary — client validation is UX only).
 * On success, revalidates the suppliers list cache.
 */
export async function createSupplier(
  input: SupplierInput,
): Promise<SupplierActionResult> {
  const parsed = supplierSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: first?.message ?? 'Datos inválidos.' }
  }

  // Normalize empty strings to null for optional fields
  const payload = {
    name: parsed.data.name,
    tax_id: parsed.data.tax_id || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('suppliers')
    .insert([payload])
    .select('id')
    .single()

  if (error) {
    console.error('[suppliers] createSupplier error:', error.message, error.code)
    return { ok: false, error: 'Ocurrió un error al guardar el proveedor. Inténtalo de nuevo.' }
  }

  revalidatePath('/suppliers')
  return { ok: true, id: data.id as string }
}
