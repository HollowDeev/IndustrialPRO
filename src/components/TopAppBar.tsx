import React from 'react';

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
  const [searchValue, setSearchValue] = React.useState('');

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
      case 'apontamento':
        return [
          { name: 'HELPE', action: () => setCurrentScreen('dashboard') },
          { name: 'Painel do Operador', action: () => setCurrentScreen('dashboard') },
          { name: 'Apontamento Real de Paradas', active: true }
        ];
      case 'reprogramacao':
        return [
          { name: 'HELPE', action: () => setCurrentScreen('dashboard') },
          { name: 'Relatórios de Eficiência', active: true }
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
      case 'fornecedor-cadastro':
        return [
          { name: 'HELPE', action: () => setCurrentScreen('dashboard') },
          { name: 'Fornecedores', action: () => setCurrentScreen('fornecedores') },
          { name: 'Cadastro de Novo Fornecedor', active: true }
        ];
      case 'fornecedor-detail':
        return [
          { name: 'HELPE', action: () => setCurrentScreen('dashboard') },
          { name: 'Fornecedores', action: () => setCurrentScreen('fornecedores') },
          { name: 'Perfil do Fornecedor', active: true }
        ];
      default:
        return [{ name: 'HELPE', active: true }];
    }
  };

  const getTitle = () => {
    switch (currentScreen) {
      case 'dashboard':
        return 'Dashboard Geral e Abertura de OP';
      case 'pedidos':
        return 'Gestão e Planejamento de Pedidos';
      case 'pedido-detail':
        return 'Ficha Técnica do Pedido e OP';
      case 'apontamento':
        return 'Painel de Apontamento Técnico de Paradas';
      case 'reprogramacao':
        return 'Simulação e Reprogramação de Linhas';
      case 'funcionarios':
        return 'Cadastro e Controle de Funcionários';
      case 'materias-primas':
        return 'Controle de Matérias-Primas';
      case 'fornecedores':
        return 'Portal de Fornecedores Homologados';
      case 'fornecedor-cadastro':
        return 'Preenchimento cadastral de Fornecedor';
      case 'fornecedor-detail':
        return 'Detalhamento Técnico de Fornecedor';
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

  return (
    <header className="bg-surface-container-lowest border-b border-outline-variant px-8 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4 z-30 select-none">
      {/* Search & Breadcrumbs */}
      <div className="flex flex-col gap-1.5 flex-1">
        {/* Breadcrumb row */}
        <div className="flex items-center gap-1.5 text-xs text-outline font-medium tracking-wide">
          {getBreadcrumbs().map((bc, idx) => (
            <React.Fragment key={idx}>
              {idx > 0 && <span className="material-symbols-outlined text-[14px]">chevron_right</span>}
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
      <div className="flex items-center gap-5 justify-between md:justify-end shrink-0">
        {/* Search Input bar */}
        <div className="relative max-w-xs hidden sm:block">
          <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-outline">
            search
          </span>
          <input
            type="text"
            placeholder="Pesquisar..."
            value={searchValue}
            onChange={handleSearchChange}
            className="w-full bg-surface-container-low text-primary text-sm px-10 py-2.5 rounded-full border border-outline/20 outline-hidden focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
          />
        </div>

        {/* Dynamic Alerts Indicator */}
        <div className="relative group cursor-pointer">
          <button className="relative p-2 rounded-full hover:bg-surface-container-high transition-colors">
            <span className="material-symbols-outlined text-[24px] text-primary">notifications</span>
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-secondary-container rounded-full ring-2 ring-surface"></span>
          </button>
        </div>

        {/* User Card */}
        <div className="flex items-center gap-3 bg-surface-container-low px-4 py-1.5 rounded-full border border-outline-variant">
          <div className="text-right">
            <p className="text-xs font-bold text-primary">Fabrício Rodrigues</p>
            <p className="text-[10px] font-semibold text-outline tracking-wider uppercase">Extrusora Turno A</p>
          </div>
          <img
            src="https://ui-avatars.com/api/?name=Fabricio+Rodrigues&background=1b365d&color=fff&size=150"
            alt="Fabrício"
            className="w-8 h-8 rounded-full border border-secondary object-cover shadow-xs"
          />
        </div>
      </div>
    </header>
  );
}
