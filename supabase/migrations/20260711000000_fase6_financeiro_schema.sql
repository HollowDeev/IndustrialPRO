-- Migration: Fase 6 Financeiro Schema
-- Created At: 2026-07-11

-- 1. Tabela: entradas_custos_extras
CREATE TABLE IF NOT EXISTS public.entradas_custos_extras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    entrada_id UUID NOT NULL REFERENCES public.entradas_estoque(id) ON DELETE CASCADE,
    descricao_custo VARCHAR(255) NOT NULL,
    valor NUMERIC(15,4) NOT NULL CHECK (valor >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.entradas_custos_extras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for entradas_custos_extras"
    ON public.entradas_custos_extras
    FOR ALL
    USING (empresa_id = public.obter_empresa_id_usuario() AND public.verificar_assinatura_ativa())
    WITH CHECK (empresa_id = public.obter_empresa_id_usuario() AND public.verificar_assinatura_ativa());

-- 2. Adicionar coluna custo_unitario_real na tabela entradas_estoque
ALTER TABLE public.entradas_estoque 
ADD COLUMN IF NOT EXISTS custo_unitario_real NUMERIC(15,4);

-- 3. Adicionar coluna preco_venda_unitario na tabela ordens_producao
ALTER TABLE public.ordens_producao
ADD COLUMN IF NOT EXISTS preco_venda_unitario NUMERIC(15,4) DEFAULT 0 CHECK (preco_venda_unitario >= 0);

-- 4. Tabela: custos_fixos
CREATE TABLE IF NOT EXISTS public.custos_fixos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    descricao VARCHAR(255) NOT NULL,
    valor_mensal NUMERIC(15,4) NOT NULL CHECK (valor_mensal >= 0),
    competencia_mes DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.custos_fixos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for custos_fixos"
    ON public.custos_fixos
    FOR ALL
    USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa() AND public.has_permission('ver_painel_dre'))
    WITH CHECK (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa() AND public.has_permission('gerenciar_custos_fixos'));

-- 5. Tabela: ordem_producao_consumos
CREATE TABLE IF NOT EXISTS public.ordem_producao_consumos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ordem_producao_id UUID NOT NULL REFERENCES public.ordens_producao(id) ON DELETE CASCADE,
    insumo_id UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
    entrada_estoque_id UUID NOT NULL REFERENCES public.entradas_estoque(id) ON DELETE CASCADE,
    quantidade_consumida NUMERIC(15,4) NOT NULL CHECK (quantidade_consumida > 0),
    custo_unitario_lote NUMERIC(15,4) NOT NULL CHECK (custo_unitario_lote >= 0),
    valor_total NUMERIC(15,4) NOT NULL CHECK (valor_total >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.ordem_producao_consumos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for ordem_producao_consumos"
    ON public.ordem_producao_consumos
    FOR ALL
    USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa())
    WITH CHECK (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa());

-- 6. Tabela: precificacao_parametros
CREATE TABLE IF NOT EXISTS public.precificacao_parametros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    familia_id UUID NOT NULL REFERENCES public.familias_produto(id) ON DELETE CASCADE,
    margem_minima_saudavel NUMERIC(5,2) NOT NULL DEFAULT 15.00 CHECK (margem_minima_saudavel >= 0),
    margem_operacional_limite NUMERIC(5,2) NOT NULL DEFAULT 5.00 CHECK (margem_operacional_limite >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(empresa_id, familia_id)
);

-- Habilitar RLS
ALTER TABLE public.precificacao_parametros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for precificacao_parametros"
    ON public.precificacao_parametros
    FOR ALL
    USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa())
    WITH CHECK (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa());

-- 7. Tabela: titulos_financeiros
CREATE TABLE IF NOT EXISTS public.titulos_financeiros (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('PAGAR', 'RECEBER')),
    descricao VARCHAR(255) NOT NULL,
    valor NUMERIC(15,4) NOT NULL CHECK (valor >= 0),
    data_vencimento DATE NOT NULL,
    data_liquidacao DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'PAGO', 'ANTECIPADO', 'CANCELADO')),
    cliente_id UUID REFERENCES public.clientes(id) ON DELETE SET NULL,
    fornecedor_id UUID REFERENCES public.fornecedores(id) ON DELETE SET NULL,
    pedido_id UUID REFERENCES public.pedidos(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.titulos_financeiros ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for titulos_financeiros"
    ON public.titulos_financeiros
    FOR ALL
    USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa() AND (public.has_permission('operar_fluxo_caixa') OR public.has_permission('autorizar_factoring')))
    WITH CHECK (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa() AND (public.has_permission('operar_fluxo_caixa') OR public.has_permission('autorizar_factoring')));

-- 8. Tabela: fluxo_caixa_config
CREATE TABLE IF NOT EXISTS public.fluxo_caixa_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE UNIQUE,
    saldo_inicial NUMERIC(15,4) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.fluxo_caixa_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for fluxo_caixa_config"
    ON public.fluxo_caixa_config
    FOR ALL
    USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa())
    WITH CHECK (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa());
