import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import LoadingOverlay from './LoadingOverlay';
import { NivelAcesso } from '@/types';

interface Usuario {
  id: string;
  nome: string;
  cargo: string;
  nivel_acesso_id: string | null;
}

interface ControleAcessosProps {
  empresaIdProp?: string | null;
  isSuperAdmin?: boolean;
}

export default function ControleAcessos({ empresaIdProp, isSuperAdmin }: ControleAcessosProps = {}) {
  const supabase = createClient();
  const { addToast } = useToast();

  const [activeTab, setActiveTab] = useState<'NIVEIS' | 'USUARIOS'>('NIVEIS');
  const [loading, setLoading] = useState(true);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  // States
  const [niveis, setNiveis] = useState<NivelAcesso[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  
  // Modal de Nível
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingNivel, setEditingNivel] = useState<NivelAcesso | null>(null);
  const [novoNomeNivel, setNovoNomeNivel] = useState('');
  const [permissoesForm, setPermissoesForm] = useState({
    dashboard: false,
    estoque: false,
    pedidos: false,
    apontamento: false,
    reprogramacao: false,
    fornecedores: false,
    funcionarios: false,
    'materias-primas': false,
    'familias-skus': false,
    'bom-formulas': false,
    arquivos: false,
    configuracoes: false,
    acessos: false,
    clientes: false,
    financeiro: false,
    'formacao-preco': false
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
    let finalEmpresaId = empresaIdProp || profile?.empresa_id;
    if (!finalEmpresaId) {
      setLoading(false);
      return;
    }
    setEmpresaId(finalEmpresaId);

    // Fetch níveis
    const { data: dataNiveis } = await supabase
      .from('niveis_acesso')
      .select('*')
      .eq('empresa_id', finalEmpresaId)
      .order('nome_nivel');
    
    if (dataNiveis) setNiveis(dataNiveis);

    // Fetch usuários
    const { data: dataUsuarios } = await supabase
      .from('usuarios')
      .select('id, nome, cargo, nivel_acesso_id')
      .eq('empresa_id', finalEmpresaId)
      .order('nome');
    
    if (dataUsuarios) setUsuarios(dataUsuarios);
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [empresaIdProp]);

  const handleOpenModal = (nivel?: NivelAcesso) => {
    if (nivel) {
      setEditingNivel(nivel);
      setNovoNomeNivel(nivel.nome_nivel);
      setPermissoesForm({
        dashboard: !!nivel.permissoes.dashboard,
        estoque: !!nivel.permissoes.estoque,
        pedidos: !!nivel.permissoes.pedidos,
        apontamento: !!nivel.permissoes.apontamento,
        reprogramacao: !!nivel.permissoes.reprogramacao,
        fornecedores: !!nivel.permissoes.fornecedores,
        funcionarios: !!nivel.permissoes.funcionarios,
        'materias-primas': !!nivel.permissoes['materias-primas'],
        'familias-skus': !!nivel.permissoes['familias-skus'],
        'bom-formulas': !!nivel.permissoes['bom-formulas'],
        arquivos: !!nivel.permissoes.arquivos,
        configuracoes: !!nivel.permissoes.configuracoes,
        acessos: !!nivel.permissoes.acessos,
        clientes: !!nivel.permissoes.clientes,
        financeiro: !!nivel.permissoes.financeiro,
        'formacao-preco': !!nivel.permissoes['formacao-preco']
      });
    } else {
      setEditingNivel(null);
      setNovoNomeNivel('');
      setPermissoesForm({
        dashboard: false,
        estoque: false,
        pedidos: false,
        apontamento: false,
        reprogramacao: false,
        fornecedores: false,
        funcionarios: false,
        'materias-primas': false,
        'familias-skus': false,
        'bom-formulas': false,
        arquivos: false,
        configuracoes: false,
        acessos: false,
        clientes: false,
        financeiro: false,
        'formacao-preco': false
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveNivel = async () => {
    if (!novoNomeNivel) {
      addToast('O nome do nível é obrigatório.', 'error');
      return;
    }

    const permissoesJson = {
      // Novas chaves (telas)
      dashboard: permissoesForm.dashboard,
      estoque: permissoesForm.estoque,
      pedidos: permissoesForm.pedidos,
      apontamento: permissoesForm.apontamento,
      reprogramacao: permissoesForm.reprogramacao,
      fornecedores: permissoesForm.fornecedores,
      funcionarios: permissoesForm.funcionarios,
      'materias-primas': permissoesForm['materias-primas'],
      'familias-skus': permissoesForm['familias-skus'],
      'bom-formulas': permissoesForm['bom-formulas'],
      arquivos: permissoesForm.arquivos,
      configuracoes: permissoesForm.configuracoes,
      acessos: permissoesForm.acessos,
      clientes: permissoesForm.clientes,
      financeiro: permissoesForm.financeiro,
      'formacao-preco': permissoesForm['formacao-preco'],
      
      // Chaves legadas (necessárias para o RLS do banco de dados)
      ver_central: permissoesForm.dashboard,
      gerenciar_estoque: permissoesForm.estoque,
      gerenciar_almoxarifado: permissoesForm.estoque || permissoesForm['materias-primas'] || permissoesForm.fornecedores,
      acessar_planejamento: permissoesForm.pedidos,
      gerenciar_apontamentos: permissoesForm.apontamento,
      gerenciar_fornecedores: permissoesForm.fornecedores,
      gerenciar_usuarios: permissoesForm.funcionarios || permissoesForm.acessos,
      gerenciar_materias_primas: permissoesForm['materias-primas'],
      gerenciar_familias: permissoesForm['familias-skus'],
      gerenciar_receitas: permissoesForm['bom-formulas'],
      gerenciar_arquivos: permissoesForm.arquivos,
      gerenciar_clientes: permissoesForm.clientes,
      ver_painel_dre: permissoesForm.financeiro,
      gerenciar_custos_fixos: permissoesForm.financeiro,
      operar_fluxo_caixa: permissoesForm.financeiro,
      autorizar_factoring: permissoesForm.financeiro,
      simular_precos: permissoesForm['formacao-preco'],
      gerenciar_medidas: permissoesForm['familias-skus']
    };

    setLoading(true);
    try {
      if (editingNivel) {
        const { error } = await supabase
          .from('niveis_acesso')
          .update({
            nome_nivel: novoNomeNivel,
            permissoes: permissoesJson
          })
          .eq('id', editingNivel.id);
          
        if (error) throw error;
        addToast('Nível atualizado com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('niveis_acesso')
          .insert({
            empresa_id: empresaId,
            nome_nivel: novoNomeNivel,
            permissoes: permissoesJson
          });
          
        if (error) throw error;
        addToast('Nível criado com sucesso!', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      addToast(`Erro ao salvar: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const handleDeleteNivel = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este nível? Usuários vinculados a ele perderão o acesso.')) return;
    
    setLoading(true);
    try {
      const { error } = await supabase.from('niveis_acesso').delete().eq('id', id);
      if (error) throw error;
      addToast('Nível excluído.', 'success');
      fetchData();
    } catch (err: any) {
      addToast(`Erro ao excluir: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const handleChangeUserLevel = async (userId: string, newLevelId: string) => {
    try {
      const { error } = await supabase
        .from('usuarios')
        .update({ nivel_acesso_id: newLevelId || null })
        .eq('id', userId);
        
      if (error) throw error;
      addToast('Acesso do usuário atualizado.', 'success');
      
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, nivel_acesso_id: newLevelId || null } : u));
    } catch (err: any) {
      addToast(`Erro ao atualizar: ${err.message}`, 'error');
    }
  };

  const permissoesLabels: Record<keyof typeof permissoesForm, string> = {
    dashboard: 'Dashboard (Central)',
    estoque: 'Almoxarifado / Estoque',
    pedidos: 'Pedidos & Planejamento',
    apontamento: 'Apontamento de Produção',
    reprogramacao: 'Reprogramação Técnica',
    fornecedores: 'Fornecedores',
    funcionarios: 'Funcionários & Extrusoras',
    'materias-primas': 'Matérias Primas',
    'familias-skus': 'Famílias & SKUs (Medidas)',
    'bom-formulas': 'BOM (Fórmulas)',
    arquivos: 'Arquivos & Documentos',
    configuracoes: 'Configurações',
    acessos: 'Controle de Acessos',
    clientes: 'Clientes',
    financeiro: 'Financeiro (Painel DRE)',
    'formacao-preco': 'Simulador / Formação de Preço'
  };

  const visiblePermissoes = Object.keys(permissoesForm) as Array<keyof typeof permissoesForm>;

  if (loading) return <LoadingOverlay />;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#002046] flex items-center gap-2">
            <span className="material-symbols-outlined notranslate text-primary text-[28px]">admin_panel_settings</span>
            Controle de Acessos
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Gerencie os níveis de acesso dinâmicos e vincule-os aos usuários da plataforma.
          </p>
        </div>
        <div className="flex gap-2 bg-surface-container p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('NIVEIS')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === 'NIVEIS' 
                ? 'bg-primary text-white shadow' 
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Níveis de Acesso
          </button>
          <button
            onClick={() => setActiveTab('USUARIOS')}
            className={`px-6 py-2 rounded-lg text-sm font-bold transition-colors ${
              activeTab === 'USUARIOS' 
                ? 'bg-primary text-white shadow' 
                : 'text-on-surface-variant hover:text-primary'
            }`}
          >
            Usuários
          </button>
        </div>
      </div>

      {activeTab === 'NIVEIS' && (
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm animate-fade-in">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold text-on-surface">Cargos e Níveis Disponíveis</h3>
            <button 
              onClick={() => handleOpenModal()}
              className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 shadow-sm transition-all"
            >
              <span className="material-symbols-outlined notranslate text-[18px]">add</span>
              NOVO NÍVEL
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {niveis.map(nivel => {
              const activePermsCount = Object.values(nivel.permissoes || {}).filter(Boolean).length;
              return (
                <div key={nivel.id} className="border border-outline-variant/60 rounded-xl p-5 hover:border-primary/50 transition-colors bg-[#f8f9fa] relative group">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="font-black text-lg text-[#002046]">{nivel.nome_nivel}</h4>
                      <p className="text-xs font-semibold text-secondary">{activePermsCount} permissões ativas</p>
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => handleOpenModal(nivel)} className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors" title="Editar">
                        <span className="material-symbols-outlined notranslate text-[18px]">edit</span>
                      </button>
                      <button onClick={() => handleDeleteNivel(nivel.id)} className="p-1.5 text-error hover:bg-error/10 rounded-md transition-colors" title="Excluir">
                        <span className="material-symbols-outlined notranslate text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                  
                  <div className="space-y-1.5 text-xs text-on-surface-variant mt-4">
                    {Object.entries(nivel.permissoes).map(([key, val]) => (
                      val ? (
                        <div key={key} className="flex items-center gap-2">
                          <span className="material-symbols-outlined notranslate text-secondary text-[14px]">check_circle</span>
                          {permissoesLabels[key as keyof typeof permissoesForm] || key}
                        </div>
                      ) : null
                    ))}
                    {activePermsCount === 0 && (
                      <div className="text-error font-medium italic">Nenhuma permissão concedida.</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'USUARIOS' && (
        <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-sm overflow-hidden animate-fade-in">
          <div className="p-6 border-b border-outline-variant">
            <h3 className="text-lg font-bold text-on-surface">Vínculo de Acessos</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface-container-low text-xs text-outline uppercase">
                <tr>
                  <th className="px-6 py-4 font-bold">Nome do Usuário</th>
                  <th className="px-6 py-4 font-bold">Cargo Declarado</th>
                  <th className="px-6 py-4 font-bold">Nível de Acesso Vinculado (RBAC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/30">
                {usuarios.map(user => (
                  <tr key={user.id} className="hover:bg-surface-container-lowest/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-on-surface">{user.nome}</td>
                    <td className="px-6 py-4 text-on-surface-variant">{user.cargo}</td>
                    <td className="px-6 py-4">
                      <select
                        value={user.nivel_acesso_id || ''}
                        onChange={(e) => handleChangeUserLevel(user.id, e.target.value)}
                        className="bg-surface-bright border border-outline-variant rounded-lg px-3 py-2 text-sm text-primary font-medium focus:ring-2 focus:ring-primary focus:outline-none w-full max-w-[250px]"
                      >
                        <option value="">-- Sem Acesso --</option>
                        {niveis.map(n => (
                          <option key={n.id} value={n.id}>{n.nome_nivel}</option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Nível */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-[#002046] text-white rounded-t-2xl">
              <h2 className="text-xl font-bold">{editingNivel ? 'Editar Nível de Acesso' : 'Novo Nível de Acesso'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <span className="material-symbols-outlined notranslate">close</span>
              </button>
            </div>

            <div className="p-6 flex-1 overflow-y-auto">
              <div className="mb-6">
                <label className="block text-xs font-bold text-outline uppercase mb-2">Nome do Nível</label>
                <input
                  type="text"
                  value={novoNomeNivel}
                  onChange={(e) => setNovoNomeNivel(e.target.value)}
                  placeholder="Ex: Operador de Fábrica"
                  className="w-full bg-surface-bright border border-outline-variant rounded-lg p-3 text-primary font-medium focus:outline-none focus:border-primary"
                />
              </div>

              <h4 className="text-sm font-bold text-[#002046] border-b border-outline-variant/50 pb-2 mb-4">Módulos Permitidos</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {visiblePermissoes.map(key => (
                  <label key={key} className="flex items-center gap-3 p-3 border border-outline-variant rounded-xl cursor-pointer hover:bg-surface-container-low transition-colors">
                    <input 
                      type="checkbox" 
                      checked={permissoesForm[key]}
                      onChange={(e) => setPermissoesForm(prev => ({ ...prev, [key]: e.target.checked }))}
                      className="w-5 h-5 rounded border-outline text-primary focus:ring-primary"
                    />
                    <span className="text-sm font-medium text-on-surface">{permissoesLabels[key]}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low rounded-b-2xl flex justify-end gap-3">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm">
                CANCELAR
              </button>
              <button onClick={handleSaveNivel} className="px-6 py-2 rounded-lg font-bold bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm text-sm">
                SALVAR
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
