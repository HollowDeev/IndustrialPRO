-- 1. Criar tabela de Extrusoras
CREATE TABLE IF NOT EXISTS public.extrusoras (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    codigo VARCHAR(50) NOT NULL,
    numero VARCHAR(50) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para extrusoras
ALTER TABLE public.extrusoras ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenant CRUD Access extrusoras" ON public.extrusoras
FOR ALL USING (
    public.verificar_super_admin() OR 
    (empresa_id = public.obter_empresa_id_usuario() AND public.verificar_assinatura_ativa())
) WITH CHECK (
    public.verificar_super_admin() OR 
    (empresa_id = public.obter_empresa_id_usuario() AND public.verificar_assinatura_ativa())
);

-- 2. Alterar tabela de funcionários para adicionar extrusora_id
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS extrusora_id UUID REFERENCES public.extrusoras(id) ON DELETE SET NULL;
