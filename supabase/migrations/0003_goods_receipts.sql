-- ============================================================
-- Migration: 0003_goods_receipts
-- Description: goods_receipts table, goods_receipt_items table,
--              RLS policies, updated_at trigger, and
--              receive_purchase_order RPC.
-- Apply via: Supabase SQL editor or `supabase db push`
-- ============================================================

-- ============================================================
-- 1. GOODS_RECEIPTS TABLE
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
-- 2. GOODS_RECEIPT_ITEMS TABLE
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
-- 3. RPC: receive_purchase_order
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
