-- Fase 3: Motor Dinâmico de Permissões (RBAC Customizável)

-- 1. Criação da tabela niveis_acesso
CREATE TABLE IF NOT EXISTS public.niveis_acesso (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome_nivel VARCHAR(255) NOT NULL,
    permissoes JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS para niveis_acesso
ALTER TABLE public.niveis_acesso ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant CRUD Access niveis_acesso" ON public.niveis_acesso
FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
) WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
);

-- 2. Alteração na tabela usuarios
ALTER TABLE public.usuarios 
ADD COLUMN IF NOT EXISTS nivel_acesso_id UUID REFERENCES public.niveis_acesso(id) ON DELETE SET NULL;

-- 3. Scripts de Migração de Dados Iniciais
DO $$
DECLARE
    r_empresa RECORD;
    v_nivel_master_id UUID;
BEGIN
    FOR r_empresa IN SELECT id FROM public.empresas LOOP
        -- Tenta encontrar se já existe um nível Master
        SELECT id INTO v_nivel_master_id FROM public.niveis_acesso WHERE empresa_id = r_empresa.id AND nome_nivel = 'Master' LIMIT 1;
        
        IF v_nivel_master_id IS NULL THEN
            -- Insere nível Master
            INSERT INTO public.niveis_acesso (empresa_id, nome_nivel, permissoes)
            VALUES (
                r_empresa.id, 
                'Master', 
                '{
                    "ver_central": true, 
                    "acessar_planejamento": true, 
                    "gerenciar_apontamentos": true, 
                    "gerenciar_receitas": true, 
                    "gerenciar_medidas": true, 
                    "gerenciar_familias": true, 
                    "gerenciar_almoxarifado": true, 
                    "gerenciar_clientes": true, 
                    "gerenciar_usuarios": true
                }'::jsonb
            ) RETURNING id INTO v_nivel_master_id;
        END IF;

        -- Atribui o nível Master a todos os usuários daquela empresa que ainda não têm nível
        UPDATE public.usuarios 
        SET nivel_acesso_id = v_nivel_master_id
        WHERE empresa_id = r_empresa.id AND nivel_acesso_id IS NULL;
    END LOOP;
END $$;

-- 4. Função has_permission (Engine RLS)
CREATE OR REPLACE FUNCTION public.has_permission(p_chave text)
RETURNS boolean AS $$
DECLARE
    v_permissoes jsonb;
BEGIN
    SELECT na.permissoes INTO v_permissoes
    FROM public.usuarios u
    JOIN public.niveis_acesso na ON na.id = u.nivel_acesso_id
    WHERE u.id = auth.uid();
    
    IF v_permissoes IS NULL THEN
        RETURN false;
    END IF;

    -- Extrai o valor booleano da chave JSON
    RETURN COALESCE((v_permissoes->>p_chave)::boolean, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Atualização de Políticas (RLS Sensíveis)
-- Remover as antigas (FOR ALL)
DROP POLICY IF EXISTS "Tenant CRUD Access" ON public.familias_produto;
DROP POLICY IF EXISTS "Tenant CRUD Access" ON public.skus;
DROP POLICY IF EXISTS "Tenant CRUD Access" ON public.bom;
DROP POLICY IF EXISTS "Tenant CRUD Access" ON public.insumos;
DROP POLICY IF EXISTS "Tenant isolation for entradas_estoque" ON public.entradas_estoque;
DROP POLICY IF EXISTS "Tenant CRUD Access" ON public.ordens_producao;
DROP POLICY IF EXISTS "Tenant CRUD Access" ON public.apontamentos;
DROP POLICY IF EXISTS "Tenant CRUD Access" ON public.pedidos;

-- Criar permissão de Leitura Livre (Tenant Isolation)
CREATE POLICY "Tenant Select Access" ON public.familias_produto FOR SELECT USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa());
CREATE POLICY "Tenant Select Access" ON public.skus FOR SELECT USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa());
CREATE POLICY "Tenant Select Access" ON public.bom FOR SELECT USING (familia_id IN (SELECT id FROM public.familias_produto WHERE empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())) AND public.verificar_assinatura_ativa());
CREATE POLICY "Tenant Select Access" ON public.insumos FOR SELECT USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa());
CREATE POLICY "Tenant Select Access" ON public.entradas_estoque FOR SELECT USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa());
CREATE POLICY "Tenant Select Access" ON public.ordens_producao FOR SELECT USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa());
CREATE POLICY "Tenant Select Access" ON public.apontamentos FOR SELECT USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa());
CREATE POLICY "Tenant Select Access" ON public.pedidos FOR SELECT USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) AND public.verificar_assinatura_ativa());

-- Familias (Modify)
CREATE POLICY "Tenant Modify Access" ON public.familias_produto
FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_familias')
) WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_familias')
);

-- SKUs (Modify)
CREATE POLICY "Tenant Modify Access" ON public.skus
FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_medidas')
) WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_medidas')
);

-- BOM (Modify)
CREATE POLICY "Tenant Modify Access" ON public.bom
FOR ALL USING (
    familia_id IN (SELECT id FROM public.familias_produto WHERE empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()))
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_receitas')
) WITH CHECK (
    familia_id IN (SELECT id FROM public.familias_produto WHERE empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()))
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_receitas')
);

-- Insumos e Lotes (Modify)
CREATE POLICY "Tenant Modify Access" ON public.insumos
FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_almoxarifado')
) WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_almoxarifado')
);
CREATE POLICY "Tenant Modify Access" ON public.entradas_estoque
FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_almoxarifado')
) WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_almoxarifado')
);

-- Ordens_Producao (Modify)
CREATE POLICY "Tenant Modify Access" ON public.ordens_producao
FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('acessar_planejamento')
) WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('acessar_planejamento')
);

-- Apontamentos (Modify)
CREATE POLICY "Tenant Modify Access" ON public.apontamentos
FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_apontamentos')
) WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_apontamentos')
);

-- Pedidos (Modify)
CREATE POLICY "Tenant Modify Access" ON public.pedidos
FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_clientes')
) WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_clientes')
);
