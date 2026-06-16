-- ============================================================
-- Migration: 0001_products
-- Description: Products master table with RLS policies and
--              auto-updated `updated_at` trigger (self-contained
--              plpgsql — does not require the moddatetime extension).
-- Apply via: Supabase SQL editor or `supabase db push`
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
