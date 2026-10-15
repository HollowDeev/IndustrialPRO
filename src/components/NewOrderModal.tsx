"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { useToast } from '../contexts/ToastContext';
import { SimulatedOrderItem } from './FormacaoPrecoScreen';

interface NewOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (orderCode: string) => void;
  empresaId: string;
  initialCode: string; // The suggested PED-XXXX-YYY code
  preSelectedClientId?: string;
  preSelectedItems?: SimulatedOrderItem[];
  tourDemoMode?: boolean;
}

export default function NewOrderModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  empresaId, 
  initialCode, 
  preSelectedClientId,
  preSelectedItems,
  tourDemoMode = false
}: NewOrderModalProps) {
  const supabase = createClient();
  const { addToast } = useToast();

  const [loadingBaseData, setLoadingBaseData] = useState(false);
  const [dbClientes, setDbClientes] = useState<{id: string, razao_social: string, uf?: string, tipo_cliente?: string}[]>([]);
  const [dbVendedores, setDbVendedores] = useState<{id: string, nome: string}[]>([]);
  const [regrasFiscais, setRegrasFiscais] = useState<any[]>([]);
  const [skuNcmMap, setSkuNcmMap] = useState<Record<string, string>>({});

  const [newOrderCode, setNewOrderCode] = useState(initialCode);
  const [newOrderClient, setNewOrderClient] = useState(preSelectedClientId || '');
  const [newOrderVendedor, setNewOrderVendedor] = useState('');
  const [newOrderLocation, setNewOrderLocation] = useState('');
  const [newOrderDeliveryDate, setNewOrderDeliveryDate] = useState('');
  const [newOrderCondicao, setNewOrderCondicao] = useState('30_DIAS');

  // States para simulação de fluxo de caixa no alerta NCG
  const [newOrderCustomReceiptDate, setNewOrderCustomReceiptDate] = useState('');
  const [dbTitulos, setDbTitulos] = useState<any[]>([]);
  const [saldoInicial, setSaldoInicial] = useState<number>(0);
  const [valorFrete, setValorFrete] = useState<number>(0);

  // Load baseline data on open
  useEffect(() => {
    if (!isOpen || !empresaId) return;

    const loadData = async () => {
      setLoadingBaseData(true);
      try {
        // Load Clientes
        const { data: cliData } = await supabase
          .from('clientes')
          .select('id, razao_social, uf, tipo_cliente')
          .eq('empresa_id', empresaId)
          .order('razao_social');
        if (cliData) setDbClientes(cliData);

        // Load Vendedores
        const { data: vendData } = await supabase
          .from('funcionarios')
          .select('id, nome')
          .eq('empresa_id', empresaId)
          .eq('vendedor', true)
          .eq('ativo', true)
          .order('nome');
        if (vendData) setDbVendedores(vendData);

        // Carregar saldo inicial e títulos para cálculo de NCG simulado
        const { data: configSaldo } = await supabase
          .from('fluxo_caixa_config')
          .select('saldo_inicial')
          .eq('empresa_id', empresaId)
          .maybeSingle();
        setSaldoInicial(Number(configSaldo?.saldo_inicial) || 0);

        const { data: tList } = await supabase
          .from('titulos_financeiros')
          .select('*')
          .eq('empresa_id', empresaId)
          .order('data_vencimento', { ascending: true });
        if (tList) setDbTitulos(tList);

        // Load Regras Fiscais
        const { data: rList } = await supabase
          .from('regras_fiscais_matriz')
          .select('*')
          .eq('empresa_id', empresaId);
        if (rList) setRegrasFiscais(rList);

        // Load Skus with NCM
        if (preSelectedItems && preSelectedItems.length > 0) {
          const skuIds = preSelectedItems.map(i => i.skuId);
          const { data: sList } = await supabase
            .from('skus')
            .select('id, familias_produto(ncm)')
            .in('id', skuIds);
            
          if (sList) {
            const map: Record<string, string> = {};
            sList.forEach((s: any) => {
              map[s.id] = s.familias_produto?.ncm || '';
            });
            setSkuNcmMap(map);
          }
        }

      } catch (err) {
        console.error("Error loading modal data", err);
      } finally {
        setLoadingBaseData(false);
      }
    };

    loadData();
  }, [isOpen, empresaId]);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      if (tourDemoMode) {
        setNewOrderCode('PED-DEMO-2026');
        setNewOrderClient(preSelectedClientId || (dbClientes.length > 0 ? dbClientes[0].id : ''));
        setNewOrderVendedor(dbVendedores.length > 0 ? dbVendedores[0].id : '');
        setNewOrderLocation('Fábrica 01 - Linha Principal (Extrusão)');
        const d = new Date();
        d.setDate(d.getDate() + 15);
        setNewOrderDeliveryDate(d.toISOString().substring(0, 10));
        setNewOrderCondicao('30_DIAS');
        setValorFrete(350);
      } else {
        setNewOrderCode(initialCode);
        setNewOrderClient(preSelectedClientId || (dbClientes.length > 0 ? dbClientes[0].id : ''));
        setNewOrderVendedor('');
        setNewOrderLocation('');
        setNewOrderDeliveryDate('');
        setNewOrderCondicao('30_DIAS');
        setNewOrderCustomReceiptDate('');
        setValorFrete(0);
      }
    }
  }, [isOpen, initialCode, preSelectedClientId, dbClientes, dbVendedores, tourDemoMode]);

  // Simular Fluxo de Caixa para Alerta de NCG
  const getCashFlowSimulation = () => {
    const orderVal = preSelectedItems?.reduce((sum, item) => sum + (item.quantidade * item.precoVenda), 0) || 0;
    if (newOrderCondicao !== 'PERSONALIZADA' || !newOrderCustomReceiptDate || orderVal <= 0) {
      return { hasNegativeBalance: false, negativeDate: null, negativeValue: 0 };
    }

    const projectionDays = 30;
    let currentBalance = saldoInicial;
    const today = new Date();
    today.setHours(0,0,0,0);

    let hasNegative = false;
    let firstNegativeDate = null;
    let firstNegativeVal = 0;

    const receiptIso = newOrderCustomReceiptDate;

    for (let i = 0; i <= projectionDays; i++) {
      const targetDay = new Date(today);
      targetDay.setDate(today.getDate() + i);
      const targetIso = targetDay.toISOString().split('T')[0];

      // Títulos reais do dia
      const titulosDoDia = dbTitulos.filter((t: any) => {
        if (t.status === 'PAGO' || t.status === 'ANTECIPADO') {
          return t.data_liquidacao === targetIso;
        } else {
          return t.data_vencimento === targetIso;
        }
      });

      let entradasDia = titulosDoDia
        .filter((t: any) => t.tipo === 'RECEBER')
        .reduce((sum: number, t: any) => sum + Number(t.valor), 0);

      const saidasDia = titulosDoDia
        .filter((t: any) => t.tipo === 'PAGAR')
        .reduce((sum: number, t: any) => sum + Number(t.valor), 0);

      // Injeta o título simulado do pedido na data de recebimento personalizada
      if (targetIso === receiptIso) {
        entradasDia += orderVal;
      }

      currentBalance = currentBalance + entradasDia - saidasDia;

      if (currentBalance < 0 && !hasNegative) {
        hasNegative = true;
        firstNegativeDate = targetDay.toLocaleDateString('pt-BR');
        firstNegativeVal = currentBalance;
      }
    }

    return {
      hasNegativeBalance: hasNegative,
      negativeDate: firstNegativeDate,
      negativeValue: firstNegativeVal
    };
  };

  const simulation = getCashFlowSimulation();
  
  const isReceiptBeforeDelivery = (() => {
    if (newOrderCondicao === 'PERSONALIZADA' && newOrderCustomReceiptDate && newOrderDeliveryDate) {
      const rDate = new Date(newOrderCustomReceiptDate);
      const dDate = new Date(newOrderDeliveryDate);
      return rDate < dDate;
    }
    return false;
  })();

  const showAlert = isReceiptBeforeDelivery && simulation.hasNegativeBalance;

  const activeItems = (preSelectedItems && preSelectedItems.length > 0)
    ? preSelectedItems
    : (tourDemoMode ? [
        {
          skuId: 'demo-sku-1',
          skuCodigo: 'TUBO-PEAD-32MM-3000',
          quantidade: 5000,
          precoVenda: 28.50,
          comissaoPercentual: 3,
          fixedCostAlocado: 2.10
        }
      ] : []);

  // Calculos Fiscais Dinâmicos
  const getFiscalTotals = () => {
    let totalIcms = 0;
    let totalIpi = 0;
    
    if (!newOrderClient || activeItems.length === 0) return { totalIcms, totalIpi };
    
    const client = dbClientes.find(c => c.id === newOrderClient);
    if (!client) return { totalIcms, totalIpi };

    activeItems.forEach(item => {
      const ncm = skuNcmMap[item.skuId] || '';
      // Procura regra exata ou coringa
      const regra = regrasFiscais.find(r => 
        (r.ncm_padrao === ncm || r.ncm_padrao === '*') &&
        (r.uf_destino === client.uf || r.uf_destino === '*') &&
        (r.tipo_cliente === client.tipo_cliente || r.tipo_cliente === '*')
      );
      
      const valItem = item.quantidade * item.precoVenda;
      if (regra) {
        totalIcms += valItem * ((regra.icms_percent || 0) / 100);
        totalIpi += valItem * ((regra.ipi_percent || 0) / 100);
      }
    });

    return { totalIcms, totalIpi };
  };

  const { totalIcms, totalIpi } = getFiscalTotals();
  const baseTotalValue = activeItems.reduce((sum, item) => sum + (item.quantidade * item.precoVenda), 0);
  const finalTotalValue = baseTotalValue + valorFrete;

  const handleCreateOrderSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrderCode || !newOrderClient || !newOrderVendedor) {
      addToast('Por favor, preencha os campos obrigatórios (incluindo o vendedor).', 'warning');
      return;
    }

    if (!preSelectedItems || preSelectedItems.length === 0) {
      addToast('Não há itens simulados no pedido.', 'warning');
      return;
    }

    if (newOrderCondicao === 'PERSONALIZADA' && !newOrderCustomReceiptDate) {
      addToast('Por favor, preencha a data de recebimento personalizada.', 'warning');
      return;
    }

    try {
      // 1. Gravar o pedido principal
      const { data: pedRow, error } = await supabase
        .from('pedidos')
        .insert({
          empresa_id: empresaId,
          codigo: newOrderCode,
          cliente_id: newOrderClient,
          vendedor_id: newOrderVendedor,
          localizacao: newOrderLocation || 'São Paulo - SP',
          data_entrega: newOrderDeliveryDate || null,
          condicao_pagamento: newOrderCondicao,
          comissao_venda_percentual: preSelectedItems[0]?.comissaoPercentual || 0,
          data_recebimento_personalizada: newOrderCondicao === 'PERSONALIZADA' ? newOrderCustomReceiptDate : null,
          valor_frete: valorFrete,
          total_icms_estimado: totalIcms,
          total_ipi_estimado: totalIpi,
          status: 'AGUARDANDO_APROVACAO'
        })
        .select()
        .single();

      if (error) {
        addToast(`Erro ao criar pedido: ${error.message}`, 'error');
        return;
      }

      // 2. Gravar lote de OPs correspondentes
      const opsToInsert = preSelectedItems.map(item => ({
        empresa_id: empresaId,
        pedido_id: pedRow.id,
        sku_id: item.skuId,
        quantidade_planejada: item.quantidade,
        preco_venda_unitario: item.precoVenda,
        status: 'AGUARDANDO_APROVACAO'
      }));

      const { error: opError } = await supabase
        .from('ordens_producao')
        .insert(opsToInsert);

      if (opError) {
        addToast(`Erro ao criar ordens de produção: ${opError.message}`, 'error');
        return;
      }

      onSuccess(newOrderCode);
      onClose();
    } catch (err: any) {
      addToast('Erro ao processar criação de pedido: ' + err.message, 'error');
    }
  };

  if (!isOpen) return null;

  const receiptDateStr = newOrderCustomReceiptDate ? new Date(newOrderCustomReceiptDate + 'T00:00:00').toLocaleDateString('pt-BR') : '';
  const deliveryDateStr = newOrderDeliveryDate ? new Date(newOrderDeliveryDate + 'T00:00:00').toLocaleDateString('pt-BR') : '-';
  const negativeBalanceStr = simulation.negativeValue ? simulation.negativeValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '';

  return (
    <div className="fixed inset-0 bg-[#0c0d12]/60 backdrop-blur-xs flex items-center justify-center z-[500] p-4 text-left">
      <div className="bg-white rounded-3xl shadow-2xl flex flex-col w-full max-w-lg overflow-hidden border border-outline-variant/50 animate-scale-up relative">
        <div className="w-full p-6 flex flex-col justify-between max-h-[85vh] overflow-y-auto">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-base font-black text-[#002046] uppercase flex items-center gap-1.5">
                  <span className="material-symbols-outlined notranslate text-secondary text-[24px]">assignment</span>
                  Confirmar Novo Pedido Geral
                </h2>
                <p className="text-[10px] text-outline font-medium mt-0.5">Insira as informações de entrega e fechamento comercial do lote</p>
              </div>
              <button type="button" onClick={onClose} className="text-[#74777f] hover:text-primary transition-colors cursor-pointer bg-surface-container-low rounded-full p-1.5">
                <span className="material-symbols-outlined notranslate text-[18px]">close</span>
              </button>
            </div>

            {loadingBaseData ? (
              <div className="flex-1 flex items-center justify-center py-10">
                <p className="text-xs font-bold text-outline animate-pulse">Carregando dados...</p>
              </div>
            ) : (
              <form id="new-order-form" onSubmit={handleCreateOrderSubmit} className="space-y-4">
                
                {/* Visualização de Itens Selecionados */}
                <div className="bg-[#f4f3f9] p-4 rounded-2xl border border-outline-variant/60 space-y-3">
                  <h4 className="text-[9px] font-black text-secondary uppercase tracking-wider">Produtos do Lote</h4>
                  <div className="divide-y divide-outline-variant/30 max-h-[15vh] overflow-y-auto pr-1">
                    {activeItems.map((item, idx) => (
                      <div key={idx} className="py-1.5 flex justify-between text-xs font-semibold text-[#002046]">
                        <span className="font-mono">{item.skuCodigo}</span>
                        <span>{item.quantidade.toLocaleString('pt-BR')} un x {item.precoVenda.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                      </div>
                    ))}
                  </div>
                  <div className="border-t border-outline-variant/40 pt-2 flex flex-col gap-1 text-[10px] font-bold text-outline">
                    <div className="flex justify-between">
                      <span>Subtotal Itens:</span>
                      <span>{baseTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between text-secondary">
                      <span>Estimativa ICMS:</span>
                      <span>{totalIcms.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between text-secondary">
                      <span>Estimativa IPI:</span>
                      <span>{totalIpi.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                    </div>
                    <div className="flex justify-between items-center mt-2 border-t border-outline-variant/20 pt-2">
                      <label className="text-[10px] font-bold uppercase text-[#002046]">Valor do Frete</label>
                      <input 
                        type="number"
                        step="0.01"
                        value={valorFrete || ''}
                        onChange={e => setValorFrete(Number(e.target.value))}
                        className="w-24 bg-white border border-outline-variant rounded p-1 text-right text-[#002046] focus:outline-none focus:border-secondary"
                        placeholder="R$ 0,00"
                      />
                    </div>
                  </div>
                  <div className="border-t border-outline-variant/40 pt-2 flex justify-between text-xs font-black text-primary">
                    <span>Total do Pedido (c/ Frete):</span>
                    <span>{finalTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Código do Pedido</label>
                    <input
                      type="text"
                      required
                      value={newOrderCode}
                      onChange={(e) => setNewOrderCode(e.target.value.toUpperCase())}
                      className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-mono font-bold text-primary focus:outline-none focus:ring-1 focus:ring-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-outline uppercase mb-2">Cliente *</label>
                    <select
                      required
                      value={newOrderClient}
                      onChange={(e) => setNewOrderClient(e.target.value)}
                      disabled={!!preSelectedClientId}
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg p-3 text-primary font-medium focus:outline-none focus:border-primary disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <option value="" disabled>Selecione o Cliente</option>
                      {dbClientes.map(cli => (
                        <option key={cli.id} value={cli.id}>{cli.razao_social}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-outline uppercase mb-2">Vendedor *</label>
                    <select
                      required
                      value={newOrderVendedor}
                      onChange={(e) => setNewOrderVendedor(e.target.value)}
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg p-3 text-primary font-medium focus:outline-none focus:border-primary"
                    >
                      <option value="">Selecione o Vendedor</option>
                      {dbVendedores.map(vend => (
                        <option key={vend.id} value={vend.id}>{vend.nome}</option>
                      ))}
                      {dbVendedores.length === 0 && (
                        <option value="" disabled>Nenhum vendedor cadastrado</option>
                      )}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Localização (Cidade - UF)</label>
                    <input
                      type="text"
                      placeholder="Ex: São Paulo - SP"
                      value={newOrderLocation}
                      onChange={(e) => setNewOrderLocation(e.target.value)}
                      className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-secondary"
                    />
                  </div>

                  <div>
                    <label className="block text-outline font-bold mb-1">Data de Entrega Prevista</label>
                    <input 
                      type="date"
                      value={newOrderDeliveryDate}
                      onChange={(e) => setNewOrderDeliveryDate(e.target.value)}
                      className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-primary focus:outline-none focus:ring-1 focus:ring-secondary" 
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs mt-4">
                  <div className="col-span-2">
                    <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Condição de Recebimento</label>
                    <select
                      value={newOrderCondicao}
                      onChange={(e) => setNewOrderCondicao(e.target.value)}
                      className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-semibold text-primary focus:outline-none focus:ring-1 focus:ring-secondary"
                    >
                      <option value="A_VISTA">À Vista</option>
                      <option value="30_DIAS">30 Dias</option>
                      <option value="30_60_90">30 / 60 / 90 Dias</option>
                      <option value="PERSONALIZADA">Data Personalizada</option>
                    </select>

                    {newOrderCondicao === 'PERSONALIZADA' && (
                      <div className="mt-2 animate-fade-in">
                        <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Data de Recebimento Customizada *</label>
                        <input 
                          type="date"
                          required
                          value={newOrderCustomReceiptDate}
                          onChange={(e) => setNewOrderCustomReceiptDate(e.target.value)}
                          className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-primary focus:outline-none focus:ring-1 focus:ring-secondary" 
                        />
                      </div>
                    )}
                  </div>
                </div>

                {showAlert && (
                  <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-xl text-red-800 flex items-start gap-3 animate-pulse shadow-sm">
                    <span className="material-symbols-outlined notranslate text-red-600 text-[20px]">warning</span>
                    <div className="text-xs">
                      <strong className="font-black uppercase block tracking-wider text-[10px]">Alerta Crítico de Caixa (NCG)</strong>
                      <p className="mt-1 leading-relaxed text-left">
                        A data de recebimento do pedido (<strong>{receiptDateStr}</strong>) é anterior à data de entrega prevista (<strong>{deliveryDateStr}</strong>), <strong>E</strong> o caixa projetado para o período ficará negativo em <strong>{simulation.negativeDate}</strong> com saldo de <strong className="text-red-700">{negativeBalanceStr}</strong>.
                      </p>
                    </div>
                  </div>
                )}
              </form>
            )}
          </div>

          {/* Botões */}
          <div className="flex justify-between items-center pt-4 mt-6 border-t border-outline-variant bg-white">
            <button
              type="button"
              onClick={onClose}
              className="text-on-surface-variant hover:text-primary font-bold px-4 py-2.5 rounded-lg text-xs cursor-pointer transition-colors"
            >
              Cancelar
            </button>
            <button
              form="new-order-form"
              type="submit"
              disabled={loadingBaseData || !preSelectedItems || preSelectedItems.length === 0}
              className={`font-bold px-5 py-2.5 rounded-lg text-xs tracking-wider transition-all shadow-sm ${(!preSelectedItems || preSelectedItems.length === 0 || loadingBaseData) ? 'bg-outline-variant text-on-surface-variant cursor-not-allowed' : 'bg-[#002046] hover:bg-[#1b365d] text-white cursor-pointer'}`}
            >
              Gravar Pedido Geral
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
