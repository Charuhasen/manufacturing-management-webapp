-- =============================================================
-- Alpha Packaging Ghana — Database Schema
-- =============================================================
-- Run this file against a fresh Supabase project to recreate
-- all public-schema objects (enums, tables, indexes, functions).
-- 7TH FEB 16:37
-- =============================================================

-- ---------------------
-- 1. ENUM TYPES
-- ---------------------

CREATE TYPE public.machine_status AS ENUM ('ACTIVE', 'MAINTENANCE', 'RETIRED');

CREATE TYPE public.process_type AS ENUM ('BLOW_MOULDING', 'INJECTION_MOULDING', 'EXTRUSION', 'THERMOFORMING');

CREATE TYPE public.product_type AS ENUM ('RAW_MATERIAL', 'FINISHED_GOOD', 'MASTER_BATCH', 'REGRIND_MATERIAL');

CREATE TYPE public.shift_type AS ENUM ('DAY', 'NIGHT');

CREATE TYPE public.unit_of_measure AS ENUM ('pcs', 'bags');

CREATE TYPE public.user_role AS ENUM ('ADMIN', 'OPERATOR', 'SUPERVISOR', 'MAINTENANCE');


-- ---------------------
-- 2. TABLES
-- ---------------------

-- Inventory of manufacturing machines
CREATE TABLE public.machines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  serial_number text NOT NULL UNIQUE,
  process_type  public.process_type NOT NULL,
  status      public.machine_status NOT NULL DEFAULT 'ACTIVE',
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.machines IS 'Inventory of manufacturing machines';


-- Extended profile data for application users
CREATE TABLE public.users_profile (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL UNIQUE,
  first_name  text NOT NULL,
  last_name   text NOT NULL,
  role        public.user_role NOT NULL DEFAULT 'OPERATOR',
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.users_profile IS 'Extended profile data for application users';


-- Centralized table for all product types (FG, Raw, etc.)
CREATE TABLE public.products (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sku                     text NOT NULL UNIQUE,
  name                    text NOT NULL,
  type                    public.product_type NOT NULL,
  description             text,
  uom                     public.unit_of_measure NOT NULL,
  color                   text,
  size                    text,
  parent_raw_material_id  uuid REFERENCES public.products(id),
  parent_master_batch_id  uuid REFERENCES public.products(id),
  target_production_per_shift integer,
  machine_type            text,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT check_uom_product_type CHECK (
    (type = 'FINISHED_GOOD' AND uom = 'pcs')
    OR
    (type IN ('RAW_MATERIAL', 'MASTER_BATCH', 'REGRIND_MATERIAL') AND uom = 'bags')
  )
);

COMMENT ON TABLE  public.products IS 'Centralized table for all product types (FG, Raw, etc.)';
COMMENT ON COLUMN public.products.parent_raw_material_id IS 'Link specific to Finished Goods pointing to their primary Raw Material';
COMMENT ON COLUMN public.products.parent_master_batch_id IS 'Link specific to Finished Goods pointing to their Master Batch';


-- Current stock levels for products, updated by stock_ledger events
CREATE TABLE public.products_stock (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id  uuid NOT NULL REFERENCES public.products(id),
  quantity    numeric NOT NULL DEFAULT 0,
  uom         public.unit_of_measure NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.products_stock IS 'Current stock levels for products, updated by stock_ledger events';


-- Centralized ledger for all stock movements
CREATE TABLE public.stock_ledger (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id                uuid NOT NULL REFERENCES public.products(id),
  transaction_source_table  text NOT NULL,
  transaction_id            uuid,
  quantity_change           numeric NOT NULL,
  uom                       public.unit_of_measure NOT NULL,
  notes                     text,
  created_by                uuid NOT NULL REFERENCES public.users_profile(user_id),
  created_at                timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.stock_ledger IS 'Centralized ledger for all stock movements';
COMMENT ON COLUMN public.stock_ledger.transaction_source_table IS 'Name of the table that initiated this transaction';
COMMENT ON COLUMN public.stock_ledger.transaction_id IS 'ID of the record in the transaction_source_table';


-- Tracks historical production runs and material usage
CREATE TABLE public.production_runs (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id              uuid NOT NULL REFERENCES public.products(id),
  machine_id              uuid NOT NULL REFERENCES public.machines(id),
  target_quantity         integer NOT NULL,
  actual_pieces_produced  integer NOT NULL,
  waste_quantity          integer DEFAULT 0,
  raw_material_id         uuid REFERENCES public.products(id),
  raw_material_bags_used  numeric NOT NULL DEFAULT 0,
  master_batch_id         uuid REFERENCES public.products(id),
  master_batch_bags_used  numeric NOT NULL DEFAULT 0,
  shift                   public.shift_type NOT NULL,
  started_at              timestamptz,
  completed_at            timestamptz,
  created_by              uuid NOT NULL REFERENCES public.users_profile(user_id),
  created_at              timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE  public.production_runs IS 'Tracks historical production runs and material usage';
COMMENT ON COLUMN public.production_runs.machine_id IS 'References machines(id).';
COMMENT ON COLUMN public.production_runs.waste_quantity IS 'Calculated scraps or rejects during the run';
COMMENT ON COLUMN public.production_runs.raw_material_id IS 'The specific Raw Material SKU used in this run';


-- ---------------------
-- 3. INDEXES
-- ---------------------

CREATE INDEX idx_stock_ledger_product_id ON public.stock_ledger USING btree (product_id);
CREATE INDEX idx_stock_ledger_transaction ON public.stock_ledger USING btree (transaction_source_table, transaction_id);


-- ---------------------
-- 4. FUNCTIONS
-- ---------------------

CREATE OR REPLACE FUNCTION public.adjust_stock(
  p_product_stock_id uuid,
  p_product_id       uuid,
  p_quantity_change  numeric,
  p_uom              unit_of_measure,
  p_notes            text,
  p_created_by       uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_qty numeric;
  v_ledger_id   uuid;
BEGIN
  -- Lock the row to prevent concurrent modifications
  SELECT quantity INTO v_current_qty
  FROM public.products_stock
  WHERE id = p_product_stock_id
    AND product_id = p_product_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Product stock record not found';
  END IF;

  -- Prevent negative stock
  IF (v_current_qty + p_quantity_change) < 0 THEN
    RAISE EXCEPTION 'Insufficient stock. Current: %, Requested change: %', v_current_qty, p_quantity_change;
  END IF;

  -- Update the stock quantity
  UPDATE public.products_stock
  SET quantity = quantity + p_quantity_change
  WHERE id = p_product_stock_id;

  -- Insert ledger entry
  INSERT INTO public.stock_ledger (
    product_id,
    transaction_source_table,
    transaction_id,
    quantity_change,
    uom,
    notes,
    created_by
  ) VALUES (
    p_product_id,
    'products_stock',
    NULL,
    p_quantity_change,
    p_uom,
    p_notes,
    p_created_by
  )
  RETURNING id INTO v_ledger_id;

  RETURN v_ledger_id;
END;
$$;
