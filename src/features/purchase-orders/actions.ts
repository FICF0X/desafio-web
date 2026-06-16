'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { poSchema, type PoInput } from './schema'

export type PoActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

/**
 * Create a new purchase order via the create_purchase_order RPC.
 *
 * The RPC handles atomicity (header + items in one transaction),
 * code generation (OC-YYYY-NNNN), and total computation.
 * On success redirects to /purchase-orders/[id].
 */
export async function createPurchaseOrder(input: PoInput): Promise<PoActionResult> {
  const parsed = poSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: first?.message ?? 'Datos inválidos.' }
  }

  const { supplier_id, order_date, notes, items } = parsed.data

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_purchase_order', {
    p_supplier_id: supplier_id,
    p_order_date: order_date,
    p_notes: notes ?? null,
    p_items: items as unknown as string,
  })

  if (error) {
    console.error(
      '[purchase-orders] createPurchaseOrder RPC error:',
      error.message,
      error.code,
    )
    return {
      ok: false,
      error: 'Ocurrió un error al registrar la orden. Inténtalo de nuevo.',
    }
  }

  const newId = data as string
  revalidatePath('/purchase-orders')
  redirect(`/purchase-orders/${newId}`)
}

/**
 * Cancel a pending purchase order.
 *
 * Only orders with status 'pending' can be cancelled.
 * Returns an error if the order is not pending.
 */
export async function cancelPurchaseOrder(id: string): Promise<PoActionResult> {
  const supabase = await createClient()

  // Fetch current status before updating
  const { data: current, error: fetchError } = await supabase
    .from('purchase_orders')
    .select('status')
    .eq('id', id)
    .single()

  if (fetchError || !current) {
    return { ok: false, error: 'No se encontró la orden de compra.' }
  }

  if (current.status !== 'pending') {
    return {
      ok: false,
      error: 'Solo se pueden cancelar órdenes en estado Pendiente.',
    }
  }

  const { error: updateError } = await supabase
    .from('purchase_orders')
    .update({ status: 'cancelled' })
    .eq('id', id)

  if (updateError) {
    console.error(
      '[purchase-orders] cancelPurchaseOrder error:',
      updateError.message,
      updateError.code,
    )
    return { ok: false, error: 'Ocurrió un error al cancelar la orden. Inténtalo de nuevo.' }
  }

  revalidatePath('/purchase-orders')
  revalidatePath(`/purchase-orders/${id}`)
  return { ok: true, id }
}
