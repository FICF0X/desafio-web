-- ============================================================
-- Migration: 0005_dispatch
-- Description: dispatches table, RLS policies, updated_at trigger.
--              No RPC — create and status advance are plain DML.
-- Apply via: Supabase SQL editor or `supabase migration up`
-- ============================================================

-- ============================================================
-- 1. DISPATCHES TABLE
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
-- 2. ROW LEVEL SECURITY
-- ============================================================
ALTER TABLE public.dispatches ENABLE ROW LEVEL SECURITY;

CREATE POLICY dispatches_select_authenticated
  ON public.dispatches FOR SELECT TO authenticated USING (true);

CREATE POLICY dispatches_insert_authenticated
  ON public.dispatches FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY dispatches_update_authenticated
  ON public.dispatches FOR UPDATE TO authenticated
  USING (true) WITH CHECK (true);
