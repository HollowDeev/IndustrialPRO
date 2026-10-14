-- Migration: Fase 6 - Módulo de Arquivos no Planejamento

-- 1. Criar Tabela de Metadados
CREATE TABLE public.arquivos_planejamento (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    nome_arquivo TEXT NOT NULL,
    storage_path TEXT NOT NULL,
    tamanho_bytes INTEGER NOT NULL,
    excluido BOOLEAN DEFAULT false,
    criado_por UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    criado_em TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar RLS na Tabela
ALTER TABLE public.arquivos_planejamento ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Isolamento Empresa Arquivos Select" ON public.arquivos_planejamento
FOR SELECT USING (
    public.verificar_super_admin() OR 
    empresa_id = public.obter_empresa_id_usuario()
);

CREATE POLICY "Isolamento Empresa Arquivos Insert" ON public.arquivos_planejamento
FOR INSERT WITH CHECK (
    empresa_id = public.obter_empresa_id_usuario()
);

CREATE POLICY "Isolamento Empresa Arquivos Update" ON public.arquivos_planejamento
FOR UPDATE USING (
    public.verificar_super_admin() OR 
    empresa_id = public.obter_empresa_id_usuario()
) WITH CHECK (
    public.verificar_super_admin() OR 
    empresa_id = public.obter_empresa_id_usuario()
);

-- 2. Criar Storage Bucket (se não existir)
INSERT INTO storage.buckets (id, name, public)
VALUES ('arquivos_planejamento', 'arquivos_planejamento', false)
ON CONFLICT (id) DO NOTHING;

-- 3. RLS Policies no Storage
-- O acesso ao storage será restrito à pasta cujo nome é o empresa_id do usuário logado.

CREATE POLICY "Storage Insert Isolado Empresa" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (
    bucket_id = 'arquivos_planejamento' AND 
    (storage.foldername(name))[1] = public.obter_empresa_id_usuario()::text
);

CREATE POLICY "Storage Select Isolado Empresa" ON storage.objects
FOR SELECT TO authenticated
USING (
    bucket_id = 'arquivos_planejamento' AND 
    (storage.foldername(name))[1] = public.obter_empresa_id_usuario()::text
);

CREATE POLICY "Storage Delete Isolado Empresa" ON storage.objects
FOR DELETE TO authenticated
USING (
    bucket_id = 'arquivos_planejamento' AND 
    (storage.foldername(name))[1] = public.obter_empresa_id_usuario()::text
);
