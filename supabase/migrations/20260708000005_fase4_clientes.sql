-- Fase 4: Módulo de Clientes e Acoplamento de Pedidos

-- 1. Criar tabela clientes
CREATE TABLE IF NOT EXISTS public.clientes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    razao_social VARCHAR(255) NOT NULL,
    cnpj VARCHAR(20),
    telefone VARCHAR(20),
    endereco_entrega TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS e criar políticas
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant Select Access" ON public.clientes 
FOR SELECT USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
);

CREATE POLICY "Tenant Modify Access" ON public.clientes
FOR ALL USING (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_clientes')
) WITH CHECK (
    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
    AND public.verificar_assinatura_ativa()
    AND public.has_permission('gerenciar_clientes')
);

-- 2. Adicionar coluna cliente_id em pedidos
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS cliente_id UUID REFERENCES public.clientes(id) ON DELETE RESTRICT;

-- 3. Migração de Dados (Histórico)
DO $$
DECLARE
    r_pedido RECORD;
    v_cliente_id UUID;
BEGIN
    FOR r_pedido IN SELECT DISTINCT empresa_id, nome_cliente FROM public.pedidos WHERE nome_cliente IS NOT NULL AND TRIM(nome_cliente) != '' LOOP
        -- Tenta encontrar se o cliente já existe
        SELECT id INTO v_cliente_id FROM public.clientes WHERE empresa_id = r_pedido.empresa_id AND razao_social = TRIM(r_pedido.nome_cliente) LIMIT 1;
        
        IF v_cliente_id IS NULL THEN
            -- Insere novo cliente baseado no nome antigo
            INSERT INTO public.clientes (empresa_id, razao_social)
            VALUES (r_pedido.empresa_id, TRIM(r_pedido.nome_cliente))
            RETURNING id INTO v_cliente_id;
        END IF;

        -- Atualiza os pedidos vinculando ao cliente criado
        UPDATE public.pedidos 
        SET cliente_id = v_cliente_id
        WHERE empresa_id = r_pedido.empresa_id AND nome_cliente = r_pedido.nome_cliente;
    END LOOP;
END $$;

-- Tratar pedidos vazios ou nulos antigos (se houver, vincula a um cliente 'Cliente Padrão')
DO $$
DECLARE
    r_empresa RECORD;
    v_cliente_id UUID;
BEGIN
    FOR r_empresa IN SELECT DISTINCT empresa_id FROM public.pedidos WHERE cliente_id IS NULL LOOP
        -- Tenta encontrar 'Cliente Não Informado'
        SELECT id INTO v_cliente_id FROM public.clientes WHERE empresa_id = r_empresa.empresa_id AND razao_social = 'Cliente Não Informado' LIMIT 1;
        
        IF v_cliente_id IS NULL THEN
            INSERT INTO public.clientes (empresa_id, razao_social)
            VALUES (r_empresa.empresa_id, 'Cliente Não Informado')
            RETURNING id INTO v_cliente_id;
        END IF;

        UPDATE public.pedidos 
        SET cliente_id = v_cliente_id
        WHERE empresa_id = r_empresa.empresa_id AND cliente_id IS NULL;
    END LOOP;
END $$;

-- 4. Tornar cliente_id NOT NULL e dropar nome_cliente
ALTER TABLE public.pedidos ALTER COLUMN cliente_id SET NOT NULL;
ALTER TABLE public.pedidos DROP COLUMN nome_cliente;
