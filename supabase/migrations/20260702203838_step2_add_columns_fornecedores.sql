ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS audit_date varchar(50);
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS payment_term varchar(50) default '30 Dias';
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS currency varchar(10) default 'BRL';
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS documents jsonb default '[]'::jsonb;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS history jsonb default '[]'::jsonb;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS homologado boolean default false;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS logo varchar(512);
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS limite_financeiro numeric(15,2) default 250000;

-- Emite um evento para forçar o PostgREST a recarregar o cache
NOTIFY pgrst, 'reload schema';