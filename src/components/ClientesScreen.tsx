import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useToast } from '@/contexts/ToastContext';
import LoadingOverlay from './LoadingOverlay';
import { Cliente } from '@/types';

interface ClientesScreenProps {
  onGerarPedido?: (clienteId: string, clienteNome: string) => void;
}

export default function ClientesScreen({ onGerarPedido }: ClientesScreenProps) {
  const supabase = createClient();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [empresaId, setEmpresaId] = useState<string | null>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    razao_social: '',
    cnpj: '',
    telefone: '',
    endereco_entrega: '',
    uf: 'SP',
    tipo_cliente: 'REVENDA',
    contribuinte_icms: true
  });

  const fetchData = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single();
    if (profile?.empresa_id) {
      setEmpresaId(profile.empresa_id);
      
      const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .order('razao_social');

      if (!error && data) {
        setClientes(data);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenModal = (c?: Cliente) => {
    if (c) {
      setEditingId(c.id);
      setFormData({
        razao_social: c.razao_social || '',
        cnpj: c.cnpj || '',
        telefone: c.telefone || '',
        endereco_entrega: c.endereco_entrega || '',
        uf: c.uf || 'SP',
        tipo_cliente: c.tipo_cliente || 'REVENDA',
        contribuinte_icms: c.contribuinte_icms !== undefined ? c.contribuinte_icms : true
      });
    } else {
      setEditingId(null);
      setFormData({
        razao_social: '',
        cnpj: '',
        telefone: '',
        endereco_entrega: '',
        uf: 'SP',
        tipo_cliente: 'REVENDA',
        contribuinte_icms: true
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.razao_social) {
      addToast('Razão Social é obrigatória', 'error');
      return;
    }
    setLoading(true);
    
    try {
      if (editingId) {
        const { error } = await supabase
          .from('clientes')
          .update(formData)
          .eq('id', editingId);
        if (error) throw error;
        addToast('Cliente atualizado com sucesso!', 'success');
      } else {
        const { error } = await supabase
          .from('clientes')
          .insert({
            ...formData,
            empresa_id: empresaId
          });
        if (error) throw error;
        addToast('Cliente criado com sucesso!', 'success');
      }
      setIsModalOpen(false);
      fetchData();
    } catch (err: any) {
      addToast(`Erro ao salvar cliente: ${err.message}`, 'error');
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente? Pedidos atrelados poderão impedir a exclusão.')) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('clientes').delete().eq('id', id);
      if (error) throw error;
      addToast('Cliente excluído.', 'success');
      fetchData();
    } catch (err: any) {
      addToast(`Erro ao excluir (Pode estar em uso): ${err.message}`, 'error');
      setLoading(false);
    }
  };

  if (loading) return <LoadingOverlay />;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-[#002046] flex items-center gap-2">
            <span className="material-symbols-outlined notranslate text-primary text-[28px]">groups</span>
            Clientes e Contratos
          </h2>
          <p className="text-sm text-on-surface-variant mt-1">
            Gerencie o portfólio de clientes, endereços e gere pedidos rapidamente.
          </p>
        </div>
        <button
          id="tour-btn-novo-cliente"
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-primary-dark text-white px-6 py-2 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center gap-2"
        >
          <span className="material-symbols-outlined notranslate text-[18px]">add</span>
          NOVO CLIENTE
        </button>
      </div>

      {/* Grid de Clientes */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {clientes.map(cliente => (
          <div key={cliente.id} className="bg-surface-container-lowest border border-outline-variant/60 rounded-xl p-5 hover:border-primary/50 transition-all shadow-sm hover:shadow-md group flex flex-col">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-black text-[#002046] leading-tight mb-1">{cliente.razao_social}</h3>
                {cliente.cnpj && (
                  <div className="text-xs font-semibold text-outline mb-1">CNPJ: {cliente.cnpj}</div>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-2">
                <button onClick={() => handleOpenModal(cliente)} className="p-1.5 text-primary hover:bg-primary/10 rounded-md transition-colors" title="Editar">
                  <span className="material-symbols-outlined notranslate text-[18px]">edit</span>
                </button>
                <button onClick={() => handleDelete(cliente.id)} className="p-1.5 text-error hover:bg-error/10 rounded-md transition-colors" title="Excluir">
                  <span className="material-symbols-outlined notranslate text-[18px]">delete</span>
                </button>
              </div>
            </div>

            <div className="space-y-2 mb-6 flex-1">
              {cliente.telefone && (
                <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined notranslate text-[16px] text-secondary">phone</span>
                  {cliente.telefone}
                </div>
              )}
              {cliente.endereco_entrega && (
                <div className="flex items-start gap-2 text-sm text-on-surface-variant">
                  <span className="material-symbols-outlined notranslate text-[16px] text-secondary mt-0.5">location_on</span>
                  <span className="line-clamp-2 leading-tight">{cliente.endereco_entrega}</span>
                </div>
              )}
            </div>

            <div className="mt-auto pt-4 border-t border-surface-container">
              <button 
                onClick={() => onGerarPedido && onGerarPedido(cliente.id, cliente.razao_social)}
                className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold py-2.5 rounded-lg text-sm flex justify-center items-center gap-2 transition-colors shadow-sm"
              >
                <span className="material-symbols-outlined notranslate text-[18px]">shopping_cart_checkout</span>
                GERAR PEDIDO
              </button>
            </div>
          </div>
        ))}
        {clientes.length === 0 && !loading && (
          <div className="col-span-full py-12 text-center text-outline bg-surface-container-lowest rounded-xl border border-dashed border-outline-variant">
            Nenhum cliente cadastrado ainda.
          </div>
        )}
      </div>

      {/* Modal de Cliente */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest w-full max-w-lg rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
            <div className="p-6 border-b border-outline-variant/30 flex justify-between items-center bg-[#002046] text-white rounded-t-2xl">
              <h2 className="text-xl font-bold">{editingId ? 'Editar Cliente' : 'Novo Cliente'}</h2>
              <button onClick={() => setIsModalOpen(false)} className="text-white/70 hover:text-white transition-colors">
                <span className="material-symbols-outlined notranslate">close</span>
              </button>
            </div>

            <form onSubmit={handleSave} className="flex flex-col overflow-hidden h-full">
              <div className="p-6 flex-1 overflow-y-auto space-y-4">
                <div>
                  <label className="block text-xs font-bold text-outline uppercase mb-1">Razão Social *</label>
                  <input
                    type="text"
                    required
                    value={formData.razao_social}
                    onChange={(e) => setFormData(prev => ({ ...prev, razao_social: e.target.value }))}
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg p-3 text-primary font-medium focus:outline-none focus:border-primary"
                    placeholder="Nome da empresa"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-outline uppercase mb-1">CNPJ</label>
                    <input
                      type="text"
                      value={formData.cnpj}
                      onChange={(e) => setFormData(prev => ({ ...prev, cnpj: e.target.value }))}
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg p-3 text-primary font-medium focus:outline-none focus:border-primary"
                      placeholder="00.000.000/0000-00"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-outline uppercase mb-1">Telefone</label>
                    <input
                      type="text"
                      value={formData.telefone}
                      onChange={(e) => setFormData(prev => ({ ...prev, telefone: e.target.value }))}
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg p-3 text-primary font-medium focus:outline-none focus:border-primary"
                      placeholder="(11) 90000-0000"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-outline uppercase mb-1">Endereço de Entrega Padrão</label>
                    <textarea
                      value={formData.endereco_entrega}
                      onChange={(e) => setFormData(prev => ({ ...prev, endereco_entrega: e.target.value }))}
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg p-3 text-primary font-medium focus:outline-none focus:border-primary min-h-[50px] resize-y"
                      placeholder="Rua, Número, Bairro, Cidade"
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-xs font-bold text-outline uppercase mb-1">UF Destino</label>
                    <select
                      value={formData.uf}
                      onChange={(e) => setFormData(prev => ({ ...prev, uf: e.target.value }))}
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg p-3 text-primary font-medium focus:outline-none focus:border-primary"
                    >
                      {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                        <option key={uf} value={uf}>{uf}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-outline-variant/30">
                  <div>
                    <label className="block text-xs font-bold text-outline uppercase mb-1">Tipo de Cliente (Fiscal)</label>
                    <select
                      value={formData.tipo_cliente}
                      onChange={(e) => setFormData(prev => ({ ...prev, tipo_cliente: e.target.value }))}
                      className="w-full bg-surface-bright border border-outline-variant rounded-lg p-3 text-primary font-medium focus:outline-none focus:border-primary"
                    >
                      <option value="REVENDA">Revenda</option>
                      <option value="INDUSTRIALIZACAO">Industrialização</option>
                      <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                    </select>
                  </div>
                  <div className="flex items-center pt-5">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.contribuinte_icms}
                        onChange={(e) => setFormData(prev => ({ ...prev, contribuinte_icms: e.target.checked }))}
                        className="w-5 h-5 rounded border-outline-variant text-primary focus:ring-primary"
                      />
                      <span className="text-sm font-bold text-primary">Contribuinte de ICMS</span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-outline-variant/30 bg-surface-container-low rounded-b-2xl flex justify-end gap-3">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-on-surface-variant hover:bg-surface-container-high transition-colors text-sm">
                  CANCELAR
                </button>
                <button type="submit" className="px-6 py-2 rounded-lg font-bold bg-primary text-white hover:bg-primary-dark transition-colors shadow-sm text-sm">
                  SALVAR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
