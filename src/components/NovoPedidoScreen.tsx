"use client";

import React, { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { useToast } from '../contexts/ToastContext';
import { calculateSKUCustoBaseLocal, SimulatedOrderItem } from './FormacaoPrecoScreen';

export interface NovoPedidoItem extends SimulatedOrderItem {
  id: string;
  familiaNome: string;
  custoTotalUnidade: number;
  custoFixoTotal: number;
  custoVariavelTotal: number;
}

interface NovoPedidoScreenProps {
  onAbrirCalculadora: (items: NovoPedidoItem[]) => void;
  onFaturar: (items: NovoPedidoItem[]) => void;
}

export default function NovoPedidoScreen({ onAbrirCalculadora, onFaturar }: NovoPedidoScreenProps) {
  const supabase = createClient();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  
  const [dbFamilias, setDbFamilias] = useState<any[]>([]);
  const [dbSkus, setDbSkus] = useState<any[]>([]);
  const [dbBoms, setDbBoms] = useState<any[]>([]);
  const [dbInsumos, setDbInsumos] = useState<any[]>([]);
  
  const [selectedFamiliaId, setSelectedFamiliaId] = useState<string>('');
  const [selectedSkuId, setSelectedSkuId] = useState<string>('');
  const [inputQtd, setInputQtd] = useState<string>('1');
  
  const [cartItems, setCartItems] = useState<NovoPedidoItem[]>([]);
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: uData } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
      if (!uData) return;
      setEmpresaId(uData.empresa_id);
      
      const [fRes, sRes, bRes, iRes] = await Promise.all([
        supabase.from('familias_produto').select('*').is('deleted_at', null).order('nome'),
        supabase.from('skus').select('*').is('deleted_at', null).order('codigo'),
        supabase.from('bom').select('*'),
        supabase.from('insumos').select('*')
      ]);
      
      if (fRes.data) setDbFamilias(fRes.data);
      if (sRes.data) setDbSkus(sRes.data);
      if (bRes.data) setDbBoms(bRes.data);
      if (iRes.data) setDbInsumos(iRes.data);
      
      setLoading(false);
    }
    loadData();
  }, []);

  const skusDaFamilia = dbSkus.filter(s => s.familia_id === selectedFamiliaId);

  const handleAddItem = () => {
    if (!selectedFamiliaId || !selectedSkuId || !inputQtd || Number(inputQtd) <= 0) return;
    
    const familia = dbFamilias.find(f => f.id === selectedFamiliaId);
    const sku = dbSkus.find(s => s.id === selectedSkuId);
    if (!familia || !sku) return;
    
    const custoEstimado = calculateSKUCustoBaseLocal(sku.id, dbSkus, dbFamilias, dbBoms, dbInsumos);
    const precoVenda = Number(sku.preco_base_venda) || 0;
    
    const newItem: NovoPedidoItem = {
      id: crypto.randomUUID(),
      skuId: sku.id,
      familiaNome: familia.nome,
      skuCodigo: sku.codigo,
      quantidade: Number(inputQtd),
      custoFixoTotal: custoEstimado,
      custoVariavelTotal: 0,
      custoTotalUnidade: custoEstimado,
      precoVenda: precoVenda,
      comissaoPercentual: 0,
      fixedCostAlocado: 0
    };
    
    setCartItems(prev => [...prev, newItem]);
    
    setSelectedFamiliaId('');
    setSelectedSkuId('');
    setInputQtd('1');
    addToast('Item adicionado ao pedido.', 'success');
  };

  const handleRemoveItem = (id: string) => {
    setCartItems(prev => prev.filter(i => i.id !== id));
  };
  
  const handleCheckout = () => {
    if (cartItems.length === 0) {
      addToast('Adicione pelo menos um item ao pedido.', 'error');
      return;
    }
    onFaturar(cartItems);
  };

  if (loading) {
    return <div className="p-8 text-center text-outline font-bold animate-pulse">Carregando dados...</div>;
  }

  const totalGeralVenda = cartItems.reduce((acc, item) => acc + (item.precoVenda * item.quantidade), 0);
  const totalGeralCusto = cartItems.reduce((acc, item) => acc + (item.custoTotalUnidade * item.quantidade), 0);
  const lucroGeral = totalGeralVenda - totalGeralCusto;

  let previewHasBOM = false;
  let previewDeficit = false;
  let calculationResult: number | null = null;
  let projectedItems: any[] = [];

  const selectedSku = selectedSkuId ? dbSkus.find(s => s.id === selectedSkuId) : null;
  const selectedFamilia = selectedSku ? dbFamilias.find(f => f.id === selectedSku.familia_id) : null;
  const familyRecipeForPreview = selectedSku ? dbBoms.filter(b => b.familia_id === selectedSku.familia_id) : [];
  
  if (selectedSku && familyRecipeForPreview.length > 0) {
    previewHasBOM = true;
    const orderQty = Number(inputQtd) || 0;
    
    projectedItems = familyRecipeForPreview.map(b => {
      const insumo = dbInsumos.find(i => i.id === b.insumo_id);
      if (!insumo) return null;

      const reserved = 0; 
      const comp_haste_m = (selectedSku.comprimento_mm - (selectedSku.desconto_aco_mm || 70)) / 1000;
      let neededForThisOrder = 0;
      let neededPerPiece = 0;

      if (insumo.categoria === 'ACO') {
        const qtyHastes = b.quantidade_por_unidade || 1;
        neededPerPiece = comp_haste_m * qtyHastes * (Number(insumo.peso_nominal_kg_m) || 0.395);
        neededForThisOrder = neededPerPiece * orderQty;
      } else if (insumo.categoria === 'QUIMICO' || insumo.categoria === 'POLIMERO') {
        const numVergalhoes = Number(selectedFamilia?.numero_vergalhoes) || 4;
        const areaSecao = Number(selectedFamilia?.area_secao_externa) || 0;
        const densidade = Number(selectedFamilia?.densidade_g_cm3) || 0;

        let volumeAcoMetro = 0;
        const acoItem = familyRecipeForPreview.find(bi => dbInsumos.find(i => i.id === bi.insumo_id)?.categoria === 'ACO');
        if (acoItem) {
          const acoInsumo = dbInsumos.find(i => i.id === acoItem.insumo_id);
          const bitola = Number(acoInsumo?.bitola_mm) || 0;
          volumeAcoMetro = Math.PI * Math.pow((bitola / 2) / 1000, 2);
        }

        const volumeAcoTotal = volumeAcoMetro * comp_haste_m * numVergalhoes;
        let volumePlastico = (areaSecao * (selectedSku.comprimento_mm / 1000)) - volumeAcoTotal;
        if (volumePlastico < 0) volumePlastico = 0;

        const massaPlastico = volumePlastico * (densidade * 1000);
        
        if (insumo.categoria === 'QUIMICO') {
          neededPerPiece = (massaPlastico / 1000) * (b.quantidade_por_unidade / 1000);
          neededForThisOrder = neededPerPiece * orderQty;
        } else {
          neededPerPiece = (b.percentual_blend / 100.0) * massaPlastico;
          neededForThisOrder = neededPerPiece * orderQty;
        }
      } else {
        neededPerPiece = b.quantidade_por_unidade;
        neededForThisOrder = neededPerPiece * orderQty;
      }

      const stockAvailable = Number(insumo.estoque_atual) || 0;
      const projectedLeft = stockAvailable - neededForThisOrder - reserved;

      return {
        insumoName: insumo.nome,
        stockAvailable,
        neededForThisOrder,
        neededPerPiece,
        projectedLeft,
        unidade: insumo.categoria === 'ACO' || insumo.categoria === 'QUIMICO' || insumo.categoria === 'POLIMERO' ? 'Kg' : (insumo.unidade_medida || 'un')
      };
    }).filter(Boolean);

    previewDeficit = projectedItems.some(item => item && item.projectedLeft < 0);

    let maxProduces = Infinity;
    projectedItems.forEach(item => {
      if (!item) return;
      if (item.neededPerPiece > 0) {
        const canProduce = Math.floor(item.stockAvailable / item.neededPerPiece);
        if (canProduce < maxProduces) {
          maxProduces = canProduce;
        }
      }
    });
    calculationResult = maxProduces === Infinity ? 0 : maxProduces;
  }

  return (
    <div className="animate-fade-in p-6 bg-surface max-w-5xl mx-auto space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-outline-variant">
        <div>
          <h2 className="text-xl font-black text-primary uppercase tracking-tight flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary text-2xl">shopping_cart_checkout</span>
            Novo Pedido
          </h2>
          <p className="text-xs text-outline mt-1 font-medium">Fluxo simplificado de vendas e faturamento.</p>
        </div>
        <button 
          onClick={() => onAbrirCalculadora(cartItems)}
          className="flex items-center gap-2 bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold px-4 py-2.5 rounded-lg text-xs cursor-pointer transition-colors"
        >
          <span className="material-symbols-outlined text-[18px]">calculate</span>
          Calculadora Avançada
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-4 bg-white p-5 rounded-2xl border border-outline-variant shadow-sm h-fit">
          <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Inserir Produto</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Família</label>
              <select 
                value={selectedFamiliaId}
                onChange={(e) => {
                  setSelectedFamiliaId(e.target.value);
                  setSelectedSkuId('');
                }}
                className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-secondary"
              >
                <option value="">Selecione...</option>
                {dbFamilias.map(f => (
                  <option key={f.id} value={f.id}>{f.nome}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Medida / SKU</label>
              <select 
                value={selectedSkuId}
                onChange={(e) => setSelectedSkuId(e.target.value)}
                disabled={!selectedFamiliaId}
                className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-secondary disabled:opacity-50"
              >
                <option value="">Selecione...</option>
                {skusDaFamilia.map(s => (
                  <option key={s.id} value={s.id}>{s.codigo} ({s.comprimento_mm}mm)</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Quantidade</label>
              <input 
                type="number"
                min="1"
                value={inputQtd}
                onChange={(e) => setInputQtd(e.target.value)}
                className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-secondary"
              />
            </div>
            
            <button 
              onClick={handleAddItem}
              disabled={!selectedFamiliaId || !selectedSkuId || Number(inputQtd) <= 0}
              className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold py-2.5 rounded-lg text-xs cursor-pointer disabled:opacity-50 transition-colors mt-2"
            >
              Adicionar ao Pedido
            </button>
          </div>
        </div>

        <div className="md:col-span-8 bg-white p-5 rounded-2xl border border-outline-variant shadow-sm flex flex-col">
          <h3 className="text-xs font-black text-primary uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Itens do Pedido ({cartItems.length})</h3>
          
          <div className="flex-1 space-y-3 overflow-y-auto max-h-[500px] pr-1">
            {cartItems.length === 0 ? (
              <div className="h-40 flex flex-col items-center justify-center text-outline opacity-50">
                <span className="material-symbols-outlined text-4xl mb-2">shopping_cart</span>
                <p className="text-xs font-medium">Nenhum produto adicionado</p>
              </div>
            ) : (
              cartItems.map(item => {
                const lucro = item.precoVenda - item.custoTotalUnidade;
                const margem = item.precoVenda > 0 ? (lucro / item.precoVenda) * 100 : 0;
                const totalLucro = lucro * item.quantidade;
                const isExpanded = expandedItem === item.id;
                
                const sku = dbSkus.find(s => s.id === item.skuId);
                const fam = sku ? dbFamilias.find(f => f.id === sku.familia_id) : null;
                const estoqueA = sku ? sku.estoque_atual_acabado : 0;
                const familyRecipe = sku ? dbBoms.filter(b => b.familia_id === sku.familia_id) : [];

                let maxProduction = Infinity;
                const missingMaterials: any[] = [];
                let hasMissingMaterials = false;
                let totalMissingCost = 0;

                familyRecipe.forEach(b => {
                  const insumo = dbInsumos.find(i => i.id === b.insumo_id);
                  if (!insumo) return;

                  const comp_haste_m = sku ? (sku.comprimento_mm - (sku.desconto_aco_mm || 70)) / 1000 : 1;
                  let qtdNecessariaPorUnidade = b.quantidade_por_unidade;
                  let unidadeMedida = 'unid';
                  
                  if (insumo.categoria === 'ACO') {
                    const qtyHastes = b.quantidade_por_unidade || 1;
                    qtdNecessariaPorUnidade = comp_haste_m * qtyHastes * (Number(insumo.peso_nominal_kg_m) || 0.395);
                    unidadeMedida = 'kg';
                  } else if (insumo.categoria === 'QUIMICO' || insumo.categoria === 'POLIMERO') {
                    unidadeMedida = 'kg';
                    const numVergalhoes = Number(fam?.numero_vergalhoes) || 4;
                    const areaSecao = Number(fam?.area_secao_externa) || 0;
                    const densidade = Number(fam?.densidade_g_cm3) || 0;

                    let volumeAcoMetro = 0;
                    const acoItem = familyRecipe.find(bi => dbInsumos.find(i => i.id === bi.insumo_id)?.categoria === 'ACO');
                    if (acoItem) {
                      const acoInsumo = dbInsumos.find(i => i.id === acoItem.insumo_id);
                      const bitola = Number(acoInsumo?.bitola_mm) || 0;
                      volumeAcoMetro = Math.PI * Math.pow((bitola / 2) / 1000, 2);
                    }

                    const volumeAcoTotal = volumeAcoMetro * comp_haste_m * numVergalhoes;
                    let volumePlastico = (areaSecao * (sku.comprimento_mm / 1000)) - volumeAcoTotal;
                    if (volumePlastico < 0) volumePlastico = 0;

                    const massaPlastico = volumePlastico * (densidade * 1000);
                    
                    if (insumo.categoria === 'QUIMICO') {
                      qtdNecessariaPorUnidade = (massaPlastico / 1000) * (b.quantidade_por_unidade / 1000);
                    } else {
                      qtdNecessariaPorUnidade = (b.percentual_blend / 100.0) * massaPlastico;
                    }
                  }

                  const estoqueAtualInsumo = Number(insumo.estoque_atual) || 0;
                  const precoUnit = Number(insumo.metadados?.last_purchase_price) || Number(insumo.preco_unitario) || 0;

                  const maxPossivelDesseInsumo = qtdNecessariaPorUnidade > 0 ? Math.floor(estoqueAtualInsumo / qtdNecessariaPorUnidade) : Infinity;
                  if (maxPossivelDesseInsumo < maxProduction) {
                    maxProduction = maxPossivelDesseInsumo;
                  }

                  const qtdNecessariaTotal = qtdNecessariaPorUnidade * item.quantidade;
                  if (qtdNecessariaTotal > estoqueAtualInsumo) {
                    hasMissingMaterials = true;
                    const qtdFaltante = qtdNecessariaTotal - estoqueAtualInsumo;
                    const valorComprar = qtdFaltante * precoUnit;
                    totalMissingCost += valorComprar;
                    missingMaterials.push({
                      nome: insumo.nome,
                      qtdFaltante,
                      unidadeMedida,
                      precoUnit,
                      valorComprar
                    });
                  }
                });

                if (maxProduction === Infinity) maxProduction = 0;

                return (
                  <div key={item.id} className="border border-outline-variant rounded-xl overflow-hidden shadow-xs hover:border-secondary transition-colors bg-[#fdfdfd]">
                    <div className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-black text-primary text-sm uppercase">{item.skuCodigo}</h4>
                          <span className="bg-surface-container-high px-2 py-0.5 rounded-full text-[10px] font-bold text-outline uppercase">{item.familiaNome}</span>
                        </div>
                        <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                          <span className="text-outline">Qtd: <strong className="text-primary">{item.quantidade} un</strong></span>
                          <span className="text-outline">Preço Unit: <strong className="text-primary">R$ {item.precoVenda.toFixed(2)}</strong></span>
                          <span className="text-outline">Estoque Pronto: <strong className={estoqueA >= item.quantidade ? 'text-emerald-600' : 'text-red-600'}>{estoqueA} un</strong></span>
                          <span className="text-outline">Máx. Fabricável: <strong className={maxProduction >= item.quantidade ? 'text-emerald-600' : 'text-yellow-600'}>{maxProduction} un</strong></span>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-[10px] font-bold text-outline uppercase mb-0.5">Lucro Total</div>
                        <div className={`text-lg font-black tracking-tight ${totalLucro >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          R$ {totalLucro.toFixed(2)}
                        </div>
                        <div className="text-[10px] font-bold mt-1">
                          Margem: <span className={margem >= 0 ? 'text-emerald-700' : 'text-red-600'}>{margem.toFixed(1)}%</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <button 
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-400 hover:text-red-600 p-1 rounded-full hover:bg-red-50 transition-colors"
                          title="Remover"
                        >
                          <span className="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                        <button 
                          onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                          className="text-primary hover:text-secondary p-1 rounded-full hover:bg-secondary/10 transition-colors"
                          title="Detalhes do Custo"
                        >
                          <span className="material-symbols-outlined text-[18px]">
                            {isExpanded ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {isExpanded && (
                      <div className={`border-t border-outline-variant p-4 text-xs animate-fade-in ${hasMissingMaterials ? 'bg-yellow-50' : 'bg-surface-bright'}`}>
                        <h5 className={`font-black uppercase text-[10px] mb-3 flex items-center gap-1 ${hasMissingMaterials ? 'text-yellow-800' : 'text-primary'}`}>
                          <span className="material-symbols-outlined text-[14px]">receipt_long</span>
                          Detalhamento de Custo Unitário de Fabricação
                        </h5>
                        <div className="space-y-1.5">
                          {familyRecipe.map(b => {
                            const insumo = dbInsumos.find(i => i.id === b.insumo_id);
                            if (!insumo) return null;
                            const comp_haste_m = sku ? (sku.comprimento_mm - (sku.desconto_aco_mm || 70)) / 1000 : 1;
                            const precoUnit = Number(insumo.metadados?.last_purchase_price) || Number(insumo.preco_unitario) || 0;
                            let custoInsumo = b.quantidade_por_unidade * precoUnit;
                            let consumoDesc = `${b.quantidade_por_unidade}`;
                            
                            if (insumo.categoria === 'ACO') {
                              const linear_m = comp_haste_m * (b.quantidade_por_unidade || 1);
                              const pesoKg = linear_m * (Number(insumo.peso_nominal_kg_m) || 0.395);
                              custoInsumo = pesoKg * precoUnit;
                              consumoDesc = `${pesoKg.toFixed(3)} kg`;
                            } 
                            
                            return (
                              <div key={b.id} className="flex justify-between items-center text-outline text-[11px] border-b border-outline-variant/30 pb-1">
                                <span>{insumo.nome} <span className="text-[9px] opacity-70">({consumoDesc})</span></span>
                                <span className="font-bold">R$ {custoInsumo.toFixed(2)}</span>
                              </div>
                            );
                          })}
                          <div className="flex justify-between items-center pt-2 font-black text-primary">
                            <span>Custo Total do Produto</span>
                            <span>R$ {item.custoTotalUnidade.toFixed(2)}</span>
                          </div>
                        </div>

                        {hasMissingMaterials && (
                          <div className="mt-4 p-3 bg-white border border-yellow-300 rounded-lg shadow-sm">
                            <h6 className="font-black text-yellow-800 text-[10px] uppercase mb-2 flex items-center gap-1">
                              <span className="material-symbols-outlined text-[14px]">warning</span>
                              Insumos Faltantes (Para Fabricar {item.quantidade} un)
                            </h6>
                            <div className="space-y-1.5">
                              {missingMaterials.map(m => (
                                <div key={m.nome} className="flex justify-between items-center text-outline text-[11px] border-b border-yellow-200/50 pb-1">
                                  <span>{m.nome} <strong className="text-red-500 ml-1">Falta {m.qtdFaltante.toFixed(3)} {m.unidadeMedida}</strong></span>
                                  <span className="font-bold">R$ {m.valorComprar.toFixed(2)}</span>
                                </div>
                              ))}
                              <div className="flex justify-between items-center pt-1 font-black text-red-600">
                                <span>Custo Adicional (Compras)</span>
                                <span>R$ {totalMissingCost.toFixed(2)}</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
          
          <div className="mt-4 pt-4 border-t border-outline-variant">
            <div className="flex justify-between items-end mb-4">
              <div>
                <div className="text-[10px] font-black text-outline uppercase mb-1">Lucro Estimado Pedido</div>
                <div className={`text-xl font-black ${lucroGeral >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                  R$ {lucroGeral.toFixed(2)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[10px] font-black text-outline uppercase mb-1">Total do Pedido</div>
                <div className="text-2xl font-black text-[#002046] tracking-tight">
                  R$ {totalGeralVenda.toFixed(2)}
                </div>
              </div>
            </div>
            
            <button
              onClick={handleCheckout}
              disabled={cartItems.length === 0}
              className="w-full bg-[#002046] hover:bg-[#1b365d] text-white font-black py-3 rounded-xl text-sm uppercase tracking-widest cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm transition-all"
            >
              Faturar e Gerar Pedido
            </button>
          </div>
        </div>
      </div>

      {/* PAINEL PROJEÇÃO DE ESTOQUE IDÊNTICO À CALCULADORA AVANÇADA */}
      {selectedSkuId && (
        <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/60 space-y-4">
          <div className="flex justify-between items-center border-b pb-2 border-outline-variant/30">
            <h5 className="text-[11px] font-black text-secondary uppercase flex items-center gap-1.5">
              <span className="material-symbols-outlined notranslate text-[16px]">inventory_2</span>
              Disponibilidade de Estoque (BOM)
            </h5>
            {!previewHasBOM && (
              <span className="text-[9px] font-black uppercase text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded">Fórmula Não Cadastrada</span>
            )}
          </div>

          {previewHasBOM && (
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

              {previewDeficit && (
                <div className="p-3 bg-surface-bright border border-outline-variant/60 rounded-xl flex items-center justify-between text-xs font-bold gap-3">
                  <span className="text-primary">Estoque insuficiente para esta quantidade comercial.</span>
                  <button
                    type="button"
                    onClick={() => setInputQtd(String(calculationResult))}
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

    </div>
  );
}
