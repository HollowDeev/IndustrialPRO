-- Fase 6.1 - Ajustes Finos Financeiros (Prazos, Comissões, Custos Fixos)

-- 1. Alterações na tabela pedidos
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS condicao_pagamento VARCHAR(50) DEFAULT '30_DIAS',
ADD COLUMN IF NOT EXISTS comissao_venda_percentual NUMERIC(5,2) DEFAULT 0;

-- 2. Alterações na tabela custos_fixos
ALTER TABLE public.custos_fixos
ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER DEFAULT 5 CHECK (dia_vencimento >= 1 AND dia_vencimento <= 31);

-- 3. Refatoração da função sync_pedido_faturamento_titulo (Fatiamento de Títulos)
CREATE OR REPLACE FUNCTION public.sync_pedido_faturamento_titulo()
RETURNS TRIGGER AS $$
DECLARE
    v_total_venda NUMERIC(15,4) := 0;
    v_vencimento DATE;
    v_condicao VARCHAR(50);
    v_parcela_valor NUMERIC(15,4);
    i INTEGER;
BEGIN
    -- Dispara quando o status do pedido muda para FINALIZADO
    IF NEW.status = 'FINALIZADO' AND OLD.status IS DISTINCT FROM 'FINALIZADO' THEN
        -- Calcular total de venda somando as ordens do pedido
        SELECT COALESCE(SUM(quantidade_planejada * COALESCE(preco_venda_unitario, 0)), 0)
        INTO v_total_venda
        FROM public.ordens_producao
        WHERE pedido_id = NEW.id;

        v_condicao := COALESCE(NEW.condicao_pagamento, '30_DIAS');
        
        -- Lógica de Fatiamento baseada na condicao_pagamento
        IF v_condicao = 'A_VISTA' THEN
            v_vencimento := COALESCE(NEW.data_entrega::date, CURRENT_DATE);
            
            INSERT INTO public.titulos_financeiros (
                empresa_id, tipo, descricao, valor, data_vencimento, status, cliente_id, pedido_id
            ) VALUES (
                NEW.empresa_id, 'RECEBER', 'Faturamento: Pedido ' || NEW.codigo, v_total_venda, v_vencimento, 'PENDENTE', NEW.cliente_id, NEW.id
            );
            
        ELSIF v_condicao = '30_DIAS' THEN
            v_vencimento := COALESCE(NEW.data_entrega::date, CURRENT_DATE) + INTERVAL '30 days';
            
            INSERT INTO public.titulos_financeiros (
                empresa_id, tipo, descricao, valor, data_vencimento, status, cliente_id, pedido_id
            ) VALUES (
                NEW.empresa_id, 'RECEBER', 'Faturamento: Pedido ' || NEW.codigo, v_total_venda, v_vencimento, 'PENDENTE', NEW.cliente_id, NEW.id
            );
            
        ELSIF v_condicao = '30_60_90' THEN
            v_parcela_valor := ROUND(v_total_venda / 3.0, 4);
            
            FOR i IN 1..3 LOOP
                v_vencimento := COALESCE(NEW.data_entrega::date, CURRENT_DATE) + (INTERVAL '30 days' * i);
                
                INSERT INTO public.titulos_financeiros (
                    empresa_id, tipo, descricao, valor, data_vencimento, status, cliente_id, pedido_id
                ) VALUES (
                    NEW.empresa_id, 'RECEBER', 'Faturamento: Pedido ' || NEW.codigo || ' (Parc ' || i || '/3)', 
                    CASE WHEN i = 3 THEN v_total_venda - (v_parcela_valor * 2) ELSE v_parcela_valor END, -- Ajuste na última parcela
                    v_vencimento, 'PENDENTE', NEW.cliente_id, NEW.id
                );
            END LOOP;
        ELSE
            -- Default to 30 days if unknown
            v_vencimento := COALESCE(NEW.data_entrega::date, CURRENT_DATE) + INTERVAL '30 days';
            
            INSERT INTO public.titulos_financeiros (
                empresa_id, tipo, descricao, valor, data_vencimento, status, cliente_id, pedido_id
            ) VALUES (
                NEW.empresa_id, 'RECEBER', 'Faturamento: Pedido ' || NEW.codigo, v_total_venda, v_vencimento, 'PENDENTE', NEW.cliente_id, NEW.id
            );
        END IF;

    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 4. Função e Trigger para espelhar custos fixos em Títulos a Pagar
CREATE OR REPLACE FUNCTION public.espelhar_custo_fixo_titulo()
RETURNS TRIGGER AS $$
DECLARE
    v_data_vencimento DATE;
BEGIN
    -- Calcula a data de vencimento para o mês SUBSEQUENTE à competência
    -- Ex: competencia_mes = '2026-07-01'. dia_vencimento = 5.
    -- Vencimento = '2026-08-05'
    
    -- Primeiro, soma 1 mês na competencia_mes, mantendo o dia 1
    -- Depois soma os (dia_vencimento - 1) dias para chegar ao dia correto.
    v_data_vencimento := (date_trunc('month', NEW.competencia_mes) + INTERVAL '1 month' + (NEW.dia_vencimento - 1 || ' days')::INTERVAL)::DATE;

    INSERT INTO public.titulos_financeiros (
        empresa_id,
        tipo,
        descricao,
        valor,
        data_vencimento,
        status
    ) VALUES (
        NEW.empresa_id,
        'PAGAR',
        'Custo Fixo: ' || NEW.descricao || ' (Comp: ' || to_char(NEW.competencia_mes, 'MM/YYYY') || ')',
        NEW.valor_mensal,
        v_data_vencimento,
        'PENDENTE'
    );
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_espelhar_custo_fixo ON public.custos_fixos;
CREATE TRIGGER trigger_espelhar_custo_fixo
AFTER INSERT ON public.custos_fixos
FOR EACH ROW
EXECUTE FUNCTION public.espelhar_custo_fixo_titulo();
