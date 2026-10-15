"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
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
import LoadingOverlay from '../components/LoadingOverlay';
import Footer from '../components/Footer';
import NewOrderModal from '../components/NewOrderModal';
import NovoPedidoScreen from '../components/NovoPedidoScreen';
import { createClient } from '../utils/supabase/client';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../contexts/PermissionsContext';
import ControleAcessos from '../components/ControleAcessos';
import ClientesScreen from '../components/ClientesScreen';
import ArquivosScreen from '../components/ArquivosScreen';
import FinanceiroScreen from '../components/FinanceiroScreen';
import FormacaoPrecoScreen, { SimulatedOrderItem } from '../components/FormacaoPrecoScreen';
import InteractiveTour, { InteractiveTourHandle } from '../components/InteractiveTour';

function parseDbCategories(categoriaVal: any): string[] {
  let rawList: string[] = [];
  if (Array.isArray(categoriaVal)) {
    const flatten = (arr: any[]): any[] => {
      return arr.reduce((acc, val) => acc.concat(Array.isArray(val) ? flatten(val) : val), []);
    };
    rawList = flatten(categoriaVal).map(v => String(v));
  } else if (typeof categoriaVal === 'string') {
    try {
      const parsed = JSON.parse(categoriaVal);
      if (Array.isArray(parsed)) {
        rawList = parsed.map(v => String(v));
      } else {
        rawList = String(parsed).split(',').map(s => s.trim());
      }
    } catch {
      rawList = categoriaVal.split(',').map(s => s.trim());
    }
  }
  return rawList
    .map(c => c.trim().toUpperCase())
    .filter(c => ['ACO', 'POLIMERO', 'QUIMICO'].includes(c));
}

export default function Home() {
  const router = useRouter();
  const supabase = createClient();
  
  const { addToast } = useToast();
  const { canAccess, loading: isPermissionsLoading, permissions } = usePermissions();
  // Screens: 'dashboard' | 'estoque' | 'pedidos' | 'pedido-detail' | 'apontamento' | 'reprogramacao' | 'fornecedores' | 'familias-skus' | 'bom-formulas' | 'acessos'
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
  const [userProfile, setUserProfile] = useState<{ id?: string; nome: string; cargo: string; empresa_id?: string } | null>(null);
  const [triggerAddEmployee, setTriggerAddEmployee] = useState(0);
  const [triggerAddMaterial, setTriggerAddMaterial] = useState(0);
  const [triggerAddFamily, setTriggerAddFamily] = useState(0);
  const [triggerAddEstoque, setTriggerAddEstoque] = useState(0);
  
  // States para Modal de Novo Pedido
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  const [preSelectedClientId, setPreSelectedClientId] = useState<string | undefined>(undefined);
  const [newOrderCode, setNewOrderCode] = useState('');
  const [activeOrdersTab, setActiveOrdersTab] = useState<'ATIVOS' | 'FINALIZADOS'>('ATIVOS');
  const [dbSKUs, setDbSKUs] = useState<{ id: string; codigo: string; comprimento_mm: number }[]>([]);
  const [preSelectedItems, setPreSelectedItems] = useState<SimulatedOrderItem[] | undefined>(undefined);
  const [calculatorInitialItems, setCalculatorInitialItems] = useState<SimulatedOrderItem[]>([]);
  const [tourDemoMode, setTourDemoMode] = useState<boolean>(false);
  const tourRef = useRef<InteractiveTourHandle>(null);

  // Carregar dados principais do banco de dados (Supabase)
  const fetchData = async () => {
    try {
      setLoading(true);

      // 1. Validar Autenticação e Perfil Primeiro
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const { data: profile } = await supabase
        .from('usuarios')
        .select('nome, cargo, is_super_admin, empresa_id')
        .eq('id', user.id)
        .maybeSingle();

      if (profile?.is_super_admin) {
        router.push('/painel-gestor-helpe');
        return;
      }

      const empresaId = profile?.empresa_id;
      if (!empresaId) {
        // Usuário sem empresa, não pode carregar os dados
        setLoading(false);
        return;
      }

      if (profile) {
        setUserProfile({ ...profile, id: user.id });
      } else {
        setUserProfile({
          id: user.id,
          nome: user.user_metadata?.nome || 'Administrador',
          cargo: user.user_metadata?.is_super_admin ? 'Super Admin' : 'Gestor SaaS'
        });
      }

      // A) Carregar Pedidos
      const { data: dbPedidos } = await supabase
        .from('pedidos')
        .select('*, clientes(razao_social), ordens_producao(*, skus(*, familias_produto(*)))')
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });

      const mappedOrders: Order[] = (dbPedidos || []).map((ped: any) => {
        const items = (ped.ordens_producao || []).map((op: any, index: number) => ({
          itemNum: (index + 1).toString().padStart(2, '0'),
          product: op.skus?.familias_produto?.nome || 'Desconhecido',
          measure: op.skus?.comprimento_mm ? `${op.skus?.comprimento_mm}mm` : 'Medida',
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
          clientId: ped.cliente_id,
          clientName: ped.clientes?.razao_social || 'Cliente Não Informado',
          location: ped.localizacao || 'Planta Principal',
          emissionDate: new Date(ped.data_emissao).toLocaleDateString('pt-BR'),
          deliveryDate: ped.data_entrega ? new Date(ped.data_entrega).toISOString().split('T')[0] : '',
          status: ped.status || 'ATIVO',
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

      // B) Carregar Fornecedores e seu histórico de entradas
      const { data: dbSuppliers } = await supabase
        .from('fornecedores')
        .select('*, entradas_estoque!entradas_estoque_fornecedor_id_fkey(*, insumos(nome))')
        .eq('empresa_id', empresaId)
        .order('nome');

      const mappedSuppliers: Supplier[] = (dbSuppliers || []).map((sup: any) => {
        const history = (sup.entradas_estoque || []).map((entrada: any) => ({
          id: entrada.id,
          date: new Date(entrada.data_prevista).toLocaleDateString('pt-BR'),
          item: entrada.insumos?.nome || 'Insumo',
          amount: `${entrada.quantidade} unid`,
          value: (entrada.quantidade * entrada.preco_unitario).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          status: entrada.status === 'ENTREGUE' ? 'Concluído' : entrada.status === 'PENDENTE' ? 'Pendente' : 'Atrasado'
        }));

        return {
          id: sup.id,
          name: sup.nome,
          cnpj: sup.cnpj || '',
          IE: sup.ie || 'Isento',
          categories: parseDbCategories(sup.categoria),
          rating: sup.rating || 90,
          status: sup.status || 'Em Homologação',
          contact: sup.contato_nome || '',
          contactEmail: sup.contato_email || sup.email || '',
          lastDelivery: sup.last_delivery || 'Recém Cadastrado',
          address: sup.endereco || '',
          logo: sup.logo,
          limit: Number(sup.limite_financeiro) || 250000,
          auditDate: sup.audit_date || new Date(sup.created_at).toLocaleDateString('pt-BR'),
          paymentTerm: sup.payment_term || '30 Dias',
          currency: sup.currency || 'BRL',
          documents: sup.documents || [],
          possui_linha_lavagem: undefined, // Removed
          passa_triagem: sup.passa_triagem || false,
          extraido_rotulo: sup.extraido_rotulo || false,
          moagem_inicia_lavagem: sup.moagem_inicia_lavagem || false,
          lavagem_a_seco: sup.lavagem_a_seco || false,
          possui_lavadora: sup.possui_lavadora || false,
          possui_tanque_decantacao: sup.possui_tanque_decantacao || false,
          possui_secadora: sup.possui_secadora || false,
          possui_sopro_silo_bag: sup.possui_sopro_silo_bag || false,
          history: history
        };
      });

      setSuppliers(mappedSuppliers);

      // C) Carregar Turno Ativo Mais Recente
      const { data: activeTurno } = await supabase
        .from('turnos')
        .select('*, turnos_operadores(funcionarios(nome))')
        .eq('empresa_id', empresaId)
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
        .eq('empresa_id', empresaId)
        .lt('estoque_atual', 500);

      setLowStockCount(dbLowStockCount || 0);

      // F) Carregar SKUs
      const { data: skusData } = await supabase
        .from('skus')
        .select('id, codigo, comprimento_mm')
        .eq('empresa_id', empresaId)
        .is('deleted_at', null)
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

  // RBAC Redirect Logic
  useEffect(() => {
    if (loading || isPermissionsLoading) return;

    const checkAccess = () => {
      // Map currentScreen to its base permission key
      let requiredPermission: keyof import('../types').PermissoesUsuario | null = null;
      
      switch(currentScreen) {
        case 'dashboard': requiredPermission = 'dashboard'; break;
        case 'estoque': requiredPermission = 'estoque'; break;
        case 'pedidos': 
        case 'pedido-detail': 
        case 'novo-pedido': requiredPermission = 'pedidos'; break;
        case 'apontamento': requiredPermission = 'apontamento'; break;
        case 'reprogramacao': requiredPermission = 'reprogramacao'; break;
        case 'fornecedores':
        case 'fornecedor-cadastro':
        case 'fornecedor-detail': requiredPermission = 'fornecedores'; break;
        case 'funcionarios': requiredPermission = 'funcionarios'; break;
        case 'materias-primas': requiredPermission = 'materias-primas'; break;
        case 'familias-skus': requiredPermission = 'familias-skus'; break;
        case 'bom-formulas': requiredPermission = 'bom-formulas'; break;
        case 'arquivos': requiredPermission = 'arquivos'; break;
        case 'configuracoes': requiredPermission = 'configuracoes'; break;
        case 'acessos': requiredPermission = 'acessos'; break;
        case 'clientes': requiredPermission = 'clientes'; break;
        case 'financeiro': requiredPermission = 'financeiro'; break;
        case 'formacao-preco': requiredPermission = 'formacao-preco'; break;
        case 'sem-acesso': return; // Skip verification for the fallback screen
        default: requiredPermission = null; break;
      }

      if (requiredPermission && !canAccess(requiredPermission)) {
        addToast('Acesso Negado: Você não tem permissão para acessar esta tela.', 'error');
        
        // Find the first screen they CAN access to prevent loop
        const availableScreens: Array<keyof import('../types').PermissoesUsuario> = [
          'dashboard', 'estoque', 'pedidos', 'apontamento', 'reprogramacao', 
          'fornecedores', 'funcionarios', 'materias-primas', 'familias-skus',
          'bom-formulas', 'arquivos', 'configuracoes', 'acessos', 'clientes', 
          'financeiro', 'formacao-preco', 'novo-pedido'
        ];
        
        const firstAvailable = availableScreens.find(screen => canAccess(screen));
        
        if (firstAvailable) {
          setCurrentScreen(firstAvailable as string);
        } else {
          // Fallback if absolutely no screen is accessible
          setCurrentScreen('sem-acesso');
        }
      }
    };

    checkAccess();
  }, [currentScreen, permissions, isPermissionsLoading, loading]);

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
      case 'estoque':
        setTriggerAddEstoque(prev => prev + 1);
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
    setCurrentScreen('novo-pedido');
  };

  const handleOrderCreatedSuccess = async (createdOrderCode: string) => {
    await fetchData();
    setCurrentScreen('pedidos');
    addToast(`Pedido ${createdOrderCode} criado e enviado para análise financeira.`, 'success');
  };



  const handleFinishOrder = async (orderId: string) => {
    const { error } = await supabase.from('pedidos').update({ status: 'FINALIZADO' }).eq('codigo', orderId);
    if (error) {
      addToast('Erro ao finalizar pedido: ' + error.message, 'error');
      return;
    }
    await fetchData();
    setCurrentScreen('pedidos');
  };

  const handleDeleteOrder = async (order: Order) => {
    const confirmDelete = window.confirm(`Tem certeza que deseja excluir o pedido ${order.id}? Esta ação não pode ser desfeita e será registrada.`);
    if (!confirmDelete) return;

    const { data: { user } } = await supabase.auth.getUser();
    const userEmail = user?.email || 'Desconhecido';

    // Registra log de exclusão
    await supabase.from('log_exclusao_pedidos').insert({
      pedido_codigo: order.id,
      pedido_nome_cliente: order.clientName,
      usuario_email: userEmail
    });

    // Exclui pedido
    const { error } = await supabase.from('pedidos').delete().eq('codigo', order.id);
    if (error) {
      addToast('Erro ao excluir pedido: ' + error.message, 'error');
      return;
    }

    await fetchData();
    setCurrentScreen('pedidos');
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
        passa_triagem: newSupplier.passa_triagem,
        extraido_rotulo: newSupplier.extraido_rotulo,
        moagem_inicia_lavagem: newSupplier.moagem_inicia_lavagem,
        lavagem_a_seco: newSupplier.lavagem_a_seco,
        possui_lavadora: newSupplier.possui_lavadora,
        possui_tanque_decantacao: newSupplier.possui_tanque_decantacao,
        possui_secadora: newSupplier.possui_secadora,
        possui_sopro_silo_bag: newSupplier.possui_sopro_silo_bag,
        documents: newSupplier.documents,
        history: newSupplier.history
      });

    if (error) {
      addToast(`Erro ao salvar fornecedor: ${error.message}`, 'error');
    } else {
      await fetchData();
    }
  };

  const handleUpdateSupplier = async (updatedSupplier: Supplier) => {

    const { error } = await supabase
      .from('fornecedores')
      .update({
        nome: updatedSupplier.name,
        cnpj: updatedSupplier.cnpj,
        ie: updatedSupplier.IE,
        categoria: updatedSupplier.categories,
        contato_nome: updatedSupplier.contact,
        contato_email: updatedSupplier.contactEmail,
        endereco: updatedSupplier.address,
        rating: updatedSupplier.rating,
        status: updatedSupplier.status,
        limite_financeiro: updatedSupplier.limit,
        logo: updatedSupplier.logo,
        audit_date: updatedSupplier.auditDate,
        payment_term: updatedSupplier.paymentTerm,
        currency: updatedSupplier.currency,
        passa_triagem: updatedSupplier.passa_triagem,
        extraido_rotulo: updatedSupplier.extraido_rotulo,
        moagem_inicia_lavagem: updatedSupplier.moagem_inicia_lavagem,
        lavagem_a_seco: updatedSupplier.lavagem_a_seco,
        possui_lavadora: updatedSupplier.possui_lavadora,
        possui_tanque_decantacao: updatedSupplier.possui_tanque_decantacao,
        possui_secadora: updatedSupplier.possui_secadora,
        possui_sopro_silo_bag: updatedSupplier.possui_sopro_silo_bag,
        documents: updatedSupplier.documents,
        history: updatedSupplier.history
      })
      .eq('id', updatedSupplier.id);

    if (error) {
      addToast(`Erro ao atualizar fornecedor: ${error.message}`, 'error');
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

  const handleGerarPedidoCliente = (clienteId: string, clienteNome: string) => {
    setPreSelectedClientId(clienteId);
    setCurrentScreen('dashboard');
    setIsAddOrderModalOpen(true);
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
        return <EstoqueScreen 
          triggerAddNew={triggerAddEstoque} 
          tourDemoMode={tourDemoMode}
          onGoToSupplier={(id, name) => {
            setGlobalSearch(name);
            setCurrentScreen('fornecedores');
          }}
        />;

      case 'pedidos':
        return (
          <div className="space-y-6">
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs">
              <div className="flex justify-between items-center border-b border-surface-container pb-4 mb-4">
                <div>
                  <h3 className="text-base font-bold text-primary">Listagem Geral de Pedidos / OPs</h3>
                  <p className="text-xs text-outline">Selecione uma carteira ativa abaixo para detalhar a ficha técnica</p>
                </div>
                <div className="flex gap-4">
                  <div className="flex gap-2">
                    <button
                      onClick={() => setActiveOrdersTab('ATIVOS')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        activeOrdersTab === 'ATIVOS' ? 'bg-secondary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      Ativos
                    </button>
                    <button
                      onClick={() => setActiveOrdersTab('FINALIZADOS')}
                      className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                        activeOrdersTab === 'FINALIZADOS' ? 'bg-secondary text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      Finalizados
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {orders.filter(o => activeOrdersTab === 'ATIVOS' ? (o.status === 'ATIVO' || o.status === 'AGUARDANDO_APROVACAO') : o.status === 'FINALIZADO').map(order => (
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
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-sm font-black text-primary">{order.id}</span>
                          {order.status === 'AGUARDANDO_APROVACAO' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-yellow-50 border border-yellow-300 text-yellow-800 uppercase animate-pulse">
                              Aguardando Aprovação
                            </span>
                          ) : order.status === 'ATIVO' ? (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-green-50 border border-green-300 text-green-800 uppercase">
                              Em Produção
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-black bg-gray-50 border border-gray-300 text-gray-800 uppercase">
                              Finalizado
                            </span>
                          )}
                        </div>
                        {order.deliveryDate ? (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-secondary-container text-on-secondary-container flex items-center gap-1">
                            <span className="material-symbols-outlined text-[10px]">calendar_today</span>
                            {order.deliveryDate.split('-').reverse().join('/')}
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-sm text-[10px] font-bold bg-surface-container-high">
                            Sem Data
                          </span>
                        )}
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
            onFinishOrder={handleFinishOrder}
            onDeleteOrder={handleDeleteOrder}
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
            externalSearchQuery={globalSearch}
            tourDemoMode={tourDemoMode}
          />
        );

      case 'funcionarios':
        return <Funcionarios triggerAddNew={triggerAddEmployee} />;

      case 'materias-primas':
        return <MateriasPrimas suppliers={suppliers} triggerAddNew={triggerAddMaterial} tourDemoMode={tourDemoMode} />;

      case 'familias-skus':
        return <FamiliasSkusScreen triggerAddNew={triggerAddFamily} tourDemoMode={tourDemoMode} />;

      case 'bom-formulas':
        return <BOMScreen tourDemoMode={tourDemoMode} />;

      case 'arquivos':
        return <ArquivosScreen />;

      case 'configuracoes':
        return <ConfiguracoesScreen />;

      case 'acessos':
        return <ControleAcessos />;

      case 'clientes':
        return <ClientesScreen onGerarPedido={handleGerarPedidoCliente} tourDemoMode={tourDemoMode} />;

      case 'financeiro':
        return <FinanceiroScreen />;

      case 'novo-pedido':
        return (
          <NovoPedidoScreen
            onAbrirCalculadora={(items) => {
              setCalculatorInitialItems(items);
              setCurrentScreen('formacao-preco');
            }}
            onFaturar={async (items) => {
              const { count } = await supabase.from('pedidos').select('*', { count: 'exact', head: true });
              const nextCode = `PED-2026-${String((count || 0) + 1).padStart(3, '0')}`;
              setNewOrderCode(nextCode);
              setPreSelectedItems(items);
              setIsAddOrderModalOpen(true);
            }}
          />
        );

      case 'formacao-preco':
        return (
          <FormacaoPrecoScreen
            initialItems={calculatorInitialItems}
            tourDemoMode={tourDemoMode}
            onAbrirPedidoSimulado={async (items) => {
              const { count } = await supabase.from('pedidos').select('*', { count: 'exact', head: true });
              const nextCode = `PED-2026-${String((count || 0) + 1).padStart(3, '0')}`;
              setNewOrderCode(nextCode);
              setPreSelectedItems(items);
              setIsAddOrderModalOpen(true);
            }}
            onBack={() => setCurrentScreen('novo-pedido')}
          />
        );

      case 'sem-acesso':
        return (
          <div className="p-12 flex flex-col items-center justify-center text-center space-y-4 h-[60vh]">
            <span className="material-symbols-outlined notranslate text-[80px] text-red-500 opacity-80">gpp_bad</span>
            <h2 className="text-3xl font-black text-on-surface">Acesso Negado</h2>
            <p className="text-outline text-lg max-w-md">Sua conta não possui permissões configuradas para acessar os módulos do sistema. Por favor, entre em contato com seu gestor de TI.</p>
          </div>
        );

      default:
        return (
          <div className="p-12 text-center text-outline">
            Selecione uma opção válida no menu lateral esquerda.
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex w-full bg-background">
        <LoadingOverlay message="Carregando Módulos Operacionais..." />
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
        userId={userProfile?.id}
      />

      {/* Main workspace box */}
      <main className="flex-1 min-h-screen flex flex-col bg-background relative overflow-y-auto">
        <TopAppBar
          currentScreen={currentScreen}
          setCurrentScreen={setCurrentScreen}
          onSearch={(query) => {
            setGlobalSearch(query);
          }}
          onStartTour={() => tourRef.current?.startTour()}
        />

        {/* Workspace body */}
        <div className="flex-1 p-8 overflow-y-auto w-full max-w-7xl mx-auto space-y-6">
          {renderActiveScreen()}
        </div>
        
        <Footer />
      </main>

      {/* ================= MODAL DE CADASTRO DE NOVO PEDIDO ================= */}
      <NewOrderModal
        isOpen={isAddOrderModalOpen}
        onClose={() => {
          setIsAddOrderModalOpen(false);
          setPreSelectedClientId(undefined);
          setPreSelectedItems(undefined);
        }}
        onSuccess={handleOrderCreatedSuccess}
        empresaId={userProfile?.empresa_id || ''}
        initialCode={newOrderCode}
        preSelectedClientId={preSelectedClientId}
        preSelectedItems={preSelectedItems}
        tourDemoMode={tourDemoMode}
      />

      {/* ================= TOUR INTERATIVO PARA AVALIADORES ================= */}
      <InteractiveTour
        ref={tourRef}
        currentScreen={currentScreen}
        setCurrentScreen={setCurrentScreen}
        setIsAddingNewSupplier={setIsAddingNewSupplier}
        setTriggerAddMaterial={setTriggerAddMaterial}
        setTriggerAddFamily={setTriggerAddFamily}
        setTriggerAddEstoque={setTriggerAddEstoque}
        setIsAddOrderModalOpen={setIsAddOrderModalOpen}
        tourDemoMode={tourDemoMode}
        setTourDemoMode={setTourDemoMode}
      />
    </div>
  );
}

