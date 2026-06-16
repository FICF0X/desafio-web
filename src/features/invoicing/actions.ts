'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'
import { invoiceSchema, type InvoiceInput } from './schema'

export type InvoiceActionResult =
  | { ok: true; id: string }
  | { ok: false; error: string }

/**
 * Create a new invoice via the create_invoice RPC.
 *
 * The RPC handles atomicity: stock-check, header+items insert,
 * stock decrement, code generation — all in one transaction.
 * On success, revalidates /invoices and /products, then redirects
 * to the invoice detail page.
 */
export async function createInvoice(
  input: InvoiceInput,
): Promise<InvoiceActionResult> {
  const parsed = invoiceSchema.safeParse(input)
  if (!parsed.success) {
    const first = parsed.error.issues[0]
    return { ok: false, error: first?.message ?? 'Datos inválidos.' }
  }

  const { customer_id, invoice_date, notes, items } = parsed.data

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('create_invoice', {
    p_customer_id: customer_id,
    p_invoice_date: invoice_date,
    p_notes: notes ?? null,
    p_items: items as unknown as string,
  })

  if (error) {
    console.error('[invoicing] createInvoice RPC error:', error.message, error.code)

    // Extract product name from INSUFFICIENT_STOCK:<product_name>
    if (error.message.includes('INSUFFICIENT_STOCK:')) {
      const productName = error.message.split('INSUFFICIENT_STOCK:')[1]?.trim() ?? ''
      return {
        ok: false,
        error: `Stock insuficiente para el producto: ${productName}. Ajusta la cantidad.`,
      }
    }

    return {
      ok: false,
      error: 'Ocurrió un error al emitir la factura. Inténtalo de nuevo.',
    }
  }

  const newId = data as string
  revalidatePath('/invoices')
  revalidatePath('/products')
  redirect(`/invoices/${newId}`)
}
