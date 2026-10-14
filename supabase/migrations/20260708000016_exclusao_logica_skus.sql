-- 1. Add deleted_at to familias_produto and skus
ALTER TABLE public.familias_produto ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.skus ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- 2. Create the logs_exclusao table
CREATE TABLE IF NOT EXISTS public.logs_exclusao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    usuario_id UUID NOT NULL REFERENCES auth.users(id),
    entidade VARCHAR(50) NOT NULL, -- 'FAMILIA' or 'SKU'
    entidade_id UUID NOT NULL,
    nome_entidade VARCHAR(255) NOT NULL,
    motivo TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. RLS Policies for logs_exclusao
ALTER TABLE public.logs_exclusao ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Visualização isolada logs_exclusao" ON public.logs_exclusao
    FOR SELECT USING (
        public.verificar_super_admin()
        OR empresa_id = public.obter_empresa_id_usuario()
    );

CREATE POLICY "Inserção com assinatura ATIVA logs_exclusao" ON public.logs_exclusao
    FOR INSERT WITH CHECK (
        public.verificar_super_admin()
        OR (
            empresa_id = public.obter_empresa_id_usuario()
            AND public.verificar_assinatura_ativa()
        )
    );
