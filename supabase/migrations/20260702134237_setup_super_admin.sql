-- Alterar a tabela usuarios para permitir empresa_id nulo para o Super-Admin
alter table public.usuarios alter column empresa_id drop not null;

-- Adicionar coluna is_super_admin na tabela de usuários
alter table public.usuarios add column is_super_admin boolean default false not null;

-- Criar função para verificar se o usuário é Super-Admin
create or replace function public.verificar_super_admin()
returns boolean as $$
begin
    return coalesce(
        (select is_super_admin from public.usuarios where id = auth.uid()),
        false
    );
end;
$$ language plpgsql security definer;

-- Atualizar políticas de RLS para a tabela de Empresas
drop policy if exists "Usuários podem ver a própria empresa" on public.empresas;
create policy "Usuários podem ver a própria empresa" on public.empresas
    for select using (
        public.verificar_super_admin()
        or id = (select empresa_id from public.usuarios where id = auth.uid())
    );

create policy "Super-Admins podem inserir empresas" on public.empresas
    for insert with check (public.verificar_super_admin());

create policy "Super-Admins podem atualizar empresas" on public.empresas
    for update using (public.verificar_super_admin());

create policy "Super-Admins podem deletar empresas" on public.empresas
    for delete using (public.verificar_super_admin());

-- Atualizar políticas de RLS para a tabela de Usuários
drop policy if exists "Usuários veem membros da mesma empresa" on public.usuarios;
create policy "Usuários veem membros da mesma empresa" on public.usuarios
    for select using (
        public.verificar_super_admin()
        or empresa_id = (select empresa_id from public.usuarios where id = auth.uid())
    );

create policy "Super-Admins podem inserir usuários" on public.usuarios
    for insert with check (public.verificar_super_admin());

create policy "Super-Admins podem atualizar usuários" on public.usuarios
    for update using (public.verificar_super_admin());

create policy "Super-Admins podem deletar usuários" on public.usuarios
    for delete using (public.verificar_super_admin());

-- Atualizar políticas de RLS das tabelas de domínio para permitir bypass do Super-Admin
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
        -- Remover políticas anteriores
        EXECUTE format('DROP POLICY IF EXISTS "Visualização isolada %I" ON public.%I;', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Inserção com assinatura ATIVA %I" ON public.%I;', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Atualização com assinatura ATIVA %I" ON public.%I;', table_name, table_name);
        EXECUTE format('DROP POLICY IF EXISTS "Exclusão com assinatura ATIVA %I" ON public.%I;', table_name, table_name);

        -- SELECT
        EXECUTE format('
            CREATE POLICY "Visualização isolada %I" ON public.%I 
            FOR SELECT USING (
                public.verificar_super_admin()
                OR empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())
            );
        ', table_name, table_name);

        -- INSERT
        EXECUTE format('
            CREATE POLICY "Inserção com assinatura ATIVA %I" ON public.%I 
            FOR INSERT WITH CHECK (
                public.verificar_super_admin()
                OR (
                    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())
                    AND public.verificar_assinatura_ativa()
                )
            );
        ', table_name, table_name);

        -- UPDATE
        EXECUTE format('
            CREATE POLICY "Atualização com assinatura ATIVA %I" ON public.%I 
            FOR UPDATE USING (
                public.verificar_super_admin()
                OR empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())
            ) WITH CHECK (
                public.verificar_super_admin()
                OR (
                    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())
                    AND public.verificar_assinatura_ativa()
                )
            );
        ', table_name, table_name);
        
        -- DELETE
        EXECUTE format('
            CREATE POLICY "Exclusão com assinatura ATIVA %I" ON public.%I 
            FOR DELETE USING (
                public.verificar_super_admin()
                OR (
                    empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid())
                    AND public.verificar_assinatura_ativa()
                )
            );
        ', table_name, table_name);
    END LOOP;
END $$;

-- Cadastrar o Super-Admin na tabela auth.users do Supabase
-- Usaremos o hash bcrypt (Blowfish) para a senha 'HelpeAdmin2026!'
INSERT INTO auth.users (
    instance_id, id, aud, role, email, encrypted_password, 
    email_confirmed_at, recovery_sent_at, last_sign_in_at, 
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at, 
    confirmation_token, email_change, email_change_token_new, recovery_token
)
VALUES (
    '00000000-0000-0000-0000-000000000000',
    '00000000-0000-0000-0000-000000000001',
    'authenticated',
    'authenticated',
    'maraltoingenierie@gmail.com',
    extensions.crypt('XJ@YG48#DtC$q&AS*^V*7x5@&7zobKzPgWDRK*C$3tz3CZ754jLD689%v^#G@edp!', extensions.gen_salt('bf')),
    now(),
    NULL,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"nome":"Administrador Geral","is_super_admin":true}',
    now(),
    now(),
    '',
    '',
    '',
    ''
) ON CONFLICT (id) DO NOTHING;

-- Cadastrar o perfil público do Super-Admin em public.usuarios
INSERT INTO public.usuarios (id, empresa_id, nome, cargo, is_super_admin)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    NULL,
    'Administrador Geral',
    'Super Admin',
    true
) ON CONFLICT (id) DO NOTHING;
