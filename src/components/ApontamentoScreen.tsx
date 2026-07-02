"use client"

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

import AberturaProducao from './AberturaProducao';

interface OP {
  id: string;
  sku_id: string;
  quantidade_planejada: number;
  quantidade_produzida: number;
  skus: {
    id: string;
    codigo: string;
    comprimento_mm: number;
    familias_produto: {
      nome: string;
    };
  };
  pedidos?: {
    codigo: string;
    nome_cliente: string;
  };
}

interface Funcionario {
  id: string;
  nome: string;
  role: string;
}

interface ApontamentoScreenProps {
  orders: any[];
  onStartProduction: (setup: any) => void;
}

export default function ApontamentoScreen({ orders, onStartProduction }: ApontamentoScreenProps) {
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'ficha' | 'setup'>('ficha');
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [msg, setMsg] = useState({ text: '', type: '' });

  // Listas do Banco
  const [activeOPs, setActiveOPs] = useState<OP[]>([]);
  const [employees, setEmployees] = useState<Funcionario[]>([]);

  // Campos do Formulário
  const [selectedOPId, setSelectedOPId] = useState('');
  const [selectedSKU, setSelectedSKU] = useState<{ id: string; codigo: string; comprimento_mm: number } | null>(null);
  const [dataEvento, setDataEvento] = useState('');
  const [selectedEmployeeName, setSelectedEmployeeName] = useState('');
  const [tempoMaquina, setTempoMaquina] = useState('');
  const [qtdAprovada, setQtdAprovada] = useState('');
  const [refugoKg, setRefugoKg] = useState('0.00');

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type });
    setTimeout(() => setMsg({ text: '', type: '' }), 4000);
  };

  // Carregar dados de OPs ativas e funcionários
  const loadFormData = async () => {
    try {
      setLoading(true);
      
      // Buscar OPs ativas (ABERTA ou EM_ANDAMENTO)
      const { data: opsData } = await supabase
        .from('ordens_producao')
        .select(`
          id,
          sku_id,
          quantidade_planejada,
          quantidade_produzida,
          skus (
            id,
            codigo,
            comprimento_mm,
            familias_produto (
              nome
            )
          ),
          pedidos (
            codigo,
            nome_cliente
          )
        `)
        .in('status', ['ABERTA', 'EM_ANDAMENTO']);

      // Buscar Funcionários (como equipe de operadores)
      const { data: empsData } = await supabase
        .from('funcionarios')
        .select('id, nome, role')
        .order('nome');

      if (opsData) {
        setActiveOPs(opsData as any);
      }
      if (empsData) {
        setEmployees(empsData as any);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFormData();
    
    // Set default date-time local
    const now = new Date();
    now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
    setDataEvento(now.toISOString().slice(0, 16));
  }, []);

  // Monitorar seleção de OP para preencher SKU correspondente
  useEffect(() => {
    if (selectedOPId) {
      const foundOP = activeOPs.find(op => op.id === selectedOPId);
      if (foundOP && foundOP.skus) {
        setSelectedSKU({
          id: foundOP.skus.id,
          codigo: foundOP.skus.codigo,
          comprimento_mm: foundOP.skus.comprimento_mm
        });
      }
    } else {
      setSelectedSKU(null);
    }
  }, [selectedOPId, activeOPs]);

  // Submissão do Apontamento Técnico
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOPId) {
      showMsg('Selecione uma Ordem de Produção ativa.', 'error');
      return;
    }

    const valQtd = parseInt(qtdAprovada);
    const valTempo = parseFloat(tempoMaquina);
    const valRefugo = parseFloat(refugoKg);

    if (isNaN(valQtd) || valQtd <= 0) {
      showMsg('A quantidade aprovada deve ser maior que zero.', 'error');
      return;
    }

    if (isNaN(valTempo) || valTempo <= 0) {
      showMsg('O tempo de máquina deve ser maior que zero.', 'error');
      return;
    }

    if (isNaN(valRefugo) || valRefugo < 0) {
      showMsg('O refugo/borra não pode ser negativo.', 'error');
      return;
    }

    setActionLoading(true);

    try {
      // Obter ID da empresa vinculada ao usuário logado
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        showMsg('Sessão encerrada. Faça login novamente.', 'error');
        setActionLoading(false);
        return;
      }

      const { data: profile } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single();

      const empresaId = profile?.empresa_id;
      if (!empresaId) {
        showMsg('Empresa do usuário não identificada.', 'error');
        setActionLoading(false);
        return;
      }

      // Executar a Stored Procedure transacional no Supabase
      const { error } = await supabase.rpc('registrar_apontamento', {
        p_empresa_id: empresaId,
        p_ordem_producao_id: selectedOPId,
        p_quantidade_produzida: valQtd,
        p_horas_maquina: valTempo,
        p_refugo_kg: valRefugo,
        p_operador_nome: selectedEmployeeName || 'Operador Geral',
        p_data_apontamento: new Date(dataEvento).toISOString()
      });

      if (error) {
        showMsg(`Erro na transação: ${error.message}`, 'error');
      } else {
        showMsg('Apontamento de turno registrado com sucesso! Baixa de estoque efetuada.');
        // Limpar campos
        setSelectedOPId('');
        setTempoMaquina('');
        setQtdAprovada('');
        setRefugoKg('0.00');
        setSelectedEmployeeName('');
        // Recarregar OPs
        await loadFormData();
      }
    } catch (err: any) {
      showMsg(`Falha inesperada: ${err.message}`, 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-outline font-bold">
        Carregando formulário de apontamento...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header com mensagens */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h3 className="text-base font-bold text-primary">Apontamentos PCP & Operacional</h3>
          <p className="text-xs text-outline font-medium">Lançamentos de produção líquida e auditoria de setup de turno</p>
        </div>
        {msg.text && (
          <span className={`text-xs px-3 py-1.5 rounded-lg font-bold border ${
            msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {msg.text}
          </span>
        )}
      </div>

      {/* Tab Switcher */}
      <div className="flex border-b border-outline-variant gap-4">
        <button
          type="button"
          onClick={() => setActiveTab('ficha')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 uppercase tracking-wider cursor-pointer ${
            activeTab === 'ficha'
              ? 'border-secondary text-primary font-black'
              : 'border-transparent text-outline hover:text-primary'
          }`}
        >
          Lançamento de Ficha Física
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('setup')}
          className={`pb-2.5 text-xs font-bold transition-all border-b-2 uppercase tracking-wider cursor-pointer ${
            activeTab === 'setup'
              ? 'border-secondary text-primary font-black'
              : 'border-transparent text-outline hover:text-primary'
          }`}
        >
          Apontamento Operacional (Ficha de Turno)
        </button>
      </div>

      {activeTab === 'ficha' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Formulário de Registro */}
          <form onSubmit={handleSubmit} className="lg:col-span-8 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-5">
            <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-2 border-b pb-2 flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">edit_note</span>
              Lançar Ficha de Produção Física
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Seleção de Ordem de Produção */}
              <div>
                <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1.5">Ordem de Produção (OP)</label>
                <select
                  required
                  value={selectedOPId}
                  onChange={(e) => setSelectedOPId(e.target.value)}
                  className="w-full bg-surface-container-low text-xs px-3 py-2.5 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden font-semibold"
                >
                  <option value="">Selecione a OP ativa...</option>
                  {activeOPs.map(op => (
                    <option key={op.id} value={op.id}>
                      {op.pedidos?.codigo || 'OP'} - {op.pedidos?.nome_cliente || 'Sem Cliente'} ({op.skus?.familias_produto?.nome} {op.skus?.codigo})
                    </option>
                  ))}
                </select>
              </div>

              {/* SKU (Preenchido Automaticamente) */}
              <div>
                <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1.5">SKU / Medida Detectada</label>
                <div className="w-full bg-surface-container-high/60 text-xs px-3 py-2.5 rounded-lg border border-outline-variant font-mono font-bold text-secondary">
                  {selectedSKU ? `${selectedSKU.codigo} (${selectedSKU.comprimento_mm}mm)` : 'Selecione a OP acima...'}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Operador Assinante */}
              <div>
                <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1.5">Operador Responsável (Escala)</label>
                <select
                  required
                  value={selectedEmployeeName}
                  onChange={(e) => setSelectedEmployeeName(e.target.value)}
                  className="w-full bg-surface-container-low text-xs px-3 py-2.5 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden font-semibold"
                >
                  <option value="">Selecione o operador...</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.nome}>{emp.nome} ({emp.role})</option>
                  ))}
                </select>
              </div>

              {/* Data do Turno */}
              <div>
                <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1.5">Data/Hora da Ficha</label>
                <input
                  type="datetime-local"
                  required
                  value={dataEvento}
                  onChange={(e) => setDataEvento(e.target.value)}
                  className="w-full bg-surface-container-low text-xs px-3 py-2.5 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden font-semibold"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 border-t pt-4 border-outline-variant/40">
              {/* Produção Aprovada */}
              <div>
                <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1.5">Produção Líquida Aprovada (peças)</label>
                <input
                  type="number"
                  required
                  min="1"
                  placeholder="Ex: 150"
                  value={qtdAprovada}
                  onChange={(e) => setQtdAprovada(e.target.value)}
                  className="w-full bg-surface-container-low text-xs px-3 py-2.5 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden font-bold"
                />
              </div>

              {/* Tempo de Máquina */}
              <div>
                <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1.5">Tempo de Máquina (horas)</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  min="0.1"
                  placeholder="Ex: 8.5"
                  value={tempoMaquina}
                  onChange={(e) => setTempoMaquina(e.target.value)}
                  className="w-full bg-surface-container-low text-xs px-3 py-2.5 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden font-bold"
                />
              </div>

              {/* Refugo / Borra */}
              <div>
                <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1.5">Refugo / Borra de Setup (kg)</label>
                <input
                  type="number"
                  step="0.01"
                  required
                  min="0"
                  value={refugoKg}
                  onChange={(e) => setRefugoKg(e.target.value)}
                  className="w-full bg-surface-container-low text-xs px-3 py-2.5 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden font-bold text-red-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={actionLoading}
                className="bg-[#002046] hover:bg-[#1b365d] text-white text-xs font-bold py-2.5 px-6 rounded-lg transition-all cursor-pointer"
              >
                {actionLoading ? 'Registrando Apontamento...' : 'Salvar Apontamento & Baixar BOM'}
              </button>
            </div>
          </form>

          {/* Lado Direito - Informações de Ajuda */}
          <div className="lg:col-span-4 space-y-6">
            <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
              <h4 className="text-xs font-black text-primary uppercase tracking-wider">Regras de Baixa Transacional</h4>
              <div className="text-xs space-y-3 text-outline leading-relaxed">
                <p>
                  Ao salvar o apontamento, o Supabase executa um processo atômico para garantir a consistência física dos dados:
                </p>
                <ul className="list-disc pl-4 space-y-1.5 font-medium">
                  <li>
                    A **Quantidade Produzida** da OP selecionada é incrementada. Se atingir a meta programada, a OP é finalizada automaticamente.
                  </li>
                  <li>
                    Os metros lineares de aço e a massa líquida plástica por peça são calculados com base na geometria paramétrica da Família.
                  </li>
                  <li>
                    O peso de **Refugo/Borra** é distribuído proporcionalmente na receita BOM dos químicos secos e descontado do estoque bruto de matéria-prima.
                  </li>
                  <li>
                    A quantidade de peças perfeitas é adicionada diretamente ao **Estoque Acabado** do SKU para carregamento logístico.
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <AberturaProducao orders={orders} onStartProduction={onStartProduction} />
      )}
    </div>
  );
}
