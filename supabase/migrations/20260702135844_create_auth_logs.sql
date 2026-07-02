-- Criar a tabela de logs de autenticação
create table public.logs_autenticacao (
    id uuid default gen_random_uuid() primary key,
    email varchar(255) not null,
    status varchar(50) not null, -- SUCESSO, FALHA
    ip_address varchar(45),
    user_agent text,
    dispositivo varchar(100),
    browser varchar(100),
    so varchar(100),
    cidade varchar(100),
    regiao varchar(100),
    pais varchar(100),
    created_at timestamp with time zone default now()
);

-- Ativar RLS
alter table public.logs_autenticacao enable row level security;

-- Apenas Super-Admins podem ler os logs
create policy "Apenas Super-Admins podem ver logs" on public.logs_autenticacao
    for select using (public.verificar_super_admin());
