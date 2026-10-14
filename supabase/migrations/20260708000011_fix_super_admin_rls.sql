-- Fix RLS para Super-Admin acessar niveis_acesso e usuarios

-- 1. Tabela niveis_acesso
DROP POLICY IF EXISTS "Tenant CRUD Access niveis_acesso" ON public.niveis_acesso;
CREATE POLICY "Tenant CRUD Access niveis_acesso" ON public.niveis_acesso
FOR ALL USING (
    public.verificar_super_admin() OR 
    (empresa_id = public.obter_empresa_id_usuario() AND public.verificar_assinatura_ativa())
) WITH CHECK (
    public.verificar_super_admin() OR 
    (empresa_id = public.obter_empresa_id_usuario() AND public.verificar_assinatura_ativa())
);

-- 2. Tabela usuarios
DROP POLICY IF EXISTS "Tenant CRUD Access Usuarios" ON public.usuarios;
CREATE POLICY "Tenant CRUD Access Usuarios" ON public.usuarios 
FOR ALL USING (
    public.verificar_super_admin() OR 
    (empresa_id = public.obter_empresa_id_usuario())
) WITH CHECK (
    public.verificar_super_admin() OR 
    (empresa_id = public.obter_empresa_id_usuario())
);
