CREATE TABLE IF NOT EXISTS public.entradas_estoque (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    insumo_id UUID NOT NULL REFERENCES public.insumos(id) ON DELETE CASCADE,
    fornecedor_id UUID NOT NULL REFERENCES public.fornecedores(id) ON DELETE RESTRICT,
    quantidade NUMERIC(15,4) NOT NULL CHECK (quantidade > 0),
    preco_unitario NUMERIC(15,4) NOT NULL CHECK (preco_unitario >= 0),
    data_prevista DATE NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'PENDENTE' CHECK (status IN ('PENDENTE', 'ENTREGUE', 'CANCELADO')),
    data_entrega TIMESTAMP WITH TIME ZONE,
    recebido_por UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.entradas_estoque ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant isolation for entradas_estoque"
    ON public.entradas_estoque
    FOR ALL
    USING (empresa_id = public.obter_empresa_id_usuario());

-- Function to register delivery
CREATE OR REPLACE FUNCTION public.registrar_recebimento(p_entrada_id UUID)
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

    -- Lock the row for update to prevent concurrent updates
    SELECT * INTO v_entrada
    FROM entradas_estoque
    WHERE id = p_entrada_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Entrada de estoque não encontrada.';
    END IF;

    IF v_entrada.status = 'ENTREGUE' THEN
        RAISE EXCEPTION 'Esta entrada já foi registrada como ENTREGUE.';
    END IF;

    -- Update the inbound delivery
    UPDATE entradas_estoque
    SET 
        status = 'ENTREGUE',
        data_entrega = NOW(),
        recebido_por = v_user_id,
        updated_at = NOW()
    WHERE id = p_entrada_id;

    -- Update the insumo (stock and last purchase price)
    UPDATE insumos
    SET 
        estoque_atual = estoque_atual + v_entrada.quantidade,
        metadados = jsonb_set(
            COALESCE(metadados, '{}'::jsonb), 
            '{last_purchase_price}', 
            to_jsonb(v_entrada.preco_unitario)
        )
    WHERE id = v_entrada.insumo_id;

END;
$$;