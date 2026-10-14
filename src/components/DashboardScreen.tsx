"use client"

import React, { useState, useEffect } from 'react';
import { Order, DailyProductionSetup } from '../types';
import { createClient } from '../utils/supabase/client';
import LoadingOverlay from './LoadingOverlay';
import { useToast } from '../contexts/ToastContext';

interface DashboardScreenProps {
  orders: Order[];
  currentSetup: DailyProductionSetup | null;
  onSelectOrder: (orderId: string) => void;
  setCurrentScreen: (screen: string) => void;
  userName?: string;
  lowStockCount?: number;
}

interface DBOP {
  id: string;
  sku_id: string;
  quantidade_planejada: number;
  quantidade_produzida: number;
  status: string;
  skus: {
    id: string;
    codigo: string;
    comprimento_mm: number;
    desconto_aco_mm: number;
    familia_id: string;
    familias_produto: {
      id: string;
      nome: string;
      area_secao_externa: number;
      densidade_g_cm3: number;
    };
  };
  pedidos?: {
    codigo: string;
    clientes?: {
      razao_social: string;
    }
  };
}

interface DBInsumo {
  id: string;
  nome: string;
  categoria: 'ACO' | 'QUIMICO' | 'POLIMERO' | 'EMBALAGEM' | 'OUTROS';
  unidade_medida: string;
  estoque_atual: number;
  bitola_mm?: number | string | null;
  peso_nominal_kg_m?: number | string | null;
}

interface DBBOM {
  id: string;
  familia_id: string;
  insumo_id: string;
  quantidade_por_unidade: number;
  percentual_blend: number | null;
}

interface HomologadoSupplier {
  id: string;
  fornecedor_id: string;
  fornecedores: {
    nome: string;
    rating: number;
  };
}

export default function DashboardScreen({
  orders,
  currentSetup,
  onSelectOrder,
  setCurrentScreen,
  userName,
  lowStockCount: initialLowStockCount = 0
}: DashboardScreenProps) {
  const { addToast } = useToast();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  
  // Dados dinâmicos do Banco
  const [dbOPs, setDbOPs] = useState<DBOP[]>([]);
  const [dbInsumos, setDbInsumos] = useState<DBInsumo[]>([]);
  const [dbBOMs, setDbBOMs] = useState<DBBOM[]>([]);

  // Estados do Modal de Ordem de Compra
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [purchaseInsumo, setPurchaseInsumo] = useState<DBInsumo | null>(null);
  const [purchaseQuantity, setPurchaseQuantity] = useState(0);
  const [homologatedSuppliers, setHomologatedSuppliers] = useState<HomologadoSupplier[]>([]);
  const [selectedSupplierName, setSelectedSupplierName] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Carregar dados principais
  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // A) Buscar OPs ativas ou planejadas
      const { data: opsData } = await supabase
        .from('ordens_producao')
        .select(`
          id,
          sku_id,
          quantidade_planejada,
          quantidade_produzida,
          status,
          skus (
            id,
            codigo,
            comprimento_mm,
            desconto_aco_mm,
            familia_id,
            familias_produto (
              id,
              nome,
              area_secao_externa,
              densidade_g_cm3
            )
          ),
          pedidos (
            codigo,
            clientes (razao_social)
          )
        `)
        .in('status', ['ABERTA', 'EM_ANDAMENTO']);

      // B) Buscar estoque atual de insumos
      const { data: insumosData } = await supabase
        .from('insumos')
        .select('*')
        .order('nome');

      // C) Buscar BOM receitas
      const { data: bomData } = await supabase
        .from('bom')
        .select('*');

      if (opsData) setDbOPs(opsData as any);
      if (insumosData) setDbInsumos(insumosData as any);
      if (bomData) setDbBOMs(bomData as any);
    } catch (err) {
      console.error('Erro ao carregar dados do painel:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  // --- CÁLCULOS DO MRP I (Explosão de Necessidades Líquidas) ---
  const getMRPCalculations = () => {
    const requirements: Record<string, { insumo: DBInsumo; totalRequired: number }> = {};

    // Inicializar requirements com estoque atual de cada insumo
    dbInsumos.forEach(ins => {
      requirements[ins.id] = { insumo: ins, totalRequired: 0 };
    });

    // Calcular requisitos para cada OP ativa
    dbOPs.forEach(op => {
      if (!op.skus || !op.skus.familias_produto) return;
      
      const qtyToProduce = Math.max(0, op.quantidade_planejada - op.quantidade_produzida);
      if (qtyToProduce <= 0) return;

      const sku = op.skus;
      const fam = sku.familias_produto;

      // Volume geométrico de plástico:
      // O volume de aço ocupado dentro da peça precisa considerar a quantidade de hastes se a família tiver aço
      const familyBOMs = dbBOMs.filter(b => b.familia_id === fam.id);
      
      let qtdHastesAco = 1;
      let areaSecaoAcoM2 = 0;
      const acoBom = familyBOMs.find(b => {
        const ins = requirements[b.insumo_id]?.insumo;
        return ins && ins.categoria === 'ACO';
      });
      if (acoBom) {
        qtdHastesAco = acoBom.quantidade_por_unidade || 1;
        const insumoAco = requirements[acoBom.insumo_id]?.insumo;
        if (insumoAco && insumoAco.bitola_mm) {
          const radiusM = (Number(insumoAco.bitola_mm) / 1000.0) / 2.0;
          areaSecaoAcoM2 = Math.PI * Math.pow(radiusM, 2);
        }
      }

      const volAcoTotal = areaSecaoAcoM2 * ((sku.comprimento_mm - (sku.desconto_aco_mm || 70)) / 1000.0) * qtdHastesAco * qtyToProduce;
      const volPlasticoLiquido = (fam.area_secao_externa * (sku.comprimento_mm / 1000.0) * qtyToProduce) - volAcoTotal;
      const volumeM3 = volPlasticoLiquido < 0 ? 0 : volPlasticoLiquido;
      
      // Massa do blend plástico (kg):
      const massaPlasticoKg = volumeM3 * (fam.densidade_g_cm3 * 1000.0);


      familyBOMs.forEach(bom => {
        if (!requirements[bom.insumo_id]) return;

        const reqObj = requirements[bom.insumo_id];
        if (reqObj.insumo.categoria === 'ACO') {
          const acoMetrosHaste = ((sku.comprimento_mm - (sku.desconto_aco_mm || 70)) / 1000.0) * (bom.quantidade_por_unidade || 1) * qtyToProduce;
          const pesoNominal = Number(reqObj.insumo.peso_nominal_kg_m || 0.395);
          reqObj.totalRequired += acoMetrosHaste * pesoNominal;
        } else if (reqObj.insumo.categoria === 'QUIMICO') {
          reqObj.totalRequired += (massaPlasticoKg / 1000.0) * (bom.quantidade_por_unidade / 1000.0);
        } else if (reqObj.insumo.categoria === 'POLIMERO') {
          reqObj.totalRequired += bom.quantidade_por_unidade * massaPlasticoKg;
        } else {
          // Embalagens, etc
          reqObj.totalRequired += bom.quantidade_por_unidade * qtyToProduce;
        }
      });
    });

    return Object.values(requirements);
  };

  const mrpList = getMRPCalculations();

  // Verificação de Rombo de Estoque
  const hasMRPAlert = mrpList.some(item => item.insumo.estoque_atual < item.totalRequired);
  const lowStockCount = mrpList.filter(item => item.insumo.estoque_atual < 500).length;

  // KPIs Zona 1
  const carteiraVendasPecas = dbOPs.reduce((sum, op) => sum + (op.quantidade_planejada - op.quantidade_produzida), 0);
  const volumeEstoqueToneladas = dbInsumos
    .filter(i => i.categoria === 'ACO' || i.categoria === 'QUIMICO')
    .reduce((sum, i) => sum + (Number(i.estoque_atual) / 1000.0), 0);

  // Abertura de Modal de Ordem de Compra
  const handleOpenPurchaseModal = async (insumo: DBInsumo, requiredAmount: number) => {
    const deficit = Math.max(0, requiredAmount - insumo.estoque_atual);
    // Sugere Déficit + 10% de margem de segurança
    const suggested = Math.ceil(deficit * 1.1);

    setPurchaseInsumo(insumo);
    setPurchaseQuantity(suggested);

    // Buscar fornecedores homologados para o insumo
    const { data: supData } = await supabase
      .from('fornecedores_insumos')
      .select(`
        id,
        fornecedor_id,
        fornecedores (
          nome,
          rating
        )
      `)
      .eq('insumo_id', insumo.id);

    if (supData) {
      setHomologatedSuppliers(supData as any);
      if (supData.length > 0 && (supData[0] as any).fornecedores) {
        setSelectedSupplierName((supData[0] as any).fornecedores.nome);
      } else {
        setSelectedSupplierName('');
      }
    } else {
      setHomologatedSuppliers([]);
      setSelectedSupplierName('');
    }

    // Set default delivery date (+7 days)
    const future = new Date();
    future.setDate(future.getDate() + 7);
    setDeliveryDate(future.toISOString().split('T')[0]);

    setIsPurchaseModalOpen(true);
  };

  // Salvar Ordem de Compra
  const handleSavePurchaseOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!purchaseInsumo || !selectedSupplierName) return;

    setActionLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
      const empresaId = profile?.empresa_id;
      if (!empresaId) return;

      const { error } = await supabase
        .from('ordens_compra')
        .insert({
          empresa_id: empresaId,
          fornecedor: selectedSupplierName,
          insumo_id: purchaseInsumo.id,
          quantidade_pedida: purchaseQuantity,
          status: 'PENDENTE',
          data_entrega_prevista: deliveryDate ? new Date(deliveryDate).toISOString() : null
        });

      if (error) {
        addToast(`Erro ao criar ordem de compra: ${error.message}`, 'error');
      } else {
        addToast(`Ordem de compra emitida com sucesso para o fornecedor: ${selectedSupplierName}!`, 'success');
        setIsPurchaseModalOpen(false);
        await loadDashboardData();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && dbOPs.length === 0) {
    return (
      <div className="flex items-center justify-center p-12 text-outline font-bold">
        Sincronizando painel PCP/MRP...
      </div>
    );
  }

  return (
    <div className="space-y-6 relative">
      {/* Welcome Banner / Overview */}
      <div className="bg-primary-container text-on-primary-container p-6 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-outline-variant shadow-xs">
        <div>
          <h3 className="text-xl font-bold tracking-tight">Bem-vindo ao KORE INDUSTRIAL, {userName || 'Operador'}</h3>
          <p className="text-sm text-on-primary-container/85 mt-1 leading-relaxed">
            Planta de Coextrusão Ativa. Visualização integrada de PCP/MRP para gestão e controle de estoque de fábrica.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setCurrentScreen('pedidos')}
            className="bg-secondary text-white hover:brightness-95 font-bold text-xs px-5 py-3 rounded-lg flex items-center gap-1.5 cursor-pointer shadow-xs border border-transparent"
          >
            <span className="material-symbols-outlined notranslate text-[18px]">production_quantity_limits</span>
            VER PEDIDOS
          </button>
        </div>
      </div>

      {/* ZONA 1: KPIs Estratégicos (Módulo 1) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* KPI 1: Carteira de Vendas */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-tertiary-fixed text-primary shrink-0">
            <span className="material-symbols-outlined notranslate text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              shopping_cart
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Carteira de Vendas</span>
            <p className="text-2xl font-black text-primary">{carteiraVendasPecas.toLocaleString()} <span className="text-xs font-semibold text-outline">pcs</span></p>
            <p className="text-[10px] text-on-tertiary-container font-semibold mt-0.5">Demanda líquida pendente</p>
          </div>
        </div>

        {/* KPI 2: Volume de Estoque - Blend */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-4">
          <div className="p-3 rounded-xl bg-surface-container-high text-primary shrink-0">
            <span className="material-symbols-outlined notranslate text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              layers
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Estoque de Blend</span>
            <p className="text-2xl font-black text-primary font-mono">{volumeEstoqueToneladas.toFixed(2)} t</p>
            <p className="text-[10px] text-outline mt-0.5">Aço e Químicos cadastrados</p>
          </div>
        </div>

        {/* KPI 3: Alerta de MRP */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-4">
          <div className={`p-3 rounded-xl shrink-0 ${hasMRPAlert ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
            <span className="material-symbols-outlined notranslate text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              {hasMRPAlert ? 'report' : 'check_circle'}
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider">Alerta de MRP</span>
            <p className="text-2xl font-black text-primary">{hasMRPAlert ? 'Déficit' : 'Suprido'}</p>
            <p className={`text-[10px] font-semibold mt-0.5 ${hasMRPAlert ? 'text-red-600' : 'text-green-600'}`}>
              {hasMRPAlert ? 'Necessidades não cobertas' : 'Estoque cobre demandas'}
            </p>
          </div>
        </div>

        {/* KPI 4: Ordens em Produção */}
        <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex items-center gap-4">
          <div className="bg-surface-container-high text-primary p-3 rounded-xl shrink-0">
            <span className="material-symbols-outlined notranslate text-[28px]" style={{ fontVariationSettings: "'FILL' 1" }}>
              precision_manufacturing
            </span>
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-outline tracking-wider">OPs Ativas</span>
            <p className="text-2xl font-black text-primary">{dbOPs.filter(o => o.status === 'EM_ANDAMENTO').length}</p>
            <p className="text-[10px] text-outline mt-0.5">Ordens em execução</p>
          </div>
        </div>

      </div>

      {/* GRID DE TRABALHO: ZONA 2 (MRP I) & ZONA 3 (Bateladas) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* ZONA 2: Tabela do MRP I - Left span-8 block */}
        <div className="lg:col-span-8 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <div>
            <h4 className="text-sm font-black text-primary uppercase tracking-wider">Zona 2: Tabela de Necessidades MRP I</h4>
            <p className="text-xs text-outline mt-0.5">Balizamento de demandas físicas projetadas das OPs ativas vs. saldos em estoque</p>
          </div>

          <div className="overflow-hidden rounded-xl border border-outline-variant/60">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-surface-container-low font-bold text-[#74777f] uppercase text-[9px] tracking-wider border-b border-outline-variant">
                  <th className="p-3">Matéria-Prima</th>
                  <th className="p-3 text-center">Exigido OPs</th>
                  <th className="p-3 text-center">Disponível</th>
                  <th className="p-3 text-center">Status MRP</th>
                  <th className="p-3 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {mrpList.map(item => {
                  const hasDeficit = item.insumo.estoque_atual < item.totalRequired;
                  return (
                    <tr key={item.insumo.id} className="hover:bg-surface-container-low/40">
                      <td className="p-3 font-bold text-primary">{item.insumo.nome}</td>
                      <td className="p-3 text-center font-mono font-bold text-outline">
                        {item.totalRequired.toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.insumo.unidade_medida}
                      </td>
                      <td className="p-3 text-center font-mono font-bold">
                        {Number(item.insumo.estoque_atual).toLocaleString(undefined, { maximumFractionDigits: 2 })} {item.insumo.unidade_medida}
                      </td>
                      <td className="p-3 text-center">
                        <span className={`px-2 py-0.5 rounded-sm font-black text-[9px] uppercase tracking-wide ${
                          hasDeficit ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                        }`}>
                          {hasDeficit ? 'Déficit' : 'Suprido'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        {hasDeficit ? (
                          <button
                            onClick={() => handleOpenPurchaseModal(item.insumo, item.totalRequired)}
                            className="bg-secondary text-white hover:bg-secondary/95 px-2.5 py-1.5 rounded-md text-[10px] font-bold cursor-pointer transition-colors"
                          >
                            Gerar Ordem
                          </button>
                        ) : (
                          <span className="text-outline text-[10px] font-semibold">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* ZONA 3: Status do Chão de Fábrica (Progresso de Batelada) - Right span-4 block */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
            <div>
              <h4 className="text-xs font-black text-primary uppercase tracking-wider">Zona 3: Progresso de Batelada</h4>
              <p className="text-[10px] text-outline mt-0.5">Acompanhamento de metas de produção física em tempo real</p>
            </div>
            
            <div className="space-y-4">
              {dbOPs.map(op => {
                const progress = op.quantidade_planejada > 0 
                  ? Math.round((op.quantidade_produzida / op.quantidade_planejada) * 100) 
                  : 0;

                const remPieces = Math.max(0, op.quantidade_planejada - op.quantidade_produzida);
                let targetDateStr = 'Concluído';
                
                if (remPieces > 0) {
                  // Estimativa matemática: 25 peças por hora, turno de 12 horas por dia (300 peças/dia)
                  const daysNeeded = Math.ceil(remPieces / 300);
                  const targetDate = new Date();
                  targetDate.setDate(targetDate.getDate() + daysNeeded);
                  targetDateStr = targetDate.toLocaleDateString('pt-BR');
                }

                return (
                  <div key={op.id} className="space-y-1.5 border-b pb-3 last:border-0 last:pb-0">
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-mono font-bold text-primary">{op.pedidos?.codigo} - {op.pedidos?.clientes?.razao_social || 'Cliente Não Informado'}</span>
                      <span className="text-[10px] bg-surface-container text-outline px-1.5 py-0.2 rounded font-bold uppercase">
                        {op.status === 'EM_ANDAMENTO' ? 'Em Execução' : 'Pendente'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-[11px] text-outline">
                      <span>Item: {op.skus?.familias_produto?.nome} - {op.skus?.comprimento_mm}mm</span>
                      <span className="font-bold text-primary font-mono">{op.quantidade_produzida} / {op.quantidade_planejada} un</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <div className="w-full bg-surface-container-high h-2 rounded-full overflow-hidden">
                        <div className="bg-[#002046] h-full" style={{ width: `${progress}%` }} />
                      </div>
                      <span className="font-mono font-bold text-secondary text-xs">{progress}%</span>
                    </div>

                    <div className="flex justify-between items-center text-[10px] text-outline-variant bg-surface-container-low px-2 py-1 rounded">
                      <span className="font-bold uppercase tracking-wider text-[9px] text-outline">Previsão Fechamento:</span>
                      <span className="font-mono font-bold text-primary">{targetDateStr}</span>
                    </div>
                  </div>
                );
              })}
              {dbOPs.length === 0 && (
                <p className="text-xs text-outline text-center py-6">Nenhuma Ordem de Produção ativa no momento.</p>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* ================= MODAL DE GERAR ORDEM DE COMPRA (ZONA 2) ================= */}
      {isPurchaseModalOpen && purchaseInsumo && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <form onSubmit={handleSavePurchaseOrder} className="bg-white max-w-md w-full rounded-2xl shadow-2xl p-6 border border-outline-variant space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black text-primary uppercase flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-[18px]">shopping_bag</span>
                Sugerir Compra de Insumo
              </h3>
              <button 
                type="button" 
                onClick={() => setIsPurchaseModalOpen(false)}
                className="text-outline hover:text-primary transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined notranslate">close</span>
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <span className="block text-[10px] font-bold text-outline uppercase">Matéria-Prima Solicitada</span>
                <span className="font-bold text-primary text-sm">{purchaseInsumo.nome}</span>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-outline uppercase mb-1">Quantidade Sugerida (Déficit + 10%)</label>
                <div className="relative">
                  <input
                    type="number"
                    required
                    value={purchaseQuantity}
                    onChange={(e) => setPurchaseQuantity(Number(e.target.value))}
                    className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2.5 font-bold focus:outline-none focus:ring-1 focus:ring-secondary"
                  />
                  <span className="absolute right-3 top-2.5 text-outline font-bold">{purchaseInsumo.unidade_medida}</span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-outline uppercase mb-1">Fornecedores Homologados</label>
                <select
                  required
                  value={selectedSupplierName}
                  onChange={(e) => setSelectedSupplierName(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2.5 font-semibold focus:outline-none focus:ring-1 focus:ring-secondary"
                >
                  {homologatedSuppliers.length === 0 ? (
                    <option value="">Nenhum fornecedor cadastrado...</option>
                  ) : (
                    homologatedSuppliers.map(sup => (
                      <option key={sup.id} value={sup.fornecedores?.nome}>
                        {sup.fornecedores?.nome} (Rating: {sup.fornecedores?.rating}/100)
                      </option>
                    ))
                  )}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-outline uppercase mb-1">Previsão de Entrega</label>
                <input
                  type="date"
                  required
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-surface-container-low border border-outline-variant rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-secondary font-semibold"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-outline-variant">
              <button
                type="button"
                onClick={() => setIsPurchaseModalOpen(false)}
                className="bg-surface-container hover:bg-surface-container-high text-primary font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="bg-secondary hover:brightness-95 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer"
              >
                {actionLoading ? 'Registrando Ordem...' : 'Emitir Ordem de Compra'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
