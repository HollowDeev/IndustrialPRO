-- Migration for adding Aço conversion factor
ALTER TABLE public.insumos ADD COLUMN rendimento_ml_kg numeric(10,4) DEFAULT NULL;
