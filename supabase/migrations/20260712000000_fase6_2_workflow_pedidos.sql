-- Migration: Fase 6.2 Workflow Pedidos e Recebimento Personalizado
-- Created At: 2026-07-12

-- 1. Adicionar coluna data_recebimento_personalizada na tabela pedidos
ALTER TABLE public.pedidos 
ADD COLUMN IF NOT EXISTS data_recebimento_personalizada DATE;

-- 2. Refatoração da função sync_pedido_faturamento_titulo (Fatiamento de Títulos e Condição Personalizada)
CREATE OR REPLACE FUNCTION public.sync_pedido_faturamento_titulo()
RETURNS TRIGGER AS $$
DECLARE
    v_total_venda NUMERIC(15,4) := 0;
    v_vencimento DATE;
    v_condicao VARCHAR(50);
    v_parcela_valor NUMERIC(15,4);
    i INTEGER;
    v_pedido_id UUID;
    v_empresa_id UUID;
    v_codigo VARCHAR(100);
    v_cliente_id UUID;
    v_data_entrega TIMESTAMP WITH TIME ZONE;
    v_data_recebimento_personalizada DATE;
    v_status VARCHAR(50);
BEGIN
    -- Determinar o target pedido_id baseado no TG_TABLE_NAME
    IF TG_TABLE_NAME = 'pedidos' THEN
        IF TG_OP = 'DELETE' THEN
            v_pedido_id := OLD.id;
            DELETE FROM public.titulos_financeiros WHERE pedido_id = v_pedido_id AND status = 'PENDENTE';
            RETURN OLD;
        ELSE
            v_pedido_id := NEW.id;
            v_empresa_id := NEW.empresa_id;
            v_codigo := NEW.codigo;
            v_cliente_id := NEW.cliente_id;
            v_data_entrega := NEW.data_entrega;
            v_condicao := COALESCE(NEW.condicao_pagamento, '30_DIAS');
            v_data_recebimento_personalizada := NEW.data_recebimento_personalizada;
            v_status := NEW.status;
        END IF;
    ELSIF TG_TABLE_NAME = 'ordens_producao' THEN
        IF TG_OP = 'DELETE' THEN
            v_pedido_id := OLD.pedido_id;
        ELSE
            v_pedido_id := NEW.pedido_id;
        END IF;
        
        IF v_pedido_id IS NULL THEN
            RETURN COALESCE(NEW, OLD);
        END IF;

        -- Buscar dados correspondentes do pedido
        SELECT empresa_id, codigo, cliente_id, data_entrega, condicao_pagamento, data_recebimento_personalizada, status
        INTO v_empresa_id, v_codigo, v_cliente_id, v_data_entrega, v_condicao, v_data_recebimento_personalizada, v_status
        FROM public.pedidos
        WHERE id = v_pedido_id;
    END IF;

    -- Apenas sincroniza títulos se o status do pedido for ATIVO ou FINALIZADO
    IF v_status IN ('ATIVO', 'FINALIZADO') THEN
        -- Calcular total de venda somando as ordens do pedido
        SELECT COALESCE(SUM(quantidade_planejada * COALESCE(preco_venda_unitario, 0)), 0)
        INTO v_total_venda
        FROM public.ordens_producao
        WHERE pedido_id = v_pedido_id;

        -- Limpar títulos PENDENTE existentes deste pedido para evitar duplicatas ou lixo de condições anteriores
        DELETE FROM public.titulos_financeiros
        WHERE pedido_id = v_pedido_id AND status = 'PENDENTE';

        -- Apenas insere se o valor for positivo
        IF v_total_venda > 0 THEN
            IF v_condicao = 'A_VISTA' THEN
                v_vencimento := COALESCE(v_data_entrega::date, CURRENT_DATE);
                
                INSERT INTO public.titulos_financeiros (
                    empresa_id, tipo, descricao, valor, data_vencimento, status, cliente_id, pedido_id
                ) VALUES (
                    v_empresa_id, 'RECEBER', 'Faturamento: Pedido ' || v_codigo, v_total_venda, v_vencimento, 'PENDENTE', v_cliente_id, v_pedido_id
                );
                
            ELSIF v_condicao = '30_DIAS' THEN
                v_vencimento := COALESCE(v_data_entrega::date, CURRENT_DATE) + INTERVAL '30 days';
                
                INSERT INTO public.titulos_financeiros (
                    empresa_id, tipo, descricao, valor, data_vencimento, status, cliente_id, pedido_id
                ) VALUES (
                    v_empresa_id, 'RECEBER', 'Faturamento: Pedido ' || v_codigo, v_total_venda, v_vencimento, 'PENDENTE', v_cliente_id, v_pedido_id
                );
                
            ELSIF v_condicao = '30_60_90' THEN
                v_parcela_valor := ROUND(v_total_venda / 3.0, 4);
                
                FOR i IN 1..3 LOOP
                    v_vencimento := COALESCE(v_data_entrega::date, CURRENT_DATE) + (INTERVAL '30 days' * i);
                    
                    INSERT INTO public.titulos_financeiros (
                        empresa_id, tipo, descricao, valor, data_vencimento, status, cliente_id, pedido_id
                    ) VALUES (
                        v_empresa_id, 'RECEBER', 'Faturamento: Pedido ' || v_codigo || ' (Parc ' || i || '/3)', 
                        CASE WHEN i = 3 THEN v_total_venda - (v_parcela_valor * 2) ELSE v_parcela_valor END,
                        v_vencimento, 'PENDENTE', v_cliente_id, v_pedido_id
                    );
                END LOOP;
            ELSIF v_condicao = 'PERSONALIZADA' THEN
                v_vencimento := COALESCE(v_data_recebimento_personalizada, COALESCE(v_data_entrega::date, CURRENT_DATE));
                
                INSERT INTO public.titulos_financeiros (
                    empresa_id, tipo, descricao, valor, data_vencimento, status, cliente_id, pedido_id
                ) VALUES (
                    v_empresa_id, 'RECEBER', 'Faturamento: Pedido ' || v_codigo, v_total_venda, v_vencimento, 'PENDENTE', v_cliente_id, v_pedido_id
                );
            ELSE
                v_vencimento := COALESCE(v_data_entrega::date, CURRENT_DATE) + INTERVAL '30 days';
                
                INSERT INTO public.titulos_financeiros (
                    empresa_id, tipo, descricao, valor, data_vencimento, status, cliente_id, pedido_id
                ) VALUES (
                    v_empresa_id, 'RECEBER', 'Faturamento: Pedido ' || v_codigo, v_total_venda, v_vencimento, 'PENDENTE', v_cliente_id, v_pedido_id
                );
            END IF;
        END IF;
    ELSE
        -- Se o status mudou para qualquer outra coisa (como AGUARDANDO_APROVACAO ou CANCELADO), removemos os títulos PENDENTES vinculados
        DELETE FROM public.titulos_financeiros
        WHERE pedido_id = v_pedido_id AND status = 'PENDENTE';
    END IF;

    RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Reconfigurar Triggers

DROP TRIGGER IF EXISTS trigger_sync_pedido_faturamento_titulo ON public.pedidos;
CREATE TRIGGER trigger_sync_pedido_faturamento_titulo
AFTER INSERT OR UPDATE ON public.pedidos
FOR EACH ROW
EXECUTE FUNCTION public.sync_pedido_faturamento_titulo();

DROP TRIGGER IF EXISTS trigger_sync_op_faturamento_titulo ON public.ordens_producao;
CREATE TRIGGER trigger_sync_op_faturamento_titulo
AFTER INSERT OR UPDATE OR DELETE ON public.ordens_producao
FOR EACH ROW
EXECUTE FUNCTION public.sync_pedido_faturamento_titulo();
