-- Create a SECURITY DEFINER function in PL/PGSQL to avoid inlining and recursion
CREATE OR REPLACE FUNCTION public.obter_empresa_id_usuario()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_empresa_id uuid;
BEGIN
    SELECT empresa_id INTO v_empresa_id FROM public.usuarios WHERE id = auth.uid();
    RETURN v_empresa_id;
END;
$$;

-- Apply to all tables again to ensure they use the function correctly without subqueries
DO $$ 
DECLARE
    t text;
BEGIN
    FOR t IN 
        SELECT tablename 
        FROM pg_tables 
        WHERE schemaname = 'public' 
          AND tablename IN ('familias_produto', 'skus', 'insumos', 'bom', 'ordens_compra', 'ordens_producao', 'apontamentos', 'pedidos', 'fornecedores', 'fornecedores_insumos', 'funcionarios', 'turnos', 'turnos_operadores', 'carregamentos_expedicao', 'reprogramacoes_tecnicas')
    LOOP
        EXECUTE 'DROP POLICY IF EXISTS "Tenant CRUD Access" ON public.' || t;
        EXECUTE 'CREATE POLICY "Tenant CRUD Access" ON public.' || t || ' 
                 FOR ALL USING (
                    empresa_id = public.obter_empresa_id_usuario()
                    AND public.verificar_assinatura_ativa()
                 ) WITH CHECK (
                    empresa_id = public.obter_empresa_id_usuario()
                    AND public.verificar_assinatura_ativa()
                 );';
    END LOOP;
END $$;

-- Fix usuarios policy to also use the function
DROP POLICY IF EXISTS "Tenant CRUD Access Usuarios" ON public.usuarios;
CREATE POLICY "Tenant CRUD Access Usuarios" ON public.usuarios 
FOR ALL USING (empresa_id = public.obter_empresa_id_usuario());