-- Migration: Fase 7 Vendedores, Comissões e Alíquotas por Estado
-- Created At: 2026-07-13

-- 1. Alterar tabela public.funcionarios para adicionar vendedor e cpf
ALTER TABLE public.funcionarios 
ADD COLUMN IF NOT EXISTS vendedor BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS cpf VARCHAR(20);

-- 2. Alterar tabela public.pedidos para adicionar vendedor_id
ALTER TABLE public.pedidos
ADD COLUMN IF NOT EXISTS vendedor_id UUID REFERENCES public.funcionarios(id) ON DELETE SET NULL;

-- 3. Criar tabela public.estados_tributos
CREATE TABLE IF NOT EXISTS public.estados_tributos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    empresa_id UUID NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
    uf CHAR(2) NOT NULL,
    nome VARCHAR(100) NOT NULL,
    aliquota_imposto NUMERIC(5,2) DEFAULT 0.00 NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT unique_empresa_uf UNIQUE (empresa_id, uf)
);

-- 4. Habilitar Row Level Security (RLS) para estados_tributos
ALTER TABLE public.estados_tributos ENABLE ROW LEVEL SECURITY;

-- 5. Criar políticas RLS para estados_tributos
DROP POLICY IF EXISTS "Tenant CRUD Access estados_tributos" ON public.estados_tributos;
CREATE POLICY "Tenant CRUD Access estados_tributos" ON public.estados_tributos
FOR ALL USING (
    public.verificar_super_admin() OR 
    (empresa_id = public.obter_empresa_id_usuario() AND public.verificar_assinatura_ativa())
) WITH CHECK (
    public.verificar_super_admin() OR 
    (empresa_id = public.obter_empresa_id_usuario() AND public.verificar_assinatura_ativa())
);

-- 6. Popular tabela de estados com os 27 estados do Brasil para todas as empresas existentes
INSERT INTO public.estados_tributos (empresa_id, uf, nome, aliquota_imposto)
SELECT e.id, s.uf, s.nome, 0.00
FROM public.empresas e
CROSS JOIN (
    VALUES 
    ('AC', 'Acre'), ('AL', 'Alagoas'), ('AP', 'Amapá'), ('AM', 'Amazonas'),
    ('BA', 'Bahia'), ('CE', 'Ceará'), ('DF', 'Distrito Federal'), ('ES', 'Espírito Santo'),
    ('GO', 'Goiás'), ('MA', 'Maranhão'), ('MT', 'Mato Grosso'), ('MS', 'Mato Grosso do Sul'),
    ('MG', 'Minas Gerais'), ('PA', 'Pará'), ('PB', 'Paraíba'), ('PR', 'Paraná'),
    ('PE', 'Pernambuco'), ('PI', 'Piauí'), ('RJ', 'Rio de Janeiro'), ('RN', 'Rio Grande do Norte'),
    ('RS', 'Rio Grande do Sul'), ('RO', 'Rondônia'), ('RR', 'Roraima'), ('SC', 'Santa Catarina'),
    ('SP', 'São Paulo'), ('SE', 'Sergipe'), ('TO', 'Tocantins')
) AS s(uf, nome)
ON CONFLICT (empresa_id, uf) DO NOTHING;

-- 7. Criar Trigger para criar automaticamente os estados ao inserir uma nova empresa
CREATE OR REPLACE FUNCTION public.inicializar_estados_tributos()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.estados_tributos (empresa_id, uf, nome, aliquota_imposto)
    VALUES 
    (NEW.id, 'AC', 'Acre', 0.00), (NEW.id, 'AL', 'Alagoas', 0.00), (NEW.id, 'AP', 'Amapá', 0.00), (NEW.id, 'AM', 'Amazonas', 0.00),
    (NEW.id, 'BA', 'Bahia', 0.00), (NEW.id, 'CE', 'Ceará', 0.00), (NEW.id, 'DF', 'Distrito Federal', 0.00), (NEW.id, 'ES', 'Espírito Santo', 0.00),
    (NEW.id, 'GO', 'Goiás', 0.00), (NEW.id, 'MA', 'Maranhão', 0.00), (NEW.id, 'MT', 'Mato Grosso', 0.00), (NEW.id, 'MS', 'Mato Grosso do Sul', 0.00),
    (NEW.id, 'MG', 'Minas Gerais', 0.00), (NEW.id, 'PA', 'Pará', 0.00), (NEW.id, 'PB', 'Paraíba', 0.00), (NEW.id, 'PR', 'Paraná', 0.00),
    (NEW.id, 'PE', 'Pernambuco', 0.00), (NEW.id, 'PI', 'Piauí', 0.00), (NEW.id, 'RJ', 'Rio de Janeiro', 0.00), (NEW.id, 'RN', 'Rio Grande do Norte', 0.00),
    (NEW.id, 'RS', 'Rio Grande do Sul', 0.00), (NEW.id, 'RO', 'Rondônia', 0.00), (NEW.id, 'RR', 'Roraima', 0.00), (NEW.id, 'SC', 'Santa Catarina', 0.00),
    (NEW.id, 'SP', 'São Paulo', 0.00), (NEW.id, 'SE', 'Sergipe', 0.00), (NEW.id, 'TO', 'Tocantins', 0.00)
    ON CONFLICT (empresa_id, uf) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trigger_inicializar_estados ON public.empresas;
CREATE TRIGGER trigger_inicializar_estados
AFTER INSERT ON public.empresas
FOR EACH ROW
EXECUTE FUNCTION public.inicializar_estados_tributos();
