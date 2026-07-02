-- Criar a função obter_empresa_id_usuario com security definer para evitar recursão no RLS
create or replace function public.obter_empresa_id_usuario()
returns uuid as $$
begin
    return (
        select empresa_id 
        from public.usuarios 
        where id = auth.uid()
    );
end;
$$ language plpgsql security definer;

-- Atualizar a política RLS da tabela de Usuários usando as funções auxiliares (sem subquery direta)
drop policy if exists "Usuários veem membros da mesma empresa" on public.usuarios;
create policy "Usuários veem membros da mesma empresa" on public.usuarios
    for select using (
        public.verificar_super_admin()
        or id = auth.uid()
        or empresa_id = public.obter_empresa_id_usuario()
    );

-- Atualizar as políticas RLS da tabela de Empresas usando as funções auxiliares
drop policy if exists "Usuários podem ver a própria empresa" on public.empresas;
create policy "Usuários podem ver a própria empresa" on public.empresas
    for select using (
        public.verificar_super_admin()
        or id = public.obter_empresa_id_usuario()
    );

-- Atualizar as políticas RLS das tabelas de domínio para usar a função obter_empresa_id_usuario (otimização e segurança)
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
                OR empresa_id = public.obter_empresa_id_usuario()
            );
        ', table_name, table_name);

        -- INSERT
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

        -- UPDATE
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
        
        -- DELETE
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
