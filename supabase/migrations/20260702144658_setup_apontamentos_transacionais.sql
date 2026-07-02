-- Migração para Setup de Apontamentos Transacionais e Baixa de Estoque Automatizada

-- 1. Adicionar coluna estoque_acabado na tabela de SKUs
ALTER TABLE public.skus ADD COLUMN IF NOT EXISTS estoque_acabado integer NOT NULL DEFAULT 0;

-- 2. Adicionar coluna operador_nome na tabela de apontamentos
ALTER TABLE public.apontamentos ADD COLUMN IF NOT EXISTS operador_nome varchar(255);

-- 3. Stored Procedure RPC para Registrar Apontamento com Transação Atômica
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
    SELECT sku.comprimento_mm, sku.desconto_aco_mm, fam.id, fam.area_secao_externa, fam.volume_aco_metro, fam.densidade_g_cm3
    INTO v_comprimento_mm, v_desconto_aco_mm, v_familia_id, v_area_secao_externa, v_volume_aco_metro, v_densidade_g_cm3
    FROM public.skus sku
    INNER JOIN public.familias_produto fam ON fam.id = sku.familia_id
    WHERE sku.id = v_sku_id;

    -- Cálculos por unidade (peça única)
    -- Aço por peça (metros): (Comprimento total - desconto) / 1000
    v_aco_metros_total := ((v_comprimento_mm - v_desconto_aco_mm)::numeric / 1000.0) * p_quantidade_produzida;
    -- Peso do Aço: Ø8mm = 0.395 kg por metro linear
    v_aco_peso_total := v_aco_metros_total * 0.395;

    -- Volume geométrico de plástico por peça (m³): Area externa * (Comprimento / 1000) - volume de aço
    -- volume de aço por peça = volume_aco_metro * (Metros de aço por peça)
    v_volume_aco_total := v_volume_aco_metro * ((v_comprimento_mm - v_desconto_aco_mm)::numeric / 1000.0) * p_quantidade_produzida;
    v_volume_plastico_liquido := (v_area_secao_externa * (v_comprimento_mm::numeric / 1000.0) * p_quantidade_produzida) - v_volume_aco_total;
    IF v_volume_plastico_liquido < 0 THEN
        v_volume_plastico_liquido := 0;
    END IF;

    -- Massa de blend plástico total (kg): Volume * densidade * 1000 (para converter g/cm³ para kg/m³: 1 g/cm³ = 1000 kg/m³)
    v_massa_plastico_total := v_volume_plastico_liquido * (coalesce(v_densidade_g_cm3, 0.95) * 1000.0);

    -- Loop pelos insumos da BOM
    FOR r_bom IN (
        SELECT b.insumo_id, b.quantidade_por_unidade, b.percentual_blend, i.categoria
        FROM public.bom b
        INNER JOIN public.insumos i ON i.id = b.insumo_id
        WHERE b.familia_id = v_familia_id
    ) LOOP
        -- Baixa de Aço
        IF r_bom.categoria = 'ACO' THEN
            UPDATE public.insumos
            SET estoque_atual = estoque_atual - v_aco_peso_total
            WHERE id = r_bom.insumo_id;
        
        -- Baixa de Plásticos/Químicos com blend seco (%)
        ELSIF r_bom.categoria = 'QUIMICO' AND r_bom.percentual_blend IS NOT NULL THEN
            -- Consumo nominal das peças + refugo/borra proporcional
            DECLARE
                v_consumo_nominal numeric(15,4);
                v_consumo_refugo numeric(15,4);
            BEGIN
                v_consumo_nominal := v_massa_plastico_total * (r_bom.percentual_blend / 100.0);
                v_consumo_refugo := p_refugo_kg * (r_bom.percentual_blend / 100.0);
                
                UPDATE public.insumos
                SET estoque_atual = estoque_atual - (v_consumo_nominal + v_consumo_refugo)
                WHERE id = r_bom.insumo_id;
            END;
        
        -- Outros insumos proporcionais à quantidade (ex: aditivos ml por kg de blend)
        ELSE
            UPDATE public.insumos
            SET estoque_atual = estoque_atual - (r_bom.quantidade_por_unidade * v_massa_plastico_total)
            WHERE id = r_bom.insumo_id;
        END IF;
    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
