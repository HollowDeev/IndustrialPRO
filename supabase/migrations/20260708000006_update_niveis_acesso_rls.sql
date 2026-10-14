-- Permitir que super_admin gerencie niveis_acesso
DROP POLICY IF EXISTS "Tenant CRUD Access niveis_acesso" ON public.niveis_acesso;

CREATE POLICY "Tenant CRUD Access niveis_acesso" ON public.niveis_acesso
FOR ALL USING (
    public.verificar_super_admin()
    OR (
        empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
        AND public.verificar_assinatura_ativa()
    )
) WITH CHECK (
    public.verificar_super_admin()
    OR (
        empresa_id = (SELECT empresa_id FROM public.usuarios WHERE id = auth.uid()) 
        AND public.verificar_assinatura_ativa()
    )
);
