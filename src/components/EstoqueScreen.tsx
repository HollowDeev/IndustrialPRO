import React, { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';
import { createClient } from '../utils/supabase/client';
import LoadingOverlay from './LoadingOverlay';

interface EstoqueItem {
  id: string;
  empresa_id: string;
  nome: string;
  categoria: string;
  estoque_atual: number;
  unidade_medida: string;
  preco_unitario: number;
  valor_total_rs: number;
}

interface EntradaEstoque {
  id: string;
  insumo_id: string;
  fornecedor_id: string;
  quantidade: number;
  preco_unitario: number;
  data_prevista: string;
  status: 'PENDENTE' | 'ENTREGUE' | 'CANCELADO';
  data_entrega: string | null;
  insumos?: { nome: string; unidade_medida: string; categoria: string };
  fornecedores?: { razao_social: string };
  recebido_por?: string;
  usuarios?: { email: string };
}

interface Fornecedor {
  id: string;
  razao_social: string;
}

export default function EstoqueScreen() {
  const { addToast } = useToast();
  const supabase = createClient();
  const [items, setItems] = useState<EstoqueItem[]>([]);
  const [entradas, setEntradas] = useState<EntradaEstoque[]>([]);
  const [fornecedores, setFornecedores] = useState<Fornecedor[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Tabs: 'INVENTARIO', 'PREVISAO', 'HISTORICO'
  const [activeTab, setActiveTab] = useState<'INVENTARIO' | 'PREVISAO' | 'HISTORICO'>('INVENTARIO');
  const [filter, setFilter] = useState<string>('TODOS');
  
  // Modal Nova Entrada
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedInsumoId, setSelectedInsumoId] = useState('');
  const [selectedFornecedorId, setSelectedFornecedorId] = useState('');
  const [quantidade, setQuantidade] = useState('');
  const [precoUnitario, setPrecoUnitario] = useState('');
  const [dataPrevista, setDataPrevista] = useState('');
  
  // Confirmation Modal for early delivery
  const [confirmDeliveryId, setConfirmDeliveryId] = useState<string | null>(null);
  const [isEarlyDelivery, setIsEarlyDelivery] = useState(false);
  
  // Immediate entry flag
  const [isImmediate, setIsImmediate] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch Estoque (Insumos)
      const { data: estoqueData, error: estoqueError } = await supabase
        .from('v_estoque_valorizado')
        .select('*')
        .order('categoria')
        .order('nome');
      if (estoqueError) throw estoqueError;
      setItems(estoqueData as EstoqueItem[]);

      // Fetch Entradas with joins
      const { data: entradasData, error: entradasError } = await supabase
        .from('entradas_estoque')
        .select(`
          *,
          insumos (nome, unidade_medida, categoria),
          fornecedores (nome)
        `)
        .order('created_at', { ascending: false });
      if (entradasError) throw entradasError;
      setEntradas(entradasData as any[]);

      // Fetch Fornecedores for the dropdown
      const { data: fornData, error: fornError } = await supabase
        .from('fornecedores')
        .select('id, nome, status')
        .eq('status', 'Ativo')
        .order('nome');
      if (fornError) throw fornError;
      setFornecedores(fornData as any[]);

    } catch (err) {
      console.error('Erro ao buscar dados do almoxarifado:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();

    // Listen to changes in both insumos and entradas_estoque
    const channel = supabase
      .channel('estoque-realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'insumos' }, () => {
        fetchData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'entradas_estoque' }, () => {
        fetchData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleAddEntradaSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalDate = dataPrevista;
    if (isImmediate) {
      finalDate = new Date().toISOString().split('T')[0];
    }
    
    if (!selectedInsumoId || !selectedFornecedorId || !quantidade || !precoUnitario || !finalDate) {
      addToast("Preencha todos os campos.", "warning");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
    if (!profile?.empresa_id) return;

    const { data: inserted, error } = await supabase.from('entradas_estoque').insert({
      empresa_id: profile.empresa_id,
      insumo_id: selectedInsumoId,
      fornecedor_id: selectedFornecedorId,
      quantidade: parseFloat(quantidade),
      preco_unitario: parseFloat(precoUnitario),
      data_prevista: finalDate,
      status: 'PENDENTE'
    }).select().single();

    if (error) {
      addToast(`Erro ao registrar entrada: ${error.message}`, "error");
      return;
    }

    if (isImmediate && inserted) {
      // Registrar recebimento imediatamente sem passar pelo popup manual
      const { error: rpcError } = await supabase.rpc('registrar_recebimento', {
        p_entrada_id: inserted.id
      });
      if (rpcError) {
        addToast(`Erro ao processar o recebimento automático: ${rpcError.message}`, "error");
      }
    }

    setIsAddModalOpen(false);
    setSelectedInsumoId('');
    setSelectedFornecedorId('');
    setQuantidade('');
    setPrecoUnitario('');
    setDataPrevista('');
    setIsImmediate(false);
    fetchData();
  };

  const triggerRecebimento = (entrada: EntradaEstoque) => {
    const today = new Date();
    today.setHours(0,0,0,0);
    
    // Parse 'YYYY-MM-DD'
    const [year, month, day] = entrada.data_prevista.split('-');
    const prevDate = new Date(parseInt(year), parseInt(month)-1, parseInt(day));
    
    if (today < prevDate) {
      setIsEarlyDelivery(true);
    } else {
      setIsEarlyDelivery(false);
    }
    setConfirmDeliveryId(entrada.id);
  };

  const confirmRecebimento = async () => {
    if (!confirmDeliveryId) return;
    
    try {
      const { error } = await supabase.rpc('registrar_recebimento', {
        p_entrada_id: confirmDeliveryId
      });
      if (error) throw error;
      setConfirmDeliveryId(null);
      fetchData();
    } catch (err: any) {
      addToast(`Erro ao registrar recebimento: ${err.message}`, "error");
    }
  };

  const getCapacityPercent = (val: number, cat: string) => {
    const maxCapacity = cat === 'ACABADO' ? 5000 : 25000;
    return Math.min(100, Math.max(0, (val / maxCapacity) * 100));
  };

  if (loading) {
    return <LoadingOverlay message="Carregando Inventário de Estoque..." />;
  }

  const filteredItems = filter === 'TODOS' ? items : items.filter(i => i.categoria === filter);
  const totalImobilizado = filteredItems.reduce((acc, curr) => acc + curr.valor_total_rs, 0);

  const pendentes = entradas.filter(e => e.status === 'PENDENTE');
  const entregues = entradas.filter(e => e.status === 'ENTREGUE');

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col h-full gap-6 animate-fade-in relative">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-on-surface">Almoxarifado & Estoque</h1>
          <p className="text-on-surface-variant text-sm mt-1">Gestão de inventário e recebimento de cargas</p>
        </div>
        
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-secondary hover:brightness-95 text-white text-xs font-bold px-4 py-2.5 rounded-lg transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined notranslate text-[18px]">local_shipping</span>
          NOVA ENTRADA
        </button>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex border-b border-outline-variant/30 gap-6">
        <button 
          onClick={() => setActiveTab('INVENTARIO')} 
          className={`pb-3 font-bold transition-colors ${activeTab === 'INVENTARIO' ? 'border-b-2 border-[#002046] text-[#002046]' : 'text-on-surface-variant hover:text-[#002046]'}`}
        >
          Visão Geral / Inventário
        </button>
        <button 
          onClick={() => setActiveTab('PREVISAO')} 
          className={`pb-3 font-bold flex items-center gap-2 transition-colors ${activeTab === 'PREVISAO' ? 'border-b-2 border-[#002046] text-[#002046]' : 'text-on-surface-variant hover:text-[#002046]'}`}
        >
          Previsão de Recebimento
          {pendentes.length > 0 && (
            <span className="bg-error text-white text-[10px] px-2 py-0.5 rounded-full">{pendentes.length}</span>
          )}
        </button>
        <button 
          onClick={() => setActiveTab('HISTORICO')} 
          className={`pb-3 font-bold transition-colors ${activeTab === 'HISTORICO' ? 'border-b-2 border-[#002046] text-[#002046]' : 'text-on-surface-variant hover:text-[#002046]'}`}
        >
          Histórico de Entregas
        </button>
      </div>

      {/* TAB CONTENT: INVENTÁRIO */}
      {activeTab === 'INVENTARIO' && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex gap-2 bg-surface-container p-1 rounded-xl">
              {['TODOS', 'QUIMICO', 'ACO', 'ACABADO'].map(cat => (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                    filter === cat ? 'bg-[#002046] text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
            <div className="bg-surface-container-lowest p-3 px-5 rounded-2xl border border-outline-variant/30 shadow-sm flex items-center gap-4">
              <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">Capital Imobilizado</span>
              <span className="text-xl font-black text-[#002046]">{formatCurrency(totalImobilizado)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-12">
            {filteredItems.map(item => {
              const percent = getCapacityPercent(item.estoque_atual, item.categoria);
              const isCritical = item.estoque_atual < 500 && item.categoria !== 'ACABADO';

              return (
                <div key={item.id} className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-on-surface text-lg truncate" title={item.nome}>{item.nome}</h3>
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-surface-container-high text-on-surface-variant mt-1">
                          {item.categoria}
                        </span>
                      </div>
                      {isCritical && (
                        <span className="material-symbols-outlined notranslate text-error" title="Estoque Crítico">warning</span>
                      )}
                    </div>

                    <div className="mt-6 mb-2 flex justify-between items-end">
                      <div className="text-2xl font-black text-on-surface">
                        {item.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} <span className="text-sm font-medium text-on-surface-variant">{item.unidade_medida}</span>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-on-surface-variant mb-0.5">Capital</p>
                        <p className="font-bold text-[#002046]">{formatCurrency(item.valor_total_rs)}</p>
                      </div>
                    </div>

                    <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden mt-4">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${isCritical ? 'bg-error' : 'bg-secondary'}`}
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* TAB CONTENT: PREVISÃO DE RECEBIMENTO */}
      {activeTab === 'PREVISAO' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-container-low text-xs text-on-surface-variant uppercase font-bold border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4">Data Prevista</th>
                <th className="px-6 py-4">Status / Dias Restantes</th>
                <th className="px-6 py-4">Matéria-Prima</th>
                <th className="px-6 py-4">Fornecedor</th>
                <th className="px-6 py-4">Quantidade</th>
                <th className="px-6 py-4 text-right">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {pendentes.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-8 text-center text-on-surface-variant font-medium">Nenhuma carga pendente.</td></tr>
              ) : pendentes.map(ent => {
                const today = new Date();
                today.setHours(0,0,0,0);
                const [y, m, d] = ent.data_prevista.split('-');
                const prev = new Date(parseInt(y), parseInt(m)-1, parseInt(d));
                const diffTime = prev.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                let daysText = diffDays === 0 ? 'Chega Hoje!' : diffDays > 0 ? `Faltam ${diffDays} dias` : `Atrasado ${Math.abs(diffDays)} dias`;
                let daysColor = diffDays === 0 ? 'text-secondary' : diffDays > 0 ? 'text-primary' : 'text-error';

                return (
                  <tr key={ent.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">{new Date(prev).toLocaleDateString('pt-BR')}</td>
                    <td className={`px-6 py-4 font-bold ${daysColor}`}>{daysText}</td>
                    <td className="px-6 py-4">
                      <span className="font-bold">{ent.insumos?.nome}</span>
                      <span className="block text-[10px] uppercase text-outline">{ent.insumos?.categoria}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-on-surface-variant">{ent.fornecedores?.nome}</td>
                    <td className="px-6 py-4 font-bold">{ent.quantidade} <span className="text-xs text-outline">{ent.insumos?.unidade_medida}</span></td>
                    <td className="px-6 py-4 text-right">
                      <button 
                        onClick={() => triggerRecebimento(ent)}
                        className="bg-primary/10 text-primary hover:bg-primary/20 px-4 py-2 rounded-lg font-bold text-xs uppercase tracking-wider transition-colors"
                      >
                        Marcar Entregue
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: HISTÓRICO DE ENTREGAS */}
      {activeTab === 'HISTORICO' && (
        <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl overflow-hidden">
          <table className="w-full text-sm text-left">
            <thead className="bg-surface-container-low text-xs text-on-surface-variant uppercase font-bold border-b border-outline-variant">
              <tr>
                <th className="px-6 py-4">Data Realizada</th>
                <th className="px-6 py-4">Recebido Por (Auditoria)</th>
                <th className="px-6 py-4">Matéria-Prima</th>
                <th className="px-6 py-4">Fornecedor</th>
                <th className="px-6 py-4">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant">
              {entregues.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-on-surface-variant font-medium">Nenhum histórico de entrega registrado.</td></tr>
              ) : entregues.map(ent => (
                  <tr key={ent.id} className="hover:bg-surface-container-low/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-secondary">
                      {new Date(ent.data_entrega!).toLocaleDateString('pt-BR')} <br/>
                      <span className="text-[10px] text-outline">{new Date(ent.data_entrega!).toLocaleTimeString('pt-BR')}</span>
                    </td>
                    <td className="px-6 py-4 font-medium text-on-surface-variant">Usuário Autenticado</td>
                    <td className="px-6 py-4 font-bold text-on-surface">{ent.insumos?.nome}</td>
                    <td className="px-6 py-4 font-medium">{ent.fornecedores?.nome}</td>
                    <td className="px-6 py-4 font-bold">{ent.quantidade} <span className="text-xs text-outline">{ent.insumos?.unidade_medida}</span><br/><span className="text-[10px] text-outline font-normal">@{formatCurrency(ent.preco_unitario)}</span></td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* MODAL: NOVA ENTRADA DE ESTOQUE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[999] p-4 animate-fade-in">
          <form onSubmit={handleAddEntradaSubmit} className="bg-white max-w-lg w-full rounded-2xl shadow-2xl p-6 border border-outline-variant space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-black text-[#002046] uppercase flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-[20px]">local_shipping</span>
                Registrar Previsão de Entrada
              </h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-[#74777f] hover:text-[#002046] transition-colors cursor-pointer">
                <span className="material-symbols-outlined notranslate">close</span>
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Insumo (Item Cadastrado)</label>
                <select
                  required
                  value={selectedInsumoId}
                  onChange={(e) => setSelectedInsumoId(e.target.value)}
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-[#002046] focus:outline-none"
                >
                  <option value="" disabled>Selecione a Matéria-Prima...</option>
                  {items.map(item => (
                    <option key={item.id} value={item.id}>{item.nome} ({item.categoria})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Fornecedor da Carga</label>
                <select
                  required
                  value={selectedFornecedorId}
                  onChange={(e) => setSelectedFornecedorId(e.target.value)}
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-[#002046] focus:outline-none"
                >
                  <option value="" disabled>Selecione o Fornecedor...</option>
                  {fornecedores.map((f: any) => (
                    <option key={f.id} value={f.id}>{f.nome}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Quantidade</label>
                  <input type="number" step="0.01" required value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-[#002046] focus:outline-none" placeholder="Ex: 5000" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Preço Pago (Unitário R$)</label>
                  <input type="number" step="0.01" required value={precoUnitario} onChange={(e) => setPrecoUnitario(e.target.value)} className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-[#002046] focus:outline-none" placeholder="Ex: 12.50" />
                </div>
              </div>

              <div className="flex items-center gap-2 mb-2 pt-2">
                <input 
                  type="checkbox" 
                  id="chkImmediate"
                  className="accent-[#002046] w-4 h-4 cursor-pointer"
                  checked={isImmediate}
                  onChange={(e) => setIsImmediate(e.target.checked)}
                />
                <label htmlFor="chkImmediate" className="text-xs font-bold text-[#002046] cursor-pointer">
                  Entrada Imediata (Mercadoria já descarregada)
                </label>
              </div>

              {!isImmediate && (
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Data Prevista de Entrega</label>
                  <input type="date" required={!isImmediate} value={dataPrevista} onChange={(e) => setDataPrevista(e.target.value)} className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-[#002046] focus:outline-none" />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 mt-2 border-t border-outline-variant">
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="bg-[#f4f3f9] hover:bg-[#e4e3e9] text-[#002046] font-bold px-4 py-2.5 rounded-lg text-xs cursor-pointer">
                Cancelar
              </button>
              <button type="submit" className="bg-secondary hover:brightness-95 text-white font-bold px-4 py-2.5 rounded-lg text-xs cursor-pointer">
                {isImmediate ? 'Salvar e Receber' : 'Salvar Previsão'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRMATION DIALOG: RECEBIMENTO */}
      {confirmDeliveryId && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[1000] p-4 animate-fade-in">
          <div className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 text-center border border-outline-variant">
            <span className={`material-symbols-outlined notranslate text-[48px] ${isEarlyDelivery ? 'text-red-600' : 'text-[#002046]'} mb-4`}>
              {isEarlyDelivery ? 'warning' : 'inventory_2'}
            </span>
            <h3 className="text-lg font-black text-on-surface mb-2">Confirmar Entrega?</h3>
            {isEarlyDelivery ? (
              <p className="text-sm text-on-surface-variant mb-6">
                Atenção: A previsão de entrega era para uma data futura. Tem certeza que a transportadora já descarregou este lote? O estoque e o preço médio serão atualizados instantaneamente.
              </p>
            ) : (
              <p className="text-sm text-on-surface-variant mb-6">
                Confirma que a transportadora entregou o lote? O saldo será injetado no inventário e a ação será registrada no seu nome.
              </p>
            )}
            
            <div className="flex flex-col gap-2">
              <button 
                onClick={confirmRecebimento}
                className={`w-full text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors cursor-pointer ${isEarlyDelivery ? 'bg-red-600 hover:bg-red-700' : 'bg-secondary hover:brightness-95'}`}
              >
                Sim, Confirmar Recebimento
              </button>
              <button 
                onClick={() => setConfirmDeliveryId(null)}
                className="w-full bg-surface-container-low hover:bg-surface-container-high text-on-surface font-bold px-4 py-3 rounded-xl text-sm transition-colors"
              >
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
