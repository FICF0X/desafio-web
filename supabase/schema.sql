-- ============================================================
-- schema.sql — Consolidated schema for Desafío Web
--
-- This file concatenates migrations 0001 through 0005 in order.
-- Run this ONCE on a fresh Supabase project via SQL Editor to
-- create the complete database schema:
--   tables, indexes, RLS policies, updated_at triggers,
--   PostgreSQL RPC functions, and seed data.
--
-- Individual migration files live in supabase/migrations/ and
-- are kept untouched for incremental apply via `supabase db push`.
--
-- Sections:
--   1. Products
--   2. Purchase Orders (includes Suppliers)
--   3. Goods Receipts
--   4. Invoicing (includes Customers)
--   5. Dispatch
-- ============================================================


-- ============================================================
-- SECTION 1: PRODUCTS
-- Source: supabase/migrations/0001_products.sql
-- ============================================================

-- ------------------------------------
-- 1. Table
-- ------------------------------------
CREATE TABLE IF NOT EXISTS public.products (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  sku              text        NOT NULL,
  name             text        NOT NULL,
  description      text,
  unit_price       numeric(12, 2) NOT NULL CHECK (unit_price >= 0),
  stock_quantity   integer     NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  unit_of_measure  text,
  category         text,
  is_active        boolean     NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT products_sku_key UNIQUE (sku)
);

-- ------------------------------------
-- 2. Index
-- ------------------------------------
CREATE INDEX IF NOT EXISTS products_is_active_idx ON public.products (is_active);

-- ------------------------------------
-- 3. updated_at trigger (no extension required)
--    Self-contained plpgsql function that sets NEW.updated_at = now()
--    before every UPDATE.
-- ------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ------------------------------------
-- 4. Row-Level Security
-- ------------------------------------
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- SELECT: any authenticated user may read products
CREATE POLICY products_select_authenticated
  ON public.products
  FOR SELECT
  TO authenticated
  USING (true);

-- INSERT: any authenticated user may create products
CREATE POLICY products_insert_authenticated
  ON public.products
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- UPDATE: any authenticated user may update products
CREATE POLICY products_update_authenticated
  ON public.products
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- NOTE: No DELETE policy — hard delete is intentionally disallowed.
-- Soft-delete via is_active toggle is the only removal mechanism.


-- ============================================================
-- SECTION 2: PURCHASE ORDERS (includes Suppliers)
-- Source: supabase/migrations/0002_purchase_orders.sql
-- ============================================================

-- ============================================================
-- 2.1. SUPPLIERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.suppliers (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text        NOT NULL,
  tax_id     text,
  email      text,
  phone      text,
  is_active  boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- updated_at trigger reuses the existing set_updated_at() from 0001_products
CREATE OR REPLACE TRIGGER suppliers_set_updated_at
  BEFORE UPDATE ON public.suppliers
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;

CREATE POLICY suppliers_select_authenticated
  ON public.suppliers FOR SELECT TO authenticated USING (true);

CREATE POLICY suppliers_insert_authenticated
  ON public.suppliers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY suppliers_update_authenticated
  ON public.suppliers FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- Seed — idempotent
INSERT INTO public.suppliers (name, tax_id, email, phone) VALUES
  ('Distribuidora Lima SAC',   '20123456789', 'ventas@distriblima.pe',   '01-4512345'),
  ('Proveedor Norte EIRL',     '20234567890', 'contacto@pronorte.pe',    '044-223344'),
  ('Comercial Sur S.A.',       '20345678901', 'pedidos@comsur.pe',       '054-334455'),
  ('Insumos Nacionales SAC',   '20456789012', 'info@insnat.pe',          '01-6789012')
ON CONFLICT DO NOTHING;

-- ============================================================
-- 2.2. PURCHASE_ORDERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.purchase_orders (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code        text        NOT NULL,
  supplier_id uuid        NOT NULL REFERENCES public.suppliers(id),
  order_date  date        NOT NULL DEFAULT current_date,
  status      text        NOT NULL DEFAULT 'pending'
                          CHECK (status IN ('pending', 'received', 'cancelled')),
  notes       text,
  total       numeric(12, 2) NOT NULL DEFAULT 0 CHECK (total >= 0),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT purchase_orders_code_key UNIQUE (code)
);

CREATE OR REPLACE TRIGGER purchase_orders_set_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_orders_select_authenticated
  ON public.purchase_orders FOR SELECT TO authenticated USING (true);

CREATE POLICY purchase_orders_insert_authenticated
  ON public.purchase_orders FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY purchase_orders_update_authenticated
  ON public.purchase_orders FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- 2.3. PURCHASE_ORDER_ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.purchase_order_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_id   uuid        NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  product_id          uuid        NOT NULL REFERENCES public.products(id),
  quantity            integer     NOT NULL CHECK (quantity > 0),
  unit_cost           numeric(12, 2) NOT NULL CHECK (unit_cost >= 0),
  subtotal            numeric(12, 2) NOT NULL CHECK (subtotal >= 0),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.purchase_order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY purchase_order_items_select_authenticated
  ON public.purchase_order_items FOR SELECT TO authenticated USING (true);

CREATE POLICY purchase_order_items_insert_authenticated
  ON public.purchase_order_items FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 2.4. RPC: create_purchase_order
-- ============================================================
CREATE OR REPLACE FUNCTION public.create_purchase_order(
  p_supplier_id uuid,
  p_order_date  date,
  p_notes       text,
  p_items       jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_year   int;
  v_seq    int;
  v_code   text;
  v_total  numeric(12, 2);
  v_id     uuid;
  v_item   jsonb;
  v_qty    int;
  v_cost   numeric(12, 2);
  v_sub    numeric(12, 2);
BEGIN
  -- Determine year from the order date
  v_year := EXTRACT(YEAR FROM p_order_date)::int;

  -- Count existing POs in the same year (per-year sequence)
  SELECT COUNT(*) + 1
    INTO v_seq
    FROM public.purchase_orders
   WHERE EXTRACT(YEAR FROM order_date) = v_year;

  -- Format code: OC-YYYY-NNNN
  v_code := 'OC-' || v_year::text || '-' || LPAD(v_seq::text, 4, '0');

  -- Compute total from items array
  v_total := 0;
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty  := (v_item->>'quantity')::int;
    v_cost := (v_item->>'unit_cost')::numeric(12, 2);
    v_total := v_total + (v_qty * v_cost);
  END LOOP;

  -- Insert PO header
  INSERT INTO public.purchase_orders (code, supplier_id, order_date, notes, total)
  VALUES (v_code, p_supplier_id, p_order_date, p_notes, v_total)
  RETURNING id INTO v_id;

  -- Insert line items
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_qty  := (v_item->>'quantity')::int;
    v_cost := (v_item->>'unit_cost')::numeric(12, 2);
    v_sub  := v_qty * v_cost;

    INSERT INTO public.purchase_order_items (purchase_order_id, product_id, quantity, unit_cost, subtotal)
    VALUES (
      v_id,
      (v_item->>'product_id')::uuid,
      v_qty,
      v_cost,
      v_sub
    );
  END LOOP;

  RETURN v_id;
END;
$$;

-- Grant execute to authenticated users (required for SECURITY INVOKER + RLS to work)
GRANT EXECUTE ON FUNCTION public.create_purchase_order(uuid, date, text, jsonb)
  TO authenticated;


-- ============================================================
-- SECTION 3: GOODS RECEIPTS
-- Source: supabase/migrations/0003_goods_receipts.sql
-- ============================================================

-- ============================================================
-- 3.1. GOODS_RECEIPTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.goods_receipts (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text        NOT NULL,
  purchase_order_id   uuid        NOT NULL UNIQUE REFERENCES public.purchase_orders(id),
  receipt_date        date        NOT NULL DEFAULT current_date,
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT goods_receipts_code_key UNIQUE (code)
);

-- updated_at trigger reuses the existing set_updated_at() from 0001_products
CREATE OR REPLACE TRIGGER goods_receipts_set_updated_at
  BEFORE UPDATE ON public.goods_receipts
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- RLS
ALTER TABLE public.goods_receipts ENABLE ROW LEVEL SECURITY;

CREATE POLICY goods_receipts_select_authenticated
  ON public.goods_receipts FOR SELECT TO authenticated USING (true);

CREATE POLICY goods_receipts_insert_authenticated
  ON public.goods_receipts FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY goods_receipts_update_authenticated
  ON public.goods_receipts FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- 3.2. GOODS_RECEIPT_ITEMS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.goods_receipt_items (
  id                  uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  goods_receipt_id    uuid        NOT NULL REFERENCES public.goods_receipts(id) ON DELETE CASCADE,
  product_id          uuid        NOT NULL REFERENCES public.products(id),
  quantity            integer     NOT NULL CHECK (quantity > 0),
  created_at          timestamptz NOT NULL DEFAULT now()
);

-- RLS
ALTER TABLE public.goods_receipt_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY goods_receipt_items_select_authenticated
  ON public.goods_receipt_items FOR SELECT TO authenticated USING (true);

CREATE POLICY goods_receipt_items_insert_authenticated
  ON public.goods_receipt_items FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- 3.3. RPC: receive_purchase_order
-- ============================================================
CREATE OR REPLACE FUNCTION public.receive_purchase_order(
  p_purchase_order_id uuid,
  p_notes             text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_status     text;
  v_year       int;
  v_seq        int;
  v_code       text;
  v_receipt_id uuid;
BEGIN
  -- (1) Lock and validate purchase order
  SELECT status
    INTO v_status
    FROM public.purchase_orders
   WHERE id = p_purchase_order_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PURCHASE_ORDER_NOT_FOUND';
  END IF;

  IF v_status <> 'pending' THEN
    RAISE EXCEPTION 'PURCHASE_ORDER_NOT_PENDING';
  END IF;

  -- (2) Generate code ING-YYYY-NNNN (per-year sequence)
  v_year := EXTRACT(YEAR FROM current_date)::int;

  SELECT COUNT(*) + 1
    INTO v_seq
    FROM public.goods_receipts
   WHERE EXTRACT(YEAR FROM created_at) = v_year;

  v_code := 'ING-' || v_year::text || '-' || LPAD(v_seq::text, 4, '0');

  -- (3) Insert goods_receipts header
  INSERT INTO public.goods_receipts (code, purchase_order_id, receipt_date, notes)
  VALUES (v_code, p_purchase_order_id, current_date, p_notes)
  RETURNING id INTO v_receipt_id;

  -- (4) Insert goods_receipt_items from purchase_order_items
  INSERT INTO public.goods_receipt_items (goods_receipt_id, product_id, quantity)
  SELECT v_receipt_id, poi.product_id, poi.quantity
    FROM public.purchase_order_items poi
   WHERE poi.purchase_order_id = p_purchase_order_id;

  -- (5) Update products stock_quantity
  UPDATE public.products p
     SET stock_quantity = p.stock_quantity + poi.quantity
    FROM public.purchase_order_items poi
   WHERE poi.purchase_order_id = p_purchase_order_id
     AND poi.product_id = p.id;

  -- (6) Mark purchase order as received
  UPDATE public.purchase_orders
     SET status = 'received'
   WHERE id = p_purchase_order_id;

  -- (7) Return receipt id
  RETURN v_receipt_id;
END;
$$;

-- Grant execute to authenticated users (required for SECURITY INVOKER + RLS to work)
GRANT EXECUTE ON FUNCTION public.receive_purchase_order(uuid, text)
  TO authenticated;


-- ============================================================
-- SECTION 4: INVOICING (includes Customers)
-- Source: supabase/migrations/0004_invoicing.sql
-- ============================================================

-- ============================================================
-- 4.1. CUSTOMERS TABLE
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
-- 4.2. INVOICES TABLE
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
-- 4.3. INVOICE_ITEMS TABLE
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
-- 4.4. RPC: create_invoice
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


-- ============================================================
-- SECTION 5: DISPATCH
-- Source: supabase/migrations/0005_dispatch.sql
-- ============================================================

-- ============================================================
-- 5.1. DISPATCHES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.dispatches (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text        NOT NULL,
  invoice_id     uuid        NOT NULL REFERENCES public.invoices(id),
  dispatch_date  date        NOT NULL DEFAULT current_date,
  status         text        NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending', 'in_transit', 'delivered')),
  address        text,
  carrier        text,
  tracking_code  text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT dispatches_code_key       UNIQUE (code),
  CONSTRAINT dispatches_invoice_id_key UNIQUE (invoice_id)
);

-- updated_at trigger reuses set_updated_at() from 0001_products
CREATE OR REPLACE TRIGGER dispatches_set_updated_at
  BEFORE UPDATE ON public.dispatches
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

-- ============================================================
-- 5.2. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY dispatches_select_authenticated
  ON public.dispatches FOR SELECT TO authenticated USING (true);

CREATE POLICY dispatches_insert_authenticated
  ON public.dispatches FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY dispatches_update_authenticated
  ON public.dispatches FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
