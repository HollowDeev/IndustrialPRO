-- Migration para expandir chaves do RBAC antigo ('gerenciar_almoxarifado') para os novos módulos granulares
-- Isso garante que as roles já existentes (ex: a role 'Master' criada na Fase 3) não percam o acesso às telas
-- que foram separadas hoje (Estoque, Fornecedores e Matérias Primas).

UPDATE public.niveis_acesso
SET permissoes = permissoes || jsonb_build_object(
    'gerenciar_estoque', COALESCE((permissoes->>'gerenciar_almoxarifado')::boolean, false),
    'gerenciar_fornecedores', COALESCE((permissoes->>'gerenciar_almoxarifado')::boolean, false),
    'gerenciar_materias_primas', COALESCE((permissoes->>'gerenciar_almoxarifado')::boolean, false)
)
WHERE permissoes ? 'gerenciar_almoxarifado';
