-- ============================================================
-- Migration: 0004_invoicing
-- Description: customers table, invoices table, invoice_items table,
--              RLS policies, updated_at triggers, seed data, and
--              create_invoice RPC.
-- Apply via: Supabase SQL editor or `supabase migration up`
-- ============================================================

-- ============================================================
-- 1. CUSTOMERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.customers (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text        NOT NULL,
  doc_type    text,
  doc_number  text,
  email       text,
  phone       text,
  is_active   boolean     NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger reuses set_updated_at() from 0001_products
CREATE OR REPLACE TRIGGER customers_set_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY customers_select_authenticated
  ON public.customers FOR SELECT TO authenticated USING (true);

CREATE POLICY customers_insert_authenticated
  ON public.customers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY customers_update_authenticated
  ON public.customers FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Seed — idempotent
INSERT INTO public.customers (name, doc_type, doc_number, email, phone) VALUES
  ('Corporación Andina SAC',    'RUC', '20112233445', 'compras@corpandina.pe',  '01-2345678'),
  ('Distribuciones Norte EIRL', 'RUC', '20223344556', 'ventas@disnorte.pe',     '044-112233'),
  ('Comercial Sur S.R.L.',      'RUC', '20334455667', 'pedidos@comsur.pe',      '054-223344'),
  ('Juan Carlos Pérez',         'DNI', '42334455',    'jcperez@gmail.com',      '987654321')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2. INVOICES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoices (
  id           uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  code         text           NOT NULL,
  customer_id  uuid           NOT NULL REFERENCES public.customers(id),
  invoice_date date           NOT NULL DEFAULT current_date,
  status       text           NOT NULL DEFAULT 'issued'
                              CHECK (status IN ('issued', 'cancelled')),
  subtotal     numeric(12, 2) NOT NULL DEFAULT 0 CHECK (subtotal >= 0),
  igv          numeric(12, 2) NOT NULL DEFAULT 0 CHECK (igv >= 0),
  total        numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  notes        text,
  created_at   timestamptz    NOT NULL DEFAULT now(),
  updated_at   timestamptz    NOT NULL DEFAULT now(),
  CONSTRAINT invoices_code_key UNIQUE (code)
);

CREATE OR REPLACE TRIGGER invoices_set_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoices_select_authenticated
  ON public.invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY invoices_insert_authenticated
  ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY invoices_update_authenticated
  ON public.invoices FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- 3. INVOICE_ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.invoice_items (
  id          uuid           PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id  uuid           NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  product_id  uuid           NOT NULL REFERENCES public.products(id),
  quantity    integer        NOT NULL CHECK (quantity > 0),
  unit_price  numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  subtotal    numeric(12, 2) NOT NULL CHECK (subtotal >= 0),
  created_at  timestamptz    NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY invoice_items_select_authenticated
  ON public.invoice_items FOR SELECT TO authenticated USING (true);

CREATE POLICY invoice_items_insert_authenticated
  ON public.invoice_items FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 4. RPC: create_invoice
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_invoice(
  p_customer_id  uuid,
  p_invoice_date date,
  p_notes        text,
  p_items        jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_invoice_id uuid;
  v_code       text;
  v_year       int;
  v_seq        int;
  v_subtotal   numeric(12, 2) := 0;
  v_igv        numeric(12, 2);
  v_total      numeric(12, 2);
  v_item       jsonb;
  v_pid        uuid;
  v_qty        int;
  v_price      numeric(12, 2);
  v_stock      int;
  v_pname      text;
BEGIN
  -- --------------------------------------------------------
  -- (a) Loop 1: validate stock for ALL items first.
  --     SELECT ... FOR UPDATE serializes concurrent invoices
  --     on the same product rows (prevents oversell).
  -- --------------------------------------------------------
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid   := (v_item->>'product_id')::uuid;
    v_qty   := (v_item->>'quantity')::int;
    v_price := (v_item->>'unit_price')::numeric(12, 2);

    SELECT stock_quantity, name
      INTO v_stock, v_pname
      FROM public.products
     WHERE id = v_pid
       FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'PRODUCT_NOT_FOUND:%', v_pid::text;
    END IF;

    IF v_stock < v_qty THEN
      RAISE EXCEPTION 'INSUFFICIENT_STOCK:%', v_pname;
    END IF;

    -- Accumulate subtotal during the same pass
    v_subtotal := v_subtotal + (v_qty * v_price);
  END LOOP;

  -- --------------------------------------------------------
  -- (b) Compute IGV and total
  -- --------------------------------------------------------
  v_igv   := round(v_subtotal * 0.18, 2);
  v_total := v_subtotal + v_igv;

  -- --------------------------------------------------------
  -- (c) Generate invoice code: F-YYYY-NNNN (per-year seq)
  -- --------------------------------------------------------
  v_year := EXTRACT(YEAR FROM COALESCE(p_invoice_date, current_date))::int;

  SELECT COUNT(*) + 1
    INTO v_seq
    FROM public.invoices
   WHERE EXTRACT(YEAR FROM invoice_date) = v_year;

  v_code := 'F-' || v_year::text || '-' || LPAD(v_seq::text, 4, '0');

  -- --------------------------------------------------------
  -- (d) Insert invoice header
  -- --------------------------------------------------------
  INSERT INTO public.invoices (
    code, customer_id, invoice_date, status,
    subtotal, igv, total, notes
  )
  VALUES (
    v_code,
    p_customer_id,
    COALESCE(p_invoice_date, current_date),
    'issued',
    v_subtotal,
    v_igv,
    v_total,
    p_notes
  )
  RETURNING id INTO v_invoice_id;

  -- --------------------------------------------------------
  -- (e) Loop 2: insert items and decrement stock
  -- --------------------------------------------------------
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_pid   := (v_item->>'product_id')::uuid;
    v_qty   := (v_item->>'quantity')::int;
    v_price := (v_item->>'unit_price')::numeric(12, 2);

    INSERT INTO public.invoice_items (
      invoice_id, product_id, quantity, unit_price, subtotal
    )
    VALUES (
      v_invoice_id,
      v_pid,
      v_qty,
      v_price,
      v_qty * v_price
    );

    UPDATE public.products
       SET stock_quantity = stock_quantity - v_qty
     WHERE id = v_pid;
  END LOOP;

  -- --------------------------------------------------------
  -- (f) Return new invoice id
  -- --------------------------------------------------------
  RETURN v_invoice_id;
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.create_invoice(uuid, date, text, jsonb)
  TO authenticated;
