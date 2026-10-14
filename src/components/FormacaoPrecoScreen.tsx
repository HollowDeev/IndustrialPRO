"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../contexts/PermissionsContext';
import LoadingOverlay from './LoadingOverlay';
import { CustoFixo, PrecificacaoParametros, EstadoTributo } from '../types';

export interface SimulatedOrderItem {
  skuId: string;
  skuCodigo: string;
  quantidade: number;
  precoVenda: number;
  comissaoPercentual: number;
  fixedCostAlocado: number;
}

interface FormacaoPrecoScreenProps {
  onAbrirPedidoSimulado: (items: SimulatedOrderItem[]) => void;
  onBack?: () => void;
  initialItems?: SimulatedOrderItem[];
}

export const calculatePreviewCustoBase = (
  familia: any,
  comprimento_mm: number,
  desconto_aco_mm: number,
  localBoms: any[],
  localInsumos: any[]
) => {
  if (!familia) return 0;
  const recipe = localBoms.filter(b => b.familia_id === familia.id);
  if (recipe.length === 0) return 0;

  let totalCusto = 0;
  const comp_haste_m = (comprimento_mm - (desconto_aco_mm || 70)) / 1000;

  recipe.forEach(b => {
    const insumo = localInsumos.find(i => i.id === b.insumo_id);
    if (!insumo) return;

    const precoUnit = Number(insumo.metadados?.last_purchase_price) || Number(insumo.preco_unitario) || 0;

    if (insumo.categoria === 'ACO') {
      const quantidadeHastes = b.quantidade_por_unidade || 1;
      const linear_m = comp_haste_m * quantidadeHastes;
      const pesoKg = linear_m * (Number(insumo.peso_nominal_kg_m) || 0.395);
      totalCusto += pesoKg * precoUnit;
    } 
    else if (insumo.categoria === 'QUIMICO') {
      const numVergalhoes = Number(familia.numero_vergalhoes) || 4;
      const areaSecao = Number(familia.area_secao_externa) || 0;
      const densidade = Number(familia.densidade_g_cm3) || 0;

      let volumeAcoMetro = 0;
      const acoItem = recipe.find((bi: any) => localInsumos.find(i => i.id === bi.insumo_id)?.categoria === 'ACO');
      if (acoItem) {
        const acoInsumo = localInsumos.find(i => i.id === acoItem.insumo_id);
        const bitola = Number(acoInsumo?.bitola_mm) || 0;
        volumeAcoMetro = Math.PI * Math.pow((bitola / 2) / 1000, 2);
      }
      
      const volumeAcoTotal = volumeAcoMetro * comp_haste_m * numVergalhoes;
      let volumePlastico = (areaSecao * (comprimento_mm / 1000)) - volumeAcoTotal;
      if (volumePlastico < 0) volumePlastico = 0;
      
      const massaPlastico = volumePlastico * (densidade * 1000);
      const consumoInsumoKg = (massaPlastico / 1000) * (b.quantidade_por_unidade / 1000);
      totalCusto += consumoInsumoKg * precoUnit;
    } 
    else if (insumo.categoria === 'POLIMERO') {
      const numVergalhoes = Number(familia.numero_vergalhoes) || 4;
      const areaSecao = Number(familia.area_secao_externa) || 0;
      const densidade = Number(familia.densidade_g_cm3) || 0;

      let volumeAcoMetro = 0;
      const acoItem = recipe.find((bi: any) => localInsumos.find(i => i.id === bi.insumo_id)?.categoria === 'ACO');
      if (acoItem) {
        const acoInsumo = localInsumos.find(i => i.id === acoItem.insumo_id);
        const bitola = Number(acoInsumo?.bitola_mm) || 0;
        volumeAcoMetro = Math.PI * Math.pow((bitola / 2) / 1000, 2);
      }
      
      const volumeAcoTotal = volumeAcoMetro * comp_haste_m * numVergalhoes;
      let volumePlastico = (areaSecao * (comprimento_mm / 1000)) - volumeAcoTotal;
      if (volumePlastico < 0) volumePlastico = 0;
      
      const massaPlastico = volumePlastico * (densidade * 1000);
      const consumoInsumoKg = (b.percentual_blend / 100.0) * massaPlastico;
      totalCusto += consumoInsumoKg * precoUnit;
    } 
    else {
      totalCusto += b.quantidade_por_unidade * precoUnit;
    }
  });

  return totalCusto;
};

export const calculateSKUCustoBaseLocal = (
  skuId: string,
  localSkus: any[],
  localFamilias: any[],
  localBoms: any[],
  localInsumos: any[]
) => {
  const sku = localSkus.find(s => s.id === skuId);
  if (!sku) return 0;
  
  const familia = localFamilias.find(f => f.id === sku.familia_id);
  if (!familia) return 0;

  const recipe = localBoms.filter(b => b.familia_id === familia.id);
  if (recipe.length === 0) return 0;

  let totalCusto = 0;
  const comp_haste_m = (sku.comprimento_mm - (sku.desconto_aco_mm || 70)) / 1000;

  recipe.forEach(b => {
    const insumo = localInsumos.find(i => i.id === b.insumo_id);
    if (!insumo) return;

    const precoUnit = Number(insumo.metadados?.last_purchase_price) || Number(insumo.preco_unitario) || 0;

    if (insumo.categoria === 'ACO') {
      const quantidadeHastes = b.quantidade_por_unidade || 1;
      const linear_m = comp_haste_m * quantidadeHastes;
      const pesoKg = linear_m * (Number(insumo.peso_nominal_kg_m) || 0.395);
      totalCusto += pesoKg * precoUnit;
    } 
    else if (insumo.categoria === 'QUIMICO') {
      const numVergalhoes = Number(familia.numero_vergalhoes) || 4;
      const areaSecao = Number(familia.area_secao_externa) || 0;
      const densidade = Number(familia.densidade_g_cm3) || 0;

      let volumeAcoMetro = 0;
      const acoItem = recipe.find(bi => localInsumos.find(i => i.id === bi.insumo_id)?.categoria === 'ACO');
      if (acoItem) {
        const acoInsumo = localInsumos.find(i => i.id === acoItem.insumo_id);
        const bitola = Number(acoInsumo?.bitola_mm) || 0;
        volumeAcoMetro = Math.PI * Math.pow((bitola / 2) / 1000, 2);
      }
      
      const volumeAcoTotal = volumeAcoMetro * comp_haste_m * numVergalhoes;
      let volumePlastico = (areaSecao * (sku.comprimento_mm / 1000)) - volumeAcoTotal;
      if (volumePlastico < 0) volumePlastico = 0;
      
      const massaPlastico = volumePlastico * (densidade * 1000);
      const consumoInsumoKg = (massaPlastico / 1000) * (b.quantidade_por_unidade / 1000);
      totalCusto += consumoInsumoKg * precoUnit;
    } 
    else if (insumo.categoria === 'POLIMERO') {
      const numVergalhoes = Number(familia.numero_vergalhoes) || 4;
      const areaSecao = Number(familia.area_secao_externa) || 0;
      const densidade = Number(familia.densidade_g_cm3) || 0;

      let volumeAcoMetro = 0;
      const acoItem = recipe.find(bi => localInsumos.find(i => i.id === bi.insumo_id)?.categoria === 'ACO');
      if (acoItem) {
        const acoInsumo = localInsumos.find(i => i.id === acoItem.insumo_id);
        const bitola = Number(acoInsumo?.bitola_mm) || 0;
        volumeAcoMetro = Math.PI * Math.pow((bitola / 2) / 1000, 2);
      }
      
      const volumeAcoTotal = volumeAcoMetro * comp_haste_m * numVergalhoes;
      let volumePlastico = (areaSecao * (sku.comprimento_mm / 1000)) - volumeAcoTotal;
      if (volumePlastico < 0) volumePlastico = 0;
      
      const massaPlastico = volumePlastico * (densidade * 1000);
      const consumoInsumoKg = (b.percentual_blend / 100.0) * massaPlastico;
      totalCusto += consumoInsumoKg * precoUnit;
    } 
    else {
      totalCusto += b.quantidade_por_unidade * precoUnit;
    }
  });

  return totalCusto;
};

export default function FormacaoPrecoScreen({ onAbrirPedidoSimulado, onBack, initialItems }: FormacaoPrecoScreenProps) {
  const supabase = createClient();
  const { addToast } = useToast();
  const { canAccess } = usePermissions();

  const [addedItems, setAddedItems] = useState<SimulatedOrderItem[]>(initialItems || []);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);

  useEffect(() => {
    if (initialItems) {
      setAddedItems(initialItems);
    }
  }, [initialItems]);

  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // Accordions states
  const [isFamiliasAccordionOpen, setIsFamiliasAccordionOpen] = useState(false);
  const [isDiscountAccordionOpen, setIsDiscountAccordionOpen] = useState(false);

  // Filtros de mês (para custos fixos e rateio da competência atual)
  const [selectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // DRE and Base States
  const [familias, setFamilias] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [parametrosPreco, setParametrosPreco] = useState<PrecificacaoParametros[]>([]);
  const [activeOrdersOp, setActiveOrdersOp] = useState<any[]>([]);
  const [estadosTributos, setEstadosTributos] = useState<EstadoTributo[]>([]);
  const [selectedEstadoId, setSelectedEstadoId] = useState('');
  const [dreData, setDreData] = useState({
    custoFixo: 0,
    producaoTotal: 0,
    rateioCustoFixo: 0
  });

  // Calculadora Item Atual
  const [calcSkuId, setCalcSkuId] = useState('');
  const [simulatedQty, setSimulatedQty] = useState('1000');
  const [calcMargem, setCalcMargem] = useState('20.00');
  const [calcTributaria, setCalcTributaria] = useState('18.00');
  const [calcComissao, setCalcComissao] = useState('10.00');
  const [fixedCostRateioPercent, setFixedCostRateioPercent] = useState<number>(100); // 0 a 100%
  const [simulatedDiscount, setSimulatedDiscount] = useState<number>(0); // em %
  const [calculationResult, setCalculationResult] = useState<number | null>(null);

  // Lista de Itens do Pedido Comercial Simulado
  const [selectedItems, setSelectedItems] = useState<SimulatedOrderItem[]>([]);

  // Configuração de Margem (Modal)
  const [isConfigMargemOpen, setIsConfigMargemOpen] = useState(false);
  const [selectedFamId, setSelectedFamId] = useState('');
  const [margemSaudavel, setMargemSaudavel] = useState('15.00');
  const [margemLimite, setMargemLimite] = useState('5.00');

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseMonthDates = (yearMonth: string) => {
    const [year, month] = yearMonth.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);
    return { startDate, endDate };
  };

  const loadData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
      if (!profile?.empresa_id) return;
      setEmpresaId(profile.empresa_id);

      const { startDate, endDate } = parseMonthDates(selectedMonth);
      const startIso = startDate.toISOString().split('T')[0];
      const endIso = endDate.toISOString().split('T')[0];

      // A) Custos Fixos Totais
      const { data: fixos } = await supabase
        .from('custos_fixos')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .gte('competencia_mes', startIso)
        .lte('competencia_mes', endIso);
      
      const listFixos = (fixos || []) as CustoFixo[];
      const totalFixo = listFixos.reduce((acc, curr) => acc + Number(curr.valor_mensal), 0);

      // B) Produção Total das OPs do mês (incluindo finalizadas e ativas criadas no mês)
      const { data: pedidosFaturamento } = await supabase
        .from('pedidos')
        .select('*, ordens_producao(*)')
        .eq('empresa_id', profile.empresa_id)
        .in('status', ['FINALIZADO', 'ATIVO'])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      let totalPecasProduzidas = 0;
      (pedidosFaturamento || []).forEach(p => {
        (p.ordens_producao || []).forEach((op: any) => {
          if (op.status === 'FINALIZADA') {
            totalPecasProduzidas += Number(op.quantidade_produzida || 0);
          } else {
            totalPecasProduzidas += Number(op.quantidade_planejada || 0);
          }
        });
      });

      setDreData({
        custoFixo: totalFixo,
        producaoTotal: totalPecasProduzidas,
        rateioCustoFixo: totalPecasProduzidas > 0 ? totalFixo / totalPecasProduzidas : 0
      });

      // C) Precificação e dados base
      const { data: fams } = await supabase.from('familias_produto').select('*').is('deleted_at', null).order('nome');
      const { data: skusList } = await supabase.from('skus').select('*').is('deleted_at', null).order('codigo');
      const { data: bomList } = await supabase.from('bom').select('*');
      const { data: insumosList } = await supabase.from('insumos').select('*');
      const { data: params } = await supabase.from('precificacao_parametros').select('*').eq('empresa_id', profile.empresa_id);
      const { data: estadosList } = await supabase.from('estados_tributos').select('*').eq('empresa_id', profile.empresa_id).order('uf');
      const { data: cFin } = await supabase.from('configuracoes_financeiras').select('*').eq('empresa_id', profile.empresa_id).single();

      if (fams) setFamilias(fams);
      if (skusList) setSkus(skusList);
      if (bomList) setBoms(bomList);
      if (insumosList) setInsumos(insumosList);
      if (params) setParametrosPreco(params);
      if (estadosList) setEstadosTributos(estadosList);
      if (cFin && cFin.margem_alvo_estavel) {
        setCalcMargem(cFin.margem_alvo_estavel.toString());
      }

      // D) Reservas de Estoque Ativas
      const { data: pedData } = await supabase
        .from('pedidos')
        .select('id, ordens_producao(sku_id, quantidade_planejada, quantidade_produzida)')
        .eq('empresa_id', profile.empresa_id)
        .eq('status', 'ATIVO');
      
      const ops: any[] = [];
      if (pedData) {
        pedData.forEach((p: any) => {
          if (p.ordens_producao) {
            p.ordens_producao.forEach((op: any) => {
              ops.push({
                sku_id: op.sku_id,
                quantidade_planejada: Number(op.quantidade_planejada || 0),
                quantidade_produzida: Number(op.quantidade_produzida || 0)
              });
            });
          }
        });
      }
      setActiveOrdersOp(ops);

    } catch (err: any) {
      console.error('Erro ao carregar dados:', err);
      addToast('Erro ao carregar os dados: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  const getSKUCustoBaseReal = (skuId: string) => {
    return calculateSKUCustoBaseLocal(skuId, skus, familias, boms, insumos);
  };

  const handleSaveMargemConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFamId || !empresaId) return;

    try {
      const { error } = await supabase.from('precificacao_parametros').upsert({
        empresa_id: empresaId,
        familia_id: selectedFamId,
        margem_minima_saudavel: parseFloat(margemSaudavel),
        margem_operacional_limite: parseFloat(margemLimite)
      }, { onConflict: 'empresa_id,familia_id' });

      if (error) throw error;
      setIsConfigMargemOpen(false);
      loadData();
      addToast('Configurações de margem salvas!', 'success');
    } catch (err: any) {
      addToast('Erro ao salvar: ' + err.message, 'error');
    }
  };

  // Helper variables for current simulation SKU
  const selectedSKU = skus.find(s => s.id === calcSkuId);
  const selectedFamilia = selectedSKU ? familias.find(f => f.id === selectedSKU.familia_id) : null;
  const currentBOM = selectedFamilia ? boms.filter(b => b.familia_id === selectedFamilia.id) : [];
  const hasBOM = currentBOM.length > 0;

  // Real-time stock consumption checker for the current simulator inputs
  const getProjectedInventory = () => {
    if (!hasBOM || !calcSkuId) return [];

    const orderQty = Number(simulatedQty) || 0;

    return currentBOM.map(b => {
      const insumo = insumos.find(i => i.id === b.insumo_id);
      if (!insumo) return null;

      const reserved = activeOrdersOp
        .filter(op => op.sku_id === calcSkuId)
        .reduce((sum, op) => sum + (op.quantidade_planejada - op.quantidade_produzida), 0);

      const comp_haste_m = (selectedSKU?.comprimento_mm - (selectedSKU?.desconto_aco_mm || 70)) / 1000;
      let neededForThisOrder = 0;
      let isAco = false;

      if (insumo.categoria === 'ACO') {
        isAco = true;
        const qtyHastes = b.quantidade_por_unidade || 1;
        neededForThisOrder = comp_haste_m * qtyHastes * orderQty * (Number(insumo.peso_nominal_kg_m) || 0.395);
      } else if (insumo.categoria === 'QUIMICO' || insumo.categoria === 'POLIMERO') {
        const numVergalhoes = Number(selectedFamilia?.numero_vergalhoes) || 4;
        const areaSecao = Number(selectedFamilia?.area_secao_externa) || 0;
        const densidade = Number(selectedFamilia?.densidade_g_cm3) || 0;

        let volumeAcoMetro = 0;
        const acoItem = currentBOM.find(bi => insumos.find(i => i.id === bi.insumo_id)?.categoria === 'ACO');
        if (acoItem) {
          const acoInsumo = insumos.find(i => i.id === acoItem.insumo_id);
          const bitola = Number(acoInsumo?.bitola_mm) || 0;
          volumeAcoMetro = Math.PI * Math.pow((bitola / 2) / 1000, 2);
        }

        const volumeAcoTotal = volumeAcoMetro * comp_haste_m * numVergalhoes;
        let volumePlastico = (areaSecao * (selectedSKU?.comprimento_mm / 1000)) - volumeAcoTotal;
        if (volumePlastico < 0) volumePlastico = 0;

        const massaPlastico = volumePlastico * (densidade * 1000);
        
        if (insumo.categoria === 'QUIMICO') {
          neededForThisOrder = (massaPlastico / 1000) * (b.quantidade_por_unidade / 1000) * orderQty;
        } else {
          neededForThisOrder = (b.percentual_blend / 100.0) * massaPlastico * orderQty;
        }
      } else {
        neededForThisOrder = b.quantidade_por_unidade * orderQty;
      }

      const stockAvailable = insumo.estoque_atual;
      const projectedLeft = stockAvailable - neededForThisOrder - reserved;

      return {
        insumoName: insumo.nome,
        unidade: insumo.unidade_medida,
        stockAvailable,
        neededForThisOrder,
        reserved,
        projectedLeft,
        isAco,
        comp_haste_m,
        quantidade_por_unidade: b.quantidade_por_unidade,
        peso_nominal_kg_m: insumo.peso_nominal_kg_m
      };
    }).filter(Boolean);
  };

  const projectedItems = getProjectedInventory();
  const hasDeficit = projectedItems.some(item => item && item.projectedLeft < 0);

  const calculateMax = () => {
    if (!hasBOM || !calcSkuId) return;

    let maxProduces = Infinity;

    currentBOM.forEach(b => {
      const insumo = insumos.find(i => i.id === b.insumo_id);
      if (!insumo) return;

      const reserved = activeOrdersOp
        .filter(op => op.sku_id === calcSkuId)
        .reduce((sum, op) => sum + (op.quantidade_planejada - op.quantidade_produzida), 0);

      const stockAvailable = insumo.estoque_atual - reserved;

      let neededPerPiece = 0;
      const comp_haste_m = (selectedSKU?.comprimento_mm - (selectedSKU?.desconto_aco_mm || 70)) / 1000;

      if (insumo.categoria === 'ACO') {
        const qtyHastes = b.quantidade_por_unidade || 1;
        neededPerPiece = comp_haste_m * qtyHastes * (Number(insumo.peso_nominal_kg_m) || 0.395);
      } else if (insumo.categoria === 'QUIMICO' || insumo.categoria === 'POLIMERO') {
        const numVergalhoes = Number(selectedFamilia?.numero_vergalhoes) || 4;
        const areaSecao = Number(selectedFamilia?.area_secao_externa) || 0;
        const densidade = Number(selectedFamilia?.densidade_g_cm3) || 0;

        let volumeAcoMetro = 0;
        const acoItem = currentBOM.find(bi => insumos.find(i => i.id === bi.insumo_id)?.categoria === 'ACO');
        if (acoItem) {
          const acoInsumo = insumos.find(i => i.id === acoItem.insumo_id);
          const bitola = Number(acoInsumo?.bitola_mm) || 0;
          volumeAcoMetro = Math.PI * Math.pow((bitola / 2) / 1000, 2);
        }

        const volumeAcoTotal = volumeAcoMetro * comp_haste_m * numVergalhoes;
        let volumePlastico = (areaSecao * (selectedSKU?.comprimento_mm / 1000)) - volumeAcoTotal;
        if (volumePlastico < 0) volumePlastico = 0;

        const massaPlastico = volumePlastico * (densidade * 1000);
        
        if (insumo.categoria === 'QUIMICO') {
          neededPerPiece = (massaPlastico / 1000) * (b.quantidade_por_unidade / 1000);
        } else {
          neededPerPiece = (b.percentual_blend / 100.0) * massaPlastico;
        }
      } else {
        neededPerPiece = b.quantidade_por_unidade;
      }

      let maxWithThisInsumo = 0;
      if (neededPerPiece > 0) {
        maxWithThisInsumo = Math.floor(stockAvailable / neededPerPiece);
      } else {
        maxWithThisInsumo = Infinity;
      }

      if (maxWithThisInsumo < maxProduces) {
        maxProduces = maxWithThisInsumo;
      }
    });

    setCalculationResult(Math.max(0, maxProduces));
  };

  // Helper to check stock status on the items list
  const checkStockStatus = (skuId: string, qty: number) => {
    const sku = skus.find(s => s.id === skuId);
    if (!sku) return { hasDeficit: false, deficitInsumo: '' };
    
    const fam = familias.find(f => f.id === sku.familia_id);
    if (!fam) return { hasDeficit: false, deficitInsumo: '' };

    const recipe = boms.filter(b => b.familia_id === fam.id);
    const comp_haste_m = (sku.comprimento_mm - (sku.desconto_aco_mm || 70)) / 1000;

    let hasDef = false;
    let defInsumoName = '';

    recipe.forEach(b => {
      const insumo = insumos.find(i => i.id === b.insumo_id);
      if (!insumo) return;

      const reserved = activeOrdersOp
        .filter(op => op.sku_id === skuId)
        .reduce((sum, op) => sum + (op.quantidade_planejada - op.quantidade_produzida), 0);

      let needed = 0;
      if (insumo.categoria === 'ACO') {
        const qtyHastes = b.quantidade_por_unidade || 1;
        needed = comp_haste_m * qtyHastes * qty * (Number(insumo.peso_nominal_kg_m) || 0.395);
      } else if (insumo.categoria === 'QUIMICO' || insumo.categoria === 'POLIMERO') {
        const numVergalhoes = Number(fam.numero_vergalhoes) || 4;
        const areaSecao = Number(fam.area_secao_externa) || 0;
        const densidade = Number(fam.densidade_g_cm3) || 0;

        let volumeAcoMetro = 0;
        const acoItem = recipe.find(bi => insumos.find(i => i.id === bi.insumo_id)?.categoria === 'ACO');
        if (acoItem) {
          const acoInsumo = insumos.find(i => i.id === acoItem.insumo_id);
          const bitola = Number(acoInsumo?.bitola_mm) || 0;
          volumeAcoMetro = Math.PI * Math.pow((bitola / 2) / 1000, 2);
        }

        const volumeAcoTotal = volumeAcoMetro * comp_haste_m * numVergalhoes;
        let volumePlastico = (areaSecao * (sku.comprimento_mm / 1000)) - volumeAcoTotal;
        if (volumePlastico < 0) volumePlastico = 0;

        const massaPlastico = volumePlastico * (densidade * 1000);
        
        if (insumo.categoria === 'QUIMICO') {
          needed = (massaPlastico / 1000) * (b.quantidade_por_unidade / 1000) * qty;
        } else {
          needed = (b.percentual_blend / 100.0) * massaPlastico * qty;
        }
      } else {
        needed = b.quantidade_por_unidade * qty;
      }

      if (insumo.estoque_atual - needed - reserved < 0) {
        hasDef = true;
        defInsumoName = insumo.nome;
      }
    });

    return { hasDeficit: hasDef, deficitInsumo: defInsumoName };
  };

  // Pricing calculations
  const custoBaseCalc = calcSkuId ? getSKUCustoBaseReal(calcSkuId) : 0;
  const margemPercent = parseFloat(calcMargem) || 0;
  const tributosPercent = parseFloat(calcTributaria) || 0;
  const comissaoPercent = parseFloat(calcComissao) || 0;

  // Calculate projected rateio including current simulated quantity + cart volume
  const totalCartVolume = selectedItems.reduce((acc, curr) => acc + curr.quantidade, 0);
  const totalVolumeParaRateio = dreData.producaoTotal + totalCartVolume + (Number(simulatedQty) || 0);
  const rateioCustoFixoSimulado = totalVolumeParaRateio > 0 ? dreData.custoFixo / totalVolumeParaRateio : 0;

  // Fixed Cost Apportionment per piece allocated based on the slider (0 to 100% of standard absorption)
  const fixedCostAlocadoPorPeca = rateioCustoFixoSimulado * (fixedCostRateioPercent / 100);

  // New Markup Divider incorporating Margin, Taxes, and Commission
  const markupDivisor = 1 - (margemPercent + tributosPercent + comissaoPercent) / 100;
  
  // Suggestion price considers Base Cost + Allocated Fixed Cost
  const precoSugerido = markupDivisor > 0 ? (custoBaseCalc + fixedCostAlocadoPorPeca) / markupDivisor : 0;
  const precoSimuladoFinal = precoSugerido * (1 - simulatedDiscount / 100);

  // Net Profit per piece
  const comissaoUnit = precoSimuladoFinal * (comissaoPercent / 100);
  const tributosUnit = precoSimuladoFinal * (tributosPercent / 100);
  const lucroUnitarioSimulado = precoSimuladoFinal - comissaoUnit - tributosUnit - custoBaseCalc - fixedCostAlocadoPorPeca;
  const lucroTotalSimulado = lucroUnitarioSimulado * (Number(simulatedQty) || 0);

  const handleUpdateBasePrice = async () => {
    if (!calcSkuId || !empresaId) return;
    try {
      const { error } = await supabase.from('skus').update({ preco_base_venda: precoSimuladoFinal }).eq('id', calcSkuId);
      if (error) throw error;
      addToast('Preço base atualizado com sucesso no cadastro do SKU!', 'success');
      loadData();
    } catch (err: any) {
      addToast('Erro ao atualizar preço base: ' + err.message, 'error');
    }
  };

  const getSliderColor = () => {
    const sku = skus.find(s => s.id === calcSkuId);
    if (!sku) return 'bg-[#74777f]';
    const params = parametrosPreco.find(p => p.familia_id === sku.familia_id);
    const limit = params ? Number(params.margem_operacional_limite) : 5;
    const healthy = params ? Number(params.margem_minima_saudavel) : 15;

    const marginSim = getSimulatedMargin();

    if (marginSim >= healthy) return 'bg-green-600';
    if (marginSim >= limit) return 'bg-yellow-500';
    return 'bg-red-600';
  };

  const getSimulatedMargin = () => {
    return precoSimuladoFinal > 0 ? (lucroUnitarioSimulado / precoSimuladoFinal) * 100 : 0;
  };

  const isBlocked = () => {
    const sku = skus.find(s => s.id === calcSkuId);
    if (!sku) return true;
    const params = parametrosPreco.find(p => p.familia_id === sku.familia_id);
    const limit = params ? Number(params.margem_operacional_limite) : 5;
    return getSimulatedMargin() < limit;
  };

  // Add current simulated item to selected list
  const handleAddItem = () => {
    if (!calcSkuId) {
      addToast('Selecione um SKU antes de adicionar.', 'warning');
      return;
    }
    const sku = skus.find(s => s.id === calcSkuId);
    if (!sku) return;

    const newItem: SimulatedOrderItem = {
      skuId: calcSkuId,
      skuCodigo: sku.codigo,
      quantidade: Number(simulatedQty) || 1000,
      precoVenda: Number(precoSimuladoFinal.toFixed(2)),
      comissaoPercentual: comissaoPercent,
      fixedCostAlocado: fixedCostAlocadoPorPeca
    };

    setSelectedItems(prev => [...prev, newItem]);
    addToast(`${sku.codigo} adicionado ao pedido!`, 'success');

    // Reset some states for next item
    setCalcSkuId('');
    setSimulatedQty('1000');
    setSimulatedDiscount(0);
    setCalculationResult(null);
  };

  const handleRemoveItem = (index: number) => {
    setSelectedItems(prev => prev.filter((_, i) => i !== index));
    addToast('Item removido da lista.', 'info');
  };

  // Consolidated order metrics
  const totalVolume = selectedItems.reduce((acc, curr) => acc + curr.quantidade, 0);
  const totalRevenue = selectedItems.reduce((acc, curr) => acc + (curr.quantidade * curr.precoVenda), 0);
  
  // Total profit and costs calculation for the entire items list
  let totalInsumosCost = 0;
  let totalComissaoCost = 0;
  let totalTaxesCost = 0;
  let totalFixedCostAlocado = 0;

  selectedItems.forEach(item => {
    const costBase = getSKUCustoBaseReal(item.skuId);
    totalInsumosCost += item.quantidade * costBase;
    totalComissaoCost += item.quantidade * (item.precoVenda * (item.comissaoPercentual / 100));
    totalTaxesCost += item.quantidade * (item.precoVenda * 0.18); // default 18% taxes
    totalFixedCostAlocado += item.quantidade * item.fixedCostAlocado;
  });

  const totalLucroLiquido = totalRevenue - totalInsumosCost - totalComissaoCost - totalTaxesCost - totalFixedCostAlocado;

  const anyItemHasDeficit = selectedItems.some(item => checkStockStatus(item.skuId, item.quantidade).hasDeficit);

  if (loading) {
    return <LoadingOverlay message="Carregando Simulador de Margens..." />;
  }

  return (
    <div className="space-y-6 animate-fade-in text-left">
      <div className="flex items-center justify-between border-b border-outline-variant/30 pb-4">
        <div>
          <h2 className="text-xl font-black text-primary flex items-center gap-2">
            <span className="material-symbols-outlined notranslate text-secondary text-[28px]">price_change</span>
            Formação de Preço e Margens
          </h2>
          <p className="text-xs text-outline">Simule o preço ideal, valide o estoque e gerencie múltiplos itens em seu lote</p>
        </div>
        {onBack && (
          <button 
            onClick={onBack}
            className="text-xs font-bold text-outline hover:text-primary transition-colors flex items-center gap-1 cursor-pointer select-none"
          >
            <span className="material-symbols-outlined notranslate text-[16px]">arrow_back</span> Voltar
          </button>
        )}
      </div>

      {/* ACCORDION: Margens por Família */}
      <div className="bg-white rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
        <button 
          type="button"
          onClick={() => setIsFamiliasAccordionOpen(!isFamiliasAccordionOpen)}
          className="w-full px-5 py-4 flex justify-between items-center bg-surface-container-low font-black text-xs text-[#002046] uppercase transition-colors hover:bg-surface-container-high"
        >
          <span className="flex items-center gap-2">
            <span className="material-symbols-outlined notranslate text-secondary">tune</span>
            Margens Mínimas por Família
          </span>
          <span className="material-symbols-outlined notranslate transition-transform duration-200" style={{ transform: isFamiliasAccordionOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
            expand_more
          </span>
        </button>

        {isFamiliasAccordionOpen && (
          <div className="p-5 border-t border-outline-variant/60 bg-white grid grid-cols-1 md:grid-cols-3 gap-3 animate-slide-down">
            {familias.map(fam => {
              const param = parametrosPreco.find(p => p.familia_id === fam.id);
              const minSaudavel = param ? param.margem_minima_saudavel : 15;
              const minLimite = param ? param.margem_operacional_limite : 5;
              return (
                <div key={fam.id} className="p-3 bg-surface-container-lowest border border-outline-variant/60 rounded-xl flex justify-between items-center">
                  <div>
                    <p className="font-bold text-xs text-[#002046]">{fam.nome}</p>
                    <div className="flex gap-3 text-[10px] text-outline mt-1 font-semibold">
                      <span>Saudável: <strong className="text-green-700">{minSaudavel}%</strong></span>
                      <span>Limite: <strong className="text-yellow-600">{minLimite}%</strong></span>
                    </div>
                  </div>
                  {canAccess('gerenciar_custos_fixos') && (
                    <button 
                      onClick={() => {
                        setSelectedFamId(fam.id);
                        setMargemSaudavel(String(minSaudavel));
                        setMargemLimite(String(minLimite));
                        setIsConfigMargemOpen(true);
                      }}
                      className="text-[10px] font-black text-secondary hover:text-primary transition-colors flex items-center gap-1 cursor-pointer select-none"
                    >
                      <span className="material-symbols-outlined notranslate text-[14px]">edit</span> Ajustar
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Lado Esquerdo: Simulador de SKU e Estoque */}
        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-xs lg:col-span-2 space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h4 className="text-sm font-black text-[#002046] uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined notranslate text-secondary text-[18px]">calculate</span>
                Simulador de Item
              </h4>
              <p className="text-[11px] text-outline mt-0.5">Defina SKU, quantidade e custos para projetar as margens e lucro</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Selecione o Produto (SKU)</label>
                <select 
                  value={calcSkuId}
                  onChange={(e) => {
                    setCalcSkuId(e.target.value);
                    setSimulatedDiscount(0);
                    setCalculationResult(null);
                  }}
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-xs text-[#002046] focus:outline-none"
                >
                  <option value="">Selecione o SKU...</option>
                  {familias.map(fam => {
                    const famSkus = skus.filter(s => s.familia_id === fam.id);
                    if (famSkus.length === 0) return null;
                    return (
                      <optgroup key={fam.id} label={fam.nome}>
                        {famSkus.map(s => (
                          <option key={s.id} value={s.id}>{fam.nome} - {s.comprimento_mm}mm</option>
                        ))}
                      </optgroup>
                    );
                  })}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Quantidade Desejada (PEÇAS)</label>
                <input 
                  type="number"
                  min="1"
                  value={simulatedQty}
                  onChange={(e) => {
                    setSimulatedQty(e.target.value);
                    setCalculationResult(null);
                  }}
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-xs text-[#002046] focus:outline-none"
                />
              </div>
            </div>

            {/* Painel Projeção de Estoque (integrado se SKU estiver selecionado) */}
            {calcSkuId && (
              <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/60 space-y-4">
                <div className="flex justify-between items-center border-b pb-2 border-outline-variant/30">
                  <h5 className="text-[11px] font-black text-secondary uppercase flex items-center gap-1.5">
                    <span className="material-symbols-outlined notranslate text-[16px]">inventory_2</span>
                    Disponibilidade de Estoque (BOM)
                  </h5>
                  {!hasBOM && (
                    <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Fórmula Não Cadastrada</span>
                  )}
                </div>

                {hasBOM && (
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {projectedItems.map((item, index) => {
                        if (!item) return null;
                        const isDef = item.projectedLeft < 0;
                        return (
                          <div key={index} className={`p-3 rounded-lg border text-[10px] flex flex-col justify-between ${isDef ? 'bg-red-50 border-red-200 text-red-800' : 'bg-white border-outline-variant/40'}`}>
                            <div className="flex justify-between font-bold mb-1">
                              <span className="truncate max-w-[150px]">{item.insumoName}</span>
                              <span className={isDef ? 'text-red-700' : 'text-green-700'}>
                                {isDef ? `Falta ${Math.abs(item.projectedLeft).toFixed(1)} ${item.unidade}` : 'Estoque OK'}
                              </span>
                            </div>
                            <div className="flex justify-between text-[9px] text-[#74777f]">
                              <span>Estoque Líquido: {item.stockAvailable.toFixed(0)} {item.unidade}</span>
                              <span>Consumo: {item.neededForThisOrder.toFixed(0)} {item.unidade}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {hasDeficit && (
                      <div className="p-3 bg-surface-bright border border-outline-variant/60 rounded-xl flex items-center justify-between text-xs font-bold gap-3">
                        <span className="text-primary">Estoque insuficiente para esta quantidade comercial.</span>
                        <button
                          type="button"
                          onClick={calculateMax}
                          className="bg-secondary hover:bg-secondary/90 text-white font-bold py-1.5 px-3 rounded-lg text-[10px] shadow-sm transition-all"
                        >
                          AJUSTAR PARA MÁXIMO POSSÍVEL
                        </button>
                      </div>
                    )}

                    {calculationResult !== null && (
                      <div className="p-2.5 bg-green-50 border border-green-200 text-green-800 rounded-lg text-xs font-bold text-center">
                        Volume máximo possível com o estoque atual: <strong className="text-sm ml-1">{calculationResult} PEÇAS</strong>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {calcSkuId && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Margem Alvo (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={calcMargem}
                    onChange={(e) => setCalcMargem(e.target.value)}
                    className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-xs text-[#002046] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Estado Destino</label>
                  <select
                    value={selectedEstadoId}
                    onChange={(e) => {
                      const estId = e.target.value;
                      setSelectedEstadoId(estId);
                      const est = estadosTributos.find(x => x.id === estId);
                      if (est) {
                        setCalcTributaria(String(est.aliquota_imposto));
                      }
                    }}
                    className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-xs text-[#002046] focus:outline-none"
                  >
                    <option value="">Selecione...</option>
                    {estadosTributos.map(est => (
                      <option key={est.id} value={est.id}>{est.uf} - {est.nome}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Impostos (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={calcTributaria}
                    onChange={(e) => setCalcTributaria(e.target.value)}
                    className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-xs text-[#002046] focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Comissão Vendedor (%)</label>
                  <input 
                    type="number"
                    step="0.1"
                    value={calcComissao}
                    onChange={(e) => setCalcComissao(e.target.value)}
                    className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-xs text-[#002046] focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Slider de Rateio de Custo Fixo */}
            {calcSkuId && (
              <div className="bg-[#f4f3f9] p-4 rounded-xl border border-outline-variant/40 space-y-2">
                <div className="flex justify-between text-xs font-bold text-primary">
                  <span>Rateio Fracionado do Custo Fixo</span>
                  <span>{fixedCostRateioPercent}% Alocado</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[10px] font-bold text-outline">0%</span>
                  <input 
                    type="range"
                    min="0"
                    max="100"
                    step="5"
                    value={fixedCostRateioPercent}
                    onChange={(e) => setFixedCostRateioPercent(parseInt(e.target.value))}
                    className="flex-1 accent-[#002046] h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                  />
                  <span className="text-[10px] font-bold text-outline">100%</span>
                </div>
                <div className="flex justify-between text-[10px] text-outline font-semibold">
                  <span>Rateio DRE Projetado: {formatCurrency(rateioCustoFixoSimulado)} / pç</span>
                  <span>Custo Fixo Absorvido: <strong className="text-secondary">{formatCurrency(fixedCostAlocadoPorPeca)} / pç</strong></span>
                </div>
              </div>
            )}

            {/* ACCORDION: Simular Desconto Negociado */}
            {calcSkuId && (
              <div className="bg-white rounded-xl border border-outline-variant overflow-hidden">
                <button
                  type="button"
                  onClick={() => setIsDiscountAccordionOpen(!isDiscountAccordionOpen)}
                  className="w-full px-4 py-2.5 flex justify-between items-center bg-surface-container-low font-bold text-[10px] text-primary uppercase transition-colors"
                >
                  <span>Simular Desconto Negociado</span>
                  <span className="material-symbols-outlined notranslate text-[16px] transition-transform duration-200" style={{ transform: isDiscountAccordionOpen ? 'rotate(180deg)' : 'rotate(0)' }}>
                    expand_more
                  </span>
                </button>
                {isDiscountAccordionOpen && (
                  <div className="p-4 border-t border-outline-variant bg-white space-y-3 animate-slide-down">
                    <div className="flex justify-between items-center text-xs font-bold text-primary">
                      <span>Desconto Aplicado</span>
                      <span className="bg-surface-container px-2 py-0.5 rounded">{simulatedDiscount}%</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] text-outline font-bold">0%</span>
                      <input 
                        type="range"
                        min="0"
                        max="35"
                        step="0.5"
                        value={simulatedDiscount}
                        onChange={(e) => setSimulatedDiscount(parseFloat(e.target.value))}
                        className="flex-1 accent-primary h-1.5 bg-gray-200 rounded-lg cursor-pointer"
                      />
                      <span className="text-[10px] text-outline font-bold">35%</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Métricas e Resultados do Item Atual */}
            {calcSkuId && (
              <div className="border-t border-outline-variant/30 pt-4 space-y-3">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/30">
                    <span className="text-[9px] font-bold text-[#74777f] uppercase block">Custo Unitário Base</span>
                    <span className="text-sm font-black text-[#002046] block">{formatCurrency(custoBaseCalc)}</span>
                  </div>
                  <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/30">
                    <span className="text-[9px] font-bold text-[#74777f] uppercase block">Custo Fixo Alocado</span>
                    <span className="text-sm font-black text-secondary block">{formatCurrency(fixedCostAlocadoPorPeca)}</span>
                  </div>
                  <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/30">
                    <span className="text-[9px] font-bold text-[#74777f] uppercase block">Preço Sugerido (Markup)</span>
                    <span className="text-sm font-black text-primary block">{formatCurrency(precoSugerido)}</span>
                  </div>
                  <div className="bg-secondary/15 p-3 rounded-xl border border-secondary/20">
                    <span className="text-[9px] font-bold text-secondary uppercase block">Preço Final Negociado</span>
                    <span className="text-sm font-black text-secondary block">{formatCurrency(precoSimuladoFinal)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={`p-3 rounded-xl text-white font-bold flex flex-col justify-center transition-all ${getSliderColor()}`}>
                    <span className="uppercase tracking-wider text-[8px]">Margem Comercial</span>
                    <span className="text-base font-black mt-0.5">{getSimulatedMargin().toFixed(2)}%</span>
                  </div>
                  <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/30">
                    <span className="text-[9px] font-bold text-[#74777f] uppercase block">Lucro Líquido p/ Peça</span>
                    <span className={`text-base font-black ${lucroUnitarioSimulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(lucroUnitarioSimulado)}
                    </span>
                  </div>
                  <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/30">
                    <span className="text-[9px] font-bold text-[#74777f] uppercase block">Lucro Líquido Total</span>
                    <span className={`text-base font-black ${lucroTotalSimulado >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {formatCurrency(lucroTotalSimulado)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isBlocked()}
                    onClick={handleUpdateBasePrice}
                    className={`px-4 py-2.5 rounded-xl text-xs font-bold tracking-wider flex items-center gap-1.5 shadow-sm transition-all ${
                      isBlocked()
                        ? 'bg-outline-variant text-on-surface-variant cursor-not-allowed'
                        : 'bg-surface-container-high hover:bg-surface-container-highest text-[#002046] cursor-pointer hover:scale-[0.98]'
                    }`}
                  >
                    <span className="material-symbols-outlined notranslate text-[18px]">save</span>
                    SALVAR NOVO PREÇO BASE
                  </button>
                  <button
                    type="button"
                    disabled={isBlocked()}
                    onClick={handleAddItem}
                    className={`px-5 py-2.5 rounded-xl text-xs font-bold tracking-wider flex items-center gap-1.5 shadow-sm transition-all ${
                      isBlocked()
                        ? 'bg-outline-variant text-on-surface-variant cursor-not-allowed'
                        : 'bg-[#002046] hover:bg-[#1b365d] text-white cursor-pointer hover:scale-[0.98]'
                    }`}
                  >
                    <span className="material-symbols-outlined notranslate text-[18px]">playlist_add</span>
                    USAR APENAS NESTA VENDA
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Lado Direito: Resumo Dinâmico do Pedido (Itens Selecionados) */}
        <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-xs flex flex-col justify-between gap-5 h-full">
          <div className="space-y-4">
            <div className="border-b pb-3">
              <h4 className="text-sm font-black text-[#002046] uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined notranslate text-secondary text-[18px]">shopping_cart</span>
                Resumo do Lote
              </h4>
              <p className="text-[11px] text-outline mt-0.5">Lista de produtos adicionados para a gravação da venda geral</p>
            </div>

            {/* Lista de Itens do Pedido */}
            <div className="space-y-3 max-h-[45vh] overflow-y-auto pr-1">
              {selectedItems.length === 0 ? (
                <p className="text-center text-outline italic text-xs py-8">Nenhum item adicionado ao pedido comercial ainda.</p>
              ) : (
                selectedItems.map((item, index) => {
                  const stockCheck = checkStockStatus(item.skuId, item.quantidade);
                  const costBase = getSKUCustoBaseReal(item.skuId);
                  const commissionVal = item.quantidade * (item.precoVenda * (item.comissaoPercentual / 100));
                  const taxVal = item.quantidade * (item.precoVenda * 0.18);
                  const fixedCostVal = item.quantidade * item.fixedCostAlocado;
                  const itemRevenue = item.quantidade * item.precoVenda;
                  const itemProfit = itemRevenue - (item.quantidade * costBase) - commissionVal - taxVal - fixedCostVal;

                  return (
                    <div key={index} className="p-3 bg-surface-container-low border border-outline-variant/60 rounded-xl relative hover:bg-surface-container-high transition-colors">
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(index)}
                        className="absolute top-2 right-2 text-[#74777f] hover:text-red-600 transition-colors cursor-pointer select-none"
                      >
                        <span className="material-symbols-outlined notranslate text-[16px]">delete</span>
                      </button>
                      <div className="space-y-1">
                        <p className="font-mono text-xs font-black text-[#002046]">{item.skuCodigo}</p>
                        <div className="flex justify-between text-[10px] text-outline font-semibold">
                          <span>Volume: {item.quantidade.toLocaleString('pt-BR')} un</span>
                          <span>Preço: {formatCurrency(item.precoVenda)}</span>
                        </div>
                        <div className="flex justify-between text-[10px] border-t border-outline-variant/30 pt-1 mt-1 font-semibold">
                          <span>Lucro Líquido: <strong className={itemProfit >= 0 ? 'text-green-700' : 'text-red-600'}>{formatCurrency(itemProfit)}</strong></span>
                          {stockCheck.hasDeficit ? (
                            <span className="text-red-600 font-bold uppercase text-[9px] animate-pulse">Faltam materiais</span>
                          ) : (
                            <span className="text-green-700 text-[9px] uppercase font-bold">Estoque OK</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Rodapé do Carrinho com Totais e Botão de Abrir Pedido */}
          <div className="border-t border-outline-variant pt-4 space-y-4 bg-white">
            <div className="space-y-1.5 text-xs">
              <div className="flex justify-between text-outline">
                <span>Volume Total:</span>
                <span className="font-bold text-[#002046]">{totalVolume.toLocaleString('pt-BR')} peças</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>Valor do Pedido:</span>
                <span className="font-bold text-[#002046]">{formatCurrency(totalRevenue)}</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>Custo de Insumos (BOM):</span>
                <span className="font-bold text-red-600">-{formatCurrency(totalInsumosCost)}</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>Impostos Estimados (18%):</span>
                <span className="font-bold text-red-600">-{formatCurrency(totalTaxesCost)}</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>Comissão Comercial:</span>
                <span className="font-bold text-red-600">-{formatCurrency(totalComissaoCost)}</span>
              </div>
              <div className="flex justify-between text-outline">
                <span>Custo Fixo Alocado:</span>
                <span className="font-bold text-red-600">-{formatCurrency(totalFixedCostAlocado)}</span>
              </div>
              <div className="flex justify-between border-t border-outline-variant/40 pt-2 text-sm">
                <span className="font-black text-[#002046] uppercase">Lucro Líquido Geral:</span>
                <span className={`font-black ${totalLucroLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(totalLucroLiquido)}
                </span>
              </div>
            </div>

            {anyItemHasDeficit && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-[10px] font-bold text-center leading-relaxed">
                ⚠️ Aviso: Alguns produtos deste lote possuem déficit de insumos no estoque. O pedido poderá ser criado, mas a liberação para fabricação ficará bloqueada.
              </div>
            )}

            <button
              type="button"
              disabled={selectedItems.length === 0}
              onClick={() => onAbrirPedidoSimulado(selectedItems)}
              className={`w-full py-3.5 rounded-xl text-xs font-black tracking-wider flex justify-center items-center gap-1.5 transition-all shadow-sm ${
                selectedItems.length === 0
                  ? 'bg-outline-variant text-on-surface-variant cursor-not-allowed'
                  : 'bg-secondary hover:bg-secondary/90 text-white cursor-pointer hover:scale-[0.98]'
              }`}
            >
              <span className="material-symbols-outlined notranslate text-[18px]">shopping_bag</span>
              ABRIR PEDIDO COM ESTA SIMULAÇÃO
            </button>
          </div>
        </div>

      </div>

      {/* ================= MODAL AJUSTE DE MARGEM ================= */}
      {isConfigMargemOpen && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[1000] p-4 animate-fade-in">
          <form onSubmit={handleSaveMargemConfig} className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 border border-outline-variant text-xs space-y-4">
            <h3 className="text-sm font-black text-[#002046] uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined notranslate text-[20px]">tune</span> Configurar Margens
            </h3>
            <p className="text-outline text-[11px]">Ajuste os parâmetros limites para validação de descontos do SKU</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Mínimo Saudável (%)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={margemSaudavel} 
                  onChange={(e) => setMargemSaudavel(e.target.value)} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold focus:outline-none" 
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Limite Operacional (%)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={margemLimite} 
                  onChange={(e) => setMargemLimite(e.target.value)} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold focus:outline-none" 
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button 
                type="button" 
                onClick={() => setIsConfigMargemOpen(false)} 
                className="text-on-surface-variant hover:text-primary font-bold px-4 py-2 rounded-lg cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                className="bg-[#002046] hover:bg-[#1b365d] text-white font-bold px-4 py-2 rounded-lg cursor-pointer shadow-xs"
              >
                Salvar Configurações
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
