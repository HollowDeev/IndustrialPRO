-- Migration: Fase 6 - Atualizar RBAC (Permissão de Arquivos)

-- Adiciona a chave 'gerenciar_arquivos': true para todos os níveis de acesso que já possuem 'acessar_planejamento' (pois faz parte do módulo).
UPDATE public.niveis_acesso
SET permissoes = jsonb_set(
  permissoes, 
  '{gerenciar_arquivos}', 
  'true'::jsonb, 
  true
)
WHERE permissoes->>'acessar_planejamento' = 'true';
