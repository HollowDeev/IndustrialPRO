import React, { useState } from 'react';
import Logo from './Logo';

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

  return (
    <aside className="no-scrollbar flex flex-col h-screen sticky top-0 bg-surface-container-lowest border-r border-outline-variant w-64 shrink-0 z-40 select-none">
      {/* Brand & Logo */}
      <div className="p-4 flex flex-col gap-1 border-b border-surface-container">
        <Logo showText={true} className="w-full" />
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-4 py-4 space-y-4 overflow-y-auto">
        {/* Dashboard */}
        <div className="space-y-1">
          <button
            onClick={() => setCurrentScreen('dashboard')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 text-left ${
              currentScreen === 'dashboard'
                ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-secondary'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined">dashboard</span>
            <span>Dashboard</span>
          </button>
          
          <button
            onClick={() => setCurrentScreen('estoque')}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm transition-all duration-200 text-left ${
              currentScreen === 'estoque'
                ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-secondary'
                : 'text-on-surface-variant hover:bg-surface-container-high'
            }`}
          >
            <span className="material-symbols-outlined">warehouse</span>
            <span>Almoxarifado</span>
          </button>
        </div>

        {/* Cadastros Parent Group */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setCadastrosOpen(!cadastrosOpen)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-black text-outline uppercase tracking-wider hover:bg-surface-container-high rounded-lg transition-all duration-200 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">inventory_2</span>
              <span>Cadastros</span>
            </div>
            <span className="material-symbols-outlined text-xs">
              {cadastrosOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {cadastrosOpen && (
            <div className="pl-2 border-l border-outline-variant/60 ml-4 space-y-1">
              {/* Famílias & SKUs */}
              <button
                onClick={() => setCurrentScreen('familias-skus')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left ${
                  currentScreen === 'familias-skus'
                    ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-secondary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">category</span>
                <span>Famílias & SKUs</span>
              </button>

              {/* Fórmulas (BOM) */}
              <button
                onClick={() => setCurrentScreen('bom-formulas')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left ${
                  currentScreen === 'bom-formulas'
                    ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-secondary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">science</span>
                <span>Fórmulas (BOM)</span>
              </button>

              {/* Funcionários */}
              <button
                onClick={() => setCurrentScreen('funcionarios')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left ${
                  currentScreen === 'funcionarios'
                    ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-secondary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">badge</span>
                <span>Funcionários</span>
              </button>

              {/* Fornecedores */}
              <button
                onClick={() => setCurrentScreen('fornecedores')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left ${
                  currentScreen === 'fornecedores' || currentScreen === 'fornecedor-cadastro' || currentScreen === 'fornecedor-detail'
                    ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-secondary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: currentScreen === 'fornecedores' ? "'FILL' 1" : undefined }}>
                  factory
                </span>
                <span>Fornecedores</span>
              </button>

              {/* Matérias Primas */}
              <button
                onClick={() => setCurrentScreen('materias-primas')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left ${
                  currentScreen === 'materias-primas'
                    ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-secondary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: currentScreen === 'materias-primas' ? "'FILL' 1" : undefined }}>
                  layers
                </span>
                <span>Matérias Primas</span>
              </button>
            </div>
          )}
        </div>

        {/* Produção Parent Group */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setProducaoOpen(!producaoOpen)}
            className="w-full flex items-center justify-between px-4 py-2 text-xs font-black text-outline uppercase tracking-wider hover:bg-surface-container-high rounded-lg transition-all duration-200 text-left"
          >
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px]">precision_manufacturing</span>
              <span>Produção</span>
            </div>
            <span className="material-symbols-outlined text-xs">
              {producaoOpen ? 'expand_less' : 'expand_more'}
            </span>
          </button>

          {producaoOpen && (
            <div className="pl-2 border-l border-outline-variant/60 ml-4 space-y-1">
              {/* Pedidos */}
              <button
                onClick={() => setCurrentScreen('pedidos')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left ${
                  currentScreen === 'pedidos' || currentScreen === 'pedido-detail'
                    ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-secondary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">production_quantity_limits</span>
                <span>Pedidos</span>
              </button>

              {/* Apontamento Diário */}
              <button
                onClick={() => setCurrentScreen('apontamento')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200 text-left ${
                  currentScreen === 'apontamento'
                    ? 'bg-primary-container text-on-primary-container font-bold border-l-4 border-secondary'
                    : 'text-on-surface-variant hover:bg-surface-container-high'
                }`}
              >
                <span className="material-symbols-outlined text-[20px]">edit_note</span>
                <span>Apontamento Diário</span>
              </button>
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
          <div className="p-4 border-t border-outline-variant mt-auto bg-surface-bright">
            <button
              onClick={() => {
                if (onActionButtonClick) {
                  onActionButtonClick(currentScreen);
                } else {
                  if (currentScreen.startsWith('fornecedor')) {
                    onNewSupplier();
                  } else {
                    onNewOrder();
                  }
                }
              }}
              className="w-full bg-[#002046] hover:bg-[#1b365d] hover:scale-[0.98] text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 text-xs transition-all tracking-wider select-none shadow-sm cursor-pointer border border-transparent"
            >
              <span className="material-symbols-outlined text-[18px]">
                {action.icon}
              </span>
              <span>{action.text}</span>
            </button>
          </div>
        );
      })()}
    </aside>
  );
}
