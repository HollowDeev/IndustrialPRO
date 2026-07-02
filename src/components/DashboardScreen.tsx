import React from 'react';
import { Order, DailyProductionSetup } from '../types';

interface DashboardScreenProps {
  orders: Order[];
  currentSetup: DailyProductionSetup | null;
  onSelectOrder: (orderId: string) => void;
  setCurrentScreen: (screen: string) => void;
}

export default function DashboardScreen({
  orders,
  currentSetup,
  onSelectOrder,
  setCurrentScreen
}: DashboardScreenProps) {
  // Computations
  const totalOrdersCount = orders.length;
  const activeExtrudersCount = currentSetup ? 5 : 4;

  const totalItemsCount = orders.reduce((sum, o) => sum + o.items.length, 0);
  const itemsFinishedCount = orders.reduce(
    (sum, o) => sum + o.items.filter(i => i.status === 'Finalizado').length,
    0
  );

  return (
    <div className="space-y-6">
      {/* Welcome Banner / Overview */}
      <div className="bg-primary-container text-on-primary-container p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-outline-variant shadow-xs">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Bem-vindo ao HELPE, Fabrício</h3>
          <p className="text-sm text-on-primary-container/85 mt-1 leading-relaxed">
            Planta de Coextrusão Ativa. O turno de hoje está operando com estabilidade térmica e rendimento de OEE satisfatório.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentScreen('apontamento')}
            className="bg-secondary-container hover:brightness-95 text-on-secondary-container font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <span className="material-symbols-outlined text-[18px]">timer</span>
            APONTAR PARADA
          </button>
          
          <button
            onClick={() => setCurrentScreen('pedidos')}
            className="bg-surface-lowest text-primary hover:bg-surface-container-low font-bold text-xs px-4 py-2.5 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs border border-outline-variant"
          >
            <span className="material-symbols-outlined text-[18px]">production_quantity_limits</span>
            VER PEDIDOS
          </button>
        </div>
      </div>

      {/* Production Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Stat 1: OEE Efficiency */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-tertiary-fixed text-primary shrink-0">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              bolt
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Eficiência OEE</span>
            <p className="text-2xl font-black text-primary">89.4%</p>
            <p className="text-[10px] text-on-tertiary-container font-semibold mt-0.5">Meta: 85% (Superada)</p>
          </div>
        </div>

        {/* Stat 2: Active Extruders */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-surface-container-high text-primary shrink-0">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              precision_manufacturing
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Linhas Ativas</span>
            <p className="text-2xl font-black text-primary">{activeExtrudersCount} / 6</p>
            <p className="text-[10px] text-outline mt-0.5">EXT-04 em velocidade 100%</p>
          </div>
        </div>

        {/* Stat 3: Volume of Pieces Finished */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-surface-container-high text-primary shrink-0">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              inventory_2
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Itens OPs</span>
            <p className="text-2xl font-black text-primary">{itemsFinishedCount} / {totalItemsCount}</p>
            <p className="text-[10px] text-outline mt-0.5">Conclusão de {Math.round((itemsFinishedCount / totalItemsCount) * 100)}% das metas</p>
          </div>
        </div>

        {/* Stat 4: Active Warnings */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-secondary-container text-on-secondary-container shrink-0">
            <span className="material-symbols-outlined text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              warning
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Alertas de Manut.</span>
            <p className="text-2xl font-black text-primary">1 Ativo</p>
            <p className="text-[10px] text-secondary font-semibold mt-0.5">Filtro de tela EXT-09 obstruído</p>
          </div>
        </div>

      </div>

      {/* Main section: Orders List with technical previews & side checklists */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Orders list - Left span-8 block */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-surface-container pb-3.5">
            <div>
              <h4 className="text-sm font-black text-primary uppercase tracking-wider">Metas Técnicas por Ordem de Produção</h4>
              <p className="text-xs text-outline mt-0.5">Selecione uma OP para editar medidas, volumes e emitir novos laudos</p>
            </div>
            <span className="text-xs bg-surface-container-high text-outline font-bold px-2 py-1 rounded-sm">
              Total {totalOrdersCount} OPs
            </span>
          </div>

          <div className="divide-y divide-outline-variant/30 text-xs">
            {orders.map(order => {
              const totalItems = order.items.length;
              const producedVolume = order.items.reduce((sum, item) => sum + item.produced, 0);
              const requestedVolume = order.items.reduce((sum, item) => sum + item.totalQtd, 0);
              const progress = requestedVolume > 0 ? Math.round((producedVolume / requestedVolume) * 100) : 0;

              return (
                <div
                  key={order.id}
                  onClick={() => onSelectOrder(order.id)}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer hover:bg-surface-container-low/40 px-3 rounded-xl transition-all group"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-sm text-primary group-hover:text-secondary transition-colors">
                        {order.id}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
                      <span className={`px-2 py-0.5 rounded-sm font-black text-[9px] uppercase tracking-wide ${
                        order.priority === 'Alta' 
                          ? 'bg-secondary-container text-on-secondary-container' 
                          : 'bg-surface-container-highest text-outline'
                      }`}>
                        {order.priority}
                      </span>
                    </div>
                    <p className="font-semibold text-primary">{order.clientName}</p>
                    <p className="text-outline text-[11px]">{order.location}</p>
                  </div>

                  {/* Volume visual bar metric */}
                  <div className="sm:text-right space-y-1">
                    <p className="font-bold text-primary">
                      {producedVolume.toLocaleString()} / {requestedVolume.toLocaleString()} <span className="text-outline font-semibold">un</span>
                    </p>
                    
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-24 bg-surface-container-high h-1.5 rounded-full overflow-hidden">
                        <div className="bg-primary h-full" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="font-mono font-bold text-secondary text-[11px]">{progress}%</span>
                    </div>
                  </div>

                  {/* Button trigger arrow indicator */}
                  <div className="shrink-0 hidden sm:block">
                    <span className="material-symbols-outlined text-outline group-hover:text-secondary group-hover:translate-x-1 transition-all">
                      arrow_right_alt
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Current Active Setup & Shortcuts - Right span-4 block */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Active setup review */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
            <h4 className="text-xs font-black text-primary uppercase tracking-wider">Ficha de Turno Corrente</h4>
            
            {currentSetup ? (
              <div className="space-y-3">
                <div className="p-3 bg-tertiary-container/15 rounded-xl border border-tertiary-container text-xs text-primary">
                  <header className="flex justify-between font-bold text-[11px] uppercase text-on-tertiary-container">
                    <span>Data: {currentSetup.date}</span>
                    <span className="text-secondary font-black">EXT-04 ATIVA</span>
                  </header>
                  <p className="font-semibold mt-2 text-primary">OP: {currentSetup.orderId}</p>
                  <p className="text-outline mt-0.5">Cliente: {currentSetup.clientName}</p>
                  <p className="text-outline mt-0.5">Duração programada: {currentSetup.hoursAvailable}h de turno</p>
                </div>

                <div className="text-xs">
                  <span className="text-outline font-semibold uppercase text-[10px]">Equipe de Operadores:</span>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {currentSetup.team.map(name => (
                      <span key={name} className="bg-surface-container-low text-primary border border-outline-variant/40 rounded-sm p-1 px-1.5 text-[10px] font-semibold">
                        {name}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center p-5 bg-surface-container-low rounded-xl border border-dashed border-outline-variant space-y-3 text-xs">
                <p className="text-outline">Nenhum turno de auditoria iniciado formalmente nas calandras ainda.</p>
                <button
                  onClick={() => setCurrentScreen('dashboard')} // Scrolls down or selects Abertura
                  className="bg-primary text-white text-xs font-black px-4 py-2 rounded-lg cursor-pointer hover:bg-primary-container"
                >
                  PREENCHER AUDITORIA AGORA
                </button>
              </div>
            )}
          </div>

          {/* Quick Operations Guide shortcuts */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-3">
            <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-2">Procedimentos Operacionais</h4>
            
            <button
              onClick={() => setCurrentScreen('apontamento')}
              className="w-full flex items-center justify-between p-3.5 bg-surface-bright hover:bg-surface-container-low rounded-xl border border-outline-variant/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[24px]">troubleshoot</span>
                <div>
                  <p className="text-xs font-bold text-primary">Apontar Paradas Clínicas</p>
                  <p className="text-[10px] text-outline">Lançar alarmes AJU-05 mecânicos</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
            </button>

            <button
              onClick={() => setCurrentScreen('reprogramacao')}
              className="w-full flex items-center justify-between p-3.5 bg-surface-bright hover:bg-surface-container-low rounded-xl border border-outline-variant/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[24px]">tune</span>
                <div>
                  <p className="text-xs font-bold text-primary">Simulação de Otimização</p>
                  <p className="text-[10px] text-outline">Recalcular deltas por velocidade</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
            </button>

            <button
              onClick={() => setCurrentScreen('fornecedores')}
              className="w-full flex items-center justify-between p-3.5 bg-surface-bright hover:bg-surface-container-low rounded-xl border border-outline-variant/40 transition-colors text-left"
            >
              <div className="flex items-center gap-3">
                <span className="material-symbols-outlined text-secondary text-[24px]">verified</span>
                <div>
                  <p className="text-xs font-bold text-primary">Homologar Parceiro</p>
                  <p className="text-[10px] text-outline">Verificar ISO 9001:2015 ativo</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-[16px] text-outline">chevron_right</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
