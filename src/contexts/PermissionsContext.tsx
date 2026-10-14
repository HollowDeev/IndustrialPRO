"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createClient } from '@/utils/supabase/client';
import { PermissoesUsuario } from '@/types';

interface PermissionsContextType {
  permissions: PermissoesUsuario;
  loading: boolean;
  canAccess: (module: keyof PermissoesUsuario) => boolean;
  refreshPermissions: () => Promise<void>;
}

const defaultPermissions: PermissoesUsuario = {};

const PermissionsContext = createContext<PermissionsContextType>({
  permissions: defaultPermissions,
  loading: true,
  canAccess: () => false,
  refreshPermissions: async () => {},
});

export function PermissionsProvider({ children }: { children: ReactNode }) {
  const [permissions, setPermissions] = useState<PermissoesUsuario>(defaultPermissions);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  const fetchPermissions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setPermissions({});
        setLoading(false);
        return;
      }

      // Buscar o nível de acesso do usuário atual
      const { data, error } = await supabase
        .from('usuarios')
        .select(`
          cargo,
          is_super_admin,
          nivel_acesso_id,
          niveis_acesso (
            permissoes
          )
        `)
        .eq('id', user.id)
        .single();

      if (error || !data || !data.niveis_acesso) {
        console.error('Erro ao buscar permissões:', error);
        setPermissions({});
      } else {
        // Garantindo que niveis_acesso é do tipo correto
        const nivelAcesso = Array.isArray(data.niveis_acesso) ? data.niveis_acesso[0] : data.niveis_acesso;

        if (nivelAcesso && nivelAcesso.permissoes) {
          const p = nivelAcesso.permissoes as any;
          // Mapeamento de retrocompatibilidade para evitar bloqueio com chaves antigas
          const mappedPermissions: PermissoesUsuario = {
            dashboard: !!(p.dashboard || p.ver_central),
            estoque: !!(p.estoque || p.gerenciar_estoque || p.gerenciar_almoxarifado),
            pedidos: !!(p.pedidos || p.acessar_planejamento),
            apontamento: !!(p.apontamento || p.gerenciar_apontamentos),
            reprogramacao: !!p.reprogramacao,
            fornecedores: !!(p.fornecedores || p.gerenciar_fornecedores || p.gerenciar_almoxarifado),
            funcionarios: !!(p.funcionarios || p.gerenciar_usuarios),
            'materias-primas': !!(p['materias-primas'] || p.gerenciar_materias_primas || p.gerenciar_almoxarifado),
            'familias-skus': !!(p['familias-skus'] || p.gerenciar_familias),
            'bom-formulas': !!(p['bom-formulas'] || p.gerenciar_receitas),
            arquivos: !!(p.arquivos || p.gerenciar_arquivos),
            configuracoes: !!p.configuracoes,
            acessos: !!(p.acessos || p.gerenciar_usuarios),
            clientes: !!(p.clientes || p.gerenciar_clientes),
            financeiro: !!(p.financeiro || p.ver_painel_dre || p.operar_fluxo_caixa || p.autorizar_factoring),
            'formacao-preco': !!(p['formacao-preco'] || p.simular_precos)
          };
          
          setPermissions(mappedPermissions);
        } else {
          setPermissions({});
        }
      }
    } catch (err) {
      console.error('Exceção ao buscar permissões:', err);
      setPermissions({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPermissions();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      fetchPermissions();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const canAccess = (module: keyof PermissoesUsuario): boolean => {
    // Se loading for true, retornamos false ou true?
    // Vamos retornar verdadeiro durante o loading para evitar piscar telas que vão ser redirecionadas ou escondidas
    // O ideal é que o componente de Rota bloqueie no layout.
    if (loading) return true;
    return !!permissions[module];
  };

  return (
    <PermissionsContext.Provider value={{ permissions, loading, canAccess, refreshPermissions: fetchPermissions }}>
      {children}
    </PermissionsContext.Provider>
  );
}

export const usePermissions = () => useContext(PermissionsContext);
