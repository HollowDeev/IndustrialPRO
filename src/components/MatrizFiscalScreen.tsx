import React, { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { useToast } from '../contexts/ToastContext';

export default function MatrizFiscalScreen({ empresaId }: { empresaId: string }) {
  const supabase = createClient();
  const { addToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [regras, setRegras] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    id: '',
    ncm_padrao: '',
    uf_destino: '*',
    tipo_cliente: '*',
    cfop: '',
    cst: '',
    icms_percent: 0,
    ipi_percent: 0
  });

  const UFS = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'];

  const loadRegras = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('regras_fiscais_matriz')
      .select('*')
      .eq('empresa_id', empresaId)
      .order('ncm_padrao');
      
    if (error) {
      addToast('Erro ao carregar matriz fiscal: ' + error.message, 'error');
    } else {
      setRegras(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (empresaId) loadRegras();
  }, [empresaId]);

  const handleOpenModal = (r?: any) => {
    if (r) {
      setFormData(r);
    } else {
      setFormData({
        id: '',
        ncm_padrao: '',
        uf_destino: '*',
        tipo_cliente: '*',
        cfop: '',
        cst: '',
        icms_percent: 0,
        ipi_percent: 0
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.ncm_padrao || !formData.cfop || !formData.cst) {
      addToast('Preencha os campos obrigatórios.', 'warning');
      return;
    }
    
    try {
      const payload = {
        empresa_id: empresaId,
        ncm_padrao: formData.ncm_padrao,
        uf_destino: formData.uf_destino,
        tipo_cliente: formData.tipo_cliente,
        cfop: formData.cfop,
        cst: formData.cst,
        icms_percent: Number(formData.icms_percent),
        ipi_percent: Number(formData.ipi_percent)
      };

      if (formData.id) {
        const { error } = await supabase.from('regras_fiscais_matriz').update(payload).eq('id', formData.id);
        if (error) throw error;
        addToast('Regra atualizada com sucesso!', 'success');
      } else {
        const { error } = await supabase.from('regras_fiscais_matriz').insert(payload);
        if (error) throw error;
        addToast('Regra cadastrada com sucesso!', 'success');
      }
      setIsModalOpen(false);
      loadRegras();
    } catch (err: any) {
      addToast('Erro ao salvar regra: ' + err.message, 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir regra fiscal?')) return;
    try {
      const { error } = await supabase.from('regras_fiscais_matriz').delete().eq('id', id);
      if (error) throw error;
      addToast('Regra excluída!', 'success');
      loadRegras();
    } catch (err: any) {
      addToast('Erro ao excluir: ' + err.message, 'error');
    }
  };

  return (
    <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-sm">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-lg font-black text-primary">Matriz de Operações (De / Para)</h3>
          <p className="text-sm text-outline">Defina as regras de CFOP, CST e alíquotas baseadas no NCM, UF de Destino e Tipo de Cliente.</p>
        </div>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-primary hover:bg-primary-dark text-white px-4 py-2 rounded-lg font-bold text-sm transition-colors shadow-sm flex items-center gap-2"
        >
          <span className="material-symbols-outlined notranslate text-[18px]">add</span>
          NOVA REGRA
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-outline-variant/60">
        <table className="w-full text-left text-xs">
          <thead className="bg-surface-container-low text-outline font-bold border-b border-outline-variant uppercase text-[10px] tracking-wider">
            <tr>
              <th className="p-4">NCM Padrão</th>
              <th className="p-4">UF Destino</th>
              <th className="p-4">Tipo Cliente</th>
              <th className="p-4">CFOP</th>
              <th className="p-4">CST</th>
              <th className="p-4 text-right">ICMS %</th>
              <th className="p-4 text-right">IPI %</th>
              <th className="p-4 w-16 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/30 text-on-surface">
            {loading ? (
              <tr><td colSpan={8} className="p-6 text-center text-outline">Carregando regras...</td></tr>
            ) : regras.length === 0 ? (
              <tr><td colSpan={8} className="p-6 text-center text-outline font-semibold">Nenhuma regra cadastrada. O sistema usará cálculos zerados.</td></tr>
            ) : (
              regras.map(r => (
                <tr key={r.id} className="hover:bg-surface-container-low/30 transition-colors">
                  <td className="p-4 font-mono font-bold text-primary">{r.ncm_padrao}</td>
                  <td className="p-4">{r.uf_destino === '*' ? 'Todas as UFs' : r.uf_destino}</td>
                  <td className="p-4">{r.tipo_cliente === '*' ? 'Todos os Tipos' : r.tipo_cliente}</td>
                  <td className="p-4 font-bold">{r.cfop}</td>
                  <td className="p-4">{r.cst}</td>
                  <td className="p-4 text-right font-semibold text-secondary">{r.icms_percent}%</td>
                  <td className="p-4 text-right font-semibold text-secondary">{r.ipi_percent}%</td>
                  <td className="p-4">
                    <div className="flex gap-2 justify-center">
                      <button onClick={() => handleOpenModal(r)} className="text-primary hover:text-primary-dark transition-colors" title="Editar">
                        <span className="material-symbols-outlined notranslate text-[18px]">edit</span>
                      </button>
                      <button onClick={() => handleDelete(r.id)} className="text-error hover:text-red-700 transition-colors" title="Excluir">
                        <span className="material-symbols-outlined notranslate text-[18px]">delete</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden">
            <div className="bg-[#002046] p-4 flex justify-between items-center text-white">
              <h4 className="font-bold">{formData.id ? 'Editar Regra Fiscal' : 'Nova Regra Fiscal'}</h4>
              <button onClick={() => setIsModalOpen(false)} className="hover:text-gray-300">
                <span className="material-symbols-outlined notranslate">close</span>
              </button>
            </div>
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-outline uppercase mb-1">NCM *</label>
                  <input
                    type="text"
                    required
                    value={formData.ncm_padrao}
                    onChange={e => setFormData({...formData, ncm_padrao: e.target.value})}
                    placeholder="Ex: 3917.23.00 ou *"
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-outline uppercase mb-1">UF Destino</label>
                  <select
                    value={formData.uf_destino}
                    onChange={e => setFormData({...formData, uf_destino: e.target.value})}
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-sm"
                  >
                    <option value="*">Qualquer UF (*)</option>
                    {UFS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="col-span-1">
                  <label className="block text-xs font-bold text-outline uppercase mb-1">Tipo Cliente</label>
                  <select
                    value={formData.tipo_cliente}
                    onChange={e => setFormData({...formData, tipo_cliente: e.target.value})}
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-sm"
                  >
                    <option value="*">Qualquer (*)</option>
                    <option value="REVENDA">Revenda</option>
                    <option value="INDUSTRIALIZACAO">Industrialização</option>
                    <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-outline uppercase mb-1">CFOP *</label>
                  <input
                    type="text"
                    required
                    value={formData.cfop}
                    onChange={e => setFormData({...formData, cfop: e.target.value})}
                    placeholder="Ex: 6101"
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-outline uppercase mb-1">CST *</label>
                  <input
                    type="text"
                    required
                    value={formData.cst}
                    onChange={e => setFormData({...formData, cst: e.target.value})}
                    placeholder="Ex: 00"
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-outline uppercase mb-1">ICMS (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.icms_percent}
                    onChange={e => setFormData({...formData, icms_percent: Number(e.target.value)})}
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-outline uppercase mb-1">IPI (%)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.ipi_percent}
                    onChange={e => setFormData({...formData, ipi_percent: Number(e.target.value)})}
                    className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-sm"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant/50 mt-4">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-bold text-outline hover:bg-surface-container-high transition-colors">
                  CANCELAR
                </button>
                <button type="submit" className="px-6 py-2 rounded-lg font-bold bg-primary text-white hover:bg-primary-dark shadow-sm">
                  SALVAR REGRA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
