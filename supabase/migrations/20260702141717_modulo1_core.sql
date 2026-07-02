-- 1. Alterar public.familias_produto para incluir densidade
alter table public.familias_produto add column densidade_g_cm3 numeric(5,2) default 0.95;

-- 2. Criar a tabela de Fornecedores
create table public.fornecedores (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    nome varchar(255) not null,
    cnpj varchar(14),
    ie varchar(50) default 'Isento',
    telefone varchar(20),
    email varchar(255),
    contato_nome varchar(255),
    contato_email varchar(255),
    endereco text,
    limite_financeiro numeric(15,2) default 250000,
    categoria varchar(100) default 'Matéria-Prima',
    rating integer default 90,
    status varchar(50) default 'Em Homologação', -- Ativo, Em Homologação, Bloqueado
    last_delivery varchar(255) default 'Recém Cadastrado',
    logo varchar(512) default 'https://images.unsplash.com/photo-1516825425712-4014f3747596?w=150&auto=format&fit=crop&q=80&referrerpolicy=no-referrer',
    audit_date varchar(50),
    payment_term varchar(50) default '30 Dias',
    currency varchar(10) default 'BRL',
    documents jsonb default '[]'::jsonb,
    history jsonb default '[]'::jsonb,
    homologado boolean default false,
    created_at timestamp with time zone default now()
);

-- 3. Criar a tabela de Funcionários
create table public.funcionarios (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    nome varchar(255) not null,
    cargo varchar(100),
    ativo boolean default true,
    metadados jsonb default '{}'::jsonb,
    created_at timestamp with time zone default now()
);

-- 4. Criar a tabela associativa de Fornecedores e Insumos
create table public.fornecedores_insumos (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    fornecedor_id uuid references public.fornecedores(id) on delete cascade not null,
    insumo_id uuid references public.insumos(id) on delete cascade not null,
    created_at timestamp with time zone default now()
);

-- 5. Criar a tabela de Fichas de Turno (Operacional)
create table public.turnos (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    order_id varchar(100) not null,
    date varchar(50) not null,
    extruder varchar(50) not null,
    hours_available numeric(5,2) not null,
    checklist jsonb,
    created_at timestamp with time zone default now()
);

-- 6. Criar a tabela de associação de Turnos e Operadores (Funcionários)
create table public.turnos_operadores (
    id uuid default gen_random_uuid() primary key,
    empresa_id uuid references public.empresas(id) on delete cascade not null,
    turno_id uuid references public.turnos(id) on delete cascade not null,
    funcionario_id uuid references public.funcionarios(id) on delete cascade not null,
    created_at timestamp with time zone default now()
);

-- 7. Configurar e Habilitar RLS nas novas tabelas
DO $$
DECLARE
    table_name text;
    tables text[] := ARRAY[
        'fornecedores', 'funcionarios', 'fornecedores_insumos', 
        'turnos', 'turnos_operadores'
    ];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        -- Habilitar RLS
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', table_name);

        -- SELECT Policy
        EXECUTE format('
            CREATE POLICY "Visualização isolada %I" ON public.%I 
            FOR SELECT USING (
                public.verificar_super_admin()
                OR empresa_id = public.obter_empresa_id_usuario()
            );
        ', table_name, table_name);

        -- INSERT Policy
        EXECUTE format('
            CREATE POLICY "Inserção com assinatura ATIVA %I" ON public.%I 
            FOR INSERT WITH CHECK (
                public.verificar_super_admin()
                OR (
                    empresa_id = public.obter_empresa_id_usuario()
                    AND public.verificar_assinatura_ativa()
                )
            );
        ', table_name, table_name);

        -- UPDATE Policy
        EXECUTE format('
            CREATE POLICY "Atualização com assinatura ATIVA %I" ON public.%I 
            FOR UPDATE USING (
                public.verificar_super_admin()
                OR empresa_id = public.obter_empresa_id_usuario()
            ) WITH CHECK (
                public.verificar_super_admin()
                OR (
                    empresa_id = public.obter_empresa_id_usuario()
                    AND public.verificar_assinatura_ativa()
                )
            );
        ', table_name, table_name);
        
        -- DELETE Policy
        EXECUTE format('
            CREATE POLICY "Exclusão com assinatura ATIVA %I" ON public.%I 
            FOR DELETE USING (
                public.verificar_super_admin()
                OR (
                    empresa_id = public.obter_empresa_id_usuario()
                    AND public.verificar_assinatura_ativa()
                )
            );
        ', table_name, table_name);
    END LOOP;
END $$;
