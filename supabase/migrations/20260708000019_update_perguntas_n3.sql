-- Migration: Fase 5 - Atualizar Perguntas Fornecedor N3

ALTER TABLE public.fornecedores
DROP COLUMN IF EXISTS possui_linha_lavagem,
DROP COLUMN IF EXISTS possui_moinho,
DROP COLUMN IF EXISTS possui_extrusora,
DROP COLUMN IF EXISTS possui_balanca,
DROP COLUMN IF EXISTS possui_licenca_ambiental;

ALTER TABLE public.fornecedores
ADD COLUMN IF NOT EXISTS passa_triagem BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS extraido_rotulo BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS moagem_inicia_lavagem BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS lavagem_a_seco BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS possui_lavadora BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS possui_tanque_decantacao BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS possui_secadora BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS possui_sopro_silo_bag BOOLEAN DEFAULT FALSE;
