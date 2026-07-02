-- Adicionar coluna metadados na tabela de insumos para salvar campos auxiliares
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS metadados jsonb DEFAULT '{}'::jsonb;
