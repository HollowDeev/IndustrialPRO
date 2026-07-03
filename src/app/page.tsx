"use client";

import React, { useState, useEffect } from 'react';
import { Supplier, Order, DailyProductionSetup } from '../types';
import SideNavBar from '../components/SideNavBar';
import TopAppBar from '../components/TopAppBar';
import DashboardScreen from '../components/DashboardScreen';
import AberturaProducao from '../components/AberturaProducao';
import ApontamentoScreen from '../components/ApontamentoScreen';
import ReprogramacaoTecnica from '../components/ReprogramacaoTecnica';
import Fornecedores from '../components/Fornecedores';
import PedidosDetail from '../components/PedidosDetail';
import Funcionarios from '../components/Funcionarios';
import MateriasPrimas from '../components/MateriasPrimas';
import FamiliasSkusScreen from '../components/FamiliasSkusScreen';
import BOMScreen from '../components/BOMScreen';
import ConfiguracoesScreen from '../components/ConfiguracoesScreen';
import EstoqueScreen from '../components/EstoqueScreen';
import { createClient } from '../utils/supabase/client';

export default function Home() {
  const supabase = createClient();
  
  // Screens: 'dashboard' | 'estoque' | 'pedidos' | 'pedido-detail' | 'apontamento' | 'reprogramacao' | 'fornecedores' | 'familias-skus' | 'bom-formulas'
  const [currentScreen, setCurrentScreen] = useState<string>('dashboard');
  
  // App States
  const [orders, setOrders] = useState<Order[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [currentSetup, setCurrentSetup] = useState<DailyProductionSetup | null>(null);
  const [isAddingNewSupplier, setIsAddingNewSupplier] = useState(false);
  const [loading, setLoading] = useState(true);
  const [globalSearch, setGlobalSearch] = useState('');
  const [lowStockCount, setLowStockCount] = useState(0);
  const [userProfile, setUserProfile] = useState<{ nome: string; cargo: string } | null>(null);
  const [triggerAddEmployee, setTriggerAddEmployee] = useState(0);
  const [triggerAddMaterial, setTriggerAddMaterial] = useState(0);
  const [triggerAddFamily, setTriggerAddFamily] = useState(0);
  
  // States para Modal de Novo Pedido
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  const [newOrderCode, setNewOrderCode] = useState('');
  const [newOrderClient, setNewOrderClient] = useState('');
  const [newOrderLocation, setNewOrderLocation] = useState('');
  const [newOrderPriority, setNewOrderPriority] = useState('MEDIA');
  const [newOrderSKUId, setNewOrderSKUId] = useState('');
  const [newOrderQty, setNewOrderQty] = useState('1000');
  const [dbSKUs, setDbSKUs] = useState<{ id: string; codigo: string; comprimento_mm: number }[]>([]);

  // Carregar dados principais do banco de dados (Supabase)
  const fetchData = async () => {
    try {
      setLoading(true);

      // A) Carregar Pedidos
      const { data: dbPedidos } = await supabase
        .from('pedidos')
        .select('*, ordens_producao(*, skus(*, familias_produto(*)))')
        .order('created_at', { ascending: false });

      const mappedOrders: Order[] = (dbPedidos || []).map((ped: any) => {
        const items = (ped.ordens_producao || []).map((op: any, index: number) => ({
          itemNum: (index + 1).toString().padStart(2, '0'),
          product: op.skus?.familias_produto?.nome || 'Desconhecido',
          measure: op.skus?.codigo || `${op.skus?.comprimento_mm}mm`,
          totalQtd: op.quantidade_planejada,
          produced: op.quantidade_produzida || 0,
          tempoPeca: 1.2,
          extruder: 'EXT-04',
          eta: op.status === 'ABERTA' ? 'Aguardando' : op.status === 'FINALIZADA' ? 'Finalizado' : 'Em Andamento',
          status: op.status === 'ABERTA' ? 'Aberto' : op.status === 'FINALIZADA' ? 'Finalizado' : 'Em Andamento'
        }));

        const totalVolume = items.reduce((sum: number, i: typeof items[0]) => sum + i.totalQtd, 0);
        const totalProduced = items.reduce((sum: number, i: typeof items[0]) => sum + i.produced, 0);

        return {
          id: ped.codigo,
          clientName: ped.nome_cliente,
          location: ped.localizacao || 'Planta Principal',
          emissionDate: new Date(ped.data_emissao).toLocaleDateString('pt-BR'),
          deliveryDate: ped.data_entrega ? new Date(ped.data_entrega).toISOString().split('T')[0] : '',
          priority: ped.prioridade === 'ALTA' ? 'Alta' : ped.prioridade === 'BAIXA' ? 'Baixa' : 'Média',
          totalProduced,
          totalVolume,
          efficiency: 89.4,
          timeEstimated: 12,
          items
        };
      });

      setOrders(mappedOrders);
      if (mappedOrders.length > 0 && !selectedOrderId) {
        setSelectedOrderId(mappedOrders[0].id);
      }

      // B) Carregar Fornecedores
      const { data: dbSuppliers } = await supabase
        .from('fornecedores')
        .select('*')
        .order('nome');

      const mappedSuppliers: Supplier[] = (dbSuppliers || []).map((sup: any) => ({
        id: sup.id,
        name: sup.nome,
        cnpj: sup.cnpj || '',
        IE: sup.ie || 'Isento',
        categories: [sup.categoria || 'Matéria-Prima'],
        rating: sup.rating || 90,
        status: sup.status || 'Em Homologação',
        contact: sup.contato_nome || '',
        contactEmail: sup.contato_email || sup.email || '',
        lastDelivery: sup.last_delivery || 'Recém Cadastrado',
        address: sup.endereco || '',
        limit: Number(sup.limite_financeiro) || 250000,
        logo: sup.logo,
        auditDate: sup.audit_date || new Date(sup.created_at).toLocaleDateString('pt-BR'),
        paymentTerm: sup.payment_term || '30 Dias',
        currency: sup.currency || 'BRL',
        documents: sup.documents || [],
        history: sup.history || []
      }));

      setSuppliers(mappedSuppliers);

      // C) Carregar Turno Ativo Mais Recente
      const { data: activeTurno } = await supabase
        .from('turnos')
        .select('*, turnos_operadores(funcionarios(nome))')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (activeTurno) {
        const team = (activeTurno.turnos_operadores || [])
          .map((to: any) => to.funcionarios?.nome)
          .filter(Boolean);

        setCurrentSetup({
          date: activeTurno.date,
          orderId: activeTurno.order_id,
          clientName: 'Atendimento do Chão de Fábrica',
          team,
          deadline: '',
          hoursAvailable: Number(activeTurno.hours_available),
          checklists: activeTurno.checklist
        });
      }

      // D) Buscar contagem de insumos críticos
      const { count: dbLowStockCount } = await supabase
        .from('insumos')
        .select('*', { count: 'exact', head: true })
        .lt('estoque_atual', 500);

      setLowStockCount(dbLowStockCount || 0);

      // E) Carregar perfil de usuário logado
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

      // F) Carregar SKUs
      const { data: skusData } = await supabase
        .from('skus')
        .select('id, codigo, comprimento_mm')
        .order('codigo');
      if (skusData) {
        setDbSKUs(skusData);
      }

    } catch (err) {
      console.error('Erro ao buscar dados do Supabase:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleActionButtonClick = (screen: string) => {
    switch (screen) {
      case 'dashboard':
      case 'pedidos':
      case 'pedido-detail':
        handleAddOrder();
        break;
      case 'fornecedores':
      case 'fornecedor-cadastro':
      case 'fornecedor-detail':
        setIsAddingNewSupplier(true);
        break;
      case 'funcionarios':
        setTriggerAddEmployee(prev => prev + 1);
        break;
      case 'materias-primas':
        setTriggerAddMaterial(prev => prev + 1);
        break;
      case 'familias-skus':
        setTriggerAddFamily(prev => prev + 1);
        break;
      default:
        break;
    }
  };

  // Handlers para Atualização de Pedidos / OPs
  const handleUpdateOrder = async (updatedOrder: Order) => {
    setOrders(prev => prev.map(o => o.id === updatedOrder.id ? updatedOrder : o));
    // Sincronização de pedidos no banco de dados pode ser expandida aqui
  };

  const handleAddOrder = () => {
    const newCode = `PED-2026-${(orders.length + 1).toString().padStart(3, '0')}`;
    setNewOrderCode(newCode);
    setNewOrderClient('');
    setNewOrderLocation('');
    setNewOrderPriority('MEDIA');
    if (dbSKUs.length > 0) {
      setNewOrderSKUId(dbSKUs[0].id);
    } else {
      setNewOrderSKUId('');
    }
    setNewOrderQty('1000');
    setIsAddOrderModalOpen(true);
  };

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCode || !newOrderClient || !newOrderSKUId) {
      alert('Por favor, preencha os campos obrigatórios.');
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
    const empresaId = profile?.empresa_id;
    if (!empresaId) return;

    const { data: pedRow, error } = await supabase
      .from('pedidos')
      .insert({
        empresa_id: empresaId,
        codigo: newOrderCode,
        nome_cliente: newOrderClient,
        localizacao: newOrderLocation || 'São Paulo - SP',
        prioridade: newOrderPriority
      })
      .select()
      .single();

    if (error) {
      alert(`Erro ao criar pedido: ${error.message}`);
      return;
    }

    const qty = parseInt(newOrderQty) || 1000;
    await supabase.from('ordens_producao').insert({
      empresa_id: empresaId,
      pedido_id: pedRow.id,
      sku_id: newOrderSKUId,
      quantidade_planejada: qty,
      status: 'ABERTA'
    });

    setIsAddOrderModalOpen(false);
    await fetchData();
    setSelectedOrderId(newOrderCode);
    setCurrentScreen('pedido-detail');
  };

  // Handlers para Fornecedores
  const handleAddSupplier = async (newSupplier: Supplier) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
    const empresaId = profile?.empresa_id;
    if (!empresaId) return;

    const { error } = await supabase
      .from('fornecedores')
      .insert({
        empresa_id: empresaId,
        nome: newSupplier.name,
        cnpj: newSupplier.cnpj,
        ie: newSupplier.IE,
        categoria: newSupplier.categories,
        rating: newSupplier.rating,
        status: newSupplier.status,
        contato_nome: newSupplier.contact,
        contato_email: newSupplier.contactEmail,
        endereco: newSupplier.address,
        limite_financeiro: newSupplier.limit,
        logo: newSupplier.logo,
        audit_date: newSupplier.auditDate,
        payment_term: newSupplier.paymentTerm,
        currency: newSupplier.currency,
        documents: newSupplier.documents,
        history: newSupplier.history
      });

    if (error) {
      alert(`Erro ao salvar fornecedor: ${error.message}`);
    } else {
      await fetchData();
    }
  };

  const handleUpdateSupplier = async (updatedSup: Supplier) => {
    const { error } = await supabase
      .from('fornecedores')
      .update({
        nome: updatedSup.name,
        cnpj: updatedSup.cnpj,
        ie: updatedSup.IE,
        categoria: updatedSup.categories,
        rating: updatedSup.rating,
        status: updatedSup.status,
        contato_nome: updatedSup.contact,
        contato_email: updatedSup.contactEmail,
        endereco: updatedSup.address,
        limite_financeiro: updatedSup.limit,
        logo: updatedSup.logo,
        audit_date: updatedSup.auditDate,
        payment_term: updatedSup.paymentTerm,
        currency: updatedSup.currency,
        documents: updatedSup.documents,
        history: updatedSup.history
      })
      .eq('id', updatedSup.id);

    if (error) {
      alert(`Erro ao atualizar fornecedor: ${error.message}`);
    } else {
      await fetchData();
    }
  };

  const selectedOrder = orders.find(o => o.id === selectedOrderId) || orders[0];

  // Configuração e persistência de Ficha de Turno
  const handleStartProductionSetup = async (setup: DailyProductionSetup) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
    const empresaId = profile?.empresa_id;
    if (!empresaId) return;

    // Criar turno no banco
    const { data: turnoRow, error } = await supabase
      .from('turnos')
      .insert({
        empresa_id: empresaId,
        order_id: setup.orderId,
        date: setup.date,
        extruder: 'EXT-04',
        hours_available: setup.hoursAvailable,
        checklist: setup.checklists
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao abrir turno no banco:', error.message);
    } else if (turnoRow) {
      // Registrar operadores vinculados ao turno
      for (const opNome of setup.team) {
        // Encontrar funcionário por nome correspondente
        const { data: func } = await supabase
          .from('funcionarios')
          .select('id')
          .eq('nome', opNome)
          .maybeSingle();

        if (func) {
          await supabase.from('turnos_operadores').insert({
            empresa_id: empresaId,
            turno_id: turnoRow.id,
            funcionario_id: func.id
          });
        }
      }
    }

    await fetchData();
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
              userName={userProfile?.nome ? userProfile.nome.split(' ')[0] : 'Operador'}
              lowStockCount={lowStockCount}
              onSelectOrder={(id) => {
                setSelectedOrderId(id);
                setCurrentScreen('pedido-detail');
              }}
              setCurrentScreen={setCurrentScreen}
            />
          </div>
        );

      case 'estoque':
        return <EstoqueScreen />;

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
                  className="bg-[#002046] hover:bg-[#1b365d] text-white text-xs font-bold px-4 py-2 rounded-lg cursor-pointer transition-colors"
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
        return (
          <ApontamentoScreen
            orders={orders}
            onStartProduction={handleStartProductionSetup}
          />
        );

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
        return <Funcionarios externalSearchQuery={globalSearch} triggerAddNew={triggerAddEmployee} />;

      case 'materias-primas':
        return <MateriasPrimas suppliers={suppliers} triggerAddNew={triggerAddMaterial} />;

      case 'familias-skus':
        return <FamiliasSkusScreen triggerAddNew={triggerAddFamily} />;

      case 'bom-formulas':
        return <BOMScreen />;

      case 'configuracoes':
        return <ConfiguracoesScreen />;

      default:
        return (
          <div className="p-12 text-center text-outline">
            Selecione uma opção válida no menu lateral esquerda.
          </div>
        );
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center text-outline font-bold bg-background">
        Carregando Módulos Operacionais...
      </div>
    );
  }

  return (
    <div className="min-h-screen flex text-primary select-none max-w-[100vw] overflow-x-hidden bg-background">
      {/* Sidebar Nav */}
      <SideNavBar
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        onNewOrder={handleAddOrder}
        onNewSupplier={() => {
          setIsAddingNewSupplier(true);
          setCurrentScreen('fornecedores');
        }}
        onActionButtonClick={handleActionButtonClick}
      />

      {/* Main workspace box */}
      <main className="flex-1 min-h-screen flex flex-col bg-background relative overflow-y-auto">
        <TopAppBar
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          onSearch={(query) => {
            setGlobalSearch(query);
          }}
        />

        {/* Workspace body */}
        <div className="flex-1 p-8 overflow-y-auto w-full max-w-7xl mx-auto space-y-6">
          {renderActiveScreen()}
        </div>
      </main>

      {/* ================= MODAL DE CADASTRO DE NOVO PEDIDO ================= */}
      {isAddOrderModalOpen && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[999] p-4 animate-fade-in">
          <form onSubmit={handleCreateOrderSubmit} className="bg-white max-w-lg w-full rounded-2xl shadow-2xl p-6 border border-outline-variant space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black text-[#002046] uppercase flex items-center gap-2">
                <span className="material-symbols-outlined text-[20px]">add_shopping_cart</span>
                Cadastrar Novo Pedido Geral
              </h3>
              <button 
                type="button" 
                onClick={() => setIsAddOrderModalOpen(false)}
                className="text-[#74777f] hover:text-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Código do Pedido</label>
                <input
                  type="text"
                  required
                  value={newOrderCode}
                  onChange={(e) => setNewOrderCode(e.target.value.toUpperCase())}
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-mono font-bold text-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Nome do Cliente</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rodoplex Distribuidora"
                  value={newOrderClient}
                  onChange={(e) => setNewOrderClient(e.target.value)}
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-primary focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Localização (Cidade - UF)</label>
                <input
                  type="text"
                  placeholder="Ex: São Paulo - SP"
                  value={newOrderLocation}
                  onChange={(e) => setNewOrderLocation(e.target.value)}
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-semibold text-primary focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Prioridade</label>
                <select
                  value={newOrderPriority}
                  onChange={(e) => setNewOrderPriority(e.target.value)}
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-semibold text-primary focus:outline-none"
                >
                  <option value="BAIXA">Baixa</option>
                  <option value="MEDIA">Média</option>
                  <option value="ALTA">Alta</option>
                </select>
              </div>
            </div>

            <div className="border-t pt-4 border-outline-variant/40 space-y-4">
              <h4 className="text-[10px] font-black text-secondary uppercase tracking-wider">Item Inicial da OP</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">SKU do Produto</label>
                  <select
                    required
                    value={newOrderSKUId}
                    onChange={(e) => setNewOrderSKUId(e.target.value)}
                    className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-semibold text-primary focus:outline-none"
                  >
                    <option value="" disabled>Selecione o SKU...</option>
                    {dbSKUs.map(sku => (
                      <option key={sku.id} value={sku.id}>
                        {sku.codigo}{sku.comprimento_mm ? ` (${sku.comprimento_mm}mm)` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Quantidade Planejada</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={newOrderQty}
                    onChange={(e) => setNewOrderQty(e.target.value)}
                    className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-primary focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setIsAddOrderModalOpen(false)}
                className="bg-[#f4f3f9] hover:bg-[#e4e3e9] text-primary font-bold px-4 py-2.5 rounded-lg text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-[#002046] hover:bg-[#1b365d] text-white font-bold px-4 py-2.5 rounded-lg text-xs cursor-pointer"
              >
                Gravar Pedido Geral
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

