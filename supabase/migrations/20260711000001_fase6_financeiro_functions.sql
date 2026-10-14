-- Migration: Fase 6 Financeiro Functions & Triggers
-- Created At: 2026-07-11

-- 1. Refatorar registrar_recebimento
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
    v_soma_extras NUMERIC(15,4);
    v_custo_unitario_real NUMERIC(15,4);
    v_prazo_forn VARCHAR(100);
    v_dias_prazo INTEGER := 0;
    v_vencimento DATE;
BEGIN
    v_user_id := auth.uid();
    
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    SELECT * INTO v_entrada FROM entradas_estoque WHERE id = p_entrada_id FOR UPDATE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Entrada de estoque não encontrada.'; END IF;
    IF v_entrada.status = 'ENTREGUE' THEN RAISE EXCEPTION 'Esta entrada já foi registrada como ENTREGUE.'; END IF;

    -- Calcular soma dos custos extras
    SELECT COALESCE(SUM(valor), 0) INTO v_soma_extras FROM entradas_custos_extras WHERE entrada_id = p_entrada_id;

    -- Calcular custo unitario real
    v_custo_unitario_real := ((v_entrada.quantidade * v_entrada.preco_unitario) + v_soma_extras) / v_entrada.quantidade;

    -- Atualizar lote
    UPDATE entradas_estoque
    SET 
        status = 'ENTREGUE',
        data_entrega = NOW(),
        recebido_por = v_user_id,
        updated_at = NOW(),
        quantidade_atual = quantidade,
        umidade_produto = p_umidade_produto,
        umidade_ambiente = p_umidade_ambiente,
        custo_unitario_real = v_custo_unitario_real
    WHERE id = p_entrada_id;

    -- Atualizar preço de última compra do insumo com o custo unitário real
    UPDATE insumos
    SET metadados = jsonb_set(
            COALESCE(metadados, '{}'::jsonb), 
            '{last_purchase_price}', 
            to_jsonb(v_custo_unitario_real)
        )
    WHERE id = v_entrada.insumo_id;

    -- Obter prazo de pagamento do fornecedor
    SELECT COALESCE(payment_term, 'À Vista') INTO v_prazo_forn FROM fornecedores WHERE id = v_entrada.fornecedor_id;

    -- Parsear prazo de pagamento (ex: '30 Dias' -> 30)
    IF v_prazo_forn ~ '^[0-9]+' THEN
        v_dias_prazo := (regexp_matches(v_prazo_forn, '^[0-9]+'))[1]::integer;
    ELSE
        v_dias_prazo := 0;
    END IF;

    v_vencimento := (CURRENT_DATE + v_dias_prazo * INTERVAL '1 day')::date;

    -- Inserir Título a Pagar correspondente ao valor original da nota do fornecedor
    INSERT INTO titulos_financeiros (
        empresa_id,
        tipo,
        descricao,
        valor,
        data_vencimento,
        status,
        fornecedor_id
    ) VALUES (
        v_entrada.empresa_id,
        'PAGAR',
        'Compra de Insumo (Lote ' || SUBSTRING(p_entrada_id::text FROM 1 FOR 8) || ')',
        v_entrada.quantidade * v_entrada.preco_unitario,
        v_vencimento,
        'PENDENTE',
        v_entrada.fornecedor_id
    );

    -- Lançar também os custos extras como títulos a pagar imediatos vinculados ao mesmo fornecedor
    INSERT INTO titulos_financeiros (
        empresa_id,
        tipo,
        descricao,
        valor,
        data_vencimento,
        status,
        fornecedor_id
    )
    SELECT 
        v_entrada.empresa_id,
        'PAGAR',
        descricao_custo || ' (Lote ' || SUBSTRING(p_entrada_id::text FROM 1 FOR 8) || ')',
        valor,
        CURRENT_DATE,
        'PENDENTE',
        v_entrada.fornecedor_id
    FROM entradas_custos_extras
    WHERE entrada_id = p_entrada_id;

END;
$$;


-- 2. Refatorar registrar_apontamento (Lógica FIFO com gravação de consumo)
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
                SELECT id, quantidade_atual, preco_unitario, custo_unitario_real 
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

                -- Registrar na tabela de consumos das OPs
                DECLARE
                    v_custo_lote NUMERIC(15,4);
                BEGIN
                    v_custo_lote := COALESCE(v_lote_atual.custo_unitario_real, v_lote_atual.preco_unitario);
                    INSERT INTO public.ordem_producao_consumos (
                        empresa_id,
                        ordem_producao_id,
                        insumo_id,
                        entrada_estoque_id,
                        quantidade_consumida,
                        custo_unitario_lote,
                        valor_total
                    ) VALUES (
                        p_empresa_id,
                        p_ordem_producao_id,
                        r_bom.insumo_id,
                        v_lote_atual.id,
                        v_abater,
                        v_custo_lote,
                        v_abater * v_custo_lote
                    );
                END;

                v_quantidade_necessaria := v_quantidade_necessaria - v_abater;
            END LOOP;
        END;
    END LOOP;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Trigger de Faturamento Automático de Pedidos
CREATE OR REPLACE FUNCTION public.sync_pedido_faturamento_titulo()
RETURNS TRIGGER AS $$
DECLARE
    v_total_venda NUMERIC(15,4) := 0;
    v_vencimento DATE;
BEGIN
    -- Dispara quando o status do pedido muda para FINALIZADO
    IF NEW.status = 'FINALIZADO' AND OLD.status IS DISTINCT FROM 'FINALIZADO' THEN
        -- Calcular total de venda somando as ordens do pedido
        SELECT COALESCE(SUM(quantidade_planejada * COALESCE(preco_venda_unitario, 0)), 0)
        INTO v_total_venda
        FROM public.ordens_producao
        WHERE pedido_id = NEW.id;

        v_vencimento := COALESCE(NEW.data_entrega::date, (CURRENT_DATE + INTERVAL '30 days')::date);

        -- Inserir Título a Receber correspondente
        INSERT INTO public.titulos_financeiros (
            empresa_id,
            tipo,
            descricao,
            valor,
            data_vencimento,
            status,
            cliente_id,
            pedido_id
        ) VALUES (
            NEW.empresa_id,
            'RECEBER',
            'Faturamento: Pedido ' || NEW.codigo,
            v_total_venda,
            v_vencimento,
            'PENDENTE',
            NEW.cliente_id,
            NEW.id
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_sync_pedido_faturamento_titulo ON public.pedidos;
CREATE TRIGGER trigger_sync_pedido_faturamento_titulo
AFTER UPDATE OF status ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.sync_pedido_faturamento_titulo();


-- 4. Função Atômica de Factoring (Antecipação)
CREATE OR REPLACE FUNCTION public.executar_factoring(
    p_titulo_id UUID,
    p_taxa_desagio NUMERIC
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_titulo RECORD;
    v_user_id UUID;
BEGIN
    v_user_id := auth.uid();
    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Usuário não autenticado.';
    END IF;

    -- Validar e bloquear o título para edição
    SELECT * INTO v_titulo FROM titulos_financeiros WHERE id = p_titulo_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Título não encontrado.';
    END IF;

    IF v_titulo.tipo != 'RECEBER' THEN
        RAISE EXCEPTION 'Apenas títulos a RECEBER podem ser antecipados.';
    END IF;

    IF v_titulo.status != 'PENDENTE' THEN
        RAISE EXCEPTION 'Apenas títulos com status PENDENTE podem ser antecipados.';
    END IF;

    IF p_taxa_desagio < 0 OR p_taxa_desagio > v_titulo.valor THEN
        RAISE EXCEPTION 'A taxa de deságio deve ser entre zero e o valor do título.';
    END IF;

    -- 1. Alterar o status do Título a Receber para ANTECIPADO
    UPDATE titulos_financeiros
    SET 
        status = 'ANTECIPADO',
        data_liquidacao = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = p_titulo_id;

    -- 2. Lançar o deságio como um Título a Pagar quitado
    INSERT INTO titulos_financeiros (
        empresa_id,
        tipo,
        descricao,
        valor,
        data_vencimento,
        data_liquidacao,
        status,
        cliente_id,
        pedido_id
    ) VALUES (
        v_titulo.empresa_id,
        'PAGAR',
        'Despesa Financeira / Deságio (Ref: ' || v_titulo.descricao || ')',
        p_taxa_desagio,
        CURRENT_DATE,
        CURRENT_DATE,
        'PAGO',
        v_titulo.cliente_id,
        v_titulo.pedido_id
    );

END;
$$;
