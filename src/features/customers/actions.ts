'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { customerSchema, type CustomerInput } from './schema'

export type CustomerActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string; field?: string }

/**
 * Create a new customer.
 *
 * Re-validates server-side (trust boundary — client validation is UX only).
 * On success, revalidates the customers list cache and redirects.
 */
export async function createCustomer(
  input: CustomerInput,
): Promise<CustomerActionResult> {
  const parsed = customerSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: first?.message ?? 'Datos inválidos.' }
  }

  // Normalize empty strings to null for optional fields
  const payload = {
    name: parsed.data.name,
    doc_type: parsed.data.doc_type || null,
    doc_number: parsed.data.doc_number || null,
    email: parsed.data.email || null,
    phone: parsed.data.phone || null,
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('customers')
    .insert([payload])
    .select('id')
    .single()

  if (error) {
    console.error('[customers] createCustomer error:', error.message, error.code)
    return {
      ok: false,
      error: 'Ocurrió un error al guardar el cliente. Inténtalo de nuevo.',
    }
  }

  revalidatePath('/customers')
  redirect('/customers')
  // redirect throws — this return is unreachable but satisfies the return type
  return { ok: true, id: (data as { id: string }).id }
}
