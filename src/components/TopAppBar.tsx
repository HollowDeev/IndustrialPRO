import React, { useState, useEffect, useRef } from 'react';
import { createClient } from '../utils/supabase/client';
import { useShortcut } from '../hooks/useShortcut';

interface TopAppBarProps {
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  onSearch?: (query: string) => void;
}

export default function TopAppBar({
  currentScreen,
  setCurrentScreen,
  onSearch
}: TopAppBarProps) {
  const [searchValue, setSearchValue] = useState('');
  const [userProfile, setUserProfile] = useState<{ nome: string; cargo: string } | null>(null);
  const [notifications, setNotifications] = useState<{ id: string; text: string; type: string }[]>([]);
  const [showNotifDropdown, setShowNotifDropdown] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  
  const searchInputRef = useRef<HTMLInputElement>(null);

  useShortcut('f', () => {
    if (searchInputRef.current) {
      searchInputRef.current.focus();
    }
  });

  const supabase = createClient();

  // Carregar dados de perfil do usuário logado
  useEffect(() => {
    const loadUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('usuarios')
          .select('nome, cargo')
          .eq('id', user.id)
          .maybeSingle();

        if (profile) {
          setUserProfile(profile);
        } else {
          setUserProfile({
            nome: user.user_metadata?.nome || 'Administrador',
            cargo: user.user_metadata?.is_super_admin ? 'Super Admin' : 'Gestor SaaS'
          });
        }
      }
    };

    loadUser();
  }, []);

  // Carregar Alertas Reais de Estoque Baixo para as Notificações
  useEffect(() => {
    const loadNotifications = async () => {
      const { data: lowStock } = await supabase
        .from('insumos')
        .select('nome, estoque_atual, unidade_medida')
        .lt('estoque_atual', 500)
        .limit(5);

      const alerts = (lowStock || []).map((ins, idx) => ({
        id: `alert-${idx}`,
        text: `Estoque crítico: ${ins.nome} (${Number(ins.estoque_atual)} ${ins.unidade_medida})`,
        type: 'warning'
      }));

      setNotifications(alerts);
    };

    loadNotifications();
  }, []);

  const getBreadcrumbs = () => {
    switch (currentScreen) {
      case 'dashboard':
        return [
          { name: 'HELPE', action: () => setCurrentScreen('dashboard') },
          { name: 'Dashboard de Produção', active: true }
        ];
      case 'pedidos':
        return [
          { name: 'HELPE', action: () => setCurrentScreen('dashboard') },
          { name: 'Controle de Pedidos', active: true }
        ];
      case 'pedido-detail':
        return [
          { name: 'HELPE', action: () => setCurrentScreen('dashboard') },
          { name: 'Pedidos', action: () => setCurrentScreen('pedidos') },
          { name: 'Detalhamento do Pedido', active: true }
        ];
      case 'funcionarios':
        return [
          { name: 'HELPE', action: () => setCurrentScreen('dashboard') },
          { name: 'Gestão de Funcionários', active: true }
        ];
      case 'materias-primas':
        return [
          { name: 'HELPE', action: () => setCurrentScreen('dashboard') },
          { name: 'Matérias-Primas', active: true }
        ];
      case 'fornecedores':
        return [
          { name: 'HELPE', action: () => setCurrentScreen('dashboard') },
          { name: 'Gestão de Fornecedores', active: true }
        ];
      case 'familias-skus':
        return [
          { name: 'HELPE', action: () => setCurrentScreen('dashboard') },
          { name: 'Famílias & SKUs', active: true }
        ];
      case 'bom-formulas':
        return [
          { name: 'HELPE', action: () => setCurrentScreen('dashboard') },
          { name: 'Fórmulas (BOM)', active: true }
        ];
      default:
        return [{ name: 'HELPE', active: true }];
    }
  };

  const getTitle = () => {
    switch (currentScreen) {
      case 'dashboard':
        return 'Dashboard Geral e Ficha de Turno';
      case 'pedidos':
        return 'Gestão e Planejamento de Pedidos';
      case 'pedido-detail':
        return 'Ficha Técnica do Pedido e OP';
      case 'funcionarios':
        return 'Cadastro e Controle de Funcionários';
      case 'materias-primas':
        return 'Controle de Matérias-Primas';
      case 'fornecedores':
        return 'Portal de Fornecedores Homologados';
      case 'familias-skus':
        return 'Engenharia de Catálogo e SKUs';
      case 'bom-formulas':
        return 'Fórmulas de Produto (BOM)';
      default:
        return 'Gestão Industrial';
    }
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchValue(value);
    if (onSearch) {
      onSearch(value);
    }
  };

  const avatarName = userProfile?.nome || 'Carregando';
  const avatarUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(avatarName)}&background=1b365d&color=fff&size=150`;

  return (
    <header className="bg-surface-container-lowest border-b border-outline-variant px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 z-30 select-none relative">
      {/* Search & Breadcrumbs */}
      <div className="flex flex-col gap-1.5 flex-1">
        {/* Breadcrumb row */}
        <div className="flex items-center gap-1.5 text-xs text-outline font-medium tracking-wide">
          {getBreadcrumbs().map((bc, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="material-symbols-outlined notranslate text-[14px]">chevron_right</span>}
              {bc.active ? (
                <span className="text-secondary font-semibold">{bc.name}</span>
              ) : (
                <button
                  onClick={bc.action}
                  className="hover:text-primary transition-colors cursor-pointer"
                >
                  {bc.name}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Screen Title */}
        <h2 className="text-xl font-bold text-primary tracking-tight">{getTitle()}</h2>
      </div>

      {/* Global search entry & user status component */}
      <div className="flex items-center gap-5 justify-between md:justify-end shrink-0 relative">
        {/* Search Input bar */}
        <div className="relative max-w-xs hidden sm:block">
          <span className="material-symbols-outlined notranslate absolute left-3 top-2.5 text-[20px] text-outline">
            search
          </span>
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Pesquisar..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full bg-surface-container-low text-primary text-sm pl-10 pr-12 py-2.5 rounded-full border border-outline/20 outline-hidden focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
          />
          <div className="absolute right-2 top-2">
            <kbd className="text-[10px] text-outline bg-surface border border-outline-variant rounded px-1.5 py-0.5 pointer-events-none">F</kbd>
          </div>
        </div>

        {/* Dynamic Alerts Indicator with Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowNotifDropdown(!showNotifDropdown)}
            className="relative p-2 rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined notranslate text-[24px] text-primary">notifications</span>
            {notifications.length > 0 && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-surface"></span>
            )}
          </button>

          {showNotifDropdown && (
            <div className="absolute right-0 mt-2 w-80 bg-white border border-outline-variant rounded-2xl shadow-xl z-50 p-4 space-y-3">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="text-xs font-black text-primary uppercase">Notificações ({notifications.length})</span>
                <button
                  onClick={() => setShowNotifDropdown(false)}
                  className="text-[10px] text-outline hover:text-primary font-bold uppercase"
                >
                  Fechar
                </button>
              </div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="text-xs text-outline text-center py-4">Nenhum alerta de estoque pendente.</p>
                ) : (
                  notifications.map(n => (
                    <div key={n.id} className="p-2.5 bg-red-50 text-red-700 text-xs rounded-lg border border-red-100 flex items-start gap-2">
                      <span className="material-symbols-outlined notranslate text-[16px] mt-0.5">warning</span>
                      <span>{n.text}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* User Card with dropdown click */}
        <div className="relative">
          <div
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            className="flex items-center gap-3 bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant cursor-pointer hover:bg-surface-container-high transition-colors select-none"
          >
            <img
              src={avatarUrl}
              alt={avatarName}
              className="w-8 h-8 rounded-full border border-secondary object-cover shadow-xs"
            />
            <div className="text-right">
              <p className="text-xs font-bold text-primary">{userProfile?.nome || 'Carregando...'}</p>
              <p className="text-[10px] font-semibold text-outline tracking-wider uppercase">{userProfile?.cargo || '...'}</p>
            </div>

            <span className="material-symbols-outlined notranslate text-xs text-outline">
              {showUserDropdown ? 'expand_less' : 'expand_more'}
            </span>
          </div>

          {showUserDropdown && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-outline-variant rounded-2xl shadow-xl z-50 p-2 space-y-1">
              <button
                onClick={() => {
                  setCurrentScreen('configuracoes');
                  setShowUserDropdown(false);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-primary hover:bg-surface-container-low rounded-lg transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined notranslate text-[16px]">settings</span>
                <span>Configurações</span>
              </button>

              <button
                onClick={async () => {
                  if (confirm('Deseja realmente sair do sistema?')) {
                    await supabase.auth.signOut();
                    window.location.href = '/login';
                  }
                }}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50 rounded-lg transition-colors text-left cursor-pointer"
              >
                <span className="material-symbols-outlined notranslate text-[16px]">logout</span>
                <span>Sair</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

