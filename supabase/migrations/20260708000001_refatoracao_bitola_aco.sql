-- Adicionar coluna bitola_mm na tabela insumos
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS bitola_mm numeric;

-- Remover a coluna volume_aco_metro da tabela familias_produto
ALTER TABLE public.familias_produto DROP COLUMN IF EXISTS volume_aco_metro;
