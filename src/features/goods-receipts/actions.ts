'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { receiveSchema } from './schema'

export type ReceiveActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

/**
 * Receive a purchase order via the receive_purchase_order RPC.
 *
 * The RPC handles atomicity: receipt header, receipt items, stock increment,
 * and PO status flip all run in a single transaction.
 * On success revalidates related paths and redirects to the new receipt detail.
 */
export async function receiveGoodsReceipt(
  formData: FormData,
): Promise<ReceiveActionResult> {
  const raw = {
    purchase_order_id: formData.get('purchase_order_id'),
    notes: formData.get('notes') ?? undefined,
  }

  const parsed = receiveSchema.safeParse(raw)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: first?.message ?? 'Datos inválidos.' }
  }

  const { purchase_order_id, notes } = parsed.data

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('receive_purchase_order', {
    p_purchase_order_id: purchase_order_id,
    p_notes: notes ?? null,
  })

  if (error) {
    console.error(
      '[goods-receipts] receiveGoodsReceipt RPC error:',
      error.message,
      error.code,
    )

    const msg = error.message ?? ''
    const code = error.code ?? ''

    if (msg.includes('NOT_PENDING')) {
      return {
        ok: false,
        error: 'La orden ya fue recibida o no está pendiente.',
      }
    }

    if (code === '23505' || msg.toLowerCase().includes('duplicate') || msg.toLowerCase().includes('unique')) {
      return {
        ok: false,
        error: 'Esta orden ya tiene un ingreso registrado.',
      }
    }

    return {
      ok: false,
      error: 'Ocurrió un error al registrar el ingreso. Inténtalo de nuevo.',
    }
  }

  const newId = data as string

  revalidatePath('/goods-receipts')
  revalidatePath('/products')
  revalidatePath('/purchase-orders')

  redirect(`/goods-receipts/${newId}`)
}
