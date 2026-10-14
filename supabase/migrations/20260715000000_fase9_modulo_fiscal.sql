-- Fase 9: Módulo de Apuração Fiscal

-- 1. Tabela de Clientes
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS tipo_cliente VARCHAR(50) DEFAULT 'REVENDA';
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS contribuinte_icms BOOLEAN DEFAULT true;
ALTER TABLE public.clientes ADD COLUMN IF NOT EXISTS uf VARCHAR(2) DEFAULT 'SP';

-- 2. Tabela Famílias Produto
ALTER TABLE public.familias_produto ADD COLUMN IF NOT EXISTS ncm VARCHAR(20);
ALTER TABLE public.familias_produto ADD COLUMN IF NOT EXISTS classificacao_fiscal VARCHAR(100);

-- 3. Tabela Matriz Fiscal
CREATE TABLE IF NOT EXISTS public.regras_fiscais_matriz (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    ncm_padrao VARCHAR(20) NOT NULL,
    uf_destino VARCHAR(2) NOT NULL, -- '*' para todas
    tipo_cliente VARCHAR(50) NOT NULL, -- 'REVENDA', 'INDUSTRIALIZACAO', 'CONSUMIDOR_FINAL', '*'
    cfop VARCHAR(10) NOT NULL,
    cst VARCHAR(10) NOT NULL,
    icms_percent NUMERIC(5, 2) DEFAULT 0,
    ipi_percent NUMERIC(5, 2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.regras_fiscais_matriz ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Select Access regras_fiscais_matriz" ON public.regras_fiscais_matriz
FOR SELECT USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
);

CREATE POLICY "Tenant Modify Access regras_fiscais_matriz" ON public.regras_fiscais_matriz
FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
) WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
);

-- 4. Pedidos e Itens (Ordens de Produção)
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS valor_frete NUMERIC(15, 4) DEFAULT 0;
ALTER TABLE public.ordens_producao ADD COLUMN IF NOT EXISTS valor_icms NUMERIC(15, 4) DEFAULT 0;
ALTER TABLE public.ordens_producao ADD COLUMN IF NOT EXISTS valor_ipi NUMERIC(15, 4) DEFAULT 0;
ALTER TABLE public.ordens_producao ADD COLUMN IF NOT EXISTS frete_rateado NUMERIC(15, 4) DEFAULT 0;

-- 5. Recebimento (Entradas de Estoque)
ALTER TABLE public.entradas_estoque ADD COLUMN IF NOT EXISTS destinacao VARCHAR(50) DEFAULT 'INSUMO';
ALTER TABLE public.entradas_estoque ADD COLUMN IF NOT EXISTS valor_icms_nota NUMERIC(15, 4) DEFAULT 0;
ALTER TABLE public.entradas_estoque ADD COLUMN IF NOT EXISTS valor_ipi_nota NUMERIC(15, 4) DEFAULT 0;

-- 6. Configurações da Empresa
ALTER TABLE public.empresas ADD COLUMN IF NOT EXISTS uf_origem VARCHAR(2) DEFAULT 'SP';
