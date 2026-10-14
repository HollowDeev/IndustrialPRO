-- Remover a restrição anterior
ALTER TABLE public.insumos DROP CONSTRAINT IF EXISTS insumos_categoria_check;

-- Adicionar a nova restrição estrita
ALTER TABLE public.insumos ADD CONSTRAINT insumos_categoria_check CHECK (categoria in ('ACO', 'QUIMICO', 'POLIMERO'));
