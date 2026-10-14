import React, { useState, useEffect } from 'react';
import { Funcionario, Extrusora } from '../types';
import { createClient } from '../utils/supabase/client';
import { useToast } from '../contexts/ToastContext';
import LoadingOverlay from './LoadingOverlay';

export default function Funcionarios({
  triggerAddNew
}: {
  triggerAddNew?: number;
}) {
  const { addToast } = useToast();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<'FUNCIONARIOS' | 'EXTRUSORAS' | 'VENDEDORES'>('FUNCIONARIOS');
  const [loading, setLoading] = useState(true);

  // States for Data
  const [funcionarios, setFuncionarios] = useState<Funcionario[]>([]);
  const [extrusoras, setExtrusoras] = useState<Extrusora[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // States for Modals
  const [isFuncModalOpen, setIsFuncModalOpen] = useState(false);
  const [isExtModalOpen, setIsExtModalOpen] = useState(false);
  const [isVendasModalOpen, setIsVendasModalOpen] = useState(false);
  const [selectedVendedor, setSelectedVendedor] = useState<Funcionario | null>(null);
  const [vendasLoading, setVendasLoading] = useState(false);
  const [vendasHistorico, setVendasHistorico] = useState<any[]>([]);

  // States for Forms
  const [funcForm, setFuncForm] = useState<Partial<Funcionario>>({ nome: '', extrusora_id: '' });
  const [extForm, setExtForm] = useState<Partial<Extrusora>>({ codigo: '', numero: '' });

  const fetchData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
      const currentEmpresaId = profile?.empresa_id;
      if (!currentEmpresaId) return;
      
      setEmpresaId(currentEmpresaId);

      // Fetch Extrusoras
      const { data: dataExtrusoras } = await supabase
        .from('extrusoras')
        .select('*')
        .eq('empresa_id', currentEmpresaId)
        .order('codigo');
      
      if (dataExtrusoras) setExtrusoras(dataExtrusoras);

      // Fetch Funcionarios (with extrusora join)
      const { data: dataFuncionarios } = await supabase
        .from('funcionarios')
        .select(`
          id,
          nome,
          cargo,
          ativo,
          extrusora_id,
          vendedor,
          cpf,
          extrusoras:extrusora_id (
            id,
            codigo,
            numero
          )
        `)
        .eq('empresa_id', currentEmpresaId)
        .order('nome');

      if (dataFuncionarios) {
        setFuncionarios(dataFuncionarios.map((f: any) => ({
          ...f,
          extrusora: f.extrusoras
        })));
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (triggerAddNew !== undefined && triggerAddNew > 0) {
      handleOpenFuncModal();
    }
  }, [triggerAddNew]);

  // Máscara de formatação do CPF
  const formatCPF = (val: string) => {
    return val
      .replace(/\D/g, '') // remove tudo que não for dígito
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d)/, '$1.$2')
      .replace(/(\d{3})(\d{1,2})/, '$1-$2')
      .replace(/(-\d{2})\d+?$/, '$1'); // limita a 11 dígitos formatados
  };

  // --- Handlers para Funcionários ---
  const handleOpenFuncModal = (func?: Funcionario) => {
    if (func) {
      setFuncForm({ 
        id: func.id, 
        nome: func.nome, 
        extrusora_id: func.extrusora_id || '',
        vendedor: func.vendedor || false,
        cpf: func.cpf || ''
      });
    } else {
      setFuncForm({ 
        id: undefined, 
        nome: '', 
        extrusora_id: '',
        vendedor: false,
        cpf: ''
      });
    }
    setIsFuncModalOpen(true);
  };

  const handleSaveFuncionario = async () => {
    if (!funcForm.nome) {
      addToast('O nome do funcionário é obrigatório.', 'error');
      return;
    }

    if (funcForm.vendedor && !funcForm.cpf) {
      addToast('O CPF é obrigatório para vendedores.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        nome: funcForm.nome,
        extrusora_id: funcForm.vendedor ? null : (funcForm.extrusora_id || null),
        vendedor: funcForm.vendedor || false,
        cpf: funcForm.vendedor ? (funcForm.cpf || '') : null
      };

      if (funcForm.id) {
        // Edit
        const { error } = await supabase
          .from('funcionarios')
          .update(payload)
          .eq('id', funcForm.id);
        if (error) throw error;
        addToast('Funcionário atualizado com sucesso!', 'success');
      } else {
        // Insert
        const { error } = await supabase
          .from('funcionarios')
          .insert({
            empresa_id: empresaId,
            cargo: 'Operador',
            ...payload
          });
        if (error) throw error;
        addToast('Funcionário cadastrado com sucesso!', 'success');
      }
      setIsFuncModalOpen(false);
      fetchData();
    } catch (err: any) {
      addToast(`Erro ao salvar: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const handleDeleteFuncionario = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este funcionário?')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('funcionarios').delete().eq('id', id);
      if (error) throw error;
      addToast('Funcionário excluído.', 'success');
      fetchData();
    } catch (err: any) {
      addToast(`Erro ao excluir: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  // --- Handlers para Vendas e Comissões ---
  const handleOpenVendasModal = async (vendedor: Funcionario) => {
    setSelectedVendedor(vendedor);
    setIsVendasModalOpen(true);
    setVendasLoading(true);
    setVendasHistorico([]);
    
    try {
      const { data, error } = await supabase
        .from('pedidos')
        .select(`
          id,
          codigo,
          nome_cliente,
          data_emissao,
          status,
          comissao_venda_percentual,
          ordens_producao (
            quantidade_planejada,
            preco_venda_unitario
          )
        `)
        .eq('vendedor_id', vendedor.id)
        .order('data_emissao', { ascending: false });

      if (error) throw error;
      
      const formatado = data.map((ped: any) => {
        const faturamento = ped.ordens_producao?.reduce((acc: number, curr: any) => {
          const qtd = Number(curr.quantidade_planejada) || 0;
          const preco = Number(curr.preco_venda_unitario) || 0;
          return acc + (qtd * preco);
        }, 0) || 0;
        const comissaoPercent = Number(ped.comissao_venda_percentual) || 0;
        const comissaoValor = faturamento * (comissaoPercent / 100);
        
        return {
          ...ped,
          faturamento,
          comissaoValor
        };
      });

      setVendasHistorico(formatado);
    } catch (err: any) {
      addToast(`Erro ao buscar histórico: ${err.message}`, 'error');
    } finally {
      setVendasLoading(false);
    }
  };

  // --- Handlers para Extrusoras ---
  const handleOpenExtModal = (ext?: Extrusora) => {
    if (ext) {
      setExtForm({ id: ext.id, codigo: ext.codigo, numero: ext.numero });
    } else {
      setExtForm({ id: undefined, codigo: '', numero: '' });
    }
    setIsExtModalOpen(true);
  };

  const handleSaveExtrusora = async () => {
    if (!extForm.codigo || !extForm.numero) {
      addToast('Código e Número são obrigatórios.', 'error');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        codigo: extForm.codigo,
        numero: extForm.numero
      };

      if (extForm.id) {
        // Edit
        const { error } = await supabase
          .from('extrusoras')
          .update(payload)
          .eq('id', extForm.id);
        if (error) throw error;
        addToast('Extrusora atualizada com sucesso!', 'success');
      } else {
        // Insert
        const { error } = await supabase
          .from('extrusoras')
          .insert({
            empresa_id: empresaId,
            ...payload
          });
        if (error) throw error;
        addToast('Extrusora cadastrada com sucesso!', 'success');
      }
      setIsExtModalOpen(false);
      fetchData();
    } catch (err: any) {
      addToast(`Erro ao salvar: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const handleDeleteExtrusora = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta extrusora? Funcionários vinculados a ela ficarão sem extrusora.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('extrusoras').delete().eq('id', id);
      if (error) throw error;
      addToast('Extrusora excluída.', 'success');
      fetchData();
    } catch (err: any) {
      addToast(`Erro ao excluir: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  if (loading) return <LoadingOverlay />;

  return (
    <div className="space-y-6">
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#002046] flex items-center gap-2">
            <span className="material-symbols-outlined notranslate text-primary text-[28px]">badge</span>
            Operadores & Extrusoras
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Gerencie o cadastro simples de funcionários e suas respectivas extrusoras.
          </p>
        </div>
        
        <div className="flex bg-surface-container-low rounded-xl p-1 shadow-xs border border-outline-variant/30 w-max">
          <button
            onClick={() => setActiveTab('FUNCIONARIOS')}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wide flex items-center gap-2 ${
              activeTab === 'FUNCIONARIOS' ? 'bg-primary text-on-primary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined notranslate text-[18px]">group</span>
            Funcionários ({funcionarios.filter(f => !f.vendedor).length})
          </button>
          
          <button
            onClick={() => setActiveTab('VENDEDORES')}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wide flex items-center gap-2 ${
              activeTab === 'VENDEDORES' ? 'bg-[#ffc107] text-[#5c4000] shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined notranslate text-[18px]">sell</span>
            Vendedores ({funcionarios.filter(f => f.vendedor).length})
          </button>

          <button
            onClick={() => setActiveTab('EXTRUSORAS')}
            className={`px-6 py-2.5 rounded-lg text-xs font-bold transition-all uppercase tracking-wide flex items-center gap-2 ${
              activeTab === 'EXTRUSORAS' ? 'bg-secondary text-on-secondary shadow-sm' : 'text-on-surface-variant hover:bg-surface-container-highest hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined notranslate text-[18px]">precision_manufacturing</span>
            Extrusoras ({extrusoras.length})
          </button>
        </div>
      </div>

      {activeTab === 'VENDEDORES' && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-lowest sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                <tr className="text-on-surface-variant font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-6 rounded-tl-xl">Nome do Vendedor</th>
                  <th className="py-4 px-6">CPF</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right rounded-tr-xl">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {funcionarios.filter(f => f.vendedor).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-outline text-sm">
                      Nenhum vendedor cadastrado ainda.
                    </td>
                  </tr>
                ) : (
                  funcionarios.filter(f => f.vendedor).map(func => (
                    <tr key={func.id} className="hover:bg-[#fff9e6] transition-colors">
                      <td className="py-4 px-6 font-semibold text-on-surface">{func.nome}</td>
                      <td className="py-4 px-6 font-mono text-xs font-semibold">{func.cpf || 'Não informado'}</td>
                      <td className="py-4 px-6 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                          Ativo
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenVendasModal(func)}
                            className="bg-[#ffc107] text-[#5c4000] hover:bg-[#e0a800] p-1.5 rounded-lg transition-colors flex items-center justify-center gap-1.5 px-3 shadow-sm font-bold text-xs uppercase"
                          >
                            <span className="material-symbols-outlined notranslate text-[18px]">receipt_long</span>
                            Histórico de Vendas
                          </button>
                          <button
                            onClick={() => handleOpenFuncModal(func)}
                            className="text-primary hover:bg-primary-container p-1.5 rounded-lg transition-colors flex items-center justify-center"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined notranslate text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteFuncionario(func.id)}
                            className="text-error hover:bg-error-container p-1.5 rounded-lg transition-colors flex items-center justify-center"
                            title="Excluir"
                          >
                            <span className="material-symbols-outlined notranslate text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'FUNCIONARIOS' && (
        <div className="bg-white rounded-2xl shadow-sm border border-outline-variant/30 overflow-hidden flex-1 flex flex-col min-h-0">
          <div className="overflow-y-auto flex-1 custom-scrollbar">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-surface-container-lowest sticky top-0 z-10 shadow-[0_1px_0_0_rgba(0,0,0,0.05)]">
                <tr className="text-on-surface-variant font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-4 px-6 rounded-tl-xl">Nome</th>
                  <th className="py-4 px-6">Atribuição / Cargo</th>
                  <th className="py-4 px-6 text-center">Status</th>
                  <th className="py-4 px-6 text-right rounded-tr-xl">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {funcionarios.filter(f => !f.vendedor).length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-12 text-center text-outline text-sm">
                      Nenhum funcionário operacional encontrado.
                    </td>
                  </tr>
                ) : (
                  funcionarios.filter(f => !f.vendedor).map(func => (
                    <tr key={func.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                      <td className="py-4 px-6 font-semibold text-on-surface">{func.nome}</td>
                      <td className="py-4 px-6">
                        {func.extrusora ? (
                          <span className="bg-primary-container text-on-primary-container px-3 py-1 rounded-full text-[10px] font-bold">
                            {func.extrusora.codigo} - #{func.extrusora.numero}
                          </span>
                        ) : (
                          <span className="text-outline text-xs italic">Sem extrusora</span>
                        )}
                      </td>
                      <td className="py-4 px-6 text-center">
                        <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-[10px] font-black uppercase">
                          Ativo
                        </span>
                      </td>
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleOpenFuncModal(func)}
                            className="text-primary hover:bg-primary-container p-1.5 rounded-lg transition-colors flex items-center justify-center"
                            title="Editar"
                          >
                            <span className="material-symbols-outlined notranslate text-[20px]">edit</span>
                          </button>
                          <button
                            onClick={() => handleDeleteFuncionario(func.id)}
                            className="text-error hover:bg-error-container p-1.5 rounded-lg transition-colors flex items-center justify-center"
                            title="Excluir"
                          >
                            <span className="material-symbols-outlined notranslate text-[20px]">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'EXTRUSORAS' && (
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-on-surface">Cadastro de Extrusoras</h3>
            <button
              onClick={() => activeTab === 'EXTRUSORAS' ? handleOpenExtModal() : handleOpenFuncModal()}
              className={`px-6 py-2.5 text-white rounded-xl text-xs font-bold uppercase tracking-wider shadow-md hover:shadow-lg transition-all flex items-center gap-2 ${
                activeTab === 'EXTRUSORAS' ? 'bg-secondary hover:bg-secondary-dark' : (activeTab === 'VENDEDORES' ? 'bg-[#ffc107] text-[#5c4000] hover:bg-[#e0a800]' : 'bg-primary hover:bg-primary-dark')
              }`}
            >
              <span className="material-symbols-outlined notranslate text-[20px]">add</span>
              {activeTab === 'EXTRUSORAS' ? 'Nova Extrusora' : 'Novo Funcionário'}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-outline-variant text-on-surface-variant uppercase text-xs">
                  <th className="pb-3 font-bold">Código (Ex: EXT)</th>
                  <th className="pb-3 font-bold">Número (Ex: 01)</th>
                  <th className="pb-3 font-bold text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/50">
                {extrusoras.map(ext => (
                  <tr key={ext.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="py-4 font-semibold text-on-surface">{ext.codigo}</td>
                    <td className="py-4 font-mono text-outline">{ext.numero}</td>
                    <td className="py-4 text-right space-x-2">
                      <button 
                        onClick={() => handleOpenExtModal(ext)}
                        className="p-2 text-on-surface-variant hover:bg-surface-container hover:text-primary rounded-lg transition-colors"
                        title="Editar"
                      >
                        <span className="material-symbols-outlined notranslate text-[18px]">edit</span>
                      </button>
                      <button 
                        onClick={() => handleDeleteExtrusora(ext.id)}
                        className="p-2 text-on-surface-variant hover:bg-red-50 hover:text-red-500 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <span className="material-symbols-outlined notranslate text-[18px]">delete</span>
                      </button>
                    </td>
                  </tr>
                ))}
                {extrusoras.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-8 text-center text-on-surface-variant">
                      Nenhuma extrusora cadastrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: FUNCIONARIO */}
      {isFuncModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <h3 className="text-lg font-black text-on-surface">
                {funcForm.id ? 'Editar Funcionário' : 'Novo Funcionário'}
              </h3>
              <button 
                onClick={() => setIsFuncModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container p-2 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined notranslate">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Nome Completo</label>
                <input
                  type="text"
                  value={funcForm.nome || ''}
                  onChange={e => setFuncForm({...funcForm, nome: e.target.value})}
                  className="w-full border border-outline-variant rounded-xl p-3 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="Ex: João da Silva"
                />
              </div>

              <div className="flex items-center gap-2 py-2">
                <input
                  type="checkbox"
                  id="vendedor-checkbox"
                  checked={funcForm.vendedor || false}
                  onChange={e => setFuncForm({...funcForm, vendedor: e.target.checked})}
                  className="w-4 h-4 rounded border-outline-variant text-primary focus:ring-primary"
                />
                <label htmlFor="vendedor-checkbox" className="text-xs font-bold text-on-surface select-none cursor-pointer uppercase">
                  É Vendedor? (Vendas e Comissão)
                </label>
              </div>

              {funcForm.vendedor ? (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">CPF do Vendedor</label>
                  <input
                    type="text"
                    value={funcForm.cpf || ''}
                    onChange={e => setFuncForm({...funcForm, cpf: formatCPF(e.target.value)})}
                    className="w-full border border-outline-variant rounded-xl p-3 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                    placeholder="000.000.000-00"
                    maxLength={14}
                  />
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Extrusora Vinculada (Opcional)</label>
                  <select
                    value={funcForm.extrusora_id || ''}
                    onChange={e => setFuncForm({...funcForm, extrusora_id: e.target.value})}
                    className="w-full border border-outline-variant rounded-xl p-3 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all appearance-none"
                  >
                    <option value="">-- Sem vínculo --</option>
                    {extrusoras.map(ext => (
                      <option key={ext.id} value={ext.id}>{ext.codigo} - #{ext.numero}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="p-6 bg-surface-container-lowest border-t border-outline-variant flex justify-end gap-3">
              <button
                onClick={() => setIsFuncModalOpen(false)}
                className="px-6 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveFuncionario}
                className="px-6 py-2 bg-primary hover:bg-primary-dark text-white rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EXTRUSORA */}
      {isExtModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-surface-container-lowest rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
            <div className="flex justify-between items-center p-6 border-b border-outline-variant">
              <h3 className="text-lg font-black text-on-surface">
                {extForm.id ? 'Editar Extrusora' : 'Nova Extrusora'}
              </h3>
              <button 
                onClick={() => setIsExtModalOpen(false)}
                className="text-on-surface-variant hover:bg-surface-container p-2 rounded-full transition-colors"
              >
                <span className="material-symbols-outlined notranslate">close</span>
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Código</label>
                <input
                  type="text"
                  value={extForm.codigo || ''}
                  onChange={e => setExtForm({...extForm, codigo: e.target.value})}
                  className="w-full border border-outline-variant rounded-xl p-3 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all uppercase"
                  placeholder="Ex: EXT"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-on-surface-variant uppercase mb-2">Número</label>
                <input
                  type="text"
                  value={extForm.numero || ''}
                  onChange={e => setExtForm({...extForm, numero: e.target.value})}
                  className="w-full border border-outline-variant rounded-xl p-3 bg-surface-container-lowest focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                  placeholder="Ex: 01"
                />
              </div>
            </div>

            <div className="p-6 bg-surface-container-lowest border-t border-outline-variant flex justify-end gap-3">
              <button
                onClick={() => setIsExtModalOpen(false)}
                className="px-6 py-2 rounded-xl text-sm font-bold text-on-surface-variant hover:bg-surface-container transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveExtrusora}
                className="px-6 py-2 bg-secondary hover:bg-secondary-dark text-white rounded-xl text-sm font-bold shadow-sm transition-all"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal Histórico de Vendas */}
      {isVendasModalOpen && selectedVendedor && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-surface rounded-3xl shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="px-6 py-5 border-b border-outline-variant/30 flex justify-between items-center bg-[#fffbf0]">
              <div>
                <h3 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
                  <span className="material-symbols-outlined text-[#ffc107] text-[28px]">sell</span>
                  Histórico de Vendas
                </h3>
                <p className="text-sm text-outline font-medium mt-1">
                  Vendedor: <span className="font-bold text-[#5c4000]">{selectedVendedor.nome}</span> {selectedVendedor.cpf && `(${selectedVendedor.cpf})`}
                </p>
              </div>
              <button
                onClick={() => setIsVendasModalOpen(false)}
                className="w-10 h-10 rounded-full bg-surface-container-highest text-on-surface-variant hover:bg-error/10 hover:text-error flex items-center justify-center transition-colors"
              >
                <span className="material-symbols-outlined notranslate">close</span>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 bg-surface">
              {vendasLoading ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-4">
                  <div className="w-8 h-8 border-4 border-t-[#ffc107] border-[#ffc107]/20 rounded-full animate-spin"></div>
                  <span className="text-sm font-bold text-outline">Buscando comissões...</span>
                </div>
              ) : vendasHistorico.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
                  <span className="material-symbols-outlined notranslate text-5xl text-outline-variant">assignment_late</span>
                  <p className="text-sm font-bold text-outline">Nenhum pedido foi atrelado a este vendedor até o momento.</p>
                </div>
              ) : (
                <div className="border border-outline-variant/30 rounded-xl overflow-hidden shadow-sm">
                  <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-surface-container-lowest border-b border-outline-variant/30">
                      <tr className="text-on-surface-variant font-bold uppercase text-[10px] tracking-wider">
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4">Pedido</th>
                        <th className="py-3 px-4">Cliente</th>
                        <th className="py-3 px-4 text-right">Faturamento (R$)</th>
                        <th className="py-3 px-4 text-center">% Com.</th>
                        <th className="py-3 px-4 text-right">Comissão (R$)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {vendasHistorico.map((venda: any) => (
                        <tr key={venda.id} className="hover:bg-surface-container-lowest/50">
                          <td className="py-3 px-4 text-xs font-semibold">{new Date(venda.data_emissao).toLocaleDateString('pt-BR')}</td>
                          <td className="py-3 px-4 text-xs font-bold text-primary">{venda.codigo}</td>
                          <td className="py-3 px-4 text-xs truncate max-w-[150px]">{venda.nome_cliente}</td>
                          <td className="py-3 px-4 text-xs text-right font-bold">R$ {venda.faturamento.toFixed(2)}</td>
                          <td className="py-3 px-4 text-xs text-center font-bold text-outline">{venda.comissao_venda_percentual || 0}%</td>
                          <td className="py-3 px-4 text-xs text-right font-black text-emerald-600">R$ {venda.comissaoValor.toFixed(2)}</td>
                          <td className="py-3 px-4 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${venda.status === 'CANCELADO' ? 'bg-red-100 text-red-800' : 'bg-blue-50 text-blue-800'}`}>
                              {venda.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-surface-container-low border-t-2 border-outline-variant/40">
                      <tr>
                        <td colSpan={3} className="py-3 px-4 font-black text-right text-xs uppercase">TOTAL ACUMULADO:</td>
                        <td className="py-3 px-4 font-black text-right text-xs text-primary">
                          R$ {vendasHistorico.reduce((acc, curr) => acc + curr.faturamento, 0).toFixed(2)}
                        </td>
                        <td></td>
                        <td className="py-3 px-4 font-black text-right text-xs text-emerald-600">
                          R$ {vendasHistorico.reduce((acc, curr) => acc + curr.comissaoValor, 0).toFixed(2)}
                        </td>
                        <td></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
