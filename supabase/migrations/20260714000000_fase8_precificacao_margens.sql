-- Fase 8: Mecânica de Precificação e Margens

-- 1. Adicionar coluna preco_base_venda na tabela skus
ALTER TABLE public.skus ADD COLUMN IF NOT EXISTS preco_base_venda NUMERIC(15, 4) DEFAULT 0;

-- 2. Criar tabela de configuracoes_financeiras
CREATE TABLE IF NOT EXISTS public.configuracoes_financeiras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    margem_alvo_estavel NUMERIC(5, 2) DEFAULT 30.00,
    margem_risco_instavel NUMERIC(5, 2) DEFAULT 15.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(empresa_id)
);

-- RLS configuracoes_financeiras
ALTER TABLE public.configuracoes_financeiras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Select Access configuracoes_financeiras" ON public.configuracoes_financeiras
FOR SELECT USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
);

CREATE POLICY "Tenant Modify Access configuracoes_financeiras" ON public.configuracoes_financeiras
FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND (public.has_permission('ver_painel_dre') OR public.has_permission('operar_fluxo_caixa'))
) WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND (public.has_permission('ver_painel_dre') OR public.has_permission('operar_fluxo_caixa'))
);

-- Inserir default para empresas existentes caso não tenham
INSERT INTO public.configuracoes_financeiras (empresa_id)
SELECT id FROM public.empresas
ON CONFLICT (empresa_id) DO NOTHING;
