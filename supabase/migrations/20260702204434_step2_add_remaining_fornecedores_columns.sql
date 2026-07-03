ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS ie varchar(50) default 'Isento';
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS contato_nome varchar(255);
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS contato_email varchar(255);
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS endereco text;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS rating integer default 90;
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS status varchar(50) default 'Em Homologação';
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS last_delivery varchar(255) default 'Recém Cadastrado';
ALTER TABLE public.fornecedores ADD COLUMN IF NOT EXISTS categoria jsonb default '["Químico (Blend)"]'::jsonb;

-- Emite um evento para forçar o PostgREST a recarregar o cache
NOTIFY pgrst, 'reload schema';