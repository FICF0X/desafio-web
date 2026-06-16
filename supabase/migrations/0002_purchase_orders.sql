-- ============================================================
-- Migration: 0002_purchase_orders
-- Description: Suppliers table, purchase_orders table,
--              purchase_order_items table, RLS policies,
--              updated_at triggers, seed data, and
--              create_purchase_order RPC.
-- Apply via: Supabase SQL editor or `supabase db push`
-- ============================================================

-- ============================================================
-- 1. SUPPLIERS TABLE
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
-- 2. PURCHASE_ORDERS TABLE
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
-- 3. PURCHASE_ORDER_ITEMS TABLE
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
-- 4. RPC: create_purchase_order
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
