-- Migration: Fase 5 - Rastreabilidade Dinâmica da Cadeia de Custódia

-- 1. Adicionar nivel_padrao na tabela fornecedores
ALTER TABLE public.fornecedores 
ADD COLUMN nivel_padrao INTEGER DEFAULT 1;

-- 2. Adicionar rastreabilidade na tabela entradas_estoque
ALTER TABLE public.entradas_estoque 
ADD COLUMN origem_tier1_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
ADD COLUMN origem_tier2_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL;
