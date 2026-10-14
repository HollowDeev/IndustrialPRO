-- 20260708000004_fix_mrp_quimicos.sql

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
    v_densidade_g_cm3 numeric(10,4);
    
    v_bitola_mm numeric(10,4);
    v_volume_aco_metro numeric(15,8) := 0;
    
    v_volume_aco_total numeric(15,6);
    v_volume_plastico_liquido numeric(15,6);
    v_massa_plastico_total numeric(15,4);
    v_aco_metros_total numeric(15,4);
    r_bom record;
    v_qtd_planejada integer;
    v_qtd_produzida_atual integer;
    v_status varchar;
BEGIN
    SELECT op.sku_id, op.quantidade_planejada, op.quantidade_produzida, op.status
    INTO v_sku_id, v_qtd_planejada, v_qtd_produzida_atual, v_status
    FROM public.ordens_producao op
    WHERE op.id = p_ordem_producao_id AND op.empresa_id = p_empresa_id;

    IF v_sku_id IS NULL THEN
        RAISE EXCEPTION 'Ordem de produção não encontrada ou acesso não autorizado.';
    END IF;

    INSERT INTO public.apontamentos (
        empresa_id, ordem_producao_id, quantidade_produzida, horas_maquina,
        refugo_kg, operador_nome, data_apontamento
    ) VALUES (
        p_empresa_id, p_ordem_producao_id, p_quantidade_produzida, p_horas_maquina,
        p_refugo_kg, p_operador_nome, coalesce(p_data_apontamento, now())
    );

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

    UPDATE public.skus
    SET estoque_acabado = estoque_acabado + p_quantidade_produzida
    WHERE id = v_sku_id;

    SELECT sku.comprimento_mm, sku.desconto_aco_mm, fam.id, fam.numero_vergalhoes, fam.area_secao_externa, fam.densidade_g_cm3
    INTO v_comprimento_mm, v_desconto_aco_mm, v_familia_id, v_numero_vergalhoes, v_area_secao_externa, v_densidade_g_cm3
    FROM public.skus sku
    INNER JOIN public.familias_produto fam ON fam.id = sku.familia_id
    WHERE sku.id = v_sku_id;

    IF v_densidade_g_cm3 IS NULL OR v_densidade_g_cm3 <= 0 THEN
        RAISE EXCEPTION 'A densidade do blend não foi informada.';
    END IF;

    -- Obter a bitola do Aço diretamente do insumo da BOM para calcular o volume métrico
    SELECT i.bitola_mm 
    INTO v_bitola_mm
    FROM public.bom b
    INNER JOIN public.insumos i ON i.id = b.insumo_id
    WHERE b.familia_id = v_familia_id AND i.categoria = 'ACO'
    LIMIT 1;

    IF v_bitola_mm IS NOT NULL THEN
        v_volume_aco_metro := PI() * POWER(((v_bitola_mm / 2.0) / 1000.0), 2);
    END IF;

    v_aco_metros_total := (((v_comprimento_mm - coalesce(v_desconto_aco_mm, 70))::numeric / 1000.0) * coalesce(v_numero_vergalhoes, 4)) * p_quantidade_produzida;
    v_volume_aco_total := v_volume_aco_metro * ((v_comprimento_mm - coalesce(v_desconto_aco_mm, 70))::numeric / 1000.0) * coalesce(v_numero_vergalhoes, 4) * p_quantidade_produzida;
    v_volume_plastico_liquido := (v_area_secao_externa * (v_comprimento_mm::numeric / 1000.0) * p_quantidade_produzida) - v_volume_aco_total;
    
    IF v_volume_plastico_liquido < 0 THEN
        v_volume_plastico_liquido := 0;
    END IF;

    v_massa_plastico_total := v_volume_plastico_liquido * (v_densidade_g_cm3 * 1000.0);

    FOR r_bom IN (
        SELECT b.insumo_id, b.quantidade_por_unidade, b.percentual_blend, i.categoria, i.peso_nominal_kg_m
        FROM public.bom b
        INNER JOIN public.insumos i ON i.id = b.insumo_id
        WHERE b.familia_id = v_familia_id
    ) LOOP
        DECLARE
            v_quantidade_necessaria NUMERIC(15,4);
            v_estoque_atual NUMERIC(15,4);
            v_lote_atual RECORD;
            v_abater NUMERIC(15,4);
        BEGIN
            IF r_bom.categoria = 'ACO' THEN
                v_quantidade_necessaria := v_aco_metros_total * coalesce(r_bom.peso_nominal_kg_m, 0.395);
            ELSIF r_bom.categoria = 'QUIMICO' THEN
                -- Refugo consome químico, pois é misturado antes.
                -- Consumo L = ((Massa Líquida + Refugo) / 1000) * (dosagem / 1000)
                v_quantidade_necessaria := ((v_massa_plastico_total + coalesce(p_refugo_kg, 0)) / 1000.0) * (r_bom.quantidade_por_unidade / 1000.0);
            ELSE
                v_quantidade_necessaria := (r_bom.quantidade_por_unidade * v_massa_plastico_total);
            END IF;

            SELECT COALESCE(SUM(quantidade_atual), 0) INTO v_estoque_atual 
            FROM public.entradas_estoque 
            WHERE insumo_id = r_bom.insumo_id AND status = 'ENTREGUE';
            
            IF v_estoque_atual < v_quantidade_necessaria THEN
                RAISE EXCEPTION 'Estoque insuficiente (FIFO) para insumo %. Necessidade: %, Saldo Lotes: %', r_bom.insumo_id, v_quantidade_necessaria, v_estoque_atual;
            END IF;

            FOR v_lote_atual IN 
                SELECT id, quantidade_atual 
                FROM public.entradas_estoque 
                WHERE insumo_id = r_bom.insumo_id AND status = 'ENTREGUE' AND quantidade_atual > 0
                ORDER BY data_entrega ASC
                FOR UPDATE
            LOOP
                IF v_quantidade_necessaria <= 0 THEN
                    EXIT;
                END IF;

                IF v_lote_atual.quantidade_atual >= v_quantidade_necessaria THEN
                    v_abater := v_quantidade_necessaria;
                ELSE
                    v_abater := v_lote_atual.quantidade_atual;
                END IF;

                UPDATE public.entradas_estoque 
                SET quantidade_atual = quantidade_atual - v_abater
                WHERE id = v_lote_atual.id;

                v_quantidade_necessaria := v_quantidade_necessaria - v_abater;
            END LOOP;
        END;
    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
