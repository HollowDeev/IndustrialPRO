-- Drop the incorrect yield column
ALTER TABLE public.insumos DROP COLUMN IF EXISTS rendimento_ml_kg;

-- Add the parametric standard mass per meter column
ALTER TABLE public.insumos ADD COLUMN IF NOT EXISTS peso_nominal_kg_m numeric(10,4) DEFAULT 0.395;

-- Update the registrar_apontamento Stored Procedure to use the parametric formula
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
    r_bom record;
    v_qtd_planejada integer;
    v_qtd_produzida_atual integer;
    v_status varchar;
    v_estoque_atual numeric(15,4);
    v_consumo_aco_kg numeric(15,4);
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

    -- Cálculos Paramétricos base da peça
    -- Aço por peça (metros lineares) * qtd_produzida
    v_aco_metros_total := (((v_comprimento_mm - coalesce(v_desconto_aco_mm, 70))::numeric / 1000.0) * coalesce(v_numero_vergalhoes, 4)) * p_quantidade_produzida;

    -- Volume geométrico do plástico
    v_volume_aco_total := v_volume_aco_metro * ((v_comprimento_mm - coalesce(v_desconto_aco_mm, 70))::numeric / 1000.0) * coalesce(v_numero_vergalhoes, 4) * p_quantidade_produzida;
    v_volume_plastico_liquido := (v_area_secao_externa * (v_comprimento_mm::numeric / 1000.0) * p_quantidade_produzida) - v_volume_aco_total;
    
    IF v_volume_plastico_liquido < 0 THEN
        v_volume_plastico_liquido := 0;
    END IF;

    -- Massa de blend plástico total (kg): Volume * densidade * 1000
    v_massa_plastico_total := v_volume_plastico_liquido * (v_densidade_g_cm3 * 1000.0);

    -- Loop pelos insumos da BOM
    FOR r_bom IN (
        SELECT b.insumo_id, b.quantidade_por_unidade, b.percentual_blend, i.categoria, i.peso_nominal_kg_m
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
            -- Cálculo determinístico do consumo do aço pelo peso nominal real do insumo
            v_consumo_aco_kg := v_aco_metros_total * coalesce(r_bom.peso_nominal_kg_m, 0.395);
            v_estoque_atual := v_estoque_atual - v_consumo_aco_kg;
        
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
