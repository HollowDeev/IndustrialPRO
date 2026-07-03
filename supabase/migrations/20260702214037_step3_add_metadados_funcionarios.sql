-- Add metadados column as JSONB to funcionarios table
ALTER TABLE public.funcionarios
ADD COLUMN IF NOT EXISTS metadados JSONB DEFAULT '{}'::jsonb;
