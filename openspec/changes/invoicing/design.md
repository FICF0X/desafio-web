# Design: Facturación (Module 5)

## Technical Approach

Mirror Modules 2-4 exactly. Issue-an-invoice is a single Postgres RPC `create_invoice` (SECURITY INVOKER) because stock check + decrement + header insert + items insert MUST be one transaction — PostgREST cannot batch statements, so split writes could decrement stock then fail (or oversell under concurrency). The RPC locks each product row `FOR UPDATE`, validates `stock_quantity >= quantity`, raises `INSUFFICIENT_STOCK:<name>` (whole txn rolls back) on shortfall, computes line subtotals + `igv = round(subtotal*0.18, 2)` + total, generates `F-YYYY-NNNN`, inserts, decrements stock. Two new feature modules (`customers`, `invoicing`) follow the `actions/schema/queries/components/types` layout. Additive migration `0004_invoicing.sql`. The InvoiceForm is the PurchaseOrderForm with one extra behavior (unit_price defaults from the product) plus a Subtotal/IGV/Total summary instead of a single total.

## Architecture Decisions

| Decision | Choice | Rejected | Rationale |
|----------|--------|----------|-----------|
| Atomicity | Single RPC `create_invoice` | Multiple Server-Action writes | Check + decrement + insert are inseparable; PostgREST has no multi-statement txn. |
| Concurrency | `SELECT ... FOR UPDATE` per product before check | Optimistic / no lock | Row lock serializes concurrent invoices on the same product, preventing oversell; the in-RPC check + decrement is then atomic. |
| Stock error surfacing | `RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', product_name` | Boolean return / silent skip | Lets the action `.includes('INSUFFICIENT_STOCK')` and show a Spanish toast naming the product; rollback is automatic. |
| Code generation | `F-YYYY-NNNN`, per-year `count(*)+1` in RPC | Postgres sequence object | Mirrors `OC-`/`ING-`; no extra DDL, demo-adequate (single-writer-safe under the row lock). |
| IGV storage | Store `subtotal`,`igv`,`total` on header | Compute on read | Snapshot at issue time; immune to future rate changes; Module 6 reads issued totals. |
| Unit price default | Default from `products.unit_price`, editable | Hardcode product price | Supports per-line discount/negotiation (proposal assumption). |
| Customer master | Minimal table + seed + `/customers` | Full CRM | Brief needs selection only; mirrors suppliers scope. |
| Items payload | `jsonb` arg, iterate `jsonb_array_elements` with casts | Postgres array of composite type | Reuses the exact `create_purchase_order` pattern the codebase already proves. |

## Data Flow — create invoice (Mermaid)

```mermaid
sequenceDiagram
  participant U as InvoiceForm (client)
  participant A as createInvoice (Server Action)
  participant DB as Supabase / create_invoice RPC
  U->>A: onSubmit(zod-validated values)
  A->>A: invoiceSchema.safeParse (re-validate, trust boundary)
  A->>DB: rpc('create_invoice', {customer_id, invoice_date, notes, items})
  Note over DB: BEGIN txn
  loop each item
    DB->>DB: SELECT stock_quantity FROM products WHERE id=? FOR UPDATE
    alt stock < quantity
      DB-->>A: RAISE INSUFFICIENT_STOCK:<name> (ROLLBACK)
    end
  end
  DB->>DB: subtotal=Σ(qty*price); igv=round(subtotal*0.18,2); total=subtotal+igv
  DB->>DB: code F-YYYY-NNNN; INSERT invoice header + items
  DB->>DB: UPDATE products SET stock_quantity = stock_quantity - qty (each)
  Note over DB: COMMIT
  DB-->>A: invoice id
  alt error contains INSUFFICIENT_STOCK
    A-->>U: { ok:false, error: "Stock insuficiente para <producto>" } → toast
  else
    A->>A: revalidatePath('/invoices') + revalidatePath('/products')
    A-->>U: redirect('/invoices/{id}')
  end
```

## RPC contract (load-bearing — implement verbatim)

```sql
CREATE OR REPLACE FUNCTION public.create_invoice(
  p_customer_id uuid, p_invoice_date date, p_notes text, p_items jsonb
) RETURNS uuid LANGUAGE plpgsql SECURITY INVOKER AS $$
DECLARE
  v_year int; v_seq int; v_code text;
  v_subtotal numeric(12,2) := 0; v_igv numeric(12,2); v_total numeric(12,2);
  v_id uuid; v_item jsonb;
  v_pid uuid; v_qty int; v_price numeric(12,2); v_line numeric(12,2);
  v_stock int; v_name text;
BEGIN
  -- 1. lock + validate stock per item (FOR UPDATE serializes concurrent issues)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;
    SELECT stock_quantity, name INTO v_stock, v_name
      FROM public.products WHERE id = v_pid FOR UPDATE;
    IF v_stock IS NULL THEN RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', v_pid; END IF;
    IF v_stock < v_qty THEN RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_name; END IF;
  END LOOP;
  -- 2. totals
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty   := (v_item->>'quantity')::int;
    v_price := (v_item->>'unit_price')::numeric(12,2);
    v_subtotal := v_subtotal + (v_qty * v_price);
  END LOOP;
  v_igv := round(v_subtotal * 0.18, 2);
  v_total := v_subtotal + v_igv;
  -- 3. code F-YYYY-NNNN
  v_year := EXTRACT(YEAR FROM p_invoice_date)::int;
  SELECT COUNT(*) + 1 INTO v_seq FROM public.invoices
    WHERE EXTRACT(YEAR FROM invoice_date) = v_year;
  v_code := 'F-' || v_year::text || '-' || LPAD(v_seq::text, 4, '0');
  -- 4. header
  INSERT INTO public.invoices (code, customer_id, invoice_date, notes, subtotal, igv, total)
  VALUES (v_code, p_customer_id, p_invoice_date, p_notes, v_subtotal, v_igv, v_total)
  RETURNING id INTO v_id;
  -- 5. items + 6. decrement stock
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid := (v_item->>'product_id')::uuid;
    v_qty := (v_item->>'quantity')::int;
    v_price := (v_item->>'unit_price')::numeric(12,2);
    v_line := v_qty * v_price;
    INSERT INTO public.invoice_items (invoice_id, product_id, quantity, unit_price, subtotal)
    VALUES (v_id, v_pid, v_qty, v_price, v_line);
    UPDATE public.products SET stock_quantity = stock_quantity - v_qty WHERE id = v_pid;
  END LOOP;
  RETURN v_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.create_invoice(uuid, date, text, jsonb) TO authenticated;
```

Tables `customers`, `invoices`, `invoice_items` follow the 0002 DDL style (RLS authenticated select/insert[/update], `set_updated_at()` trigger on `customers`+`invoices`, seed customers). Constraints per the change brief (status check, numeric `>= 0` checks, `quantity > 0`, FK `invoice_items.invoice_id ... ON DELETE CASCADE`, `code` unique).

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `supabase/migrations/0004_invoicing.sql` | Create | customers + invoices + invoice_items + RLS + triggers + seed + `create_invoice` RPC |
| `src/features/customers/{types,schema,queries,actions}.ts` | Create | mirror suppliers; `customerSchema`, `listCustomers`, `createCustomer` |
| `src/features/customers/components/{CustomerForm,CustomersTable}.tsx` | Create | mirror suppliers components |
| `src/features/invoicing/types.ts` | Create | `Invoice`, `InvoiceItem`, joined `InvoiceListRow`/`InvoiceDetail` |
| `src/features/invoicing/schema.ts` | Create | `invoiceSchema` (numeric helpers from po/schema), duplicate-product `.refine`, Spanish msgs |
| `src/features/invoicing/queries.ts` | Create | `listInvoices` (customer join), `getInvoice(id)` (items→product + customer join) |
| `src/features/invoicing/actions.ts` | Create | `createInvoice`: rpc, map `INSUFFICIENT_STOCK`→Spanish toast, revalidate `/invoices`+`/products`, redirect detail |
| `src/features/invoicing/components/InvoiceForm.tsx` | Create | useFieldArray form + unit_price default + Subtotal/IGV/Total summary |
| `src/features/invoicing/components/{InvoicesTable,InvoiceDetail}.tsx` | Create | list + detail (totals breakdown) |
| `src/app/(app)/customers/{page,new}.tsx` | Create | minimal list + create (mirror /suppliers) |
| `src/app/(app)/invoices/page.tsx` | Create | list + "Nueva factura" |
| `src/app/(app)/invoices/new/page.tsx` | Create | server-loads `listCustomers()` + `listProducts(undefined,false)`, renders form |
| `src/app/(app)/invoices/[id]/page.tsx` | Create | `params: Promise<{id}>`, `await params`, `notFound()` |
| `src/app/(app)/layout.tsx` | Modify | add "Facturación" nav link → `/invoices` |
| `src/app/(app)/page.tsx` | Modify | Facturación card: `status: 'done'`, `href: '/invoices'` |

## InvoiceForm — non-obvious logic

Trickiest part: defaulting `unit_price` from the selected product without clobbering a user edit. Use per-render diff against the previous product id, not a global effect.

```tsx
// add control to useForm; track applied product per row to default price once.
const { setValue } = useForm(...)
// In each row: when product_id changes, set unit_price to that product's
// sale price ONLY if the field is empty/untouched.
function onProductChange(index: number, productId: string) {
  setValue(`items.${index}.product_id`, productId, { shouldValidate: true })
  const current = getValues(`items.${index}.unit_price`)
  if (current === '' || current === undefined) {
    const p = products.find((x) => x.id === productId)
    if (p) setValue(`items.${index}.unit_price`, p.unit_price, { shouldValidate: true })
  }
}
// Bind via onChange on the product <select> (not just register), keeping register for RHF state.
```

Summary box replaces PO's single `runningTotal`: `subtotal = Σ line`, `igv = round(subtotal*0.18, 2)`, `total = subtotal + igv`, all live via `useWatch`. Same duplicate-product disabling and per-row subtotal as PO.

## Interfaces

`invoiceSchema`: `customer_id` uuid (Spanish msg), `invoice_date` non-empty string, `notes` optional, `items` array min 1; each item `product_id` uuid, `quantity` positive int, `unit_price` non-negative (reuse `numericPositiveInt`/`numericNonNegative`); `.refine` rejects duplicate `product_id` with "No se puede agregar el mismo producto dos veces en la misma factura."

`createInvoice` returns `{ ok:true, id } | { ok:false, error }`; on RPC error, `error.message.includes('INSUFFICIENT_STOCK')` → extract name → `"Stock insuficiente para "<name>". Ajusta la cantidad."`.

## Testing Strategy

| Layer | What | Approach |
|-------|------|----------|
| Manual | Issue invoice decrements stock; totals = subtotal+IGV; oversell raises + rolls back; `/customers` CRUD; detail renders | Run against live Supabase (Vitest planned, not yet installed) |
| (future) Unit | `invoiceSchema`, IGV math, INSUFFICIENT_STOCK parsing | Vitest once installed |

## Migration / Rollout

Additive only. Rollback: `DROP FUNCTION create_invoice`, then `DROP TABLE invoice_items, invoices, customers`. No existing tables altered (`products` row values change at runtime only).

## Notes

- Next 16 async params: `[id]/page.tsx` must `await params`.
- Vitest is planned but not installed — verification is manual this iteration.

## Open Questions

- None blocking.
