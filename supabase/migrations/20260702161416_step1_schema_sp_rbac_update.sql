-- 1. Schema Changes
ALTER TABLE public.familias_produto ADD COLUMN IF NOT EXISTS numero_vergalhoes integer NOT NULL DEFAULT 4;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS data_carga_prevista timestamp with time zone;
ALTER TABLE public.pedidos ADD COLUMN IF NOT EXISTS data_fechamento_expedicao timestamp with time zone;
ALTER TABLE public.usuarios ADD COLUMN IF NOT EXISTS role varchar(20) NOT NULL DEFAULT 'GESTOR';

-- 2. New Tables for Ficha
CREATE TABLE IF NOT EXISTS public.carregamentos_expedicao (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    pedido_id uuid references public.pedidos(id) on delete cascade not null,
    data_hora timestamp with time zone not null default now(),
    total integer not null,
    liberado integer not null,
    pendente integer not null,
    status varchar(50) not null,
    created_at timestamp with time zone default now()
);

CREATE TABLE IF NOT EXISTS public.reprogramacoes_tecnicas (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    pedido_id uuid references public.pedidos(id) on delete cascade not null,
    item_controle varchar(255) not null,
    registro_corrigido text not null,
    data_registro timestamp with time zone default now()
);

-- Enable RLS on new tables
ALTER TABLE public.carregamentos_expedicao ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reprogramacoes_tecnicas ENABLE ROW LEVEL SECURITY;

-- 3. Simplified RLS Policies (All active users from the tenant can read/write)
-- We will replace all existing complex policies with a single universal logic
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('familias_produto', 'skus', 'insumos', 'bom', 'ordens_compra', 'ordens_producao', 'apontamentos', 'pedidos', 'fornecedores', 'fornecedores_insumos', 'funcionarios', 'turnos', 'turnos_operadores', 'carregamentos_expedicao', 'reprogramacoes_tecnicas')
    LOOP
        -- Drop all possible previous policies (ignoring if they don't exist is done via DROP POLICY IF EXISTS but we have to do it generically, so we list known names or just use a generic drop)
        -- Since we know the names from the past, we drop them:
        EXECUTE 'DROP POLICY IF EXISTS "Visualização isolada ' || t || '" ON public.' || t;
        EXECUTE 'DROP POLICY IF EXISTS "Inserção com assinatura ATIVA ' || t || '" ON public.' || t;
        EXECUTE 'DROP POLICY IF EXISTS "Atualização com assinatura ATIVA ' || t || '" ON public.' || t;
        EXECUTE 'DROP POLICY IF EXISTS "Exclusão com assinatura ATIVA ' || t || '" ON public.' || t;
        EXECUTE 'DROP POLICY IF EXISTS "apontamentos_select" ON public.' || t;
        EXECUTE 'DROP POLICY IF EXISTS "apontamentos_insert" ON public.' || t;
        EXECUTE 'DROP POLICY IF EXISTS "insumos_select_financeiro" ON public.' || t;
        EXECUTE 'DROP POLICY IF EXISTS "ops_select_todos" ON public.' || t;
        EXECUTE 'DROP POLICY IF EXISTS "ops_write_gestao" ON public.' || t;

        -- Create simplified Tenant CRUD Access policy
        EXECUTE 'DROP POLICY IF EXISTS "Tenant CRUD Access" ON public.' || t;
        EXECUTE 'CREATE POLICY "Tenant CRUD Access" ON public.' || t || ' 
                 FOR ALL USING (
                    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
                    AND public.verificar_assinatura_ativa()
                 ) WITH CHECK (
                    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
                    AND public.verificar_assinatura_ativa()
                 );';
    END LOOP;
END $$;

-- Exceptions for 'empresas' and 'usuarios' to allow initial read without infinite recursion
DROP POLICY IF EXISTS "Tenant CRUD Access" ON public.empresas;
DROP POLICY IF EXISTS "Tenant CRUD Access" ON public.usuarios;

DROP POLICY IF EXISTS "Usuários podem ver a própria empresa" ON public.empresas;
CREATE POLICY "Tenant CRUD Access Empresas" ON public.empresas FOR ALL USING (id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()));

DROP POLICY IF EXISTS "Usuários veem membros da mesma empresa" ON public.usuarios;
DROP POLICY IF EXISTS "Usuários podem atualizar o próprio perfil" ON public.usuarios;
CREATE POLICY "Tenant CRUD Access Usuarios" ON public.usuarios FOR ALL USING (empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()));


-- 4. Stored Procedure: registrar_apontamento updated
CREATE OR REPLACE FUNCTION public.registrar_apontamento(
    p_empresa_id uuid,
    p_ordem_producao_id uuid,
    p_quantidade_produzida integer,
    p_horas_maquina numeric(10,2),
    p_refugo_kg numeric(10,4),
    p_operador_nome varchar(255),
    p_data_apontamento timestamp with time zone
)
RETURNS void AS $$
DECLARE
    v_sku_id uuid;
    v_familia_id uuid;
    v_comprimento_mm integer;
    v_desconto_aco_mm integer;
    v_numero_vergalhoes integer;
    v_area_secao_externa numeric(10,4);
    v_volume_aco_metro numeric(10,4);
    v_densidade_g_cm3 numeric(10,4);
    v_volume_aco_total numeric(15,6);
    v_volume_plastico_liquido numeric(15,6);
    v_massa_plastico_total numeric(15,4); -- em kg
    v_aco_metros_total numeric(15,4);
    v_aco_peso_total numeric(15,4); -- em kg
    r_bom record;
    v_qtd_planejada integer;
    v_qtd_produzida_atual integer;
    v_status varchar;
    v_estoque_atual numeric(15,4);
BEGIN
    -- 1. Obter informações da OP e do SKU correspondente
    SELECT op.sku_id, op.quantidade_planejada, op.quantidade_produzida, op.status
    INTO v_sku_id, v_qtd_planejada, v_qtd_produzida_atual, v_status
    FROM public.ordens_producao op
    WHERE op.id = p_ordem_producao_id AND op.empresa_id = p_empresa_id;

    IF v_sku_id IS NULL THEN
        RAISE EXCEPTION 'Ordem de produção não encontrada ou acesso não autorizado.';
    END IF;

    -- 2. Inserir na tabela de apontamentos
    INSERT INTO public.apontamentos (
        empresa_id,
        ordem_producao_id,
        quantidade_produzida,
        horas_maquina,
        refugo_kg,
        operador_nome,
        data_apontamento
    )
    VALUES (
        p_empresa_id,
        p_ordem_producao_id,
        p_quantidade_produzida,
        p_horas_maquina,
        p_refugo_kg,
        p_operador_nome,
        coalesce(p_data_apontamento, now())
    );

    -- 3. Atualizar a Ordem de Produção
    v_qtd_produzida_atual := v_qtd_produzida_atual + p_quantidade_produzida;
    IF v_qtd_produzida_atual >= v_qtd_planejada THEN
        v_status := 'FINALIZADA';
    ELSE
        v_status := 'EM_ANDAMENTO';
    END IF;

    UPDATE public.ordens_producao
    SET quantidade_produzida = v_qtd_produzida_atual,
        status = v_status,
        data_inicio = coalesce(data_inicio, now()),
        data_fim = CASE WHEN v_status = 'FINALIZADA' then now() ELSE data_fim END
    WHERE id = p_ordem_producao_id;

    -- 4. Adicionar ao estoque acabado do SKU
    UPDATE public.skus
    SET estoque_acabado = estoque_acabado + p_quantidade_produzida
    WHERE id = v_sku_id;

    -- 5. Executar a Explosão Reversa de BOM para baixa de estoque
    -- Pegar parâmetros físicos do SKU e da Família
    SELECT sku.comprimento_mm, sku.desconto_aco_mm, fam.id, fam.numero_vergalhoes, fam.area_secao_externa, fam.volume_aco_metro, fam.densidade_g_cm3
    INTO v_comprimento_mm, v_desconto_aco_mm, v_familia_id, v_numero_vergalhoes, v_area_secao_externa, v_volume_aco_metro, v_densidade_g_cm3
    FROM public.skus sku
    INNER JOIN public.familias_produto fam ON fam.id = sku.familia_id
    WHERE sku.id = v_sku_id;

    IF v_densidade_g_cm3 IS NULL OR v_densidade_g_cm3 <= 0 THEN
        RAISE EXCEPTION 'A densidade do blend não foi informada no cadastro da Família de Produto. Configure a densidade (ex: 0.98 t/m3) antes de apontar produção.';
    END IF;

    -- Cálculos por peça
    -- Aço por peça (metros): ((Comprimento - desconto) / 1000) * numero_vergalhoes
    v_aco_metros_total := (((v_comprimento_mm - v_desconto_aco_mm)::numeric / 1000.0) * coalesce(v_numero_vergalhoes, 4)) * p_quantidade_produzida;
    -- Peso do Aço: Ø8mm = 0.395 kg por metro linear
    v_aco_peso_total := v_aco_metros_total * 0.395;

    -- Volume geométrico do plástico
    -- Volume de aço total = volume de aco por metro * ((comprimento - desconto)/1000) * numero de vergalhoes * qtd_produzida
    v_volume_aco_total := v_volume_aco_metro * ((v_comprimento_mm - v_desconto_aco_mm)::numeric / 1000.0) * coalesce(v_numero_vergalhoes, 4) * p_quantidade_produzida;
    v_volume_plastico_liquido := (v_area_secao_externa * (v_comprimento_mm::numeric / 1000.0) * p_quantidade_produzida) - v_volume_aco_total;
    IF v_volume_plastico_liquido < 0 THEN
        v_volume_plastico_liquido := 0;
    END IF;

    -- Massa de blend plástico total (kg): Volume * densidade * 1000
    v_massa_plastico_total := v_volume_plastico_liquido * (v_densidade_g_cm3 * 1000.0);

    -- Loop pelos insumos da BOM
    FOR r_bom IN (
        SELECT b.insumo_id, b.quantidade_por_unidade, b.percentual_blend, i.categoria
        FROM public.bom b
        INNER JOIN public.insumos i ON i.id = b.insumo_id
        WHERE b.familia_id = v_familia_id
    ) LOOP
        -- BLOQUEIO PESSIMISTA: SELECT FOR UPDATE
        SELECT estoque_atual INTO v_estoque_atual
        FROM public.insumos
        WHERE id = r_bom.insumo_id
        FOR UPDATE;

        IF r_bom.categoria = 'ACO' THEN
            v_estoque_atual := v_estoque_atual - v_aco_peso_total;
        
        ELSIF r_bom.categoria = 'QUIMICO' AND r_bom.percentual_blend IS NOT NULL THEN
            DECLARE
                v_consumo_nominal numeric(15,4);
                v_consumo_refugo numeric(15,4);
            BEGIN
                v_consumo_nominal := v_massa_plastico_total * (r_bom.percentual_blend / 100.0);
                v_consumo_refugo := coalesce(p_refugo_kg, 0) * (r_bom.percentual_blend / 100.0);
                v_estoque_atual := v_estoque_atual - (v_consumo_nominal + v_consumo_refugo);
            END;
        
        ELSE
            -- Outros insumos proporcionais à massa total ou peças
            v_estoque_atual := v_estoque_atual - (r_bom.quantidade_por_unidade * v_massa_plastico_total);
        END IF;

        IF v_estoque_atual < 0 THEN
            RAISE EXCEPTION 'Estoque insuficiente para o insumo (ID: %). Consumo geraria saldo negativo de %', r_bom.insumo_id, v_estoque_atual;
        END IF;

        UPDATE public.insumos
        SET estoque_atual = v_estoque_atual
        WHERE id = r_bom.insumo_id;

    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;