-- Migration: Fase 5 - Arvore de Rastreabilidade 1:N e Auditoria

-- 1. Remover campos antigos da abordagem linear
ALTER TABLE public.entradas_estoque 
DROP COLUMN IF EXISTS origem_tier1_id,
DROP COLUMN IF EXISTS origem_tier2_id;

ALTER TABLE public.fornecedores
DROP COLUMN IF EXISTS nivel_padrao;

-- 2. Tabela de Log de Auditoria para Fornecedores (N3)
CREATE TABLE IF NOT EXISTS public.fornecedores_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
    usuario_id UUID REFERENCES auth.users(id),
    acao VARCHAR(10) NOT NULL, -- INSERT, UPDATE, DELETE
    dados_antigos JSONB,
    dados_novos JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para Audit Log
ALTER TABLE public.fornecedores_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Visualização isolada audit_log" ON public.fornecedores_audit_log
    FOR SELECT USING (
        public.verificar_super_admin()
        OR empresa_id = public.obter_empresa_id_usuario()
    );

-- Trigger Function para o Audit Log
CREATE OR REPLACE FUNCTION public.log_fornecedor_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_empresa_id UUID;
BEGIN
    -- Captura o usuário atual se estiver no contexto da request (Supabase auth.uid())
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        v_empresa_id := NEW.empresa_id;
        INSERT INTO public.fornecedores_audit_log (empresa_id, fornecedor_id, usuario_id, acao, dados_novos)
        VALUES (v_empresa_id, NEW.id, v_user_id, 'INSERT', row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'UPDATE' THEN
        v_empresa_id := NEW.empresa_id;
        INSERT INTO public.fornecedores_audit_log (empresa_id, fornecedor_id, usuario_id, acao, dados_antigos, dados_novos)
        VALUES (v_empresa_id, NEW.id, v_user_id, 'UPDATE', row_to_json(OLD)::jsonb, row_to_json(NEW)::jsonb);
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        v_empresa_id := OLD.empresa_id;
        INSERT INTO public.fornecedores_audit_log (empresa_id, fornecedor_id, usuario_id, acao, dados_antigos)
        VALUES (v_empresa_id, OLD.id, v_user_id, 'DELETE', row_to_json(OLD)::jsonb);
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atachar a Trigger na tabela fornecedores
DROP TRIGGER IF EXISTS fornecedores_audit_trigger ON public.fornecedores;
CREATE TRIGGER fornecedores_audit_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.fornecedores
FOR EACH ROW EXECUTE FUNCTION public.log_fornecedor_changes();


-- 3. Tabelas da Árvore de Composição
-- Nível 2 (Prensagem / Distribuidor)
CREATE TABLE IF NOT EXISTS public.fornecedores_n2 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    fornecedor_n3_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    dados_extras JSONB DEFAULT '{}'::jsonb, -- endereco, doc, maquina/equipamento, contato
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Nível 1 (Coleta / Fabricante)
CREATE TABLE IF NOT EXISTS public.fornecedores_n1 (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    fornecedor_n2_id UUID NOT NULL REFERENCES public.fornecedores_n2(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18),
    dados_extras JSONB DEFAULT '{}'::jsonb, -- endereco, contato, modelo_formato_coleta
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabela Associativa para Composição do Lote
CREATE TABLE IF NOT EXISTS public.entradas_origens_tree (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    entrada_id UUID NOT NULL REFERENCES public.entradas_estoque(id) ON DELETE CASCADE,
    fornecedor_n2_id UUID REFERENCES public.fornecedores_n2(id) ON DELETE CASCADE,
    fornecedor_n1_id UUID REFERENCES public.fornecedores_n1(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    -- Restrição: Não pode ter um registro vazio (tem que apontar pra N2 ou N1 ou ambos)
    CONSTRAINT chk_tree_nodes CHECK (fornecedor_n2_id IS NOT NULL OR fornecedor_n1_id IS NOT NULL)
);

-- 4. RLS para novas tabelas
ALTER TABLE public.fornecedores_n2 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fornecedores_n1 ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entradas_origens_tree ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
    table_name text;
    tables text[] := ARRAY[
        'fornecedores_n2', 'fornecedores_n1', 'entradas_origens_tree'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        -- SELECT Policy
        EXECUTE format('
            CREATE POLICY "Visualização isolada %I" ON public.%I 
            FOR SELECT USING (
                public.verificar_super_admin()
                OR empresa_id = public.obter_empresa_id_usuario()
            );
        ', table_name, table_name);

        -- INSERT Policy
        EXECUTE format('
            CREATE POLICY "Inserção com assinatura ATIVA %I" ON public.%I 
            FOR INSERT WITH CHECK (
                public.verificar_super_admin()
                OR (
                    empresa_id = public.obter_empresa_id_usuario()
                    AND public.verificar_assinatura_ativa()
                )
            );
        ', table_name, table_name);

        -- UPDATE Policy
        EXECUTE format('
            CREATE POLICY "Atualização com assinatura ATIVA %I" ON public.%I 
            FOR UPDATE USING (
                public.verificar_super_admin()
                OR empresa_id = public.obter_empresa_id_usuario()
            ) WITH CHECK (
                public.verificar_super_admin()
                OR (
                    empresa_id = public.obter_empresa_id_usuario()
                    AND public.verificar_assinatura_ativa()
                )
            );
        ', table_name, table_name);
        
        -- DELETE Policy
        EXECUTE format('
            CREATE POLICY "Exclusão com assinatura ATIVA %I" ON public.%I 
            FOR DELETE USING (
                public.verificar_super_admin()
                OR (
                    empresa_id = public.obter_empresa_id_usuario()
                    AND public.verificar_assinatura_ativa()
                )
            );
        ', table_name, table_name);
    END LOOP;
END $$;
