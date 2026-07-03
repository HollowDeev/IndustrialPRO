import React, { useState } from 'react';
import Logo from './Logo';
import { useShortcut } from '../hooks/useShortcut';

interface SideNavBarProps {
  currentScreen: string;
  setCurrentScreen: (screen: string) => void;
  onNewOrder: () => void;
  onNewSupplier: () => void;
  onActionButtonClick?: (screen: string) => void;
}

export default function SideNavBar({
  currentScreen,
  setCurrentScreen,
  onNewOrder,
  onNewSupplier,
  onActionButtonClick
}: SideNavBarProps) {
  const [cadastrosOpen, setCadastrosOpen] = useState(true);
  const [producaoOpen, setProducaoOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const handleAction = () => {
    if (onActionButtonClick) {
      onActionButtonClick(currentScreen);
    } else {
      if (currentScreen.startsWith('fornecedor')) {
        onNewSupplier();
      } else {
        onNewOrder();
      }
    }
  };

  // Shortcut to toggle sidebar
  useShortcut('s', () => setIsCollapsed(prev => !prev));
  
  // Shortcut to trigger main action
  useShortcut('n', handleAction);

  const navItemClass = (active: boolean) => 
    `group relative w-full flex items-center ${isCollapsed ? 'justify-center' : 'gap-3 px-4'} py-3 rounded-lg text-sm transition-all duration-200 text-left ${
      active
        ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-secondary'
        : 'text-on-surface-variant hover:bg-surface-container-high'
    }`;

  const iconClass = (icon: string, customFill?: boolean) => (
    <span className="material-symbols-outlined notranslate" style={customFill ? { fontVariationSettings: "'FILL' 1" } : undefined}>
      {icon}
    </span>
  );

  const renderTooltip = (text: string) => {
    if (!isCollapsed) return null;
    return (
      <div className="hidden group-hover:block absolute left-full ml-2 bg-surface-container-highest text-on-surface-variant font-bold text-xs p-2 rounded shadow-lg whitespace-nowrap z-50">
        {text}
      </div>
    );
  };

  const renderNavItem = (id: string, icon: string, label: string, activeScreenMatch: string | string[] = id, customFill?: boolean) => {
    const isActive = Array.isArray(activeScreenMatch) 
      ? activeScreenMatch.includes(currentScreen)
      : currentScreen === activeScreenMatch;
      
    return (
      <button onClick={() => setCurrentScreen(id)} className={navItemClass(isActive)}>
        {iconClass(icon, customFill)}
        {!isCollapsed && <span>{label}</span>}
        {renderTooltip(label)}
      </button>
    );
  };

  const renderSubItem = (id: string, icon: string, label: string, activeScreenMatch: string | string[] = id, customFill?: boolean) => {
    const isActive = Array.isArray(activeScreenMatch) 
      ? activeScreenMatch.includes(currentScreen)
      : currentScreen === activeScreenMatch;
      
    return (
      <button onClick={() => setCurrentScreen(id)} className={`group relative w-full flex items-center ${isCollapsed ? 'justify-center py-3' : 'gap-3 px-3 py-2.5'} rounded-lg text-sm transition-all duration-200 text-left ${isActive ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-secondary' : 'text-on-surface-variant hover:bg-surface-container-high'}`}>
        <span className={`material-symbols-outlined notranslate ${!isCollapsed ? 'text-[20px]' : ''}`} style={customFill ? { fontVariationSettings: "'FILL' 1" } : undefined}>{icon}</span>
        {!isCollapsed && <span>{label}</span>}
        {renderTooltip(label)}
      </button>
    );
  };

  return (
    <aside className={`no-scrollbar flex flex-col h-screen sticky top-0 bg-surface-container-lowest border-r border-outline-variant ${isCollapsed ? 'w-20' : 'w-64'} shrink-0 z-40 select-none transition-all duration-300`}>
      {/* Brand & Logo */}
      <div className="p-4 flex flex-col gap-1 border-b border-surface-container relative">
        <Logo showText={!isCollapsed} className={isCollapsed ? 'justify-center' : 'w-full'} />
        {!isCollapsed && (
          <div className="absolute top-2 right-2">
             <kbd className="text-[9px] bg-surface-container-high border border-outline-variant rounded px-1.5 py-0.5 text-outline opacity-50 cursor-help" title="Atalho: S">S</kbd>
          </div>
        )}
      </div>

      {/* Navigation Links */}
      <nav className={`flex-1 ${isCollapsed ? 'px-2' : 'px-4'} py-4 space-y-4 overflow-y-auto`}>
        {/* Dashboard */}
        <div className="space-y-1">
          {renderNavItem('dashboard', 'dashboard', 'Dashboard')}
          {renderNavItem('estoque', 'warehouse', 'Almoxarifado')}
        </div>

        {/* Cadastros Parent Group */}
        <div className="space-y-1">
          {!isCollapsed ? (
            <button
              type="button"
              onClick={() => setCadastrosOpen(!cadastrosOpen)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-black text-outline uppercase tracking-wider hover:bg-surface-container-high rounded-lg transition-all duration-200 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-[18px]">inventory_2</span>
                <span>Cadastros</span>
              </div>
              <span className="material-symbols-outlined notranslate text-xs">
                {cadastrosOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          ) : (
            <div className="w-full flex justify-center py-2 text-outline" title="Cadastros">
              <span className="material-symbols-outlined notranslate text-[18px]">inventory_2</span>
            </div>
          )}

          {(cadastrosOpen || isCollapsed) && (
            <div className={`${isCollapsed ? 'space-y-1' : 'pl-2 border-l border-outline-variant/60 ml-4 space-y-1'}`}>
              {renderSubItem('familias-skus', 'category', 'Famílias & SKUs')}
              {renderSubItem('bom-formulas', 'science', 'Fórmulas (BOM)')}
              {renderSubItem('funcionarios', 'badge', 'Funcionários')}
              {renderSubItem('fornecedores', 'factory', 'Fornecedores', ['fornecedores', 'fornecedor-cadastro', 'fornecedor-detail'], currentScreen === 'fornecedores')}
              {renderSubItem('materias-primas', 'layers', 'Matérias Primas', 'materias-primas', currentScreen === 'materias-primas')}
            </div>
          )}
        </div>

        {/* Produção Parent Group */}
        <div className="space-y-1">
          {!isCollapsed ? (
            <button
              type="button"
              onClick={() => setProducaoOpen(!producaoOpen)}
              className="w-full flex items-center justify-between px-4 py-2 text-xs font-black text-outline uppercase tracking-wider hover:bg-surface-container-high rounded-lg transition-all duration-200 text-left"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-[18px]">precision_manufacturing</span>
                <span>Produção</span>
              </div>
              <span className="material-symbols-outlined notranslate text-xs">
                {producaoOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>
          ) : (
            <div className="w-full flex justify-center py-2 text-outline" title="Produção">
              <span className="material-symbols-outlined notranslate text-[18px]">precision_manufacturing</span>
            </div>
          )}

          {(producaoOpen || isCollapsed) && (
            <div className={`${isCollapsed ? 'space-y-1' : 'pl-2 border-l border-outline-variant/60 ml-4 space-y-1'}`}>
              {renderSubItem('pedidos', 'production_quantity_limits', 'Pedidos', ['pedidos', 'pedido-detail'])}
              {renderSubItem('apontamento', 'edit_note', 'Apontamento Diário')}
            </div>
          )}
        </div>
      </nav>

      {/* Footer / Persistent Controls */}
      {(() => {
        const getActionButtonLabel = () => {
          switch (currentScreen) {
            case 'dashboard':
            case 'pedidos':
            case 'pedido-detail':
              return { text: 'NOVO PEDIDO', icon: 'add' };
            case 'estoque':
              return { text: 'NOVA ENTRADA', icon: 'local_shipping' };
            case 'fornecedores':
            case 'fornecedor-cadastro':
            case 'fornecedor-detail':
              return { text: 'NOVO FORNECEDOR', icon: 'add' };
            case 'funcionarios':
              return { text: 'NOVO FUNCIONÁRIO', icon: 'person_add' };
            case 'materias-primas':
              return { text: 'NOVO INSUMO', icon: 'add_box' };
            case 'familias-skus':
              return { text: 'NOVA FAMÍLIA', icon: 'category' };
            default:
              return null;
          }
        };

        const action = getActionButtonLabel();
        if (!action) return null;

        return (
          <div className="p-4 border-t border-outline-variant mt-auto bg-surface-bright relative">
            <button
              onClick={handleAction}
              className={`group w-full bg-secondary hover:brightness-95 hover:scale-[0.98] text-white font-bold py-3 ${isCollapsed ? 'px-0 justify-center' : 'px-4 justify-center'} rounded-lg flex items-center gap-2 text-xs transition-all tracking-wider select-none shadow-sm cursor-pointer border border-transparent`}
            >
              <span className="material-symbols-outlined notranslate text-[18px]">
                {action.icon}
              </span>
              {!isCollapsed && <span>{action.text}</span>}
              {!isCollapsed && (
                <kbd className="ml-1 text-[9px] bg-white/20 border border-white/30 rounded px-1.5 py-0.5 opacity-90 cursor-help" title="Atalho: N">N</kbd>
              )}
              {isCollapsed && (
                <div className="hidden group-hover:flex items-center gap-2 absolute left-full ml-2 bg-secondary text-white font-bold text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap z-50">
                  {action.text} <kbd className="text-[9px] bg-white/20 border border-white/30 rounded px-1.5 py-0.5">N</kbd>
                </div>
              )}
            </button>
          </div>
        );
      })()}
    </aside>
  );
}
