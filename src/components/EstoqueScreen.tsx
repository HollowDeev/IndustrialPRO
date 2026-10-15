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
  quantidade_atual: number;
  umidade_produto?: number;
  umidade_ambiente?: number;
  preco_unitario: number;
  data_prevista: string;
  status: 'PENDENTE' | 'ENTREGUE' | 'CANCELADO';
  data_entrega: string | null;
  insumos?: { nome: string; unidade_medida: string; categoria: string };
  fornecedor?: { nome?: string; razao_social?: string; };
  entradas_origens_tree?: {
    fornecedor_n2_id?: string;
    fornecedor_n1_id?: string;
    fornecedores_n2?: { nome?: string; cnpj?: string; dados_extras?: any };
    fornecedores_n1?: { nome?: string; cnpj?: string; dados_extras?: any };
  }[];
  recebido_por?: string;
  recebido_por_nome?: string;
  usuarios?: { email: string };
  created_at?: string;
}

interface Fornecedor {
  id: string;
  razao_social: string;
  nome?: string;
  status?: string;
  categoria?: string;
}

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

export default function EstoqueScreen({ 
  triggerAddNew = 0,
  onGoToSupplier,
  tourDemoMode = false
}: { 
  triggerAddNew?: number,
  onGoToSupplier?: (id: string, name: string) => void,
  tourDemoMode?: boolean
}) {
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
  
  // 1:N Traceability Tree states
  const [n2List, setN2List] = useState<any[]>([]);
  const [n1List, setN1List] = useState<any[]>([]);
  const [selectedN2Ids, setSelectedN2Ids] = useState<string[]>([]);
  const [selectedN1Ids, setSelectedN1Ids] = useState<string[]>([]);
  const [treeTab, setTreeTab] = useState<'ATUAL' | 'HISTORICO'>('ATUAL');
  
  // Custom sub-modal forms for N1 & N2
  const [isN2ModalOpen, setIsN2ModalOpen] = useState(false);
  const [n2Form, setN2Form] = useState({
    nome: '',
    cnpj: '',
    maquina: '',
    endereco: '',
    telefone: '',
    email: ''
  });

  const [isN1ModalOpen, setIsN1ModalOpen] = useState(false);
  const [n1Form, setN1Form] = useState({
    nome: '',
    telefone: '',
    email: '',
    cnpj: '',
    modeloColeta: ''
  });
  const [currentN2IdForN1, setCurrentN2IdForN1] = useState<string | null>(null);

  // Custom select dropdown state
  const [isSupplierSelectOpen, setIsSupplierSelectOpen] = useState(false);
  
  const [confirmDeliveryId, setConfirmDeliveryId] = useState<string | null>(null);
  const [isEarlyDelivery, setIsEarlyDelivery] = useState(false);
  const [umidadeProduto, setUmidadeProduto] = useState('');
  const [umidadeAmbiente, setUmidadeAmbiente] = useState('');
  
  const [expandedInsumoId, setExpandedInsumoId] = useState<string | null>(null);
  
  // Immediate entry flag
  const [isImmediate, setIsImmediate] = useState(false);
  
  // Novos campos fiscais da Fase 9
  const [destinacao, setDestinacao] = useState<'INSUMO' | 'CONSUMO'>('INSUMO');
  const [valorIcmsNf, setValorIcmsNf] = useState('');
  const [valorIpiNf, setValorIpiNf] = useState('');

  // Custos Extras (Fase 6)
  const [custosExtras, setCustosExtras] = useState<{ descricao: string; valor: string }[]>([]);

  const addCustoExtraRow = () => {
    setCustosExtras([...custosExtras, { descricao: '', valor: '' }]);
  };

  const removeCustoExtraRow = (index: number) => {
    setCustosExtras(custosExtras.filter((_, i) => i !== index));
  };

  const updateCustoExtraRow = (index: number, field: 'descricao' | 'valor', value: string) => {
    const updated = [...custosExtras];
    updated[index][field] = value;
    setCustosExtras(updated);
  };

  useEffect(() => {
    if (triggerAddNew > 0) {
      setIsAddModalOpen(true);
    }
  }, [triggerAddNew]);

  // Efeito para preencher dados de demonstração no Tour Interativo
  useEffect(() => {
    if (tourDemoMode) {
      setIsAddModalOpen(true);
      setQuantidade('2500');
      setPrecoUnitario('8.90');
      setDataPrevista(new Date().toISOString().substring(0, 10));
      if (items.length > 0) {
        setSelectedInsumoId(items[0].id);
      }
      if (fornecedores.length > 0) {
        setSelectedFornecedorId(fornecedores[0].id);
      }
    }
  }, [tourDemoMode, items, fornecedores]);

    const fetchData = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
      const empresaId = profile?.empresa_id;
      if (!empresaId) return;

      // Fetch Estoque (Insumos)
      const { data: estoqueData, error: estoqueError } = await supabase
        .from('v_estoque_valorizado')
        .select('*')
        .eq('empresa_id', empresaId)
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
          fornecedor:fornecedores!entradas_estoque_fornecedor_id_fkey (nome),
          entradas_origens_tree (
            fornecedor_n2_id,
            fornecedor_n1_id,
            fornecedores_n2 (nome, cnpj, dados_extras),
            fornecedores_n1 (nome, cnpj, dados_extras)
          )
        `)
        .eq('empresa_id', empresaId)
        .order('created_at', { ascending: false });
      if (entradasError) throw entradasError;
      
      const entradasFinal = entradasData || [];

      // Fetch users for 'recebido_por'
      const userIds = [...new Set(entradasFinal.map(e => e.recebido_por).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: usersData } = await supabase
          .from('usuarios')
          .select('id, nome')
          .in('id', userIds);
          
        if (usersData) {
          const userMap: Record<string, string> = {};
          usersData.forEach(u => userMap[u.id] = u.nome);
          entradasFinal.forEach((e: any) => {
            if (e.recebido_por) {
              e.recebido_por_nome = userMap[e.recebido_por];
            }
          });
        }
      }

      setEntradas(entradasFinal as any[]);

      const { data: fornData, error: fornError } = await supabase
        .from('fornecedores')
        .select('id, nome, status, categoria')
        .eq('empresa_id', empresaId)
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

  useEffect(() => {
    setTreeTab('ATUAL');
    const fetchN2N1 = async () => {
      if (selectedFornecedorId) {
        const { data: n2Data } = await supabase.from('fornecedores_n2').select('*').eq('fornecedor_n3_id', selectedFornecedorId);
        setN2List(n2Data || []);
        if (n2Data && n2Data.length > 0) {
          const n2Ids = n2Data.map((n: any) => n.id);
          const { data: n1Data } = await supabase.from('fornecedores_n1').select('*').in('fornecedor_n2_id', n2Ids);
          setN1List(n1Data || []);
        } else {
          setN1List([]);
        }
      } else {
        setN2List([]);
        setN1List([]);
      }
    };
    fetchN2N1();
  }, [selectedFornecedorId]);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatCNPJ = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 14);
    return v.replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2');
  };

  const formatCPFOrCNPJ = (value: string) => {
    const clean = value.replace(/\D/g, '');
    if (clean.length <= 11) {
      const v = clean.slice(0, 11);
      return v.replace(/^(\d{3})(\d)/, '$1.$2')
              .replace(/^(\d{3})\.(\d{3})(\d)/, '$1.$2.$3')
              .replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/, '$1.$2.$3-$4');
    } else {
      const v = clean.slice(0, 14);
      return v.replace(/^(\d{2})(\d)/, '$1.$2')
              .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
              .replace(/\.(\d{3})(\d)/, '.$1/$2')
              .replace(/(\d{4})(\d)/, '$1-$2');
    }
  };

  const formatTelefone = (value: string) => {
    const clean = value.replace(/\D/g, '').slice(0, 11);
    if (clean.length <= 10) {
      return clean.replace(/^(\d{2})(\d)/, '($1) $2')
                  .replace(/(\d{4})(\d)/, '$1-$2');
    } else {
      return clean.replace(/^(\d{2})(\d)/, '($1) $2')
                  .replace(/(\d{5})(\d)/, '$1-$2');
    }
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
      destinacao,
      valor_icms_nota: valorIcmsNf ? parseFloat(valorIcmsNf) : 0,
      valor_ipi_nota: valorIpiNf ? parseFloat(valorIpiNf) : 0,
      status: 'PENDENTE'
    }).select().single();

    if (error) {
      addToast(`Erro ao registrar entrada: ${error.message}`, "error");
      return;
    }

    // Inserir Custos Extras (Fase 6)
    if (inserted && custosExtras.length > 0) {
      const extraInserts = custosExtras
        .filter(c => c.descricao.trim() && parseFloat(c.valor) > 0)
        .map(c => ({
          empresa_id: profile.empresa_id,
          entrada_id: inserted.id,
          descricao_custo: c.descricao.trim(),
          valor: parseFloat(c.valor)
        }));
      if (extraInserts.length > 0) {
        const { error: extrasError } = await supabase.from('entradas_custos_extras').insert(extraInserts);
        if (extrasError) {
          console.error("Erro ao salvar custos adicionais:", extrasError);
        }
      }
    }

    // Insert Tree Nodes
    if (inserted && (selectedN2Ids.length > 0 || selectedN1Ids.length > 0)) {
      const treeInserts = [];
      
      // If N1 is selected, we map it to its parent N2
      for (const n1Id of selectedN1Ids) {
        const n1Node = n1List.find(n => n.id === n1Id);
        treeInserts.push({
          empresa_id: profile.empresa_id,
          entrada_id: inserted.id,
          fornecedor_n2_id: n1Node ? n1Node.fornecedor_n2_id : null,
          fornecedor_n1_id: n1Id
        });
      }
      
      // If N2 is selected but has NO N1 selected, we insert it alone
      for (const n2Id of selectedN2Ids) {
        const hasN1SelectedForThisN2 = selectedN1Ids.some(n1Id => {
          const n1Node = n1List.find(n => n.id === n1Id);
          return n1Node && n1Node.fornecedor_n2_id === n2Id;
        });
        
        if (!hasN1SelectedForThisN2) {
          treeInserts.push({
            empresa_id: profile.empresa_id,
            entrada_id: inserted.id,
            fornecedor_n2_id: n2Id,
            fornecedor_n1_id: null
          });
        }
      }
      
      if (treeInserts.length > 0) {
        const { error: treeError } = await supabase.from('entradas_origens_tree').insert(treeInserts);
        if (treeError) {
          console.error("Erro ao salvar árvore de rastreabilidade:", treeError);
        }
      }
    }

    if (isImmediate && inserted) {
      // Automatic receiving
      const { error: receiveError } = await supabase.rpc('registrar_recebimento', { 
        p_entrada_id: inserted.id,
        p_umidade_produto: umidadeProduto ? parseFloat(umidadeProduto) : null,
        p_umidade_ambiente: umidadeAmbiente ? parseFloat(umidadeAmbiente) : null
      });
      if (receiveError) {
        addToast(`Previsão registrada, mas erro ao receber o lote: ${receiveError.message}`, "error");
      } else {
        addToast("Lote recebido e estoque atualizado com sucesso!", "success");
      }
    } else {
      addToast("Previsão de lote registrada com sucesso!", "success");
    }

    setIsAddModalOpen(false);
    setSelectedInsumoId('');
    setSelectedFornecedorId('');
    setQuantidade('');
    setPrecoUnitario('');
    setDataPrevista('');
    setUmidadeProduto('');
    setUmidadeAmbiente('');
    setIsImmediate(false);
    setDestinacao('INSUMO');
    setValorIcmsNf('');
    setValorIpiNf('');
    setSelectedN2Ids([]);
    setSelectedN1Ids([]);
    setCustosExtras([]);
    fetchData();
  };

  const handleAddN2 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!n2Form.nome.trim() || !selectedFornecedorId) {
      addToast("Preencha o Nome Fantasia.", "warning");
      return;
    }

    const cleanCnpj = n2Form.cnpj.replace(/\D/g, '');
    if (cleanCnpj && cleanCnpj.length !== 14) {
      addToast("CNPJ do Distribuidor deve ter 14 dígitos.", "warning");
      return;
    }

    if (n2Form.email && !/\S+@\S+\.\S+/.test(n2Form.email)) {
      addToast("E-mail inválido.", "warning");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
    if (!profile?.empresa_id) return;

    const { data, error } = await supabase.from('fornecedores_n2').insert({
      empresa_id: profile.empresa_id,
      fornecedor_n3_id: selectedFornecedorId,
      nome: n2Form.nome,
      cnpj: cleanCnpj ? n2Form.cnpj : null,
      dados_extras: {
        maquina: n2Form.maquina,
        endereco: n2Form.endereco,
        telefone: n2Form.telefone,
        email: n2Form.email
      }
    }).select().single();

    if (error) {
      addToast(`Erro ao adicionar Nível 2: ${error.message}`, "error");
    } else if (data) {
      setN2List([...n2List, data]);
      setSelectedN2Ids([...selectedN2Ids, data.id]);
      setN2Form({ nome: '', cnpj: '', maquina: '', endereco: '', telefone: '', email: '' });
      setIsN2ModalOpen(false);
      addToast("Distribuidor (Nível 2) adicionado com sucesso!", "success");
    }
  };

  const handleAddN1 = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!n1Form.nome.trim() || !currentN2IdForN1) {
      addToast("Preencha o Nome do Fabricante.", "warning");
      return;
    }

    const cleanCnpj = n1Form.cnpj.replace(/\D/g, '');
    if (cleanCnpj && cleanCnpj.length !== 11 && cleanCnpj.length !== 14) {
      addToast("CPF deve ter 11 dígitos ou CNPJ deve ter 14.", "warning");
      return;
    }

    if (n1Form.email && !/\S+@\S+\.\S+/.test(n1Form.email)) {
      addToast("E-mail inválido.", "warning");
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
    if (!profile?.empresa_id) return;

    const { data, error } = await supabase.from('fornecedores_n1').insert({
      empresa_id: profile.empresa_id,
      fornecedor_n2_id: currentN2IdForN1,
      nome: n1Form.nome,
      cnpj: cleanCnpj ? n1Form.cnpj : null,
      dados_extras: {
        telefone: n1Form.telefone,
        email: n1Form.email,
        modelo_coleta: n1Form.modeloColeta
      }
    }).select().single();

    if (error) {
      addToast(`Erro ao adicionar Nível 1: ${error.message}`, "error");
    } else if (data) {
      setN1List([...n1List, data]);
      setSelectedN1Ids([...selectedN1Ids, data.id]);
      if (!selectedN2Ids.includes(currentN2IdForN1)) {
        setSelectedN2Ids([...selectedN2Ids, currentN2IdForN1]);
      }
      setN1Form({ nome: '', telefone: '', email: '', cnpj: '', modeloColeta: '' });
      setCurrentN2IdForN1(null);
      setIsN1ModalOpen(false);
      addToast("Fabricante (Nível 1) adicionado com sucesso!", "success");
    }
  };

  const handleApplyPastChain = (nodes: any[]) => {
    const n2Ids: string[] = [];
    const n1Ids: string[] = [];
    
    const newN2s = [...n2List];
    const newN1s = [...n1List];
    
    nodes.forEach(n => {
      if (n.fornecedor_n2_id) {
        n2Ids.push(n.fornecedor_n2_id);
        if (!newN2s.some(item => item.id === n.fornecedor_n2_id) && n.fornecedores_n2) {
          newN2s.push({ id: n.fornecedor_n2_id, ...n.fornecedores_n2 });
        }
      }
      if (n.fornecedor_n1_id) {
        n1Ids.push(n.fornecedor_n1_id);
        if (!newN1s.some(item => item.id === n.fornecedor_n1_id) && n.fornecedores_n1) {
          newN1s.push({ id: n.fornecedor_n1_id, ...n.fornecedores_n1 });
        }
      }
    });
    
    setN2List(newN2s);
    setN1List(newN1s);
    setSelectedN2Ids([...new Set(n2Ids)]);
    setSelectedN1Ids([...new Set(n1Ids)]);
    addToast("Cadeia de fornecedores do lote selecionado aplicada!", "success");
    setTreeTab('ATUAL');
  };

  const handleDeleteN2 = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este Distribuidor (Nível 2) do banco de dados? Todos os fabricantes (Nível 1) associados também serão excluídos!")) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('fornecedores_n2').delete().eq('id', id);
      if (error) throw error;
      addToast("Distribuidor excluído com sucesso!", "success");
      setN2List(prev => prev.filter(item => item.id !== id));
      setN1List(prev => prev.filter(item => item.fornecedor_n2_id !== id));
      setSelectedN2Ids(prev => prev.filter(i => i !== id));
      const childIds = n1List.filter(item => item.fornecedor_n2_id === id).map(item => item.id);
      setSelectedN1Ids(prev => prev.filter(i => !childIds.includes(i)));
    } catch (err: any) {
      addToast(`Erro ao excluir Distribuidor: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteN1 = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir permanentemente este Fabricante (Nível 1) do banco de dados?")) return;
    try {
      setLoading(true);
      const { error } = await supabase.from('fornecedores_n1').delete().eq('id', id);
      if (error) throw error;
      addToast("Fabricante excluído com sucesso!", "success");
      setN1List(prev => prev.filter(item => item.id !== id));
      setSelectedN1Ids(prev => prev.filter(i => i !== id));
    } catch (err: any) {
      addToast(`Erro ao excluir Fabricante: ${err.message}`, "error");
    } finally {
      setLoading(false);
    }
  };

  const triggerRecebimento = async (entrada: EntradaEstoque) => {
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

    try {
      const { data: extrasData } = await supabase
        .from('entradas_custos_extras')
        .select('descricao_custo, valor')
        .eq('entrada_id', entrada.id);
      if (extrasData) {
        setCustosExtras(extrasData.map(e => ({ descricao: e.descricao_custo, valor: String(e.valor) })));
      } else {
        setCustosExtras([]);
      }
    } catch (err) {
      console.error('Erro ao buscar custos extras:', err);
      setCustosExtras([]);
    }

    setConfirmDeliveryId(entrada.id);
  };

  const confirmRecebimento = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!confirmDeliveryId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");
      const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
      const empresaId = profile?.empresa_id;

      // 1. Limpar custos antigos e salvar os novos
      await supabase.from('entradas_custos_extras').delete().eq('entrada_id', confirmDeliveryId);
      if (custosExtras.length > 0 && empresaId) {
        const inserts = custosExtras
          .filter(c => c.descricao.trim() && parseFloat(c.valor) > 0)
          .map(c => ({
            empresa_id: empresaId,
            entrada_id: confirmDeliveryId,
            descricao_custo: c.descricao.trim(),
            valor: parseFloat(c.valor)
          }));
        if (inserts.length > 0) {
          const { error: insError } = await supabase.from('entradas_custos_extras').insert(inserts);
          if (insError) throw insError;
        }
      }

      // 2. Confirmar recebimento (PL/pgSQL reconta custos extras e calcula custo_unitario_real)
      const { error } = await supabase.rpc('registrar_recebimento', {
        p_entrada_id: confirmDeliveryId,
        p_umidade_produto: umidadeProduto ? parseFloat(umidadeProduto) : null,
        p_umidade_ambiente: umidadeAmbiente ? parseFloat(umidadeAmbiente) : null
      });
      if (error) throw error;
      setConfirmDeliveryId(null);
      setUmidadeProduto('');
      setUmidadeAmbiente('');
      setCustosExtras([]);
      fetchData();
      addToast("Recebimento de lote registrado com sucesso!", "success");
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
              {[
                { value: 'TODOS', label: 'Todos' },
                { value: 'POLIMERO', label: 'Polímeros' },
                { value: 'QUIMICO', label: 'Químicos' },
                { value: 'ACO', label: 'Aço' },
                { value: 'ACABADO', label: 'Famílias' }
              ].map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setFilter(opt.value)}
                  className={`px-4 py-2 rounded-lg text-sm font-bold transition-all duration-300 ${
                    filter === opt.value ? 'bg-[#002046] text-white shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-high'
                  }`}
                >
                  {opt.label}
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
                <div 
                  key={item.id} 
                  className="bg-surface-container-lowest rounded-2xl border border-outline-variant/30 overflow-hidden shadow-sm hover:shadow-md transition-shadow group cursor-pointer"
                  onClick={() => setExpandedInsumoId(item.id)}
                >
                  <div className="p-5">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="font-bold text-on-surface text-lg truncate" title={item.nome}>{item.nome}</h3>
                        <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-surface-container-high text-on-surface-variant mt-1">
                          {item.categoria === 'ACABADO' ? 'Família' : 
                           item.categoria === 'POLIMERO' ? 'Polímero' : 
                           item.categoria === 'QUIMICO' ? 'Químico' : 
                           item.categoria === 'ACO' ? 'Aço' : item.categoria}
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
                      <span className="block text-[10px] uppercase text-outline">
                        {ent.insumos?.categoria === 'ACABADO' ? 'Família' : 
                         ent.insumos?.categoria === 'POLIMERO' ? 'Polímero' : 
                         ent.insumos?.categoria === 'QUIMICO' ? 'Químico' : 
                         ent.insumos?.categoria === 'ACO' ? 'Aço' : ent.insumos?.categoria}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium text-on-surface-variant">{ent.fornecedor?.nome}</td>
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
                    <td className="px-6 py-4 font-medium text-on-surface-variant">
                      {ent.recebido_por_nome || 'Usuário Autenticado'}
                    </td>
                    <td className="px-6 py-4 font-bold text-on-surface">{ent.insumos?.nome}</td>
                    <td className="px-6 py-4 font-medium">
                      <div className="flex items-center gap-2">
                        <span>{ent.fornecedor?.nome || ent.fornecedor?.razao_social}</span>
                        {ent.fornecedor_id && (
                          <button 
                            onClick={() => onGoToSupplier?.(ent.fornecedor_id, ent.fornecedor?.nome || '')}
                            title="Ir para o Fornecedor"
                            className="text-[#1b365d] hover:text-[#002046] transition-colors p-1 rounded-full hover:bg-gray-100"
                          >
                            <span className="material-symbols-outlined notranslate text-[16px]">open_in_new</span>
                          </button>
                        )}
                      </div>
                    </td>
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
          <form id="tour-form-entrada-estoque" onSubmit={handleAddEntradaSubmit} className="bg-white max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col rounded-2xl shadow-2xl border border-outline-variant">
            <div className="flex justify-between items-center border-b border-outline-variant p-6 bg-surface-container-lowest shrink-0">
              <h3 className="text-sm font-black text-[#002046] uppercase flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-[20px]">local_shipping</span>
                Registrar Previsão de Entrada / Recebimento
              </h3>
              <button type="button" onClick={() => setIsAddModalOpen(false)} className="text-[#74777f] hover:text-[#002046] transition-colors cursor-pointer">
                <span className="material-symbols-outlined notranslate">close</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 h-full">
                {/* Left Panel: Form Data */}
                <div className="space-y-4 text-xs pr-4 md:border-r border-outline-variant/30">
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Insumo (Item Cadastrado)</label>
                <select
                  required
                  value={selectedInsumoId}
                  onChange={(e) => setSelectedInsumoId(e.target.value)}
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-[#002046] focus:outline-none"
                >
                  <option value="" disabled>Selecione a Matéria-Prima...</option>
                  {items.map(item => {
                    const catLabel = item.categoria === 'ACABADO' ? 'Família' : 
                                     item.categoria === 'POLIMERO' ? 'Polímero' : 
                                     item.categoria === 'QUIMICO' ? 'Químico' : 
                                     item.categoria === 'ACO' ? 'Aço' : item.categoria;
                    return (
                      <option key={item.id} value={item.id}>{item.nome} ({catLabel})</option>
                    );
                  })}
                </select>
              </div>

              <div className="relative">
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Fornecedor da Carga</label>
                {(() => {
                  const selectedForn = fornecedores.find(f => f.id === selectedFornecedorId);
                  
                  let filtered = fornecedores;
                  if (selectedInsumoId) {
                    const insumo = items.find(i => i.id === selectedInsumoId);
                    if (insumo) {
                      let targetCat = '';
                      if (insumo.categoria === 'ACO') targetCat = 'ACO';
                      else if (insumo.categoria === 'QUIMICO') targetCat = 'QUIMICO';
                      else if (insumo.categoria === 'POLIMERO') targetCat = 'POLIMERO';
                      
                      if (targetCat) {
                        filtered = fornecedores.filter(f => {
                          const cats = parseDbCategories(f.categoria);
                          return cats.includes(targetCat);
                        });
                      }
                    }
                  }
                  
                  // Filter by status (allow Ativo and Em Homologação)
                  filtered = filtered.filter(f => {
                    const statusLower = (f.status || '').toLowerCase();
                    return statusLower === 'ativo' || statusLower === 'em homologação' || statusLower === 'em homologacao';
                  });

                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => setIsSupplierSelectOpen(!isSupplierSelectOpen)}
                        className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-[#002046] text-left focus:outline-hidden flex items-center justify-between cursor-pointer select-none"
                      >
                        {selectedForn ? (
                          <div className="flex items-center gap-2">
                            <span>{selectedForn.nome}</span>
                            {selectedForn.status?.toLowerCase().includes('homologa') && (
                              <span className="bg-red-100 text-red-700 border border-red-200 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm select-none shrink-0">
                                Em Homologação
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 font-semibold">Selecione o Fornecedor...</span>
                        )}
                        <span className="material-symbols-outlined notranslate text-[18px] text-gray-500">
                          {isSupplierSelectOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
                        </span>
                      </button>

                      {isSupplierSelectOpen && (
                        <>
                          <div className="fixed inset-0 z-[990]" onClick={() => setIsSupplierSelectOpen(false)} />
                          <div className="absolute z-[1000] w-full mt-1 bg-white border border-outline-variant rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-outline-variant/30">
                          {filtered.length === 0 ? (
                            <div className="p-3 text-center text-gray-400 font-semibold">Nenhum fornecedor disponível para esta matéria-prima.</div>
                          ) : (
                            filtered.map((f: any) => {
                              const isHomologacao = (f.status || '').toLowerCase().includes('homologa');
                              return (
                                <button
                                  key={f.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedFornecedorId(f.id);
                                    setIsSupplierSelectOpen(false);
                                  }}
                                  className="w-full text-left p-3 hover:bg-[#f4f3f9] transition-colors flex items-center justify-between text-xs font-bold text-[#002046] cursor-pointer"
                                >
                                  <span>{f.nome}</span>
                                  {isHomologacao && (
                                    <span className="bg-red-100 text-red-700 border border-red-200 text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm select-none">
                                      Em Homologação
                                    </span>
                                  )}
                                </button>
                              );
                            })
                          )}
                        </div>
                        </>
                      )}
                    </>
                  );
                })()}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">
                    Quantidade {selectedInsumoId && items.find(i => i.id === selectedInsumoId) ? `(${(items.find(i => i.id === selectedInsumoId)?.unidade_medida || '').toUpperCase()})` : ''}
                  </label>
                  <input type="number" step="0.01" required value={quantidade} onChange={(e) => setQuantidade(e.target.value)} className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-[#002046] focus:outline-none" placeholder="Ex: 5000" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Preço Pago (Unitário R$)</label>
                  <input type="number" step="0.01" required value={precoUnitario} onChange={(e) => setPrecoUnitario(e.target.value)} className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2.5 font-bold text-[#002046] focus:outline-none" placeholder="Ex: 12.50" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t border-outline-variant/30 pt-4 mt-2">
                <div>
                  <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Destinação Fiscal</label>
                  <select
                    value={destinacao}
                    onChange={(e) => setDestinacao(e.target.value as any)}
                    className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 text-xs font-bold text-[#002046] focus:outline-none focus:border-secondary"
                  >
                    <option value="INSUMO">Uso Industrial (Insumo)</option>
                    <option value="CONSUMO">Uso e Consumo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Valor ICMS NF (R$)</label>
                  <input type="number" step="0.01" value={valorIcmsNf} onChange={(e) => setValorIcmsNf(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none focus:border-secondary text-xs" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-secondary uppercase mb-1">Valor IPI NF (R$)</label>
                  <input type="number" step="0.01" value={valorIpiNf} onChange={(e) => setValorIpiNf(e.target.value)} className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none focus:border-secondary text-xs" placeholder="0.00" />
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

              {isImmediate && (
                <div className="grid grid-cols-2 gap-4 mt-2 p-3 bg-[#e3e2e8] rounded-lg border border-outline-variant">
                  <div>
                    <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Umidade Produto (%)</label>
                    <input type="number" step="0.01" required={isImmediate} value={umidadeProduto} onChange={(e) => setUmidadeProduto(e.target.value)} className="w-full bg-white border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none text-xs" placeholder="Ex: 0.5" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Umidade Ambiente (%)</label>
                    <input type="number" step="0.01" required={isImmediate} value={umidadeAmbiente} onChange={(e) => setUmidadeAmbiente(e.target.value)} className="w-full bg-white border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none text-xs" placeholder="Ex: 60" />
                  </div>
                </div>
              )}

              {/* Custos Adicionais da Operação (Fase 6) */}
              <div className="bg-[#f4f3f9] p-4 rounded-xl border border-outline-variant/60 space-y-3 mt-2">
                <div className="flex justify-between items-center">
                  <h5 className="text-[10px] font-black text-[#002046] uppercase tracking-wider">Custos Adicionais da Operação</h5>
                  <button 
                    type="button" 
                    onClick={addCustoExtraRow}
                    className="text-[10px] font-bold text-secondary hover:text-primary flex items-center gap-1 transition-colors cursor-pointer select-none"
                  >
                    <span className="material-symbols-outlined notranslate text-[14px]">add</span> Adicionar Custo
                  </button>
                </div>
                
                {custosExtras.length === 0 ? (
                  <p className="text-[10px] text-gray-500 italic">Nenhum custo adicional adicionado (ex: frete, descarga, impostos).</p>
                ) : (
                  <div className="space-y-2 max-h-32 overflow-y-auto no-scrollbar">
                    {custosExtras.map((c, index) => (
                      <div key={index} className="flex gap-2 items-center">
                        <input 
                          type="text" 
                          placeholder="Ex: Frete, Taxa" 
                          value={c.descricao} 
                          onChange={(e) => updateCustoExtraRow(index, 'descricao', e.target.value)}
                          className="flex-1 bg-white border border-outline-variant rounded-md p-1.5 font-bold text-[#002046] text-xs focus:outline-none"
                        />
                        <input 
                          type="number" 
                          step="0.01"
                          placeholder="Valor R$" 
                          value={c.valor} 
                          onChange={(e) => updateCustoExtraRow(index, 'valor', e.target.value)}
                          className="w-24 bg-white border border-outline-variant rounded-md p-1.5 font-bold text-[#002046] text-xs focus:outline-none"
                        />
                        <button 
                          type="button" 
                          onClick={() => removeCustoExtraRow(index)}
                          className="text-red-600 hover:text-red-800 font-bold text-xs shrink-0 cursor-pointer"
                        >
                          <span className="material-symbols-outlined notranslate text-[16px]">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Cálculo em Tempo Real */}
                {(() => {
                  const q = parseFloat(quantidade) || 0;
                  const p = parseFloat(precoUnitario) || 0;
                  const sumExtras = custosExtras.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
                  const total = (q * p) + sumExtras;
                  const realUnit = q > 0 ? total / q : p;
                  return (
                    <div className="pt-2 border-t border-outline-variant/50 flex justify-between items-center text-[10px]">
                      <span className="text-[#74777f] font-bold">Total Lote: <strong className="text-primary">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                      <span className="bg-secondary/15 text-secondary px-2 py-0.5 rounded-sm font-black uppercase tracking-wider">
                        Custo Real Unit: R$ {realUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                  );
                })()}
              </div>
              </div>
              {/* Right Panel: Tree View */}
              <div className="space-y-4 flex flex-col h-full overflow-hidden">
                <div className="flex justify-between items-center border-b border-outline-variant/50 pb-2 shrink-0">
                  <h4 className="text-[11px] font-black text-[#002046] uppercase tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined notranslate text-[16px]">account_tree</span>
                    Árvore de Composição de Origem (1:N)
                  </h4>
                  {selectedFornecedorId && (
                    <div className="flex bg-surface-container p-0.5 rounded-lg border border-outline-variant/50">
                      <button
                        type="button"
                        onClick={() => setTreeTab('ATUAL')}
                        className={`px-2 py-1 text-[9px] font-black rounded-md transition-all cursor-pointer ${treeTab === 'ATUAL' ? 'bg-[#002046] text-white' : 'text-[#74777f] hover:bg-surface-container-high'}`}
                      >
                        Cadeia Atual
                      </button>
                      <button
                        type="button"
                        onClick={() => setTreeTab('HISTORICO')}
                        className={`px-2 py-1 text-[9px] font-black rounded-md transition-all cursor-pointer ${treeTab === 'HISTORICO' ? 'bg-[#002046] text-white' : 'text-[#74777f] hover:bg-surface-container-high'}`}
                      >
                        Histórico ({entradas.filter(e => e.fornecedor_id === selectedFornecedorId && e.entradas_origens_tree && e.entradas_origens_tree.length > 0).length})
                      </button>
                    </div>
                  )}
                </div>
                
                {!selectedFornecedorId ? (
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant text-center text-xs text-outline font-semibold">
                    Selecione um Fornecedor Nível 3 para construir a árvore.
                  </div>
                ) : treeTab === 'HISTORICO' ? (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 overflow-y-auto max-h-[50vh] space-y-3">
                    {(() => {
                      const historyList = entradas.filter(e => 
                        e.fornecedor_id === selectedFornecedorId && 
                        e.entradas_origens_tree && 
                        e.entradas_origens_tree.length > 0
                      );

                      if (historyList.length === 0) {
                        return (
                          <div className="text-center text-outline italic py-6">
                            Nenhuma cadeia de fornecedores registrada em compras anteriores deste fornecedor.
                          </div>
                        );
                      }

                      return historyList.map(e => {
                        const nodes = e.entradas_origens_tree || [];
                        return (
                          <div key={e.id} className="p-3 bg-surface-container-low border border-outline-variant/60 rounded-xl hover:border-secondary transition-all space-y-2.5">
                            <div className="flex justify-between items-start gap-2">
                              <div>
                                <p className="font-bold text-xs text-[#002046]">
                                  Compra do lote em {new Date(e.data_entrega || e.created_at || e.data_prevista).toLocaleDateString('pt-BR')}
                                </p>
                                <p className="text-[10px] text-outline mt-0.5">
                                  Quantidade: <strong className="text-primary">{e.quantidade} {e.insumos?.unidade_medida || 'un'}</strong> de <span className="font-bold">{e.insumos?.nome}</span>
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleApplyPastChain(nodes)}
                                className="bg-[#002046] hover:brightness-95 text-white font-bold text-[9px] px-2.5 py-1.5 rounded-lg transition-all cursor-pointer uppercase shrink-0"
                              >
                                Selecionar
                              </button>
                            </div>

                            {/* Cadeia Preview */}
                            <div className="bg-white p-2 rounded-lg border border-outline-variant/40 space-y-1.5">
                              {nodes.map((n: any, idx: number) => {
                                const n1 = n.fornecedores_n1?.nome;
                                const n2 = n.fornecedores_n2?.nome;
                                return (
                                  <div key={idx} className="flex items-center gap-1.5 text-[9px] text-[#74777f] font-semibold">
                                    <span className="material-symbols-outlined notranslate text-[10px] text-secondary">link</span>
                                    {n1 && <span>{n1} <span className="text-outline font-normal">(N1)</span> &rarr; </span>}
                                    {n2 && <span>{n2} <span className="text-outline font-normal">(N2)</span> &rarr; </span>}
                                    <span className="text-[#002046] font-bold">{fornecedores.find(f => f.id === selectedFornecedorId)?.nome}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                ) : (
                  <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-4 overflow-y-auto max-h-[50vh] space-y-6">
                    {n2List.length === 0 ? (
                      <div className="text-center text-outline italic py-6 text-[11px]">
                        Nenhum distribuidor (Nível 2) adicionado ainda para este fornecedor.
                      </div>
                    ) : (
                      <div className="space-y-8 relative">
                        {n2List.map(n2 => {
                          const n1s = n1List.filter(n1 => n1.fornecedor_n2_id === n2.id);
                          return (
                            <div key={n2.id} className="flex gap-6 items-start relative pl-2">
                              {/* Left Branch: N2 Card */}
                              <div className="w-[45%] shrink-0 relative group">
                                <div className={`p-3.5 rounded-xl border transition-all ${
                                  selectedN2Ids.includes(n2.id) 
                                    ? 'bg-secondary/5 border-secondary shadow-2xs' 
                                    : 'bg-surface-bright border-outline-variant/60 hover:border-outline-variant'
                                }`}>
                                  <div className="flex items-start gap-2.5">
                                    <input 
                                      type="checkbox" 
                                      className="accent-secondary w-4 h-4 cursor-pointer mt-0.5"
                                      checked={selectedN2Ids.includes(n2.id)}
                                      onChange={(e) => {
                                        if (e.target.checked) setSelectedN2Ids([...selectedN2Ids, n2.id]);
                                        else {
                                          setSelectedN2Ids(selectedN2Ids.filter(id => id !== n2.id));
                                          const childrenIds = n1List.filter(n1 => n1.fornecedor_n2_id === n2.id).map(n1 => n1.id);
                                          setSelectedN1Ids(selectedN1Ids.filter(id => !childrenIds.includes(id)));
                                        }
                                      }}
                                    />
                                    <div className="flex-1 space-y-1.5 min-w-0">
                                      <div className="flex justify-between items-start gap-1">
                                        <span className="font-black text-xs text-primary leading-tight truncate" title={n2.nome}>{n2.nome}</span>
                                        <div className="flex items-center gap-1.5 shrink-0">
                                          <button
                                            type="button"
                                            onClick={() => handleDeleteN2(n2.id)}
                                            className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50 transition-colors cursor-pointer flex items-center justify-center"
                                            title="Excluir do Banco de Dados"
                                          >
                                            <span className="material-symbols-outlined notranslate text-[14px]">delete</span>
                                          </button>
                                          <span className="bg-secondary/15 text-secondary text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm">
                                            N2
                                          </span>
                                        </div>
                                      </div>
                                      
                                      <div className="grid grid-cols-1 gap-1 text-[10px] text-outline font-semibold pt-1.5 border-t border-outline-variant/20">
                                        {n2.cnpj && (
                                          <div>
                                            CNPJ: <span className="text-[#002046] font-bold">{n2.cnpj}</span>
                                          </div>
                                        )}
                                        {n2.dados_extras?.maquina && (
                                          <div className="truncate" title={n2.dados_extras.maquina}>
                                            Máquina: <span className="text-[#002046] font-bold">{n2.dados_extras.maquina}</span>
                                          </div>
                                        )}
                                        {n2.dados_extras?.telefone && (
                                          <div>
                                            Tel: <span className="text-[#002046] font-bold">{n2.dados_extras.telefone}</span>
                                          </div>
                                        )}
                                        {n2.dados_extras?.email && (
                                          <div className="truncate" title={n2.dados_extras.email}>
                                            Email: <span className="text-[#002046] font-bold">{n2.dados_extras.email}</span>
                                          </div>
                                        )}
                                        {n2.dados_extras?.endereco && (
                                          <div className="truncate text-[9px]" title={n2.dados_extras.endereco}>
                                            End: <span className="text-[#002046] font-bold">{n2.dados_extras.endereco}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Connection Line (mindmap style) */}
                              <div className="self-stretch w-4 flex items-center justify-center relative shrink-0">
                                <div className="absolute left-0 right-0 h-0.5 border-t border-dashed border-outline-variant/60 top-1/2 -translate-y-1/2" />
                              </div>

                              {/* Right Branch: N1 Cards Stack */}
                              <div className="flex-1 space-y-2 border-l border-dashed border-outline-variant/60 pl-4 relative">
                                {n1s.length === 0 ? (
                                  <div className="text-[10px] text-outline italic p-3 bg-surface-container-low rounded-xl border border-dashed border-outline-variant/40 text-center">
                                    Nenhum fabricante Nível 1.
                                  </div>
                                ) : (
                                  n1s.map(n1 => (
                                    <div key={n1.id} className="relative group">
                                      {/* Horizontal connecting line from left border */}
                                      <div className="absolute -left-4 w-4 h-0.5 border-t border-dashed border-outline-variant/60 top-1/2 -translate-y-1/2" />
                                      
                                      {/* N1 Card */}
                                      <div className={`p-3 rounded-xl border transition-all ${
                                        selectedN1Ids.includes(n1.id) 
                                          ? 'bg-primary/5 border-[#002046] shadow-3xs' 
                                          : 'bg-surface-container-lowest border-outline-variant/40 hover:border-outline-variant/60'
                                      }`}>
                                        <div className="flex items-start gap-2">
                                          <input 
                                            type="checkbox" 
                                            className="accent-[#002046] w-3.5 h-3.5 cursor-pointer mt-0.5 shrink-0"
                                            checked={selectedN1Ids.includes(n1.id)}
                                            onChange={(e) => {
                                              if (e.target.checked) {
                                                setSelectedN1Ids([...selectedN1Ids, n1.id]);
                                                if (!selectedN2Ids.includes(n2.id)) setSelectedN2Ids([...selectedN2Ids, n2.id]);
                                              } else {
                                                setSelectedN1Ids(selectedN1Ids.filter(id => id !== n1.id));
                                              }
                                            }}
                                          />
                                          <div className="flex-1 space-y-1 min-w-0">
                                            <div className="flex justify-between items-start gap-1">
                                              <span className="font-bold text-[11px] text-[#002046] leading-tight truncate" title={n1.nome}>{n1.nome}</span>
                                              <div className="flex items-center gap-1 shrink-0">
                                                <button
                                                  type="button"
                                                  onClick={() => handleDeleteN1(n1.id)}
                                                  className="text-red-500 hover:text-red-700 p-0.5 rounded hover:bg-red-50 transition-colors cursor-pointer flex items-center justify-center"
                                                  title="Excluir do Banco de Dados"
                                                >
                                                  <span className="material-symbols-outlined notranslate text-[13px]">delete</span>
                                                </button>
                                                <span className="bg-[#002046]/10 text-[#002046] text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-sm">
                                                  N1
                                                </span>
                                              </div>
                                            </div>
                                            
                                            <div className="grid grid-cols-1 gap-0.5 text-[9px] text-outline font-semibold pt-1 border-t border-outline-variant/20">
                                              {n1.cnpj && (
                                                <div>
                                                  CNPJ: <span className="text-primary font-bold">{n1.cnpj}</span>
                                                </div>
                                              )}
                                              {n1.dados_extras?.modelo_coleta && (
                                                <div className="truncate" title={n1.dados_extras.modelo_coleta}>
                                                  Coleta: <span className="text-primary font-bold">{n1.dados_extras.modelo_coleta}</span>
                                                </div>
                                              )}
                                              {n1.dados_extras?.telefone && (
                                                <div>
                                                  Tel: <span className="text-primary font-bold">{n1.dados_extras.telefone}</span>
                                                </div>
                                              )}
                                              {n1.dados_extras?.email && (
                                                <div className="truncate" title={n1.dados_extras.email}>
                                                  Email: <span className="text-primary font-bold">{n1.dados_extras.email}</span>
                                                </div>
                                              )}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  ))
                                )}
                                
                                <button 
                                  type="button" 
                                  onClick={() => { setCurrentN2IdForN1(n2.id); setIsN1ModalOpen(true); }} 
                                  className="text-[9px] font-black text-secondary hover:text-primary flex items-center gap-0.5 transition-colors mt-2 cursor-pointer select-none pl-1"
                                >
                                  <span className="material-symbols-outlined notranslate text-[12px]">add</span> ADD FABRICANTE
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <button 
                      type="button" 
                      onClick={() => setIsN2ModalOpen(true)} 
                      className="text-xs font-bold text-secondary hover:text-primary flex items-center gap-1 transition-colors mt-2 bg-secondary/10 px-3 py-1.5 rounded-lg cursor-pointer select-none w-full justify-center"
                    >
                      <span className="material-symbols-outlined notranslate text-[14px]">add</span> Adicionar Distribuidor (Nível 2)
                    </button>
                  </div>
                )}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 p-6 bg-surface-container-lowest border-t border-outline-variant shrink-0">
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
          <form onSubmit={confirmRecebimento} className="bg-white max-w-sm w-full rounded-2xl shadow-2xl p-6 text-center border border-outline-variant">
            <span className={`material-symbols-outlined notranslate text-[48px] ${isEarlyDelivery ? 'text-red-600' : 'text-[#002046]'} mb-4`}>
              {isEarlyDelivery ? 'warning' : 'inventory_2'}
            </span>
            <h3 className="text-lg font-black text-on-surface mb-2">Confirmar Entrega?</h3>
            {isEarlyDelivery ? (
              <p className="text-sm text-on-surface-variant mb-4">
                Atenção: A previsão era para uma data futura. Tem certeza que a transportadora já descarregou este lote? O estoque será atualizado.
              </p>
            ) : (
              <p className="text-sm text-on-surface-variant mb-4">
                Confirma que a transportadora entregou o lote? O saldo será injetado no inventário.
              </p>
            )}
            
            <div className="grid grid-cols-2 gap-3 mb-4 text-left">
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Umid. Produto (%)</label>
                <input type="number" step="0.01" required value={umidadeProduto} onChange={(e) => setUmidadeProduto(e.target.value)} className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none text-xs" placeholder="Ex: 0.5" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Umid. Ambiente (%)</label>
                <input type="number" step="0.01" required value={umidadeAmbiente} onChange={(e) => setUmidadeAmbiente(e.target.value)} className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none text-xs" placeholder="Ex: 60" />
              </div>
            </div>

            {/* Custos Adicionais da Operação (Fase 6) */}
            {(() => {
              const ent = entradas.find(e => e.id === confirmDeliveryId);
              if (!ent) return null;
              const q = ent.quantidade;
              const p = ent.preco_unitario;
              const sumExtras = custosExtras.reduce((acc, curr) => acc + (parseFloat(curr.valor) || 0), 0);
              const total = (q * p) + sumExtras;
              const realUnit = q > 0 ? total / q : p;
              return (
                <div className="bg-[#f4f3f9] p-3 rounded-xl border border-outline-variant/60 space-y-2 mb-4 text-left">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-black text-[#002046] uppercase tracking-wider">Custos Adicionais</h5>
                    <button 
                      type="button" 
                      onClick={addCustoExtraRow}
                      className="text-[10px] font-bold text-secondary hover:text-primary flex items-center gap-1 transition-colors cursor-pointer select-none"
                    >
                      <span className="material-symbols-outlined notranslate text-[12px]">add</span> Adicionar
                    </button>
                  </div>
                  
                  {custosExtras.length === 0 ? (
                    <p className="text-[9px] text-gray-500 italic">Nenhum custo adicional adicionado.</p>
                  ) : (
                    <div className="space-y-1.5 max-h-24 overflow-y-auto no-scrollbar">
                      {custosExtras.map((c, index) => (
                        <div key={index} className="flex gap-1 items-center">
                          <input 
                            type="text" 
                            placeholder="Descrição" 
                            value={c.descricao} 
                            onChange={(e) => updateCustoExtraRow(index, 'descricao', e.target.value)}
                            className="flex-1 bg-white border border-outline-variant rounded-md p-1 font-bold text-[#002046] text-[10px] focus:outline-none"
                          />
                          <input 
                            type="number" 
                            step="0.01"
                            placeholder="R$" 
                            value={c.valor} 
                            onChange={(e) => updateCustoExtraRow(index, 'valor', e.target.value)}
                            className="w-16 bg-white border border-outline-variant rounded-md p-1 font-bold text-[#002046] text-[10px] focus:outline-none"
                          />
                          <button 
                            type="button" 
                            onClick={() => removeCustoExtraRow(index)}
                            className="text-red-600 hover:text-red-800 font-bold text-xs shrink-0 cursor-pointer"
                          >
                            <span className="material-symbols-outlined notranslate text-[14px]">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="pt-1.5 border-t border-outline-variant/50 flex justify-between items-center text-[9px]">
                    <span className="text-[#74777f] font-bold">Total Lote: <strong className="text-primary">R$ {total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></span>
                    <span className="bg-secondary/15 text-secondary px-1.5 py-0.5 rounded-sm font-black uppercase tracking-wider">
                      Custo Real Unit: R$ {realUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              );
            })()}

            <div className="flex flex-col gap-2">
              <button 
                type="submit"
                className={`w-full text-white font-bold px-4 py-3 rounded-xl text-sm transition-colors cursor-pointer ${isEarlyDelivery ? 'bg-red-600 hover:bg-red-700' : 'bg-secondary hover:brightness-95'}`}
              >
                Sim, Confirmar Recebimento
              </button>
              <button 
                type="button"
                onClick={() => setConfirmDeliveryId(null)}
                className="w-full bg-surface-container-low hover:bg-surface-container-high text-on-surface font-bold px-4 py-3 rounded-xl text-sm transition-colors cursor-pointer"
              >
                Voltar
              </button>
            </div>
          </form>
        </div>
      )}

      {/* MODAL DETALHAMENTO DO INSUMO E LOTES */}
      {expandedInsumoId && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[1000] p-4 animate-fade-in">
          {(() => {
            const item = items.find(i => i.id === expandedInsumoId);
            if (!item) return null;
            return (
              <div className="bg-surface-container-lowest max-w-2xl w-full max-h-[85vh] rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-slide-up border border-outline-variant/30">
                <div className="p-6 border-b border-outline-variant/50 bg-[#002046] text-white flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black">{item.nome}</h2>
                    <span className="inline-block px-2 py-0.5 mt-2 rounded text-xs font-bold bg-white/20 text-white tracking-wider">
                      {item.categoria === 'ACABADO' ? 'Família' : 
                       item.categoria === 'POLIMERO' ? 'Polímero' : 
                       item.categoria === 'QUIMICO' ? 'Químico' : 
                       item.categoria === 'ACO' ? 'Aço' : item.categoria}
                    </span>
                  </div>
                  <button onClick={() => setExpandedInsumoId(null)} className="text-white/70 hover:text-white transition-colors cursor-pointer">
                    <span className="material-symbols-outlined notranslate text-[28px]">close</span>
                  </button>
                </div>
                
                <div className="p-6 flex-1 overflow-y-auto">
                  {/* Totais do Produto */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                    <div className="bg-[#f4f3f9] p-4 rounded-xl border border-outline-variant/50">
                      <p className="text-xs font-bold text-[#74777f] uppercase tracking-wider mb-1">Estoque Total</p>
                      <p className="text-3xl font-black text-[#002046]">
                        {item.estoque_atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} <span className="text-lg font-medium text-[#74777f]">{item.unidade_medida}</span>
                      </p>
                    </div>
                    <div className="bg-[#f4f3f9] p-4 rounded-xl border border-outline-variant/50">
                      <p className="text-xs font-bold text-[#74777f] uppercase tracking-wider mb-1">Capital Imobilizado</p>
                      <p className="text-3xl font-black text-secondary">{formatCurrency(item.valor_total_rs)}</p>
                    </div>
                  </div>

                  {/* Lotes Ativos */}
                  <h3 className="font-bold text-[#002046] text-sm uppercase tracking-wider mb-4 border-b border-outline-variant/50 pb-2">Composição de Lotes Ativos (FIFO)</h3>
                  <div className="space-y-3">
                    {entradas.filter(e => e.insumo_id === item.id && e.status === 'ENTREGUE' && e.quantidade_atual > 0).length === 0 ? (
                      <div className="text-center text-on-surface-variant p-6 bg-surface-container-low rounded-xl border border-outline-variant/50">
                        {item.categoria === 'ACABADO' ? 'Rastreabilidade de produto acabado indisponível.' : 'Nenhum lote ativo encontrado.'}
                      </div>
                    ) : (
                      entradas
                        .filter(e => e.insumo_id === item.id && e.status === 'ENTREGUE' && e.quantidade_atual > 0)
                        .sort((a, b) => new Date(a.data_entrega || 0).getTime() - new Date(b.data_entrega || 0).getTime())
                        .map((lote, idx) => (
                          <div key={lote.id} className="bg-white p-4 rounded-xl border border-outline-variant shadow-sm hover:border-secondary hover:shadow-md transition-all relative flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="absolute -top-3 left-4 text-[10px] bg-secondary text-white px-2 py-1 rounded-md font-black tracking-widest shadow-sm">
                              LOTE {idx + 1}
                            </div>
                            <div className="mt-2 sm:mt-0 flex-1">
                              <div className="font-black text-lg text-[#002046]">
                                {lote.quantidade_atual.toLocaleString('pt-BR', { maximumFractionDigits: 2 })} <span className="text-sm font-medium text-[#74777f]">{item.unidade_medida}</span>
                              </div>
                              <p className="text-[11px] font-bold text-[#74777f] mt-1 flex items-center gap-1">
                                <span className="material-symbols-outlined notranslate text-[14px]">account_tree</span>
                                {(() => {
                                  const nodes = lote.entradas_origens_tree || [];
                                  if (nodes.length === 0) return `${lote.fornecedor?.nome || 'Fornecedor Desconhecido'}`;
                                  
                                  // Map and format the tree structure for display
                                  const paths = nodes.map(n => {
                                    const n1 = n.fornecedores_n1?.nome;
                                    const n2 = n.fornecedores_n2?.nome;
                                    if (n1 && n2) return `${n1} → ${n2}`;
                                    if (n1) return n1;
                                    if (n2) return n2;
                                    return '';
                                  }).filter(Boolean);
                                  
                                  if (paths.length === 0) return `${lote.fornecedor?.nome || 'Fornecedor Desconhecido'}`;
                                  
                                  const uniquePaths = [...new Set(paths)];
                                  return (
                                    <div className="flex flex-col gap-1 w-full">
                                      {uniquePaths.map((path, i) => (
                                        <div key={i} className="flex items-center gap-1">
                                          <span className="w-1.5 h-1.5 rounded-full bg-secondary shrink-0"></span>
                                          <span className="truncate">{path} → {lote.fornecedor?.nome}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </p>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-1 gap-2 text-xs sm:text-right">
                              <div className="bg-[#f4f3f9] px-2 py-1 rounded-md border border-outline-variant/30">
                                <span className="font-bold text-[#74777f]">Entrada:</span> <span className="font-black text-[#002046]">{lote.data_entrega ? new Date(lote.data_entrega).toLocaleDateString('pt-BR') : '-'}</span>
                              </div>
                              <div className="bg-[#f4f3f9] px-2 py-1 rounded-md border border-outline-variant/30">
                                <span className="font-bold text-[#74777f]">Umid:</span> <span className="font-black text-[#002046]">P: {lote.umidade_produto || '-'}% | A: {lote.umidade_ambiente || '-'}%</span>
                              </div>
                            </div>
                          </div>
                        ))
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>
      )}
      {/* SUB-MODAL: CADASTRO NÍVEL 2 (DISTRIBUIDOR) */}
      {isN2ModalOpen && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[1000] p-4 animate-fade-in">
          <form onSubmit={handleAddN2} className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-outline-variant text-xs">
            <div className="flex justify-between items-center border-b border-outline-variant p-4 bg-surface-container-lowest shrink-0">
              <h3 className="text-xs font-black text-[#002046] uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined notranslate text-[18px]">domain</span>
                Cadastrar Nível 2 - Distribuidor / Prensagem
              </h3>
              <button type="button" onClick={() => setIsN2ModalOpen(false)} className="text-[#74777f] hover:text-[#002046] transition-colors cursor-pointer">
                <span className="material-symbols-outlined notranslate">close</span>
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Nome Fantasia *</label>
                <input 
                  type="text" 
                  required 
                  value={n2Form.nome} 
                  onChange={(e) => setN2Form({ ...n2Form, nome: e.target.value })} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                  placeholder="Ex: Prensagem Recicla Mais"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">CNPJ</label>
                <input 
                  type="text" 
                  value={n2Form.cnpj} 
                  onChange={(e) => setN2Form({ ...n2Form, cnpj: formatCNPJ(e.target.value) })} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Máquina / Equipamento</label>
                <input 
                  type="text" 
                  value={n2Form.maquina} 
                  onChange={(e) => setN2Form({ ...n2Form, maquina: e.target.value })} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                  placeholder="Ex: Prensa Hidráulica 30T"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Endereço</label>
                <input 
                  type="text" 
                  value={n2Form.endereco} 
                  onChange={(e) => setN2Form({ ...n2Form, endereco: e.target.value })} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                  placeholder="Rua, Número, Bairro, Cidade - UF"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Telefone Contato</label>
                  <input 
                    type="tel" 
                    value={n2Form.telefone} 
                    onChange={(e) => setN2Form({ ...n2Form, telefone: formatTelefone(e.target.value) })} 
                    className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">E-mail Contato</label>
                  <input 
                    type="email" 
                    value={n2Form.email} 
                    onChange={(e) => setN2Form({ ...n2Form, email: e.target.value })} 
                    className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                    placeholder="contato@distribuidor.com"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 bg-surface-container-lowest border-t border-outline-variant shrink-0">
              <button type="button" onClick={() => setIsN2ModalOpen(false)} className="bg-[#f4f3f9] hover:bg-[#e4e3e9] text-[#002046] font-bold px-4 py-2 rounded-lg text-xs cursor-pointer">
                Cancelar
              </button>
              <button type="submit" className="bg-secondary hover:brightness-95 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer">
                Salvar Distribuidor
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-MODAL: CADASTRO NÍVEL 1 (FABRICANTE) */}
      {isN1ModalOpen && (
        <div className="fixed inset-0 bg-black/55 flex items-center justify-center z-[1000] p-4 animate-fade-in">
          <form onSubmit={handleAddN1} className="bg-white max-w-md w-full rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-outline-variant text-xs">
            <div className="flex justify-between items-center border-b border-outline-variant p-4 bg-surface-container-lowest shrink-0">
              <h3 className="text-xs font-black text-[#002046] uppercase flex items-center gap-1.5">
                <span className="material-symbols-outlined notranslate text-[18px]">agriculture</span>
                Cadastrar Nível 1 - Produtor / Fabricante / Origem
              </h3>
              <button type="button" onClick={() => setIsN1ModalOpen(false)} className="text-[#74777f] hover:text-[#002046] transition-colors cursor-pointer">
                <span className="material-symbols-outlined notranslate">close</span>
              </button>
            </div>
            
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Nome / Razão Social *</label>
                <input 
                  type="text" 
                  required 
                  value={n1Form.nome} 
                  onChange={(e) => setN1Form({ ...n1Form, nome: e.target.value })} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                  placeholder="Ex: Cooperativa Reciclar Oeste"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">CPF ou CNPJ</label>
                <input 
                  type="text" 
                  value={n1Form.cnpj} 
                  onChange={(e) => setN1Form({ ...n1Form, cnpj: formatCPFOrCNPJ(e.target.value) })} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                  placeholder="000.000.000-00 ou 00.000.000/0000-00"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Modelo / Formato Coleta</label>
                <input 
                  type="text" 
                  value={n1Form.modeloColeta} 
                  onChange={(e) => setN1Form({ ...n1Form, modeloColeta: e.target.value })} 
                  className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                  placeholder="Ex: Caçamba / Fardo Coletado Porta-a-Porta"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">Telefone Contato</label>
                  <input 
                    type="tel" 
                    value={n1Form.telefone} 
                    onChange={(e) => setN1Form({ ...n1Form, telefone: formatTelefone(e.target.value) })} 
                    className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                    placeholder="(00) 00000-0000"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[#74777f] uppercase mb-1">E-mail Contato</label>
                  <input 
                    type="email" 
                    value={n1Form.email} 
                    onChange={(e) => setN1Form({ ...n1Form, email: e.target.value })} 
                    className="w-full bg-[#f4f3f9] border border-outline-variant rounded-lg p-2 font-bold text-[#002046] focus:outline-none" 
                    placeholder="contato@cooperativa.com"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 p-4 bg-surface-container-lowest border-t border-outline-variant shrink-0">
              <button type="button" onClick={() => setIsN1ModalOpen(false)} className="bg-[#f4f3f9] hover:bg-[#e4e3e9] text-[#002046] font-bold px-4 py-2 rounded-lg text-xs cursor-pointer">
                Cancelar
              </button>
              <button type="submit" className="bg-secondary hover:brightness-95 text-white font-bold px-4 py-2 rounded-lg text-xs cursor-pointer">
                Salvar Fabricante
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
