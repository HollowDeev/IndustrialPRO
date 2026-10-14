-- Fase 2: Arquitetura FIFO e Rastreabilidade de Lotes

-- 1. Modificar tabela entradas_estoque (Modelo de Lotes)
ALTER TABLE public.entradas_estoque 
ADD COLUMN IF NOT EXISTS quantidade_atual NUMERIC(15,4) DEFAULT 0,
ADD COLUMN IF NOT EXISTS umidade_produto NUMERIC(5,2),
ADD COLUMN IF NOT EXISTS umidade_ambiente NUMERIC(5,2);

-- 2. Migração de Dados (Lotes Virtuais Iniciais)
DO $$
DECLARE
    r_insumo RECORD;
    v_fornecedor_padrao UUID;
BEGIN
    -- Obter o fornecedor default para insumos que não tem histórico (pegar qualquer um ativo)
    SELECT id INTO v_fornecedor_padrao FROM public.fornecedores WHERE status = 'Ativo' LIMIT 1;

    -- Zerar todas as quantidades atuais de entradas antigas (elas já foram absorvidas no estoque_atual passado)
    UPDATE public.entradas_estoque SET quantidade_atual = 0;

    -- Para cada insumo com estoque > 0, criar um lote virtual "Saldo Inicial" com status ENTREGUE
    FOR r_insumo IN SELECT id, empresa_id, estoque_atual FROM public.insumos WHERE estoque_atual > 0 LOOP
        INSERT INTO public.entradas_estoque (
            empresa_id,
            insumo_id,
            fornecedor_id,
            quantidade,
            quantidade_atual,
            preco_unitario,
            data_prevista,
            status,
            data_entrega
        ) VALUES (
            r_insumo.empresa_id,
            r_insumo.id,
            -- Tentar pegar um fornecedor recente se possível, senão o padrão
            COALESCE((SELECT fornecedor_id FROM public.entradas_estoque WHERE insumo_id = r_insumo.id LIMIT 1), v_fornecedor_padrao),
            r_insumo.estoque_atual,
            r_insumo.estoque_atual,
            COALESCE((SELECT preco_unitario FROM public.entradas_estoque WHERE insumo_id = r_insumo.id LIMIT 1), 0),
            CURRENT_DATE,
            'ENTREGUE',
            NOW()
        );
    END LOOP;
END $$;

-- 3. Trigger para manter insumos.estoque_atual sincronizado com a soma dos lotes (entradas_estoque.quantidade_atual)
CREATE OR REPLACE FUNCTION public.sync_insumo_estoque()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        UPDATE public.insumos 
        SET estoque_atual = (
            SELECT COALESCE(SUM(quantidade_atual), 0) 
            FROM public.entradas_estoque 
            WHERE insumo_id = NEW.insumo_id AND status = 'ENTREGUE'
        )
        WHERE id = NEW.insumo_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.insumos 
        SET estoque_atual = (
            SELECT COALESCE(SUM(quantidade_atual), 0) 
            FROM public.entradas_estoque 
            WHERE insumo_id = OLD.insumo_id AND status = 'ENTREGUE'
        )
        WHERE id = OLD.insumo_id;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_sync_insumo_estoque ON public.entradas_estoque;
CREATE TRIGGER trigger_sync_insumo_estoque
AFTER INSERT OR UPDATE OF quantidade_atual, status OR DELETE
ON public.entradas_estoque
FOR EACH ROW
EXECUTE FUNCTION public.sync_insumo_estoque();

-- 4. Refatorar registrar_recebimento
DROP FUNCTION IF EXISTS public.registrar_recebimento(UUID);

CREATE OR REPLACE FUNCTION public.registrar_recebimento(
    p_entrada_id UUID,
    p_umidade_produto NUMERIC(5,2) DEFAULT NULL,
    p_umidade_ambiente NUMERIC(5,2) DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_entrada RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    SELECT * INTO v_entrada FROM entradas_estoque WHERE id = p_entrada_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Entrada de estoque não encontrada.'; END IF;
    IF v_entrada.status = 'ENTREGUE' THEN RAISE EXCEPTION 'Esta entrada já foi registrada como ENTREGUE.'; END IF;

    UPDATE entradas_estoque
    SET 
        status = 'ENTREGUE',
        data_entrega = NOW(),
        recebido_por = v_user_id,
        updated_at = NOW(),
        quantidade_atual = quantidade,
        umidade_produto = p_umidade_produto,
        umidade_ambiente = p_umidade_ambiente
    WHERE id = p_entrada_id;

    UPDATE insumos
    SET metadados = jsonb_set(
            COALESCE(metadados, '{}'::jsonb), 
            '{last_purchase_price}', 
            to_jsonb(v_entrada.preco_unitario)
        )
    WHERE id = v_entrada.insumo_id;
END;
$$;

-- 5. Refatorar registrar_apontamento (Lógica FIFO)
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

    SELECT sku.comprimento_mm, sku.desconto_aco_mm, fam.id, fam.numero_vergalhoes, fam.area_secao_externa, fam.volume_aco_metro, fam.densidade_g_cm3
    INTO v_comprimento_mm, v_desconto_aco_mm, v_familia_id, v_numero_vergalhoes, v_area_secao_externa, v_volume_aco_metro, v_densidade_g_cm3
    FROM public.skus sku
    INNER JOIN public.familias_produto fam ON fam.id = sku.familia_id
    WHERE sku.id = v_sku_id;

    IF v_densidade_g_cm3 IS NULL OR v_densidade_g_cm3 <= 0 THEN
        RAISE EXCEPTION 'A densidade do blend não foi informada.';
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
            ELSIF r_bom.categoria = 'QUIMICO' AND r_bom.percentual_blend IS NOT NULL THEN
                v_quantidade_necessaria := (v_massa_plastico_total * (r_bom.percentual_blend / 100.0)) + (coalesce(p_refugo_kg, 0) * (r_bom.percentual_blend / 100.0));
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
