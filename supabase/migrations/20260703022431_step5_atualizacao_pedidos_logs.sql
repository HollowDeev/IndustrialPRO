-- Adiciona a coluna status na tabela pedidos
ALTER TABLE public.pedidos ADD COLUMN status VARCHAR(50) DEFAULT 'ATIVO' NOT NULL;

-- Cria a tabela de log de exclusao
CREATE TABLE public.log_exclusao_pedidos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    pedido_codigo VARCHAR(100) NOT NULL,
    pedido_nome_cliente VARCHAR(255) NOT NULL,
    usuario_email VARCHAR(255) NOT NULL,
    data_exclusao TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilita RLS na nova tabela
ALTER TABLE public.log_exclusao_pedidos ENABLE ROW LEVEL SECURITY;

-- Politicas para insercao e visualizacao do log
CREATE POLICY "Insercao permitida para logs" ON public.log_exclusao_pedidos
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Visualizacao logs exclusao" ON public.log_exclusao_pedidos
    FOR SELECT USING (true);
