"use client";

import React, { useState } from 'react';
import { Supplier, Order, DailyProductionSetup } from '../types';
import { INITIAL_ORDERS, INITIAL_SUPPLIERS } from '../data';
import SideNavBar from '../components/SideNavBar';
import TopAppBar from '../components/TopAppBar';
import DashboardScreen from '../components/DashboardScreen';
import AberturaProducao from '../components/AberturaProducao';
import ApontamentoReal from '../components/ApontamentoReal';
import ReprogramacaoTecnica from '../components/ReprogramacaoTecnica';
import Fornecedores from '../components/Fornecedores';
import PedidosDetail from '../components/PedidosDetail';
import Funcionarios from '../components/Funcionarios';
import MateriasPrimas from '../components/MateriasPrimas';

export default function Home() {
  // Screens: 'dashboard' | 'pedidos' | 'pedido-detail' | 'apontamento' | 'reprogramacao' | 'fornecedores'
  const [currentScreen, setCurrentScreen] = useState<string>('dashboard');
  
  // App States
  const [orders, setOrders] = useState<Order[]>(INITIAL_ORDERS);
  const [suppliers, setSuppliers] = useState<Supplier[]>(INITIAL_SUPPLIERS);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('PED-2024-015');
  const [currentSetup, setCurrentSetup] = useState<DailyProductionSetup | null>({
    date: '12/11/2023',
    orderId: 'PED-2024-015',
    clientName: 'Alcopla Plásticos Ltda',
    team: ['Fabrício Rodrigues', 'Ronaldo Sales', 'Marcio Souza'],
    deadline: '2023-11-25',
    hoursAvailable: 12,
    checklists: {
      limpeza: true,
      residualAnterior: true,
      temperaturas: true,
      rotacaoRosca: true,
      alimentacaoMaquina: true,
      bagPosicionado: true,
      operadorOk: true
    }
  });

  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);

  // Handlers for Order / OP Updates
  const handleUpdateOrder = (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
  };

  const handleAddOrder = () => {
    // Generate a new blank Order quickly and select it
    const newId = `PED-2024-${(orders.length + 15).toString().padStart(3, '0')}`;
    const newOrder: Order = {
      id: newId,
      clientName: "Nova Indústria Química S.A.",
      location: "Belo Horizonte - MG",
      emissionDate: new Date().toLocaleDateString('pt-BR'),
      deliveryDate: "2026-07-30",
      priority: "Média",
      totalProduced: 0,
      totalVolume: 5000,
      efficiency: 91.0,
      timeEstimated: 24,
      items: [
        { itemNum: "01", product: "Perfil Acabamento Borracha", measure: "15x15mm", totalQtd: 5000, produced: 0, tempoPeca: 1.2, extruder: "EXT-04", eta: "Aguardando", status: "Aberto" }
      ]
    };

    setOrders([...orders, newOrder]);
    setSelectedOrderId(newId);
    setCurrentScreen('pedido-detail');
  };

  // Handlers for Supplier Updates
  const handleAddSupplier = (newSupplier: Supplier) => {
    setSuppliers([...suppliers, newSupplier]);
  };

  const handleUpdateSupplier = (updatedSup: Supplier) => {
    setSuppliers(prev => prev.map(s => s.id === updatedSup.id ? updatedSup : s));
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || orders[0];

  const handleStartProductionSetup = (setup: DailyProductionSetup) => {
    setCurrentSetup(setup);
    // Automatically redirect to active stopwatch pointing to check progress
    setTimeout(() => {
      setCurrentScreen('apontamento');
    }, 1200);
  };

  const renderActiveScreen = () => {
    switch (currentScreen) {
      case 'dashboard':
        return (
          <div className="space-y-6">
            <DashboardScreen
              orders={orders}
              currentSetup={currentSetup}
              onSelectOrder={(id) => {
                setSelectedOrderId(id);
                setCurrentScreen('pedido-detail');
              }}
              setCurrentScreen={setCurrentScreen}
            />
            {/* Abertura setup section inline underneath as view fallback */}
            <div className="mt-8 pt-8 border-t border-outline-variant">
              <div className="mb-4">
                <h4 className="text-sm font-black text-primary uppercase tracking-wider">Lançamento de Nova Auditoria / Turno</h4>
                <p className="text-xs text-outline">Realize a abertura técnico-operacional regulamentada</p>
              </div>
              <AberturaProducao
                orders={orders}
                onStartProduction={handleStartProductionSetup}
              />
            </div>
          </div>
        );

      case 'pedidos':
        return (
          <div className="space-y-6">
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs">
              <div className="flex justify-between items-center border-b border-surface-container pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-primary">Listagem Geral de Pedidos / OPs</h3>
                  <p className="text-xs text-outline">Selecione uma carteira ativa abaixo para detalhar a ficha técnica</p>
                </div>
                <button
                  onClick={handleAddOrder}
                  className="bg-secondary text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer hover:bg-secondary/90 transition-colors"
                >
                  + CADASTRAR PEDIDO GERAL
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.map(order => (
                  <div
                    key={order.id}
                    onClick={() => {
                      setSelectedOrderId(order.id);
                      setCurrentScreen('pedido-detail');
                    }}
                    className="p-5 bg-surface-bright border border-outline-variant/60 rounded-2xl hover:border-outline/80 cursor-pointer transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="font-mono text-sm font-black text-primary">{order.id}</span>
                        <span className={`px-2 py-0.5 rounded-sm text-[10px] font-bold ${
                          order.priority === 'Alta' ? 'bg-secondary-container text-on-secondary-container' : 'bg-surface-container-high'
                        }`}>
                          {order.priority}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-primary">{order.clientName}</h4>
                      <p className="text-[10px] text-outline">{order.location}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-outline-variant/30 flex justify-between items-center text-xs">
                      <span className="text-outline">Itens: <strong className="text-primary">{order.items.length}</strong></span>
                      <span className="text-secondary font-bold">Ficha Técnica &gt;</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'pedido-detail':
        return (
          <PedidosDetail
            order={selectedOrder}
            onUpdateOrder={handleUpdateOrder}
            onBack={() => setCurrentScreen('dashboard')}
          />
        );

      case 'apontamento':
        return <ApontamentoReal />;

      case 'reprogramacao':
        return <ReprogramacaoTecnica />;

      case 'fornecedores':
      case 'fornecedor-cadastro':
      case 'fornecedor-detail':
        return (
          <Fornecedores
            suppliers={suppliers}
            onAddSupplier={handleAddSupplier}
            onUpdateSupplier={handleUpdateSupplier}
            isAddingNew={isAddingNewSupplier}
            setIsAddingNew={setIsAddingNewSupplier}
          />
        );

      case 'funcionarios':
        return <Funcionarios />;

      case 'materias-primas':
        return <MateriasPrimas suppliers={suppliers} />;

      default:
        return (
          <div className="p-12 text-center text-outline">
            Selecione uma opção válida no menu lateral esquerda.
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen flex text-primary select-none max-w-[100vw] overflow-x-hidden">
      {/* Sidebar Nav */}
      <SideNavBar
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        onNewOrder={handleAddOrder}
        onNewSupplier={() => {
          setIsAddingNewSupplier(true);
          setCurrentScreen('fornecedores');
        }}
      />

      {/* Main workspace box */}
      <main className="flex-1 min-h-screen flex flex-col bg-background relative overflow-y-auto">
        {/* Top Header bar */}
        <TopAppBar
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          onSearch={(query) => {
            // Global search trigger alerts
            console.log("Pesquisando: ", query);
          }}
        />

        {/* Workspace body with custom paddings */}
        <div className="flex-1 p-8 overflow-y-auto w-full max-w-7xl mx-auto space-y-6">
          {renderActiveScreen()}
        </div>
      </main>
    </div>
  );
}
