"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../contexts/PermissionsContext';
import LoadingOverlay from './LoadingOverlay';
import { CustoFixo, TituloFinanceiro, PrecificacaoParametros, EstadoTributo } from '../types';
import FormacaoPrecoScreen from './FormacaoPrecoScreen';
import MatrizFiscalScreen from './MatrizFiscalScreen';
import ApuracaoFiscalScreen from './ApuracaoFiscalScreen';

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

export default function FinanceiroScreen() {
  const supabase = createClient();
  const { addToast } = useToast();
  const { canAccess } = usePermissions();

  const [activeTab, setActiveTab] = useState<'DRE' | 'CAIXA' | 'PEDIDOS' | 'COMISSOES' | 'ESTADOS' | 'PRECIFICACAO' | 'FISCAL' | 'APURACAO_FISCAL'>('DRE');
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState<any[]>([]);
  const [approvingOrderId, setApprovingOrderId] = useState<string | null>(null);

  // Filtros
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  // Estação 4: Comissões States
  const [vendedores, setVendedores] = useState<any[]>([]);
  const [pedidosComissao, setPedidosComissao] = useState<any[]>([]);
  const [detalheVendedorId, setDetalheVendedorId] = useState<string | null>(null);

  // Estação 5: Estados/Tributos States
  const [estadosTributos, setEstadosTributos] = useState<EstadoTributo[]>([]);
  const [editingEstadoId, setEditingEstadoId] = useState<string | null>(null);
  const [editingAliquota, setEditingAliquota] = useState('');

  // Estação 1: DRE States
  const [custosFixos, setCustosFixos] = useState<CustoFixo[]>([]);
  const [dreData, setDreData] = useState({
    receitaBruta: 0,
    custoVariavel: 0,
    custoFixo: 0,
    lucroLiquido: 0,
    producaoTotal: 0,
    rateioCustoFixo: 0
  });

  // Modal Novo Custo Fixo
  const [isAddCustoFixoOpen, setIsAddCustoFixoOpen] = useState(false);
  const [novoCustoFixo, setNovoCustoFixo] = useState({ descricao: '', valor: '', dia_vencimento: '5' });

  // Estação 2: Formação de Preço States
  const [familias, setFamilias] = useState<any[]>([]);
  const [skus, setSkus] = useState<any[]>([]);
  const [boms, setBoms] = useState<any[]>([]);
  const [insumos, setInsumos] = useState<any[]>([]);
  const [parametrosPreco, setParametrosPreco] = useState<PrecificacaoParametros[]>([]);
  
  // Calculadora
  const [calcSkuId, setCalcSkuId] = useState('');
  const [calcMargem, setCalcMargem] = useState('20.00');
  const [calcTributaria, setCalcTributaria] = useState('18.00');
  const [simulatedPrice, setSimulatedPrice] = useState<number>(0);
  const [simulatedDiscount, setSimulatedDiscount] = useState<number>(0); // em %

  // Configurações Globais Financeiras (Fase 8)
  const [configFin, setConfigFin] = useState<any>(null);
  const [margemAlvoEstavel, setMargemAlvoEstavel] = useState('30.00');
  const [margemRiscoInstavel, setMargemRiscoInstavel] = useState('15.00');
  const [isCalculadoraOpen, setIsCalculadoraOpen] = useState(false);
  const [entradasEstoque, setEntradasEstoque] = useState<any[]>([]);

  // Estação 3: Fluxo de Caixa States
  const [titulos, setTitulos] = useState<TituloFinanceiro[]>([]);
  const [saldoInicial, setSaldoInicial] = useState<number>(0);
  const [isEditingSaldoInicial, setIsEditingSaldoInicial] = useState(false);
  const [novoSaldoInicial, setNovoSaldoInicial] = useState('');
  const [caixaSubTab, setCaixaSubTab] = useState<'RECEBER' | 'PAGAR'>('RECEBER');

  // Modal Novo Lançamento Manual (Título)
  const [isAddTituloOpen, setIsAddTituloOpen] = useState(false);
  const [novoTitulo, setNovoTitulo] = useState({
    tipo: 'PAGAR',
    descricao: '',
    valor: '',
    data_vencimento: ''
  });

  // Modal de Factoring
  const [factoringTituloId, setFactoringTituloId] = useState<string | null>(null);
  const [taxaDesagio, setTaxaDesagio] = useState('');
  const [confirmText, setConfirmText] = useState('');

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

      // --- 0. CARREGAR PRECIFICAÇÃO E DADOS BASE ---
      const { data: fams } = await supabase.from('familias_produto').select('*').is('deleted_at', null).order('nome');
      const { data: skusList } = await supabase.from('skus').select('*').is('deleted_at', null).order('codigo');
      const { data: bomList } = await supabase.from('bom').select('*');
      const { data: insumosList } = await supabase.from('insumos').select('*');
      const { data: params } = await supabase.from('precificacao_parametros').select('*').eq('empresa_id', profile.empresa_id);

      if (fams) setFamilias(fams);
      if (skusList) setSkus(skusList);
      if (bomList) setBoms(bomList);
      if (insumosList) setInsumos(insumosList);
      if (params) setParametrosPreco(params);

      const { data: cFin } = await supabase.from('configuracoes_financeiras').select('*').eq('empresa_id', profile.empresa_id).single();
      if (cFin) {
        setConfigFin(cFin);
        setMargemAlvoEstavel(cFin.margem_alvo_estavel.toString());
        setMargemRiscoInstavel(cFin.margem_risco_instavel.toString());
      }

      const { data: entradasList } = await supabase.from('entradas_estoque').select('*, insumos(nome)').eq('empresa_id', profile.empresa_id).order('data_entrada', { ascending: false }).limit(30);
      if (entradasList) setEntradasEstoque(entradasList);

      // --- 1. CARREGAR DRE ---
      // A) Custos Fixos
      const startIso = startDate.toISOString().split('T')[0];
      const endIso = endDate.toISOString().split('T')[0];

      const { data: fixos } = await supabase
        .from('custos_fixos')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .gte('competencia_mes', startIso)
        .lte('competencia_mes', endIso);
      
      const listFixos = (fixos || []) as CustoFixo[];
      setCustosFixos(listFixos);
      const totalFixo = listFixos.reduce((acc, curr) => acc + Number(curr.valor_mensal), 0);

      // B) Faturamento Realizado (Pedidos finalizados ou ativos no mês)
      const { data: pedidosFaturamento } = await supabase
        .from('pedidos')
        .select('*, ordens_producao(*)')
        .eq('empresa_id', profile.empresa_id)
        .in('status', ['FINALIZADO', 'ATIVO'])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());

      let totalFaturado = 0;
      let totalComissao = 0;
      (pedidosFaturamento || []).forEach(p => {
        let fatPedido = 0;
        (p.ordens_producao || []).forEach((op: any) => {
          fatPedido += op.quantidade_planejada * (Number(op.preco_venda_unitario) || 0);
        });
        totalFaturado += fatPedido;
        const percComissao = Number(p.comissao_venda_percentual) || 0;
        totalComissao += fatPedido * (percComissao / 100);
      });

      // C) Custos Variáveis (Consumo real FIFO de OPs concluídas + custos estimados de OPs ativas)
      const { data: opsConcluidas } = await supabase
        .from('ordens_producao')
        .select('id, quantidade_produzida')
        .eq('empresa_id', profile.empresa_id)
        .eq('status', 'FINALIZADA')
        .gte('data_fim', startDate.toISOString())
        .lte('data_fim', endDate.toISOString());

      const opIdsConcluidas = (opsConcluidas || []).map(op => op.id);
      let totalVariavel = 0;
      
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

      if (opIdsConcluidas.length > 0) {
        const { data: consumos } = await supabase
          .from('ordem_producao_consumos')
          .select('valor_total')
          .in('ordem_producao_id', opIdsConcluidas);
        
        if (consumos) {
          totalVariavel = consumos.reduce((acc, curr) => acc + Number(curr.valor_total), 0);
        }
      }

      // Adicionar custos estimados de produção para OPs de pedidos ativos/finalizados criados no mês que não estão concluídas
      let totalEstimadoAtivos = 0;
      (pedidosFaturamento || []).forEach(p => {
        (p.ordens_producao || []).forEach((op: any) => {
          if (op.status !== 'FINALIZADA') {
            const costBaseUnit = calculateSKUCustoBaseLocal(
              op.sku_id,
              skusList || [],
              fams || [],
              bomList || [],
              insumosList || []
            );
            totalEstimadoAtivos += op.quantidade_planejada * costBaseUnit;
          }
        });
      });

      totalVariavel += totalEstimadoAtivos;
      totalVariavel += totalComissao;

      setDreData({
        receitaBruta: totalFaturado,
        custoVariavel: totalVariavel,
        custoFixo: totalFixo,
        lucroLiquido: totalFaturado - totalVariavel - totalFixo,
        producaoTotal: totalPecasProduzidas,
        rateioCustoFixo: totalPecasProduzidas > 0 ? totalFixo / totalPecasProduzidas : 0
      });

      // --- 3. CARREGAR FLUXO DE CAIXA ---
      const { data: configSaldo } = await supabase.from('fluxo_caixa_config').select('saldo_inicial').eq('empresa_id', profile.empresa_id).maybeSingle();
      setSaldoInicial(Number(configSaldo?.saldo_inicial) || 0);

      const { data: tList } = await supabase
        .from('titulos_financeiros')
        .select(`
          *,
          clientes(razao_social),
          fornecedores(nome),
          pedidos(
            codigo,
            clientes(razao_social),
            ordens_producao(
              quantidade_planejada,
              skus(
                comprimento_mm,
                familias_produto(nome)
              )
            )
          )
        `)
        .eq('empresa_id', profile.empresa_id)
        .order('data_vencimento', { ascending: true });
      
      if (tList) setTitulos(tList as unknown as TituloFinanceiro[]);

      // --- 4. CARREGAR PEDIDOS PENDENTES DE APROVAÇÃO FINANCEIRA ---
      const { data: pendingPeds } = await supabase
        .from('pedidos')
        .select('*, clientes(razao_social), ordens_producao(*, skus(*, familias_produto(*)))')
        .eq('empresa_id', profile.empresa_id)
        .eq('status', 'AGUARDANDO_APROVACAO')
        .order('created_at', { ascending: true });
      setPendingOrders(pendingPeds || []);

      // --- 5. CARREGAR ESTADOS/TRIBUTOS E VENDEDORES/COMISSÕES ---
      const { data: estadosTributosList } = await supabase
        .from('estados_tributos')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('uf');
      if (estadosTributosList) setEstadosTributos(estadosTributosList);

      const { data: vendedoresList } = await supabase
        .from('funcionarios')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .eq('vendedor', true)
        .order('nome');
      if (vendedoresList) setVendedores(vendedoresList);

      const { data: pedidosComissaoList } = await supabase
        .from('pedidos')
        .select('*, clientes(razao_social), funcionarios:vendedor_id(id, nome, cpf), ordens_producao(*)')
        .eq('empresa_id', profile.empresa_id)
        .in('status', ['ATIVO', 'FINALIZADO'])
        .gte('created_at', startDate.toISOString())
        .lte('created_at', endDate.toISOString());
      if (pedidosComissaoList) setPedidosComissao(pedidosComissaoList);

    } catch (err: any) {
      console.error('Erro ao carregar dados financeiros:', err);
      addToast('Erro ao carregar os dados: ' + err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedMonth]);

  // --- CÁLCULO CUSTO BASE SKU ---
  const getSKUCustoBaseReal = (skuId: string) => {
    return calculateSKUCustoBaseLocal(skuId, skus, familias, boms, insumos);
  };

  // --- ACTIONS ---

  // Salvar Novo Custo Fixo
  const handleSaveCustoFixo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoCustoFixo.descricao.trim() || !novoCustoFixo.valor || !empresaId) return;

    try {
      const { startDate } = parseMonthDates(selectedMonth);
      const { error } = await supabase.from('custos_fixos').insert({
        empresa_id: empresaId,
        descricao: novoCustoFixo.descricao.trim(),
        valor_mensal: parseFloat(novoCustoFixo.valor),
        competencia_mes: startDate.toISOString().split('T')[0],
        dia_vencimento: parseInt(novoCustoFixo.dia_vencimento) || 5
      });

      if (error) throw error;
      setNovoCustoFixo({ descricao: '', valor: '', dia_vencimento: '5' });
      setIsAddCustoFixoOpen(false);
      loadData();
      addToast('Custo fixo adicionado!', 'success');
    } catch (err: any) {
      addToast('Erro ao salvar: ' + err.message, 'error');
    }
  };

  // Excluir Custo Fixo
  const handleDeleteCustoFixo = async (id: string) => {
    if (!window.confirm('Excluir este custo fixo?')) return;
    try {
      const { error } = await supabase.from('custos_fixos').delete().eq('id', id);
      if (error) throw error;
      loadData();
      addToast('Custo fixo removido.', 'success');
    } catch (err: any) {
      addToast('Erro ao excluir: ' + err.message, 'error');
    }
  };

  // Salvar Margens Globais
  const handleSaveMargensGlobais = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empresaId) return;

    try {
      const { error } = await supabase.from('configuracoes_financeiras').upsert({
        empresa_id: empresaId,
        margem_alvo_estavel: parseFloat(margemAlvoEstavel),
        margem_risco_instavel: parseFloat(margemRiscoInstavel)
      }, { onConflict: 'empresa_id' });

      if (error) throw error;
      loadData();
      addToast('Configurações de margem salvas!', 'success');
    } catch (err: any) {
      addToast('Erro ao salvar: ' + err.message, 'error');
    }
  };

  // Atualizar Saldo Inicial
  const handleSaveSaldoInicial = async () => {
    if (!novoSaldoInicial || !empresaId) return;
    try {
      // Remove pontos de milhar e troca vírgula decimal por ponto
      const strVal = novoSaldoInicial.replace(/\./g, '').replace(',', '.');
      const floatVal = parseFloat(strVal) || 0;

      const { error } = await supabase.from('fluxo_caixa_config').upsert({
        empresa_id: empresaId,
        saldo_inicial: floatVal
      }, { onConflict: 'empresa_id' });

      if (error) throw error;
      setSaldoInicial(floatVal);
      setIsEditingSaldoInicial(false);
      loadData();
      addToast('Saldo inicial atualizado!', 'success');
    } catch (err: any) {
      addToast('Erro ao salvar: ' + err.message, 'error');
    }
  };

  // Atualizar alíquota do Estado
  const handleSaveAliquota = async (id: string) => {
    const rate = parseFloat(editingAliquota);
    if (isNaN(rate) || rate < 0 || rate > 100) {
      addToast('A alíquota deve ser um número entre 0 e 100.', 'error');
      return;
    }
    try {
      const { error } = await supabase
        .from('estados_tributos')
        .update({ aliquota_imposto: rate })
        .eq('id', id);
      if (error) throw error;
      addToast('Alíquota atualizada com sucesso!', 'success');
      setEditingEstadoId(null);
      await loadData();
    } catch (err: any) {
      addToast('Erro ao atualizar alíquota: ' + err.message, 'error');
    }
  };

  // Novo Lançamento Manual (Título)
  const handleSaveTituloManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoTitulo.descricao || !novoTitulo.valor || !novoTitulo.data_vencimento || !empresaId) return;

    try {
      const { error } = await supabase.from('titulos_financeiros').insert({
        empresa_id: empresaId,
        tipo: novoTitulo.tipo,
        descricao: novoTitulo.descricao.trim(),
        valor: parseFloat(novoTitulo.valor),
        data_vencimento: novoTitulo.data_vencimento,
        status: 'PENDENTE'
      });

      if (error) throw error;
      setIsAddTituloOpen(false);
      setNovoTitulo({ tipo: 'PAGAR', descricao: '', valor: '', data_vencimento: '' });
      loadData();
      addToast('Lançamento financeiro criado!', 'success');
    } catch (err: any) {
      addToast('Erro ao lançar título: ' + err.message, 'error');
    }
  };

  // Liquidar/Quitar Título Manualmente
  const handleLiquidarTitulo = async (id: string, tipo: 'PAGO' | 'PENDENTE') => {
    try {
      const { error } = await supabase
        .from('titulos_financeiros')
        .update({ 
          status: tipo,
          data_liquidacao: tipo === 'PAGO' ? new Date().toISOString().split('T')[0] : null
        })
        .eq('id', id);
      if (error) throw error;
      loadData();
      addToast(tipo === 'PAGO' ? 'Título baixado/pago!' : 'Título reaberto.', 'success');
    } catch (err: any) {
      addToast('Erro ao liquidar título: ' + err.message, 'error');
    }
  };

  // Executar Factoring/Antecipação
  const handleFactoringSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!factoringTituloId || !taxaDesagio) return;

    if (confirmText !== 'CONFIRMAR') {
      addToast('Você deve digitar "CONFIRMAR" no input de segurança.', 'warning');
      return;
    }

    try {
      const { error } = await supabase.rpc('executar_factoring', {
        p_titulo_id: factoringTituloId,
        p_taxa_desagio: parseFloat(taxaDesagio)
      });

      if (error) throw error;
      setFactoringTituloId(null);
      setTaxaDesagio('');
      setConfirmText('');
      loadData();
      addToast('Título antecipado com sucesso!', 'success');
    } catch (err: any) {
      addToast('Erro ao antecipar título: ' + err.message, 'error');
    }
  };

  // Aprovar Pedido Financeiro
  const handleAprovarPedido = async (pedidoId: string) => {
    try {
      setApprovingOrderId(pedidoId);
      
      // 1. Atualiza o status do pedido para ATIVO
      const { error: errorPed } = await supabase
        .from('pedidos')
        .update({ status: 'ATIVO' })
        .eq('id', pedidoId);
      if (errorPed) throw errorPed;

      // 2. Atualiza o status das ordens_producao vinculadas para ABERTA
      const { error: errorOp } = await supabase
        .from('ordens_producao')
        .update({ status: 'ABERTA' })
        .eq('pedido_id', pedidoId);
      if (errorOp) throw errorOp;

      addToast('Pedido aprovado e enviado para produção com sucesso!', 'success');
      loadData();
    } catch (err: any) {
      console.error('Erro ao aprovar pedido:', err);
      addToast('Erro ao aprovar pedido: ' + err.message, 'error');
    } finally {
      setApprovingOrderId(null);
    }
  };

  // Rejeitar/Cancelar Pedido Financeiro
  const handleRejeitarPedido = async (pedidoId: string) => {
    if (!window.confirm('Tem certeza que deseja rejeitar/cancelar este pedido?')) return;
    try {
      setApprovingOrderId(pedidoId);

      const { error } = await supabase
        .from('pedidos')
        .update({ status: 'CANCELADO' })
        .eq('id', pedidoId);
      if (error) throw error;

      addToast('Pedido rejeitado e cancelado.', 'warning');
      loadData();
    } catch (err: any) {
      console.error('Erro ao rejeitar pedido:', err);
      addToast('Erro ao rejeitar pedido: ' + err.message, 'error');
    } finally {
      setApprovingOrderId(null);
    }
  };

  // --- CALCULADORA PREÇO CALCS ---
  const custoBaseCalc = calcSkuId ? getSKUCustoBaseReal(calcSkuId) : 0;
  const margemPercent = parseFloat(calcMargem) || 0;
  const tributosPercent = parseFloat(calcTributaria) || 0;
  const markupDivisor = 1 - (margemPercent + tributosPercent) / 100;
  const precoSugerido = markupDivisor > 0 ? custoBaseCalc / markupDivisor : 0;

  // Cor do Slider baseada nos limites de margem
  const getSliderColor = () => {
    const sku = skus.find(s => s.id === calcSkuId);
    if (!sku) return 'bg-[#74777f]';
    const params = parametrosPreco.find(p => p.familia_id === sku.familia_id);
    const limit = params ? Number(params.margem_operacional_limite) : 5;
    const healthy = params ? Number(params.margem_minima_saudavel) : 15;

    // Calcular margem simulada com o desconto
    // Simulated price = Sugerido - (Desconto %)
    const currentPriceSim = precoSugerido * (1 - simulatedDiscount / 100);
    // Margem real simulada = (Preço - Tributos - CustoBase) / Preço
    // Tributos sobre preço de venda simulado = currentPriceSim * tributosPercent / 100
    const tributosSim = currentPriceSim * (tributosPercent / 100);
    const margemSim = currentPriceSim > 0 ? ((currentPriceSim - tributosSim - custoBaseCalc) / currentPriceSim) * 100 : 0;

    if (margemSim >= healthy) return 'bg-green-600';
    if (margemSim >= limit) return 'bg-yellow-500';
    return 'bg-red-600';
  };

  const getSimulatedMargin = () => {
    const currentPriceSim = precoSugerido * (1 - simulatedDiscount / 100);
    const tributosSim = currentPriceSim * (tributosPercent / 100);
    return currentPriceSim > 0 ? ((currentPriceSim - tributosSim - custoBaseCalc) / currentPriceSim) * 100 : 0;
  };

  // --- CALCULA FLUXO DE CAIXA ACUMULADO ---
  const getTimelineProjections = () => {
    const projectionDays = 30;
    const timeline = [];
    let currentBalance = saldoInicial;
    
    // Agrupar lançamentos por dia
    const today = new Date();
    today.setHours(0,0,0,0);

    // Considerar títulos que já foram quitados no passado (para obter o saldo atual exato)
    const quitadosHistorico = titulos.filter(t => t.status === 'PAGO' || t.status === 'ANTECIPADO');
    // Saldo projetado dia a dia nos próximos 30 dias
    for (let i = 0; i <= projectionDays; i++) {
      const targetDay = new Date(today);
      targetDay.setDate(today.getDate() + i);
      const targetIso = targetDay.toISOString().split('T')[0];

      // Pegar entradas e saídas previstas ou líquidadas para este dia específico
      const titulosDoDia = titulos.filter(t => {
        if (t.status === 'PAGO' || t.status === 'ANTECIPADO') {
          return t.data_liquidacao === targetIso;
        } else {
          return t.data_vencimento === targetIso;
        }
      });

      const entradasDia = titulosDoDia
        .filter(t => t.tipo === 'RECEBER')
        .reduce((sum, t) => sum + t.valor, 0);

      const saidasDia = titulosDoDia
        .filter(t => t.tipo === 'PAGAR')
        .reduce((sum, t) => sum + t.valor, 0);

      currentBalance = currentBalance + entradasDia - saidasDia;

      timeline.push({
        dataStr: targetDay.toLocaleDateString('pt-BR'),
        entradas: entradasDia,
        saidas: saidasDia,
        saldo: currentBalance,
        critico: currentBalance < 0
      });
    }

    return timeline;
  };

  const timelineProjection = getTimelineProjections();
  const alertNCG = timelineProjection.find(d => d.saldo < 0);

  const getDesagioVal = (titulo: any) => {
    if (titulo.status !== 'ANTECIPADO') return 0;
    const desagioTitle = titulos.find(item => 
      item.tipo === 'PAGAR' && 
      item.pedido_id === titulo.pedido_id && 
      item.descricao?.includes('Deságio')
    );
    return desagioTitle ? Number(desagioTitle.valor) : 0;
  };

  const getFilteredTitulos = (tipo: 'RECEBER' | 'PAGAR', statusGrupo: 'PENDENTE' | 'LIQUIDADO') => {
    let filtered = titulos.filter(t => t.tipo === tipo && !t.descricao?.includes('Despesa Financeira / Deságio'));
    
    if (statusGrupo === 'PENDENTE') {
      filtered = filtered.filter(t => t.status === 'PENDENTE');
      return [...filtered].sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime());
    } else {
      filtered = filtered.filter(t => t.status === 'PAGO' || t.status === 'ANTECIPADO');
      return [...filtered].sort((a, b) => {
        const dateA = a.data_liquidacao || a.data_vencimento;
        const dateB = b.data_liquidacao || b.data_vencimento;
        return new Date(dateB).getTime() - new Date(dateA).getTime();
      });
    }
  };

  if (loading) {
    return <LoadingOverlay message="Carregando Módulo Financeiro..." />;
  }

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full gap-6 animate-fade-in relative">
      
      {/* HEADER E TABS */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-outline-variant/30 pb-4">
        <div>
          <h2 className="text-2xl font-black text-primary flex items-center gap-2">
            <span className="material-symbols-outlined notranslate text-secondary text-[32px]">payments</span>
            Cérebro Financeiro Industrial
          </h2>
          <p className="text-xs text-outline">Planejamento contábil, formação de preço e fluxo de caixa da Kore Industrial</p>
        </div>

        {/* Abas */}
        <div className="flex bg-surface-container p-1 rounded-xl shrink-0 self-start md:self-auto gap-1 flex-wrap">
          <button 
            onClick={() => setActiveTab('DRE')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'DRE' ? 'bg-[#002046] text-white' : 'text-on-surface hover:bg-surface-container-high'}`}
          >
            DRE & Custos Fixos
          </button>
          <button 
            onClick={() => setActiveTab('PEDIDOS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'PEDIDOS' ? 'bg-[#002046] text-white' : 'text-on-surface hover:bg-surface-container-high'}`}
          >
            Aprovação de Pedidos
          </button>
          <button 
            onClick={() => setActiveTab('CAIXA')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'CAIXA' ? 'bg-[#002046] text-white' : 'text-on-surface hover:bg-surface-container-high'}`}
          >
            Fluxo de Caixa & Factoring
          </button>
          <button 
            onClick={() => setActiveTab('COMISSOES')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'COMISSOES' ? 'bg-[#002046] text-white' : 'text-on-surface hover:bg-surface-container-high'}`}
          >
            Comissões
          </button>
          <button 
            onClick={() => setActiveTab('ESTADOS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'ESTADOS' ? 'bg-[#002046] text-white' : 'text-on-surface hover:bg-surface-container-high'}`}
          >
            Tributação por Estado
          </button>
          <button 
            onClick={() => setActiveTab('PRECIFICACAO')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'PRECIFICACAO' ? 'bg-[#002046] text-white' : 'text-on-surface hover:bg-surface-container-high'}`}
          >
            Precificação & Margens
          </button>
          <button 
            onClick={() => setActiveTab('FISCAL')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'FISCAL' ? 'bg-[#002046] text-white' : 'text-on-surface hover:bg-surface-container-high'}`}
          >
            Matriz Fiscal
          </button>
          <button 
            onClick={() => setActiveTab('APURACAO_FISCAL')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${activeTab === 'APURACAO_FISCAL' ? 'bg-secondary text-white' : 'text-on-surface hover:bg-surface-container-high'}`}
          >
            Apuração Mensal
          </button>
        </div>
      </div>

      {/* RENDER TAB DRE */}
      {activeTab === 'DRE' && (
        <div className="space-y-6">
          {/* Filtro de Mês */}
          <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant p-4 rounded-2xl w-fit">
            <label className="text-xs font-black text-primary uppercase">Mês de Competência:</label>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-outline-variant rounded-lg p-1.5 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#002046]"
            />
          </div>

          {/* Cards da DRE */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-xs">
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Receita Bruta (Pedidos)</p>
              <p className="text-2xl font-black text-green-700">{formatCurrency(dreData.receitaBruta)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-xs">
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Custos Variáveis (Insumos OPs)</p>
              <p className="text-2xl font-black text-red-600">{formatCurrency(dreData.custoVariavel)}</p>
            </div>
            <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-xs">
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Custos Fixos Totais</p>
              <p className="text-2xl font-black text-red-600">{formatCurrency(dreData.custoFixo)}</p>
            </div>
            <div className={`p-5 rounded-2xl border border-outline-variant shadow-xs ${dreData.lucroLiquido >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
              <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Lucro Líquido Real</p>
              <p className={`text-2xl font-black ${dreData.lucroLiquido >= 0 ? 'text-green-700' : 'text-red-700'}`}>{formatCurrency(dreData.lucroLiquido)}</p>
            </div>
          </div>

          {/* Rateio de Custo Fixo */}
          <div className="bg-[#f4f3f9] p-5 rounded-2xl border border-outline-variant flex flex-col md:flex-row justify-between items-center gap-4">
            <div>
              <h4 className="text-sm font-black text-primary">Rateio de Custo Fixo do Mês</h4>
              <p className="text-xs text-outline mt-0.5">Valor do Custo Fixo mensal diluído pela produção de hastes de fibra de vidro</p>
            </div>
            <div className="flex gap-8 items-center text-center">
              <div>
                <span className="text-[10px] font-bold text-outline uppercase block">Produção Total</span>
                <span className="text-lg font-black text-primary">{dreData.producaoTotal} pçs</span>
              </div>
              <div className="bg-secondary/15 px-4 py-2 rounded-xl border border-secondary/20">
                <span className="text-[10px] font-bold text-secondary uppercase block">Absorção por Haste</span>
                <span className="text-lg font-black text-secondary">{formatCurrency(dreData.rateioCustoFixo)} / pç</span>
              </div>
            </div>
          </div>

          {/* Seção Custos Fixos */}
          <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-xs">
            <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
              <div>
                <h4 className="text-sm font-black text-[#002046] uppercase">Demonstrativo Detalhado de Custos Fixos</h4>
                <p className="text-xs text-outline">Adicione os custos de aluguel, energia e equipe para esta competência</p>
              </div>
              {canAccess('gerenciar_custos_fixos') && (
                <button 
                  onClick={() => setIsAddCustoFixoOpen(true)}
                  className="bg-secondary hover:brightness-95 text-white font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                >
                  <span className="material-symbols-outlined notranslate text-[16px]">add</span> Adicionar Despesa
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant text-[#74777f] font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4">Descrição da Despesa</th>
                    <th className="p-4 w-40">Valor (R$)</th>
                    <th className="p-4 w-32">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 font-semibold text-[#002046]">
                  {custosFixos.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="p-8 text-center text-outline italic">Nenhum custo fixo lançado para este mês.</td>
                    </tr>
                  ) : (
                    custosFixos.map(cf => (
                      <tr key={cf.id} className="hover:bg-surface-container-low transition-colors">
                        <td className="p-4">{cf.descricao}</td>
                        <td className="p-4 font-black">{formatCurrency(cf.valor_mensal)}</td>
                        <td className="p-4">
                          {canAccess('gerenciar_custos_fixos') && (
                            <button 
                              onClick={() => handleDeleteCustoFixo(cf.id)}
                              className="text-red-600 hover:text-red-800 transition-colors flex items-center gap-1 cursor-pointer"
                            >
                              <span className="material-symbols-outlined notranslate text-[16px]">delete</span> Excluir
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB APROVACAO DE PEDIDOS */}
      {activeTab === 'PEDIDOS' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-xs">
            <div className="p-5 border-b border-outline-variant bg-surface-bright">
              <h4 className="text-sm font-black text-[#002046] uppercase">Pedidos Aguardando Liberação Financeira</h4>
              <p className="text-xs text-outline mt-0.5">Analise a margem de contribuição simulada e o break-even do lote antes de iniciar a fabricação</p>
            </div>

            <div className="divide-y divide-outline-variant/30">
              {pendingOrders.length === 0 ? (
                <p className="p-8 text-center text-outline italic text-xs">Nenhum pedido pendente de aprovação no momento.</p>
              ) : (
                pendingOrders.map(order => {
                  const sku = order.ordens_producao?.[0]?.skus;
                  let qty = 0;
                  let totalSale = 0;
                  let totalCostBase = 0;

                  (order.ordens_producao || []).forEach((op: any) => {
                    const itemQty = op.quantidade_planejada || 0;
                    qty += itemQty;
                    totalSale += itemQty * (op.preco_venda_unitario || 0);
                    const costBaseUnit = op.skus ? getSKUCustoBaseReal(op.skus.id) : 0;
                    totalCostBase += itemQty * costBaseUnit;
                  });

                  const commissionPercent = order.comissao_venda_percentual || 0;
                  const commissionVal = totalSale * (commissionPercent / 100);
                  
                  const taxesPercent = 18; 
                  const taxesVal = totalSale * (taxesPercent / 100);

                  const totalMarginVal = totalSale - totalCostBase - commissionVal - taxesVal;
                  const marginPercent = totalSale > 0 ? (totalMarginVal / totalSale) * 100 : 0;

                  const projectedTotal = dreData.producaoTotal + qty;
                  const fixedCostAbsorption = projectedTotal > 0 ? dreData.custoFixo / projectedTotal : 0;

                  const averagePriceUnit = qty > 0 ? totalSale / qty : 0;
                  const averageCostBaseUnit = qty > 0 ? totalCostBase / qty : 0;
                  
                  const averageUnitMarginVal = averagePriceUnit - averageCostBaseUnit - (averagePriceUnit * (commissionPercent / 100)) - (averagePriceUnit * (taxesPercent / 100));
                  const breakeven = averageUnitMarginVal > 0 ? Math.ceil(dreData.custoFixo / averageUnitMarginVal) : 0;

                  const totalFixedCostAlocado = qty * fixedCostAbsorption;
                  const orderLucroLiquido = totalSale - totalCostBase - commissionVal - taxesVal - totalFixedCostAlocado;
                  const unitLucroLiquido = qty > 0 ? orderLucroLiquido / qty : 0;

                  const isSaudavel = marginPercent >= 15;
                  const isLimite = marginPercent >= 5 && marginPercent < 15;

                  const formatDisplayDate = (dateVal: any) => {
                    if (!dateVal) return '-';
                    const datePart = typeof dateVal === 'string' ? dateVal.split('T')[0] : dateVal;
                    return new Date(datePart + 'T00:00:00').toLocaleDateString('pt-BR');
                  };

                  return (
                    <div key={order.id} className="p-6 space-y-4 hover:bg-surface-container-lowest transition-all">
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="font-mono text-sm font-black text-[#002046]">{order.codigo}</span>
                            <span className="px-2.5 py-0.5 rounded-md text-[8px] font-black uppercase bg-yellow-50 text-yellow-800 border border-yellow-200">
                              Aguardando Aprovação
                            </span>
                          </div>
                          <p className="text-xs font-bold text-[#002046] mt-1">{order.clientes?.razao_social || 'Cliente não informado'}</p>
                          <p className="text-[10px] text-[#74777f] font-semibold mt-0.5">
                            Cidade: {order.localizacao} | Emissão: {new Date(order.data_emissao || order.created_at).toLocaleDateString('pt-BR')}
                          </p>
                        </div>

                        <div className="flex gap-3 shrink-0">
                          <button
                            disabled={approvingOrderId === order.id}
                            onClick={() => setIsCalculadoraOpen(true)}
                            className="border border-[#002046] hover:bg-surface-container-low text-[#002046] font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
                          >
                            <span className="material-symbols-outlined notranslate text-[16px]">calculate</span> Simular Preço
                          </button>
                          <button
                            disabled={approvingOrderId === order.id}
                            onClick={() => handleRejeitarPedido(order.id)}
                            className="border border-outline-variant hover:bg-red-50 text-red-600 font-bold text-xs px-4 py-2.5 rounded-xl cursor-pointer transition-colors flex items-center gap-1.5 disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined notranslate text-[16px]">cancel</span> Cancelar Pedido
                          </button>
                          <button
                            disabled={approvingOrderId === order.id}
                            onClick={() => handleAprovarPedido(order.id)}
                            className="bg-[#002046] hover:bg-[#1b365d] text-white font-bold text-xs px-5 py-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-1.5 shadow-sm hover:scale-[0.98] disabled:opacity-50"
                          >
                            <span className="material-symbols-outlined notranslate text-[16px]">check_circle</span>
                            {approvingOrderId === order.id ? 'Aprovando...' : 'Aprovar & Iniciar OP'}
                          </button>
                        </div>
                      </div>

                      {/* Grade de Custos Reorganizada e Agrupada */}
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {/* Bloco 1: Totais Consolidados do Lote */}
                        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/60 flex flex-col justify-between">
                          <div>
                            <h5 className="text-[10px] font-black text-primary uppercase tracking-wider mb-3">Totais Consolidados do Lote</h5>
                            <div className="space-y-2 text-[11px]">
                              <div className="flex justify-between font-bold text-[#002046]">
                                <span>Valor do Pedido:</span>
                                <span>{formatCurrency(totalSale)}</span>
                              </div>
                              <div className="flex justify-between text-[#74777f]">
                                <span>Insumos (BOM):</span>
                                <span className="text-red-600">-{formatCurrency(totalCostBase)}</span>
                              </div>
                              <div className="flex justify-between text-[#74777f]">
                                <span>Impostos (18%):</span>
                                <span className="text-red-600">-{formatCurrency(taxesVal)}</span>
                              </div>
                              <div className="flex justify-between text-[#74777f]">
                                <span>Comissão ({commissionPercent}%):</span>
                                <span className="text-red-600">-{formatCurrency(commissionVal)}</span>
                              </div>
                              <div className="flex justify-between text-[#74777f]">
                                <span>Custo Fixo Alocado:</span>
                                <span className="text-red-600">-{formatCurrency(totalFixedCostAlocado)}</span>
                              </div>
                            </div>
                          </div>
                          <div className="mt-4 pt-3 border-t border-outline-variant/30 flex justify-between items-center">
                            <span className="text-[11px] font-black text-primary uppercase">Lucro Líquido Geral:</span>
                            <span className={`text-sm font-black ${orderLucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(orderLucroLiquido)}
                            </span>
                          </div>
                        </div>

                        {/* Bloco 2: Métricas Unitárias */}
                        <div className="lg:col-span-2 grid grid-cols-2 md:grid-cols-3 gap-3">
                          <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] font-bold text-[#74777f] uppercase block">Volume do Lote</span>
                              <span className="text-sm font-black text-[#002046] block mt-0.5">{qty.toLocaleString('pt-BR')} pçs</span>
                            </div>
                            <span className="text-[9px] text-[#74777f] block truncate mt-2">
                              {order.ordens_producao?.length > 1 
                                ? 'Lote Multi-Produtos' 
                                : `${sku?.familias_produto?.nome || 'Desconhecido'} - ${sku?.comprimento_mm ? sku.comprimento_mm + 'mm' : ''}`}
                            </span>
                          </div>

                          <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] font-bold text-[#74777f] uppercase block">Preço de Venda (Unit)</span>
                              <span className="text-sm font-black text-[#002046] block mt-0.5">{formatCurrency(averagePriceUnit)}</span>
                            </div>
                            <span className="text-[9px] text-[#74777f] block font-semibold mt-2">Preço Unitário Médio</span>
                          </div>

                          <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] font-bold text-[#74777f] uppercase block">Custo Unitário FIFO</span>
                              <span className="text-sm font-black text-red-600 block mt-0.5">-{formatCurrency(averageCostBaseUnit)}</span>
                            </div>
                            <span className="text-[9px] text-[#74777f] block font-semibold mt-2">Insumos FIFO Unitário</span>
                          </div>

                          <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] font-bold text-[#74777f] uppercase block">Margem Contribuição</span>
                              <span className={`text-sm font-black block mt-0.5 ${isSaudavel ? 'text-green-600' : isLimite ? 'text-yellow-600' : 'text-red-600'}`}>
                                {marginPercent.toFixed(2)}%
                              </span>
                            </div>
                            <span className="text-[9px] text-[#74777f] block font-semibold mt-2">Abs: {formatCurrency(totalMarginVal)}</span>
                          </div>

                          <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] font-bold text-[#74777f] uppercase block">Lucro Líquido / pç</span>
                              <span className={`text-sm font-black block mt-0.5 ${unitLucroLiquido >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(unitLucroLiquido)}
                              </span>
                            </div>
                            <span className="text-[9px] text-[#74777f] block font-semibold mt-2">Dedução Geral p/ Peça</span>
                          </div>

                          <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/30 flex flex-col justify-between">
                            <div>
                              <span className="text-[9px] font-bold text-[#74777f] uppercase block">Absorção Custo Fixo</span>
                              <span className="text-sm font-black text-secondary block mt-0.5">{formatCurrency(fixedCostAbsorption)}</span>
                            </div>
                            <span className="text-[9px] text-[#74777f] block font-semibold mt-2">PE: {breakeven > 0 ? `${breakeven.toLocaleString('pt-BR')} un` : '∞'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Info de Rodapé do Pedido */}
                      <div className="bg-surface-container-low p-3 rounded-xl border border-outline-variant/40 flex flex-wrap gap-x-6 gap-y-2 text-[10px] text-outline font-semibold">
                        <div>
                          Condição: <strong className="text-primary">{order.condicao_pagamento === 'A_VISTA' ? 'À Vista' : order.condicao_pagamento === '30_DIAS' ? '30 Dias' : order.condicao_pagamento === '30_60_90' ? '30/60/90 Dias' : 'Data Personalizada'}</strong>
                        </div>
                        {order.condicao_pagamento === 'PERSONALIZADA' && order.data_recebimento_personalizada && (
                          <div>
                            Recebimento Customizado: <strong className="text-primary">{formatDisplayDate(order.data_recebimento_personalizada)}</strong>
                          </div>
                        )}
                        <div>
                          Entrega Prevista: <strong className="text-primary">{formatDisplayDate(order.data_entrega)}</strong>
                        </div>
                        <div>
                          Comissão Comercial: <strong className="text-primary">{commissionPercent}%</strong> ({formatCurrency(commissionVal)})
                        </div>
                        <div>
                          Tributação Provisória (18%): <strong className="text-primary">{formatCurrency(taxesVal)}</strong>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB FLUXO DE CAIXA */}
      {activeTab === 'CAIXA' && (
        <div className="space-y-6">
          
          {/* Dashboard de Projeção */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Saldo Inicial e Atual */}
            <div className="bg-white p-5 rounded-2xl border border-outline-variant shadow-xs space-y-4">
              <div>
                <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Saldo de Caixa Inicial</p>
                {isEditingSaldoInicial ? (
                  <div className="flex gap-2 items-center">
                    <input 
                      type="text"
                      value={novoSaldoInicial}
                      onChange={(e) => setNovoSaldoInicial(e.target.value)}
                      placeholder="Ex: 50.000,00"
                      className="bg-[#f4f3f9] border border-outline-variant rounded-lg p-1.5 font-bold text-sm w-32 focus:outline-none"
                    />
                    <button onClick={handleSaveSaldoInicial} className="bg-secondary text-white px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer">Salvar</button>
                    <button onClick={() => setIsEditingSaldoInicial(false)} className="text-outline px-2 py-1.5 text-xs cursor-pointer">Cancelar</button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-black text-primary">{formatCurrency(saldoInicial)}</span>
                    {canAccess('gerenciar_custos_fixos') && (
                      <button 
                        onClick={() => {
                          setNovoSaldoInicial(String(saldoInicial));
                          setIsEditingSaldoInicial(true);
                        }}
                        className="text-outline hover:text-primary transition-colors cursor-pointer"
                      >
                        <span className="material-symbols-outlined notranslate text-[16px]">edit</span>
                      </button>
                    )}
                  </div>
                )}
              </div>

              <div>
                <p className="text-[10px] font-bold text-outline uppercase tracking-wider mb-1">Saldo Projetado Final (30 Dias)</p>
                {(() => {
                  const finalBalance = timelineProjection[timelineProjection.length - 1]?.saldo || 0;
                  return (
                    <span className={`text-2xl font-black ${finalBalance >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                      {formatCurrency(finalBalance)}
                    </span>
                  );
                })()}
              </div>
            </div>

            {/* Painel Alerta NCG */}
            <div className="md:col-span-2 bg-white p-5 rounded-2xl border border-outline-variant shadow-xs flex flex-col justify-between">
              <div>
                <h4 className="text-sm font-black text-[#002046] uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined notranslate text-secondary">notifications_active</span>
                  Gestão de Liquidez e NCG
                </h4>
                <p className="text-xs text-outline mt-0.5">Necessidade de Capital de Giro e análise de defasagem de prazos</p>
              </div>

              {alertNCG ? (
                <div className="bg-red-50 border border-red-200 p-4 rounded-xl text-red-700 flex items-start gap-3 mt-4">
                  <span className="material-symbols-outlined notranslate text-red-600">error</span>
                  <div>
                    <strong className="text-xs uppercase font-black block">Alerta Crítico de NCG</strong>
                    <p className="text-xs mt-0.5">A projeção indica que a conta ficará negativa em <strong className="text-red-800">{alertNCG.dataStr}</strong> com saldo de <strong className="text-red-800">{formatCurrency(alertNCG.saldo)}</strong>. É altamente recomendável antecipar títulos a receber.</p>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 p-4 rounded-xl text-green-700 flex items-start gap-3 mt-4">
                  <span className="material-symbols-outlined notranslate text-green-600">check_circle</span>
                  <div>
                    <strong className="text-xs uppercase font-black block">Saúde Financeira Operacional</strong>
                    <p className="text-xs mt-0.5">O capital de giro projetado para os próximos 30 dias é saudável. Não há previsão de inadimplência de saldo em conta.</p>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Duas Colunas: Títulos do Fluxo de Caixa / Antecipações Factoring */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Títulos / Lançamentos do Fluxo de Caixa */}
            <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-xs">
              <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
                <div>
                  <h4 className="text-sm font-black text-[#002046] uppercase">Controle de Contas a Pagar/Receber</h4>
                  <p className="text-[11px] text-outline">Listagem de títulos gerados automaticamente ou inseridos manualmente</p>
                </div>
                {canAccess('operar_fluxo_caixa') && (
                  <button 
                    onClick={() => setIsAddTituloOpen(true)}
                    className="bg-secondary hover:brightness-95 text-white font-bold text-xs px-3 py-2.5 rounded-xl cursor-pointer transition-all flex items-center gap-1 shadow-sm"
                  >
                    <span className="material-symbols-outlined notranslate text-[16px]">add</span> Novo Título
                  </button>
                )}
              </div>

              <div className="p-5 border-b border-outline-variant/30">
                {/* Abas de Contas a Pagar/Receber */}
                <div className="flex bg-[#f4f3f9] p-1 rounded-xl">
                  <button 
                    onClick={() => setCaixaSubTab('RECEBER')}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${caixaSubTab === 'RECEBER' ? 'bg-[#002046] text-white shadow-sm' : 'text-outline hover:text-[#002046]'}`}
                  >
                    Contas a Receber (Entradas)
                  </button>
                  <button 
                    onClick={() => setCaixaSubTab('PAGAR')}
                    className={`flex-1 py-2 text-xs font-black rounded-lg transition-all cursor-pointer ${caixaSubTab === 'PAGAR' ? 'bg-[#002046] text-white shadow-sm' : 'text-outline hover:text-[#002046]'}`}
                  >
                    Contas a Pagar (Saídas)
                  </button>
                </div>
              </div>

              <div className="overflow-y-auto max-h-[50vh]">
                {/* Títulos Pendentes */}
                <div className="bg-[#f4f3f9]/30 border-b px-4 py-2 text-[10px] font-black text-primary uppercase tracking-wider">
                  Títulos Pendentes
                </div>
                <div className="divide-y divide-outline-variant/30">
                  {getFilteredTitulos(caixaSubTab, 'PENDENTE').length === 0 ? (
                    <p className="p-4 text-center text-outline italic text-[11px]">Nenhum título pendente nesta carteira.</p>
                  ) : (
                    getFilteredTitulos(caixaSubTab, 'PENDENTE').map(t => {
                      const isVencido = new Date(t.data_vencimento) < new Date() && t.status === 'PENDENTE';
                      const formatLocal = (dateVal: any) => {
                        if (!dateVal) return '-';
                        const datePart = typeof dateVal === 'string' ? dateVal.split('T')[0] : dateVal;
                        return new Date(datePart + 'T00:00:00').toLocaleDateString('pt-BR');
                      };

                      let displayTitle = t.descricao;
                      let displaySubtitle = '';

                      if (t.pedidos) {
                        const client = t.pedidos.clientes?.razao_social || t.clientes?.razao_social || 'Cliente não informado';
                        displayTitle = `Cliente: ${client}`;
                        displaySubtitle = `Produto: ${(t.pedidos.ordens_producao || []).map((op: any) => `${op.skus?.familias_produto?.nome || 'Desconhecido'} (${op.quantidade_planejada} un)`).join(', ')}`;
                      } else if (t.clientes) {
                        displayTitle = `Cliente: ${t.clientes.razao_social}`;
                      } else if (t.fornecedores) {
                        displayTitle = `Fornecedor: ${t.fornecedores.nome}`;
                        displaySubtitle = t.descricao;
                      }

                      return (
                        <div key={t.id} className="p-4 flex justify-between items-center hover:bg-surface-container-low transition-colors text-left">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-[#002046]">{displayTitle}</span>
                              {isVencido ? (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-red-50 border border-red-200 text-red-700 uppercase animate-pulse">
                                  Atrasado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-yellow-50 border border-yellow-200 text-yellow-700 uppercase">
                                  Pendente
                                </span>
                              )}
                            </div>
                            {displaySubtitle && (
                              <p className="text-[10px] text-[#74777f] font-semibold">{displaySubtitle}</p>
                            )}
                            <div className="flex gap-4 text-[10px] text-outline mt-1 font-semibold">
                              <span>Vencimento: <strong className={isVencido ? 'text-red-600' : ''}>{formatLocal(t.data_vencimento)}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <span className="font-black text-xs text-[#002046]">{formatCurrency(t.valor)}</span>
                            {canAccess('operar_fluxo_caixa') && (
                              <button 
                                onClick={() => handleLiquidarTitulo(t.id, 'PAGO')}
                                className="bg-green-600 hover:bg-green-700 text-white font-bold text-[10px] px-2.5 py-1.5 rounded-md cursor-pointer select-none"
                              >
                                Baixar
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Títulos Liquidados / Pagos */}
                <div className="bg-[#f4f3f9]/30 border-t border-b px-4 py-2 text-[10px] font-black text-[#74777f] uppercase tracking-wider">
                  Histórico de Liquidações
                </div>
                <div className="divide-y divide-outline-variant/30">
                  {getFilteredTitulos(caixaSubTab, 'LIQUIDADO').length === 0 ? (
                    <p className="p-4 text-center text-outline italic text-[11px]">Nenhum título liquidado no histórico.</p>
                  ) : (
                    getFilteredTitulos(caixaSubTab, 'LIQUIDADO').map(t => {
                      const formatLocal = (dateVal: any) => {
                        if (!dateVal) return '-';
                        const datePart = typeof dateVal === 'string' ? dateVal.split('T')[0] : dateVal;
                        return new Date(datePart + 'T00:00:00').toLocaleDateString('pt-BR');
                      };

                      let displayTitle = t.descricao;
                      let displaySubtitle = '';

                      if (t.pedidos) {
                        const client = t.pedidos.clientes?.razao_social || t.clientes?.razao_social || 'Cliente não informado';
                        displayTitle = `Cliente: ${client}`;
                        displaySubtitle = `Produto: ${(t.pedidos.ordens_producao || []).map((op: any) => `${op.skus?.familias_produto?.nome || 'Desconhecido'} (${op.quantidade_planejada} un)`).join(', ')}`;
                      } else if (t.clientes) {
                        displayTitle = `Cliente: ${t.clientes.razao_social}`;
                      } else if (t.fornecedores) {
                        displayTitle = `Fornecedor: ${t.fornecedores.nome}`;
                        displaySubtitle = t.descricao;
                      }

                      const desagio = getDesagioVal(t);
                      const hasAntecipado = t.status === 'ANTECIPADO';
                      const valorLiquido = t.valor - desagio;

                      return (
                        <div key={t.id} className="p-4 flex justify-between items-center hover:bg-surface-container-low transition-colors text-left">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-xs text-[#002046]">{displayTitle}</span>
                              {hasAntecipado ? (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-blue-50 border border-blue-200 text-blue-700 uppercase">
                                  Antecipado
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black bg-green-50 border border-green-200 text-green-700 uppercase">
                                  Pago
                                </span>
                              )}
                            </div>
                            {displaySubtitle && (
                              <p className="text-[10px] text-[#74777f] font-semibold">{displaySubtitle}</p>
                            )}
                            <div className="flex gap-4 text-[10px] text-outline mt-1 font-semibold">
                              <span>Liquidação: <strong>{formatLocal(t.data_liquidacao || t.data_vencimento)}</strong></span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0 text-right">
                            <div>
                              {hasAntecipado ? (
                                <>
                                  <span className="font-black text-xs text-green-700 block">{formatCurrency(valorLiquido)}</span>
                                  <span className="text-[9px] text-[#74777f] block font-medium">Bruto: {formatCurrency(t.valor)}</span>
                                  <span className="text-[9px] text-red-600 block font-medium">Deságio: -{formatCurrency(desagio)}</span>
                                </>
                              ) : (
                                <span className={`font-black text-xs block ${t.tipo === 'RECEBER' ? 'text-green-700' : 'text-[#002046]'}`}>{formatCurrency(t.valor)}</span>
                              )}
                            </div>
                            
                            {canAccess('operar_fluxo_caixa') && (
                              <button 
                                onClick={() => handleLiquidarTitulo(t.id, 'PENDENTE')}
                                className="bg-surface-container-high hover:bg-surface-container-highest text-[#002046] font-bold text-[10px] px-2.5 py-1.5 rounded-md cursor-pointer select-none"
                              >
                                Reabrir
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Motor de Factoring (Títulos a Receber Futuros) */}
            <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-xs flex flex-col justify-between">
              <div>
                <div className="p-5 border-b border-outline-variant bg-surface-bright">
                  <h4 className="text-sm font-black text-[#002046] uppercase">Injeção de Liquidez (Risco Sacado / Factoring)</h4>
                  <p className="text-[11px] text-outline">Antecipe seus recebíveis pendentes para cobrir deficits operacionais</p>
                </div>

                <div className="overflow-y-auto max-h-[50vh] divide-y divide-outline-variant/30">
                  {titulos.filter(t => t.tipo === 'RECEBER' && t.status === 'PENDENTE').length === 0 ? (
                    <p className="p-8 text-center text-outline italic text-xs">Nenhum título a receber elegível para antecipação.</p>
                  ) : (
                    titulos
                      .filter(t => t.tipo === 'RECEBER' && t.status === 'PENDENTE')
                      .map(t => {
                        let displayTitle = t.descricao;
                        let displaySubtitle = '';

                        if (t.pedidos) {
                          const client = t.pedidos.clientes?.razao_social || t.clientes?.razao_social || 'Cliente não informado';
                          displayTitle = `Cliente: ${client}`;
                          displaySubtitle = `Produto: ${(t.pedidos.ordens_producao || []).map((op: any) => `${op.skus?.familias_produto?.nome || 'Desconhecido'} (${op.quantidade_planejada} un)`).join(', ')}`;
                        } else if (t.clientes) {
                          displayTitle = `Cliente: ${t.clientes.razao_social}`;
                        }

                        return (
                          <div key={t.id} className="p-4 flex justify-between items-center hover:bg-surface-container-low transition-colors text-left">
                            <div>
                              <span className="font-bold text-xs text-[#002046] block">{displayTitle}</span>
                              {displaySubtitle && (
                                <span className="text-[10px] text-[#74777f] font-semibold block mt-0.5">{displaySubtitle}</span>
                              )}
                              <span className="text-[9px] text-outline mt-1 font-semibold block">Vence em: {new Date(t.data_vencimento + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                            </div>
                            <div className="flex items-center gap-3 shrink-0">
                              <span className="font-black text-xs text-[#002046]">{formatCurrency(t.valor)}</span>
                              {canAccess('autorizar_factoring') && (
                                <button 
                                  onClick={() => {
                                    setFactoringTituloId(t.id);
                                    setTaxaDesagio('');
                                    setConfirmText('');
                                  }}
                                  className="bg-[#002046] hover:brightness-95 text-white font-bold text-[10px] px-3 py-1.5 rounded-lg cursor-pointer transition-all flex items-center gap-1 shadow-xs"
                                >
                                  <span className="material-symbols-outlined notranslate text-[14px]">price_change</span> Antecipar
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                  )}
                </div>
              </div>
            </div>

          </div>

        </div>
      )}

      {/* ================= ABA: COMISSOES ================= */}
      {activeTab === 'COMISSOES' && (
        <div className="space-y-6 animate-fade-in">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-6 rounded-2xl border border-outline-variant shadow-xs">
            <div>
              <h3 className="text-lg font-black text-primary uppercase">Comissões de Vendedores</h3>
              <p className="text-xs text-outline">Acompanhamento e apuração das comissões de vendas por vendedor e competência</p>
            </div>
            
            <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant p-3 rounded-xl">
              <label className="text-xs font-black text-primary uppercase">Mês de Competência:</label>
              <input 
                type="month" 
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-white border border-outline-variant rounded-lg p-1.5 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#002046]"
              />
            </div>
          </div>

          {!detalheVendedorId ? (
            <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-xs">
              <div className="p-5 border-b border-outline-variant bg-surface-bright">
                <h4 className="text-sm font-black text-[#002046] uppercase">Resumo de Vendedores no Período</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant text-[#74777f] font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-4">Vendedor</th>
                      <th className="p-4">CPF</th>
                      <th className="p-4 w-32 text-center">Pedidos no Mês</th>
                      <th className="p-4 w-44 text-right">Faturamento Geral</th>
                      <th className="p-4 w-44 text-right">Comissão a Pagar</th>
                      <th className="p-4 w-32 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 font-semibold text-[#002046]">
                    {vendedores.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="p-8 text-center text-outline italic">Nenhum vendedor cadastrado ou ativo.</td>
                      </tr>
                    ) : (
                      vendedores.map(vend => {
                        const stats = (() => {
                          const orders = pedidosComissao.filter(p => p.vendedor_id === vend.id);
                          let totalSalesVal = 0;
                          let totalCommissionVal = 0;
                          orders.forEach(p => {
                            let orderVal = 0;
                            (p.ordens_producao || []).forEach((op: any) => {
                              orderVal += op.quantidade_planejada * (Number(op.preco_venda_unitario) || 0);
                            });
                            totalSalesVal += orderVal;
                            const commPercent = Number(p.comissao_venda_percentual) || 0;
                            totalCommissionVal += orderVal * (commPercent / 100);
                          });
                          return {
                            count: orders.length,
                            sales: totalSalesVal,
                            commission: totalCommissionVal
                          };
                        })();

                        return (
                          <tr key={vend.id} className="hover:bg-surface-container-low transition-colors">
                            <td className="p-4 font-bold">{vend.nome}</td>
                            <td className="p-4 font-mono text-outline">{vend.cpf || 'Não informado'}</td>
                            <td className="p-4 text-center font-bold">{stats.count}</td>
                            <td className="p-4 text-right font-black text-primary">{formatCurrency(stats.sales)}</td>
                            <td className="p-4 text-right font-black text-green-700">{formatCurrency(stats.commission)}</td>
                            <td className="p-4 text-center">
                              <button
                                onClick={() => setDetalheVendedorId(vend.id)}
                                className="text-secondary hover:underline font-bold text-[10px] uppercase flex items-center gap-1 mx-auto cursor-pointer"
                              >
                                <span className="material-symbols-outlined notranslate text-[14px]">visibility</span> Detalhar
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                  {vendedores.length > 0 && (
                    <tfoot>
                      <tr className="bg-surface-container/30 border-t border-outline-variant font-black text-[#002046]">
                        <td colSpan={2} className="p-4 text-right uppercase">Total Acumulado:</td>
                        <td className="p-4 text-center">
                          {vendedores.reduce((acc, vend) => acc + pedidosComissao.filter(p => p.vendedor_id === vend.id).length, 0)}
                        </td>
                        <td className="p-4 text-right text-primary text-sm">
                          {formatCurrency(vendedores.reduce((acc, vend) => {
                            return acc + pedidosComissao.filter(p => p.vendedor_id === vend.id).reduce((sum, p) => {
                              return sum + (p.ordens_producao || []).reduce((opSum: number, op: any) => opSum + (op.quantidade_planejada * (Number(op.preco_venda_unitario) || 0)), 0);
                            }, 0);
                          }, 0))}
                        </td>
                        <td className="p-4 text-right text-green-700 text-sm">
                          {formatCurrency(vendedores.reduce((acc, vend) => {
                            return acc + pedidosComissao.filter(p => p.vendedor_id === vend.id).reduce((sum, p) => {
                              const orderVal = (p.ordens_producao || []).reduce((opSum: number, op: any) => opSum + (op.quantidade_planejada * (Number(op.preco_venda_unitario) || 0)), 0);
                              return sum + (orderVal * ((Number(p.comissao_venda_percentual) || 0) / 100));
                            }, 0);
                          }, 0))}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-xs">
              <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
                <div>
                  <h4 className="text-sm font-black text-[#002046] uppercase">
                    Vendas de {vendedores.find(v => v.id === detalheVendedorId)?.nome}
                  </h4>
                  <p className="text-[10px] text-outline uppercase font-mono mt-1">
                    CPF: {vendedores.find(v => v.id === detalheVendedorId)?.cpf || 'Não informado'}
                  </p>
                </div>
                <button
                  onClick={() => setDetalheVendedorId(null)}
                  className="bg-[#f4f3f9] hover:bg-[#e4e3e9] text-[#002046] border border-outline-variant font-bold text-xs px-4 py-2 rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                >
                  <span className="material-symbols-outlined notranslate text-[16px]">arrow_back</span> Voltar
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-container border-b border-outline-variant text-[#74777f] font-bold uppercase tracking-wider text-[10px]">
                      <th className="p-4">Código do Pedido</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Data de Emissão</th>
                      <th className="p-4 w-32 text-center">Status</th>
                      <th className="p-4 w-44 text-right">Faturamento do Pedido</th>
                      <th className="p-4 w-32 text-center">Comissão %</th>
                      <th className="p-4 w-44 text-right">Valor da Comissão</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/40 font-semibold text-[#002046]">
                    {(() => {
                      const vPeds = pedidosComissao.filter(p => p.vendedor_id === detalheVendedorId);
                      if (vPeds.length === 0) {
                        return (
                          <tr>
                            <td colSpan={7} className="p-8 text-center text-outline italic">Nenhum pedido faturado para este vendedor neste mês.</td>
                          </tr>
                        );
                      }
                      return vPeds.map(p => {
                        const orderVal = (p.ordens_producao || []).reduce((sum: number, op: any) => sum + (op.quantidade_planejada * (Number(op.preco_venda_unitario) || 0)), 0);
                        const commPercent = Number(p.comissao_venda_percentual) || 0;
                        const commVal = orderVal * (commPercent / 100);

                        return (
                          <tr key={p.id} className="hover:bg-surface-container-low transition-colors">
                            <td className="p-4 font-mono font-bold text-primary">{p.codigo}</td>
                            <td className="p-4">{p.clientes?.razao_social || 'Cliente não identificado'}</td>
                            <td className="p-4">{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                            <td className="p-4 text-center">
                              <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                                p.status === 'FINALIZADO' 
                                  ? 'bg-green-50 text-green-700 border border-green-200' 
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {p.status}
                              </span>
                            </td>
                            <td className="p-4 text-right font-black text-[#002046]">{formatCurrency(orderVal)}</td>
                            <td className="p-4 text-center font-bold text-secondary">{commPercent}%</td>
                            <td className="p-4 text-right font-black text-green-700">{formatCurrency(commVal)}</td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                  {pedidosComissao.filter(p => p.vendedor_id === detalheVendedorId).length > 0 && (
                    <tfoot>
                      <tr className="bg-surface-container/30 border-t border-outline-variant font-black text-[#002046]">
                        <td colSpan={4} className="p-4 text-right uppercase">Total:</td>
                        <td className="p-4 text-right text-primary text-sm">
                          {formatCurrency(pedidosComissao.filter(p => p.vendedor_id === detalheVendedorId).reduce((acc, p) => {
                            return acc + (p.ordens_producao || []).reduce((sum: number, op: any) => sum + (op.quantidade_planejada * (Number(op.preco_venda_unitario) || 0)), 0);
                          }, 0))}
                        </td>
                        <td></td>
                        <td className="p-4 text-right text-green-700 text-sm">
                          {formatCurrency(pedidosComissao.filter(p => p.vendedor_id === detalheVendedorId).reduce((acc, p) => {
                            const orderVal = (p.ordens_producao || []).reduce((sum: number, op: any) => sum + (op.quantidade_planejada * (Number(op.preco_venda_unitario) || 0)), 0);
                            return acc + (orderVal * ((Number(p.comissao_venda_percentual) || 0) / 100));
                          }, 0))}
                        </td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= ABA: TRIBUTACAO POR ESTADO ================= */}
      {activeTab === 'ESTADOS' && (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-white p-6 rounded-2xl border border-outline-variant shadow-xs">
            <h3 className="text-lg font-black text-primary uppercase">Alíquotas Tributárias por Estado</h3>
            <p className="text-xs text-outline mt-1">
              Defina os percentuais de impostos cobrados para cada Estado (UF) do Brasil. Estes valores são carregados automaticamente na simulação de formação de preço.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-outline-variant overflow-hidden shadow-xs">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container border-b border-outline-variant text-[#74777f] font-bold uppercase tracking-wider text-[10px]">
                    <th className="p-4 w-28 text-center">Sigla (UF)</th>
                    <th className="p-4">Nome do Estado</th>
                    <th className="p-4 w-60 text-right pr-12">Alíquota de Imposto (%)</th>
                    <th className="p-4 w-44 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/40 font-semibold text-[#002046]">
                  {estadosTributos.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-8 text-center text-outline italic">Carregando estados...</td>
                    </tr>
                  ) : (
                    estadosTributos.map(est => {
                      const isEditing = editingEstadoId === est.id;
                      return (
                        <tr key={est.id} className="hover:bg-surface-container-low transition-colors h-14">
                          <td className="p-4 text-center font-mono font-black text-sm text-secondary">{est.uf}</td>
                          <td className="p-4 text-sm">{est.nome}</td>
                          <td className="p-4 text-right pr-12">
                            {isEditing ? (
                              <div className="flex justify-end items-center gap-1.5 w-36 ml-auto">
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  max="100"
                                  value={editingAliquota}
                                  onChange={(e) => setEditingAliquota(e.target.value)}
                                  className="w-20 bg-[#f4f3f9] border border-outline-variant rounded-lg p-1.5 font-black text-right focus:outline-none focus:border-secondary text-xs"
                                  autoFocus
                                />
                                <span className="font-bold text-outline">%</span>
                              </div>
                            ) : (
                              <span className="font-black text-sm text-[#002046]">{est.aliquota_imposto}%</span>
                            )}
                          </td>
                          <td className="p-4 text-center">
                            {isEditing ? (
                              <div className="flex justify-center gap-2">
                                <button
                                  onClick={() => handleSaveAliquota(est.id)}
                                  className="bg-green-700 hover:bg-green-800 text-white p-1.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                                  title="Salvar"
                                >
                                  <span className="material-symbols-outlined notranslate text-[16px]">check</span>
                                </button>
                                <button
                                  onClick={() => setEditingEstadoId(null)}
                                  className="bg-surface-container-high hover:bg-outline-variant/30 text-[#74777f] p-1.5 rounded-lg flex items-center justify-center transition-colors cursor-pointer"
                                  title="Cancelar"
                                >
                                  <span className="material-symbols-outlined notranslate text-[16px]">close</span>
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => {
                                  setEditingEstadoId(est.id);
                                  setEditingAliquota(String(est.aliquota_imposto));
                                }}
                                className="bg-[#f4f3f9] hover:bg-[#e4e3e9] text-[#002046] border border-outline-variant font-bold text-[10px] px-3.5 py-1.5 rounded-lg transition-all cursor-pointer flex items-center gap-1 mx-auto"
                              >
                                <span className="material-symbols-outlined notranslate text-[14px]">edit</span> Editar
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ================= MODAL CUSTO FIXO ================= */}
      {isAddCustoFixoOpen && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[1000] p-4 animate-fade-in">
          <form onSubmit={handleSaveCustoFixo} className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 border border-outline-variant text-xs space-y-4">
            <h3 className="text-sm font-black text-[#002046] uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined notranslate text-[20px]">add_circle</span> Lançar Custo Fixo
            </h3>
            
            <div>
              <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Descrição</label>
              <input 
                type="text" 
                required 
                value={novoCustoFixo.descricao} 
                onChange={(e) => setNovoCustoFixo({ ...novoCustoFixo, descricao: e.target.value })} 
                className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                placeholder="Ex: Aluguel do Galpão A"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Valor Mensal (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={novoCustoFixo.valor} 
                  onChange={(e) => setNovoCustoFixo({ ...novoCustoFixo, valor: e.target.value })} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                  placeholder="Ex: 8500.00"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Dia de Vencimento</label>
                <input 
                  type="number" 
                  min="1"
                  max="31"
                  required 
                  value={novoCustoFixo.dia_vencimento} 
                  onChange={(e) => setNovoCustoFixo({ ...novoCustoFixo, dia_vencimento: e.target.value })} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                  placeholder="Ex: 5"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-secondary hover:brightness-95 text-white font-bold py-2.5 rounded-lg text-xs cursor-pointer">
                Lançar Despesa
              </button>
              <button type="button" onClick={() => setIsAddCustoFixoOpen(false)} className="flex-1 bg-[#f4f3f9] hover:bg-[#e4e3e9] text-[#002046] font-bold py-2.5 rounded-lg text-xs cursor-pointer">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}


      {/* ================= MODAL NOVO TÍTULO ================= */}
      {isAddTituloOpen && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[1000] p-4 animate-fade-in">
          <form onSubmit={handleSaveTituloManual} className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 border border-outline-variant text-xs space-y-4">
            <h3 className="text-sm font-black text-[#002046] uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined notranslate text-[20px]">add_box</span> Novo Lançamento Financeiro
            </h3>
            
            <div>
              <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Tipo de Lançamento</label>
              <select 
                value={novoTitulo.tipo} 
                onChange={(e) => setNovoTitulo({ ...novoTitulo, tipo: e.target.value })}
                className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none"
              >
                <option value="PAGAR">CONTAS A PAGAR (Saída)</option>
                <option value="RECEBER">CONTAS A RECEBER (Entrada)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Descrição</label>
              <input 
                type="text" 
                required 
                value={novoTitulo.descricao} 
                onChange={(e) => setNovoTitulo({ ...novoTitulo, descricao: e.target.value })} 
                className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                placeholder="Ex: Pagamento Fornecedor XYZ"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Valor (R$)</label>
                <input 
                  type="number" 
                  step="0.01" 
                  required 
                  value={novoTitulo.valor} 
                  onChange={(e) => setNovoTitulo({ ...novoTitulo, valor: e.target.value })} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                  placeholder="Ex: 1500.00"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Vencimento</label>
                <input 
                  type="date" 
                  required 
                  value={novoTitulo.data_vencimento} 
                  onChange={(e) => setNovoTitulo({ ...novoTitulo, data_vencimento: e.target.value })} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-[#002046] focus:outline-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button type="submit" className="flex-1 bg-secondary hover:brightness-95 text-white font-bold py-2.5 rounded-lg text-xs cursor-pointer">
                Lançar
              </button>
              <button type="button" onClick={() => setIsAddTituloOpen(false)} className="flex-1 bg-[#f4f3f9] hover:bg-[#e4e3e9] text-[#002046] font-bold py-2.5 rounded-lg text-xs cursor-pointer">
                Cancelar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ================= MODAL FACTORING (ANTECIPAÇÃO COM HARD CONFIRM) ================= */}
      {factoringTituloId && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[1000] p-4 animate-fade-in">
          <form onSubmit={handleFactoringSubmit} className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 border border-outline-variant text-xs space-y-4">
            <h3 className="text-sm font-black text-[#002046] uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined notranslate text-[20px] text-blue-600">price_change</span>
              Autorizar Antecipação de Recebível
            </h3>

            {(() => {
              const t = titulos.find(x => x.id === factoringTituloId);
              if (!t) return null;
              const d = parseFloat(taxaDesagio) || 0;
              const netValue = t.valor - d;
              return (
                <>
                  <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/60 text-[11px] font-semibold text-[#002046] space-y-2">
                    <p>
                      Título: <strong>
                        {t.pedidos 
                          ? `Cliente: ${t.pedidos.clientes?.razao_social || t.clientes?.razao_social || 'Cliente'}` 
                          : t.fornecedores 
                            ? `Fornecedor: ${t.fornecedores?.nome}` 
                            : t.descricao}
                      </strong>
                    </p>
                    {t.pedidos && (
                      <p>
                        Produto: <strong>
                          {(t.pedidos.ordens_producao || []).map((op: any) => `${op.skus?.familias_produto?.nome || 'Desconhecido'} (${op.quantidade_planejada} un)`).join(', ')}
                        </strong>
                      </p>
                    )}
                    <p>Valor Original: <strong>{formatCurrency(t.valor)}</strong></p>
                    <div className="border-t border-outline-variant/50 pt-2 flex justify-between items-center text-secondary">
                      <span>Valor Líquido Injetado:</span>
                      <strong className="text-sm font-black">{formatCurrency(netValue >= 0 ? netValue : 0)}</strong>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Taxa de Deságio cobrada pelo Banco / Factoring (R$)</label>
                    <input 
                      type="number"
                      step="0.01"
                      required
                      value={taxaDesagio}
                      onChange={(e) => setTaxaDesagio(e.target.value)}
                      className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none"
                      placeholder="Ex: 500.00"
                    />
                  </div>

                  {/* Escudo de Segurança - Hard Confirm */}
                  <div className="bg-red-50 border border-red-200 p-4 rounded-xl space-y-3">
                    <p className="text-[10px] font-bold text-red-700 uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined notranslate text-[14px]">shield</span>
                      Escudo de Segurança de Governança
                    </p>
                    <p className="text-[10px] text-red-600 font-semibold leading-relaxed">
                      A antecipação de recebíveis consolida um deságio financeiro irreversível. Para autorizar a injeção imediata de liquidez, digite a palavra <strong className="font-black text-red-700">CONFIRMAR</strong> no campo abaixo:
                    </p>
                    <input 
                      type="text"
                      required
                      value={confirmText}
                      onChange={(e) => setConfirmText(e.target.value)}
                      className="w-full bg-white border border-red-300 rounded-lg p-2 font-black tracking-widest text-[#002046] text-center focus:outline-none focus:ring-1 focus:ring-red-500 uppercase"
                      placeholder="CONFIRMAR"
                    />
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button 
                      type="submit" 
                      disabled={confirmText !== 'CONFIRMAR'}
                      className="flex-1 bg-[#002046] hover:brightness-95 text-white font-bold py-2.5 rounded-lg text-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none"
                    >
                      Autorizar Antecipação
                    </button>
                    <button 
                      type="button" 
                      onClick={() => {
                        setFactoringTituloId(null);
                        setTaxaDesagio('');
                        setConfirmText('');
                      }}
                      className="bg-[#f4f3f9] hover:bg-[#e4e3e9] text-[#002046] font-bold px-4 py-2.5 rounded-lg text-xs cursor-pointer select-none"
                    >
                      Cancelar
                    </button>
                  </div>
                </>
              );
            })()}
          </form>
        </div>
      )}

      {/* ================= ABA: PRECIFICACAO ================= */}
      {activeTab === 'PRECIFICACAO' && (
        <div className="flex flex-col lg:flex-row gap-6 animate-fade-in pb-20">
          
          <div className="lg:w-1/3 flex flex-col gap-6">
            <div className="bg-white rounded-2xl p-6 border border-outline-variant shadow-xs">
              <div className="flex items-center gap-2 mb-4 text-[#002046]">
                <span className="material-symbols-outlined notranslate text-[24px]">settings_suggest</span>
                <h3 className="text-lg font-black uppercase">Metas de Margem</h3>
              </div>
              <p className="text-xs text-outline mb-6">
                Defina as margens de lucro alvo para a precificação automática e a zona de risco.
              </p>

              <form onSubmit={handleSaveMargensGlobais} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Margem Alvo Estável (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={margemAlvoEstavel}
                    onChange={(e) => setMargemAlvoEstavel(e.target.value)}
                    className="w-full bg-surface-container-low text-sm font-bold px-3 py-2 rounded-lg border border-transparent focus:border-[#002046] focus:bg-white outline-hidden"
                  />
                  <p className="text-[10px] text-outline mt-1">Margem ideal para operação saudável e crescimento.</p>
                </div>
                
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Margem de Risco Instável (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={margemRiscoInstavel}
                    onChange={(e) => setMargemRiscoInstavel(e.target.value)}
                    className="w-full bg-surface-container-low text-sm font-bold px-3 py-2 rounded-lg border border-transparent focus:border-[#002046] focus:bg-white outline-hidden"
                  />
                  <p className="text-[10px] text-outline mt-1">Abaixo desta margem a operação não se sustenta no longo prazo.</p>
                </div>

                <button
                  type="submit"
                  className="w-full bg-[#002046] hover:brightness-95 text-white font-bold text-xs py-3 rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  Salvar Metas Globais
                </button>
              </form>
            </div>

            <div className="bg-[#002046] text-white rounded-2xl p-6 shadow-md relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                <span className="material-symbols-outlined notranslate text-[80px]">calculate</span>
              </div>
              <div className="relative z-10">
                <h3 className="text-lg font-black uppercase mb-2">Simulador Avançado</h3>
                <p className="text-xs text-blue-100 mb-6 leading-relaxed">
                  Acesse a calculadora completa de custos para simular precificações, analisar impostos e testar cenários hipotéticos sem alterar o preço base de venda.
                </p>
                <button
                  onClick={() => setIsCalculadoraOpen(true)}
                  className="w-full bg-white text-[#002046] hover:bg-surface-bright font-black text-xs py-3 rounded-xl transition-all shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <span className="material-symbols-outlined notranslate text-[16px]">open_in_new</span>
                  Abrir Simulador
                </button>
              </div>
            </div>
          </div>

          <div className="lg:w-2/3">
            <div className="bg-white rounded-2xl border border-outline-variant shadow-xs overflow-hidden">
              <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
                <div>
                  <h3 className="text-sm font-black text-[#002046] uppercase">Análise de Margens dos Produtos (SKUs)</h3>
                  <p className="text-[11px] text-outline mt-0.5">Visão geral do preço de venda vs custo atual do BOM.</p>
                </div>
              </div>

              <div className="overflow-x-auto max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-surface-container-low font-black text-[#74777f] uppercase text-[9px] tracking-wider sticky top-0 z-10 shadow-xs">
                      <th className="p-4 py-3 border-b border-outline-variant">SKU (Medida)</th>
                      <th className="p-4 py-3 border-b border-outline-variant">Preço Base Venda</th>
                      <th className="p-4 py-3 border-b border-outline-variant">Custo BOM Atual</th>
                      <th className="p-4 py-3 border-b border-outline-variant">Margem Bruta</th>
                      <th className="p-4 py-3 border-b border-outline-variant text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {skus.map(sku => {
                      const fam = familias.find(f => f.id === sku.familia_id);
                      const custo = getSKUCustoBaseReal(sku.id);
                      const pv = Number(sku.preco_base_venda) || 0;
                      const margem = (pv > 0 && custo > 0) ? ((pv - custo) / pv) * 100 : 0;
                      
                      const tAlvo = Number(margemAlvoEstavel) || 30;
                      const tRisco = Number(margemRiscoInstavel) || 15;
                      
                      let badge = null;
                      if (pv === 0) {
                        badge = <span className="bg-surface-container text-outline px-2 py-0.5 rounded-sm font-bold text-[9px] uppercase">Não Precificado</span>;
                      } else if (margem >= tAlvo) {
                        badge = <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-sm font-bold text-[9px] uppercase">Excelente</span>;
                      } else if (margem >= tRisco) {
                        badge = <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-sm font-bold text-[9px] uppercase">Atenção</span>;
                      } else {
                        badge = <span className="bg-red-100 text-red-800 px-2 py-0.5 rounded-sm font-bold text-[9px] uppercase">Risco</span>;
                      }

                      return (
                        <tr key={sku.id} className="hover:bg-surface-container-low/30 transition-colors">
                          <td className="p-4 py-3 font-semibold text-primary">
                            {fam?.nome} - {sku.comprimento_mm}mm
                          </td>
                          <td className="p-4 py-3 font-mono font-bold">
                            {pv > 0 ? formatCurrency(pv) : '-'}
                          </td>
                          <td className="p-4 py-3 font-mono text-outline">
                            {formatCurrency(custo)}
                          </td>
                          <td className="p-4 py-3 font-black">
                            <span className={pv === 0 ? 'text-outline font-normal' : margem >= tAlvo ? 'text-emerald-600' : margem >= tRisco ? 'text-amber-600' : 'text-red-600'}>
                              {pv > 0 ? `${margem.toFixed(1)}%` : '-'}
                            </span>
                          </td>
                          <td className="p-4 py-3 text-center">
                            {badge}
                          </td>
                        </tr>
                      );
                    })}
                    {skus.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-outline italic">Nenhum SKU encontrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-outline-variant shadow-xs overflow-hidden mt-6">
              <div className="p-5 border-b border-outline-variant flex justify-between items-center bg-surface-bright">
                <div>
                  <h3 className="text-sm font-black text-[#002046] uppercase">Histórico Recente de Insumos (Evolução de Custo)</h3>
                  <p className="text-[11px] text-outline mt-0.5">Acompanhe as últimas compras de matéria-prima e as variações de preço unitário.</p>
                </div>
              </div>
              <div className="overflow-x-auto max-h-[300px] overflow-y-auto">
                <table className="w-full text-left text-xs border-collapse min-w-[600px]">
                  <thead>
                    <tr className="bg-surface-container-low font-black text-[#74777f] uppercase text-[9px] tracking-wider sticky top-0 z-10 shadow-xs">
                      <th className="p-4 py-3 border-b border-outline-variant">Data</th>
                      <th className="p-4 py-3 border-b border-outline-variant">Insumo</th>
                      <th className="p-4 py-3 border-b border-outline-variant">Volume de Entrada</th>
                      <th className="p-4 py-3 border-b border-outline-variant">Preço Unit. Pago</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline-variant/30">
                    {entradasEstoque.map(entrada => (
                      <tr key={entrada.id} className="hover:bg-surface-container-low/30 transition-colors">
                        <td className="p-4 py-3 font-semibold text-outline">
                          {new Date(entrada.data_entrada).toLocaleDateString('pt-BR')}
                        </td>
                        <td className="p-4 py-3 font-bold text-primary">
                          {entrada.insumos?.nome || 'Insumo Excluído'}
                        </td>
                        <td className="p-4 py-3 font-mono text-outline">
                          {entrada.quantidade.toLocaleString('pt-BR')}
                        </td>
                        <td className="p-4 py-3 font-mono font-black text-red-700">
                          {formatCurrency(entrada.preco_unitario)}
                        </td>
                      </tr>
                    ))}
                    {entradasEstoque.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-outline italic">Nenhum histórico de entradas registrado.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

        </div>
      )}

      {isCalculadoraOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 lg:p-8 animate-fade-in">
          <div className="bg-surface-container-lowest w-full max-w-6xl h-full lg:max-h-[90vh] rounded-3xl shadow-2xl relative flex flex-col overflow-hidden">
            <div className="absolute top-4 right-4 z-50">
              <button 
                onClick={() => setIsCalculadoraOpen(false)}
                className="bg-black/10 hover:bg-black/20 text-[#002046] p-2 rounded-full transition-colors cursor-pointer flex items-center justify-center backdrop-blur-md"
              >
                <span className="material-symbols-outlined notranslate">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto w-full h-full custom-scrollbar p-6 md:p-8">
               <FormacaoPrecoScreen 
                  onBack={() => setIsCalculadoraOpen(false)}
                  onAbrirPedidoSimulado={() => {}}
               />
            </div>
          </div>
        </div>
      )}

      {/* RENDER TAB FISCAL */}
      {activeTab === 'FISCAL' && empresaId && (
        <div className="animate-fade-in">
          <MatrizFiscalScreen empresaId={empresaId} />
        </div>
      )}

      {/* RENDER TAB APURACAO FISCAL */}
      {activeTab === 'APURACAO_FISCAL' && empresaId && (
        <div className="animate-fade-in">
          <div className="flex items-center gap-3 bg-surface-container-lowest border border-outline-variant p-4 rounded-2xl w-fit mb-6 shadow-sm">
            <label className="text-xs font-black text-primary uppercase">Mês de Apuração:</label>
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-outline-variant rounded-lg p-1.5 font-bold text-xs focus:outline-none focus:ring-1 focus:ring-[#002046]"
            />
          </div>
          <ApuracaoFiscalScreen empresaId={empresaId} selectedMonth={selectedMonth} />
        </div>
      )}

    </div>
  );
}
