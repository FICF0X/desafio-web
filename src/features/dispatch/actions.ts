'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { createDispatchSchema } from './schema'
import { NEXT_STATUS } from './types'
import type { DispatchStatus } from './types'

export type DispatchActionResult =
  | { ok: true }
  | { ok: false; error: string }

export type AdvanceDispatchResult =
  | { ok: true; status: DispatchStatus }
  | { ok: false; error: string }

/**
 * Create a new dispatch for an issued invoice.
 *
 * Code is generated as D-YYYY-NNNN (per-year sequence based on count).
 * UNIQUE(invoice_id) is enforced at DB level — a 23505 violation means the
 * invoice already has a dispatch and surfaces as a friendly Spanish message.
 * On success revalidates /dispatches and redirects to the new dispatch detail.
 */
export async function createDispatch(
  formData: FormData,
): Promise<DispatchActionResult> {
  const raw = {
    invoice_id: formData.get('invoice_id'),
    address: formData.get('address') ?? undefined,
    carrier: formData.get('carrier') ?? undefined,
    tracking_code: formData.get('tracking_code') ?? undefined,
    notes: formData.get('notes') ?? undefined,
  }

  const parsed = createDispatchSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: first?.message ?? 'Datos inválidos.' }
  }

  const { invoice_id, address, carrier, tracking_code, notes } = parsed.data

  const supabase = await createClient()

  // Generate code D-YYYY-NNNN
  const year = new Date().getFullYear()

  const { count: existingCount, error: countError } = await supabase
    .from('dispatches')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', `${year}-01-01`)
    .lt('created_at', `${year + 1}-01-01`)

  if (countError) {
    console.error('[dispatch] createDispatch count error:', countError.message)
    return {
      ok: false,
      error: 'Ocurrió un error al generar el código. Inténtalo de nuevo.',
    }
  }

  const seq = (existingCount ?? 0) + 1
  const code = `D-${year}-${String(seq).padStart(4, '0')}`

  const { data, error } = await supabase
    .from('dispatches')
    .insert({
      code,
      invoice_id,
      address: address || null,
      carrier: carrier || null,
      tracking_code: tracking_code || null,
      notes: notes || null,
    })
    .select('id')
    .single()

  if (error) {
    console.error(
      '[dispatch] createDispatch insert error:',
      error.message,
      error.code,
    )

    if (
      error.code === '23505' &&
      error.message.toLowerCase().includes('invoice_id')
    ) {
      return {
        ok: false,
        error: 'Esta factura ya tiene un despacho registrado.',
      }
    }

    if (error.code === '23505') {
      return {
        ok: false,
        error: 'Ya existe un despacho con ese código. Inténtalo de nuevo.',
      }
    }

    return {
      ok: false,
      error: 'Ocurrió un error al registrar el despacho. Inténtalo de nuevo.',
    }
  }

  const newId = data.id as string

  revalidatePath('/dispatches')
  redirect(`/dispatches/${newId}`)
}

/**
 * Advance a dispatch to the next status using compare-and-swap semantics.
 *
 * The action recomputes the next status from NEXT_STATUS instead of trusting
 * the client. The UPDATE is conditional on status=current to prevent races.
 * If 0 rows are affected the status was changed by another request — return a
 * friendly Spanish "recarga la página" error.
 */
export async function advanceDispatchStatus(
  id: string,
  current: DispatchStatus,
): Promise<AdvanceDispatchResult> {
  // Defensive guard: a client could send a status string outside the union.
  if (!(current in NEXT_STATUS)) {
    return { ok: false, error: 'Estado inválido.' }
  }

  const next = NEXT_STATUS[current]

  if (next === null) {
    return {
      ok: false,
      error: 'El despacho ya fue entregado. No hay más pasos.',
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dispatches')
    .update({ status: next })
    .eq('id', id)
    .eq('status', current)
    .select('id')

  if (error) {
    console.error(
      '[dispatch] advanceDispatchStatus error:',
      error.message,
      error.code,
    )
    return {
      ok: false,
      error: 'Ocurrió un error al actualizar el estado. Inténtalo de nuevo.',
    }
  }

  if (!data || data.length === 0) {
    return {
      ok: false,
      error: 'El estado del despacho cambió. Recarga la página.',
    }
  }

  revalidatePath('/dispatches')
  revalidatePath(`/dispatches/${id}`)

  return { ok: true, status: next }
}
