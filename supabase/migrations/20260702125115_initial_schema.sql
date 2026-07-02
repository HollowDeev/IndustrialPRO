-- Habilitar a extensão pgcrypto para gerar UUIDs se necessário
create extension if not exists "pgcrypto";

-- 1. Empresas (Tenants)
create table public.empresas (
    id uuid default gen_random_uuid() primary key,
    nome varchar(255) not null,
    cnpj varchar(14) unique,
    status_assinatura varchar(20) not null check (status_assinatura in ('ATIVO', 'SUSPENSO')),
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- 2. Usuarios
create table public.usuarios (
    id uuid references auth.users(id) on delete cascade primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    nome varchar(255) not null,
    cargo varchar(100),
    created_at timestamp with time zone default now()
);

-- 3. Familias de Produto
create table public.familias_produto (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    nome varchar(255) not null,
    geometria_base varchar(255),
    area_secao_externa numeric(10,4), -- ex: 0.0064 m2
    volume_aco_metro numeric(10,4),
    created_at timestamp with time zone default now()
);

-- 4. SKUs (Variações Filhas)
create table public.skus (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    familia_id uuid references public.familias_produto(id) on delete cascade not null,
    codigo varchar(100) not null,
    comprimento_mm integer not null, -- ex: 2200, 3000
    desconto_aco_mm integer default 70, -- Aço sempre tem X mm a menos
    created_at timestamp with time zone default now()
);

-- 5. Insumos (Matéria Prima)
create table public.insumos (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    nome varchar(255) not null,
    categoria varchar(50) not null check (categoria in ('ACO', 'QUIMICO', 'EMBALAGEM', 'OUTROS')),
    unidade_medida varchar(20) not null, -- ex: kg, m, ml
    estoque_atual numeric(15,4) default 0,
    created_at timestamp with time zone default now()
);

-- 6. BOM (Bill of Materials / Blend)
create table public.bom (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    familia_id uuid references public.familias_produto(id) on delete cascade not null,
    insumo_id uuid references public.insumos(id) on delete cascade not null,
    quantidade_por_unidade numeric(10,4) not null, -- Quantidade na base
    percentual_blend numeric(5,2), -- % no blend se aplicável (ex: 30% PEAD)
    created_at timestamp with time zone default now()
);

-- 7. Ordens de Compra
create table public.ordens_compra (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    fornecedor varchar(255) not null,
    insumo_id uuid references public.insumos(id) on delete cascade not null,
    quantidade_pedida numeric(15,4) not null,
    status varchar(50) not null default 'PENDENTE', -- PENDENTE, ENTREGUE, CANCELADO
    data_emissao timestamp with time zone default now(),
    data_entrega_prevista timestamp with time zone
);

-- 8. Ordens de Produção
create table public.ordens_producao (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    sku_id uuid references public.skus(id) on delete cascade not null,
    quantidade_planejada integer not null,
    status varchar(50) not null default 'ABERTA', -- ABERTA, EM_ANDAMENTO, FINALIZADA
    data_inicio timestamp with time zone,
    data_fim timestamp with time zone,
    created_at timestamp with time zone default now()
);

-- 9. Apontamentos
create table public.apontamentos (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    ordem_producao_id uuid references public.ordens_producao(id) on delete cascade not null,
    quantidade_produzida integer not null,
    horas_maquina numeric(10,2),
    refugo_kg numeric(10,4),
    data_apontamento timestamp with time zone default now(),
    created_at timestamp with time zone default now()
);

-- Segurança e Políticas de RLS
alter table public.empresas enable row level security;
alter table public.usuarios enable row level security;
alter table public.familias_produto enable row level security;
alter table public.skus enable row level security;
alter table public.insumos enable row level security;
alter table public.bom enable row level security;
alter table public.ordens_compra enable row level security;
alter table public.ordens_producao enable row level security;
alter table public.apontamentos enable row level security;

-- Criar função para verificar assinatura ATIVA
create or replace function public.verificar_assinatura_ativa()
returns boolean as $$
declare
    status varchar;
begin
    select e.status_assinatura into status
    from public.empresas e
    inner join public.usuarios u on u.empresa_id = e.id
    where u.id = auth.uid();
    
    return coalesce(status = 'ATIVO', false);
end;
$$ language plpgsql security definer;

-- Políticas para Empresas (Somente leitura para o próprio usuário)
create policy "Usuários podem ver a própria empresa" on public.empresas
    for select using (
        id = (select empresa_id from public.usuarios where id = auth.uid())
    );

-- Políticas para Usuarios
create policy "Usuários veem membros da mesma empresa" on public.usuarios
    for select using (
        empresa_id = (select empresa_id from public.usuarios where id = auth.uid())
    );

create policy "Usuários podem atualizar o próprio perfil" on public.usuarios
    for update using (id = auth.uid()) with check (id = auth.uid());

-- Política Helper de Isolamento e SaaS
-- Criação dinâmica de políticas padronizadas para tabelas de domínio
DO $$
DECLARE
    table_name text;
    tables text[] := ARRAY[
        'familias_produto', 'skus', 'insumos', 'bom', 
        'ordens_compra', 'ordens_producao', 'apontamentos'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        -- SELECT Policy
        EXECUTE format('
            CREATE POLICY "Visualização isolada %I" ON public.%I 
            FOR SELECT USING (
                empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())
            );
        ', table_name, table_name);

        -- INSERT Policy (Exige assinatura ATIVA)
        EXECUTE format('
            CREATE POLICY "Inserção com assinatura ATIVA %I" ON public.%I 
            FOR INSERT WITH CHECK (
                empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())
                AND public.verificar_assinatura_ativa()
            );
        ', table_name, table_name);

        -- UPDATE Policy (Exige assinatura ATIVA)
        EXECUTE format('
            CREATE POLICY "Atualização com assinatura ATIVA %I" ON public.%I 
            FOR UPDATE USING (
                empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())
            ) WITH CHECK (
                empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())
                AND public.verificar_assinatura_ativa()
            );
        ', table_name, table_name);
        
        -- DELETE Policy (Exige assinatura ATIVA)
        EXECUTE format('
            CREATE POLICY "Exclusão com assinatura ATIVA %I" ON public.%I 
            FOR DELETE USING (
                empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())
                AND public.verificar_assinatura_ativa()
            );
        ', table_name, table_name);
    END LOOP;
END $$;
