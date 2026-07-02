-- Criar a tabela de Pedidos
create table public.pedidos (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    codigo varchar(100) not null, -- ex: PED-2024-015
    nome_cliente varchar(255) not null,
    localizacao varchar(255),
    prioridade varchar(50) not null default 'MEDIA', -- ALTA, MEDIA, BAIXA
    data_emissao timestamp with time zone default now(),
    data_entrega timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- Habilitar RLS na tabela pedidos
alter table public.pedidos enable row level security;

-- Configurar RLS para pedidos
create policy "Visualização isolada pedidos" on public.pedidos
    for select using (
        public.verificar_super_admin()
        or empresa_id = public.obter_empresa_id_usuario()
    );

create policy "Inserção com assinatura ATIVA pedidos" on public.pedidos
    for insert with check (
        public.verificar_super_admin()
        or (
            empresa_id = public.obter_empresa_id_usuario()
            and public.verificar_assinatura_ativa()
        )
    );

create policy "Atualização com assinatura ATIVA pedidos" on public.pedidos
    for update using (
        public.verificar_super_admin()
        or empresa_id = public.obter_empresa_id_usuario()
    ) with check (
        public.verificar_super_admin()
        or (
            empresa_id = public.obter_empresa_id_usuario()
            and public.verificar_assinatura_ativa()
        )
    );

create policy "Exclusão com assinatura ATIVA pedidos" on public.pedidos
    for delete using (
        public.verificar_super_admin()
        or (
            empresa_id = public.obter_empresa_id_usuario()
            and public.verificar_assinatura_ativa()
        )
    );

-- Alterar a tabela ordens_producao para relacionar com pedidos e adicionar quantidade produzida
alter table public.ordens_producao add column pedido_id uuid references public.pedidos(id) on delete cascade;
alter table public.ordens_producao add column quantidade_produzida integer default 0 not null;
