import React, { useState, useEffect } from 'react';
import { Supplier } from '../types';
import { useToast } from '../contexts/ToastContext';
import { createClient } from '../utils/supabase/client';

interface FornecedoresProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  isAddingNew: boolean;
  setIsAddingNew: (val: boolean) => void;
  externalSearchQuery?: string;
}

export default function Fornecedores({
  suppliers,
  onAddSupplier,
  onUpdateSupplier,
  isAddingNew,
  setIsAddingNew,
  externalSearchQuery = ''
}: FornecedoresProps) {
  const { addToast } = useToast();
  const supabase = createClient();
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  useEffect(() => {
    if (selectedSupplierId) {
      loadAuditLogs(selectedSupplierId);
    } else {
      setAuditLogs([]);
    }
  }, [selectedSupplierId]);

  const loadAuditLogs = async (fornId: string) => {
    setLoadingLogs(true);
    try {
      const { data, error } = await supabase
        .from('fornecedores_audit_log')
        .select(`
          *,
          usuarios(email)
        `)
        .eq('fornecedor_id', fornId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAuditLogs(data || []);
    } catch (err) {
      console.error('Erro ao buscar log de auditoria', err);
    } finally {
      setLoadingLogs(false);
    }
  };

  // New Supplier Form State
  const [newName, setNewName] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newIe, setNewIe] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [rating, setRating] = useState(90);

  // N3 Specific Questions
  const [passaTriagem, setPassaTriagem] = useState(false);
  const [extraidoRotulo, setExtraidoRotulo] = useState(false);
  const [moagemIniciaLavagem, setMoagemIniciaLavagem] = useState(false);
  const [lavagemASeco, setLavagemASeco] = useState(false);
  const [possuiLavadora, setPossuiLavadora] = useState(false);
  const [possuiTanqueDecantacao, setPossuiTanqueDecantacao] = useState(false);
  const [possuiSecadora, setPossuiSecadora] = useState(false);
  const [possuiSoproSiloBag, setPossuiSoproSiloBag] = useState(false);

  const formatCNPJ = (value: string) => {
    const v = value.replace(/\D/g, '').slice(0, 14);
    return v.replace(/^(\d{2})(\d)/, '$1.$2')
            .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
            .replace(/\.(\d{3})(\d)/, '.$1/$2')
            .replace(/(\d{4})(\d)/, '$1-$2');
  };

  // Filter Categories
  const categoriesList = ['Todas', 'Matéria-Prima', 'Insumos', 'Serviços', 'Manutenção'];

  // Match selected supplier
  const selectedSupplier = suppliers.find(s => s.id === selectedSupplierId);

  // Filtered Suppliers
  const filteredSuppliers = suppliers.filter(s => {
    const search = externalSearchQuery?.toLowerCase() || '';
    if (!search) return true;
    return (s.name || '').toLowerCase().includes(search) || 
           (s.cnpj || '').includes(search) ||
           (s.contact || '').toLowerCase().includes(search);
  });

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCnpj.trim() || newCategories.length === 0) {
      addToast('Por favor, preencha o Nome, CNPJ e selecione pelo menos uma Categoria!', 'warning');
      return;
    }

    if (isEditing && selectedSupplier) {
      const updatedSupplier: Supplier = {
        ...selectedSupplier,
        name: newName,
        cnpj: newCnpj,
        IE: newIe || 'Isento',
        categories: newCategories,
        contact: newContact,
        contactEmail: newEmail,
        address: newAddress,
        passa_triagem: passaTriagem,
        extraido_rotulo: extraidoRotulo,
        moagem_inicia_lavagem: moagemIniciaLavagem,
        lavagem_a_seco: lavagemASeco,
        possui_lavadora: possuiLavadora,
        possui_tanque_decantacao: possuiTanqueDecantacao,
        possui_secadora: possuiSecadora,
        possui_sopro_silo_bag: possuiSoproSiloBag,
      };
      onUpdateSupplier(updatedSupplier);
      setIsEditing(false);
      setIsAddingNew(false);
    } else {
      const newSupplier: Supplier = {
      id: `SUP-${(suppliers.length + 1).toString().padStart(3, '0')}`,
      name: newName,
      cnpj: newCnpj,
      IE: newIe || 'Isento',
      categories: newCategories,
      rating: rating,
      status: 'Em Homologação',
      contact: newContact,
      contactEmail: newEmail,
      lastDelivery: 'Recém Cadastrado',
      address: newAddress,
      limit: 250000,
      logo: 'https://images.unsplash.com/photo-1516825425712-4014f3747596?w=150&auto=format&fit=crop&q=80&referrerpolicy=no-referrer',
      auditDate: new Date().toLocaleDateString('pt-BR'),
      paymentTerm: '30 Dias',
      currency: 'BRL',
      documents: [
        { id: 'doc-auto', name: 'Contrato Social Inicial', type: 'Legal', issueDate: new Date().toLocaleDateString('pt-BR'), expiryDate: 'Validade Vitalícia', status: 'Válido' }
      ],
      history: [],
      passa_triagem: passaTriagem,
      extraido_rotulo: extraidoRotulo,
      moagem_inicia_lavagem: moagemIniciaLavagem,
      lavagem_a_seco: lavagemASeco,
      possui_lavadora: possuiLavadora,
      possui_tanque_decantacao: possuiTanqueDecantacao,
      possui_secadora: possuiSecadora,
      possui_sopro_silo_bag: possuiSoproSiloBag,
    };

    onAddSupplier(newSupplier);
    setIsAddingNew(false);
    } // End of else

    // Reset Form
    setNewName('');
    setNewCnpj('');
    setNewIe('');
    setNewContact('');
    setNewEmail('');
    setNewAddress('');
    setNewCategories([]);
    setRating(90);
    setPassaTriagem(false);
    setExtraidoRotulo(false);
    setMoagemIniciaLavagem(false);
    setLavagemASeco(false);
    setPossuiLavadora(false);
    setPossuiTanqueDecantacao(false);
    setPossuiSecadora(false);
    setPossuiSoproSiloBag(false);
  };

  const handleEditClick = () => {
    if (selectedSupplier) {
      setNewName(selectedSupplier.name);
      setNewCnpj(selectedSupplier.cnpj);
      setNewIe(selectedSupplier.IE);
      setNewContact(selectedSupplier.contact);
      setNewEmail(selectedSupplier.contactEmail);
      setNewAddress(selectedSupplier.address);
      setNewCategories(selectedSupplier.categories);
      setPassaTriagem(selectedSupplier.passa_triagem || false);
      setExtraidoRotulo(selectedSupplier.extraido_rotulo || false);
      setMoagemIniciaLavagem(selectedSupplier.moagem_inicia_lavagem || false);
      setLavagemASeco(selectedSupplier.lavagem_a_seco || false);
      setPossuiLavadora(selectedSupplier.possui_lavadora || false);
      setPossuiTanqueDecantacao(selectedSupplier.possui_tanque_decantacao || false);
      setPossuiSecadora(selectedSupplier.possui_secadora || false);
      setPossuiSoproSiloBag(selectedSupplier.possui_sopro_silo_bag || false);
      setIsEditing(true);
      setIsAddingNew(true);
    }
  };

  const toggleDocumentStatus = (docId: string) => {
    if (!selectedSupplier) return;
    const updatedDocs = selectedSupplier.documents.map(doc => {
      if (doc.id === docId) {
        return {
          ...doc,
          status: doc.status === 'Válido' ? 'Expirado' as const : 'Válido' as const
        };
      }
      return doc;
    });

    onUpdateSupplier({
      ...selectedSupplier,
      documents: updatedDocs
    });
  };

  const handleUpdateRating = (newRating: number) => {
    if (!selectedSupplier) return;
    onUpdateSupplier({
      ...selectedSupplier,
      rating: newRating
    });
  };

  return (
    <div className="space-y-6">
      {/* If adding a new supplier */}
      {isAddingNew ? (
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs max-w-2xl mx-auto space-y-6">
          <div className="flex items-center justify-between border-b border-surface-container pb-4">
            <div>
              <h3 className="text-base font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-secondary">domain_add</span>
                {isEditing ? 'Editar Fornecedor' : 'Cadastrar Novo Fornecedor (Onboarding)'}
              </h3>
              <p className="text-xs text-outline mt-0.5">Preencha os dados primários para iniciar o processo de homologação ISO.</p>
            </div>
            <button
              onClick={() => { setIsAddingNew(false); setIsEditing(false); }}
              className="p-1 text-outline hover:text-primary rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined notranslate">close</span>
            </button>
          </div>

          <form onSubmit={handleCreateSupplier} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">Razão Social *</label>
                <input
                  type="text"
                  required
                  placeholder="EX: Polímeros e Resinas Ind."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full bg-surface-container-low text-primary border border-outline/20 rounded-lg p-2.5 text-xs focus:border-secondary outline-hidden font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">CNPJ *</label>
                <input
                  type="text"
                  required
                  placeholder="00.000.000/0001-00"
                  value={newCnpj}
                  onChange={(e) => setNewCnpj(formatCNPJ(e.target.value))}
                  maxLength={18}
                  className="w-full bg-surface-container-low text-primary border border-outline/20 rounded-lg p-2.5 text-xs focus:border-secondary outline-hidden font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">Inscrição Estadual (IE)</label>
                <input
                  type="text"
                  placeholder="123.456.789.110"
                  value={newIe}
                  onChange={(e) => setNewIe(e.target.value)}
                  className="w-full bg-surface-container-low text-primary border border-outline/20 rounded-lg p-2.5 text-xs focus:border-secondary outline-hidden font-semibold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">Contato Principal</label>
                <input
                  type="text"
                  placeholder="Ex: Carlos Silva"
                  value={newContact}
                  onChange={(e) => setNewContact(e.target.value)}
                  className="w-full bg-surface-container-low text-primary border border-outline/20 rounded-lg p-2.5 text-xs focus:border-secondary outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">E-mail de Contrato</label>
                <input
                  type="email"
                  placeholder="carlos@resinas.com.br"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full bg-surface-container-low text-primary border border-outline/20 rounded-lg p-2.5 text-xs focus:border-secondary outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">Categoria Fornecimento *</label>
                <div className="flex gap-4 p-2.5 bg-surface-container-low border border-outline/20 rounded-lg">
                  <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="accent-secondary h-4 w-4"
                      checked={newCategories.includes('ACO')}
                      onChange={(e) => {
                        if (e.target.checked) setNewCategories([...newCategories, 'ACO']);
                        else setNewCategories(newCategories.filter(c => c !== 'ACO'));
                      }}
                    />
                    ACO
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="accent-secondary h-4 w-4"
                      checked={newCategories.includes('QUIMICO')}
                      onChange={(e) => {
                        if (e.target.checked) setNewCategories([...newCategories, 'QUIMICO']);
                        else setNewCategories(newCategories.filter(c => c !== 'QUIMICO'));
                      }}
                    />
                    QUIMICO
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="accent-secondary h-4 w-4"
                      checked={newCategories.includes('POLIMERO')}
                      onChange={(e) => {
                        if (e.target.checked) setNewCategories([...newCategories, 'POLIMERO']);
                        else setNewCategories(newCategories.filter(c => c !== 'POLIMERO'));
                      }}
                    />
                    POLIMERO
                  </label>
                </div>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-primary mb-1.5 uppercase tracking-wider">Endereço da Planta</label>
                <input
                  type="text"
                  placeholder="Rua Industrial, Km 10 - Polo Fabril, SP"
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                  className="w-full bg-surface-container-low text-primary border border-outline/20 rounded-lg p-2.5 text-xs focus:border-secondary outline-hidden"
                />
              </div>
            </div>

            <div className="border border-outline/20 rounded-lg p-4 bg-surface-container-low">
              <label className="block text-xs font-bold text-primary mb-3 uppercase tracking-wider">Perguntas de Qualificação (Nível 3)</label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="accent-secondary h-4 w-4"
                    checked={passaTriagem}
                    onChange={(e) => setPassaTriagem(e.target.checked)}
                  />
                  Passa por uma triagem?
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="accent-secondary h-4 w-4"
                    checked={extraidoRotulo}
                    onChange={(e) => setExtraidoRotulo(e.target.checked)}
                  />
                  É extraído o rótulo?
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="accent-secondary h-4 w-4"
                    checked={moagemIniciaLavagem}
                    onChange={(e) => setMoagemIniciaLavagem(e.target.checked)}
                  />
                  Na moagem inicia lavagem?
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="accent-secondary h-4 w-4"
                    checked={lavagemASeco}
                    onChange={(e) => setLavagemASeco(e.target.checked)}
                  />
                  Lavagem é a seco?
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="accent-secondary h-4 w-4"
                    checked={possuiLavadora}
                    onChange={(e) => setPossuiLavadora(e.target.checked)}
                  />
                  Lavadora?
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="accent-secondary h-4 w-4"
                    checked={possuiTanqueDecantacao}
                    onChange={(e) => setPossuiTanqueDecantacao(e.target.checked)}
                  />
                  Tanque de decantação?
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="accent-secondary h-4 w-4"
                    checked={possuiSecadora}
                    onChange={(e) => setPossuiSecadora(e.target.checked)}
                  />
                  Secadora?
                </label>
                <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="accent-secondary h-4 w-4"
                    checked={possuiSoproSiloBag}
                    onChange={(e) => setPossuiSoproSiloBag(e.target.checked)}
                  />
                  Sopro/Silo/Bag?
                </label>
              </div>
            </div>

            <div className="pt-4 border-t border-surface-container flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsAddingNew(false);
                  setIsEditing(false);
                }}
                className="bg-surface-container-high text-primary px-5 py-2.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-surface-container-highest transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-primary text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer"
              >
                {isEditing ? 'Salvar Alterações' : 'Salvar Cadastro'}
              </button>
            </div>
          </form>
        </div>
      ) : selectedSupplierId && selectedSupplier ? (
        /* Detailed View of Single Provider (e.g. SteelTech mock page) */
        <div className="space-y-6">
          {/* Back button and Edit */}
          <div className="flex justify-between items-center">
            <button
              onClick={() => setSelectedSupplierId(null)}
              className="inline-flex items-center gap-2 text-xs font-bold text-outline hover:text-primary transition-colors cursor-pointer select-none bg-surface-container-low px-3 py-2 rounded-full border border-outline/10"
            >
              <span className="material-symbols-outlined notranslate text-[16px]">arrow_back</span>
              Voltar para Listagem de Fornecedores
            </button>
            <button
              onClick={handleEditClick}
              className="bg-secondary hover:brightness-95 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-sm cursor-pointer"
            >
              EDITAR FORNECEDOR
            </button>
          </div>

          {/* Supplier Header Dashboard detail card */}
          <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-6">
            <div className="flex flex-col md:flex-row gap-6 md:items-center justify-between">
              
              {/* Left Logo / CNPJ */}
              <div className="flex items-center gap-4">
                <img
                  src={selectedSupplier.logo}
                  alt={selectedSupplier.name}
                  className="w-16 h-16 rounded-xl object-contain border border-outline-variant p-1 bg-white shrink-0"
                  referrerPolicy="no-referrer"
                />
                <div>
                  <h3 className="text-xl font-bold text-primary tracking-tight">{selectedSupplier.name}</h3>
                  <div className="flex flex-wrap items-center gap-3 mt-1 text-xs text-outline font-semibold">
                    <span>CNPJ: {selectedSupplier.cnpj}</span>
                    <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
                    <span>IE: {selectedSupplier.IE}</span>
                  </div>
                </div>
              </div>

              {/* Status and Rating Info */}
              <div className="flex items-center gap-6">
                {/* Status Tag */}
                <div className="text-right">
                  <span className="text-[10px] text-outline font-bold uppercase tracking-wider block mb-1">Status Auditoria</span>
                  <select 
                    value={selectedSupplier.status} 
                    onChange={(e) => onUpdateSupplier({ ...selectedSupplier, status: e.target.value as any })}
                    className={`px-3 py-1.5 rounded-sm text-xs font-black cursor-pointer border-none outline-hidden ${
                      selectedSupplier.status === 'Ativo'
                        ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                        : selectedSupplier.status === 'Em Homologação'
                          ? 'bg-secondary-container text-on-secondary-container'
                          : 'bg-error-container text-on-error-container'
                    }`}
                  >
                    <option value="Ativo" className="bg-white text-primary">ATIVO</option>
                    <option value="Em Homologação" className="bg-white text-primary">EM HOMOLOGAÇÃO</option>
                    <option value="Inativo" className="bg-white text-primary">INATIVO</option>
                  </select>
                </div>

                {/* Rating score circle */}
                <div className="text-center bg-surface-container-low border border-outline-variant/50 p-2 px-4 rounded-xl">
                  <span className="text-[10px] uppercase font-bold text-outline tracking-wider block mb-0.5">Score OEE</span>
                  <span className={`text-2xl font-black ${selectedSupplier.rating >= 90 ? 'text-on-tertiary-container' : 'text-secondary'}`}>
                    {selectedSupplier.rating}%
                  </span>
                </div>
              </div>

            </div>

            {/* Quick General metadata details */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs">
              <div>
                <span className="text-outline font-medium">Contato Comercial</span>
                <p className="font-bold text-primary mt-0.5">{selectedSupplier.contact}</p>
              </div>
              <div>
                <span className="text-outline font-medium">E-mail</span>
                <p className="font-bold text-primary mt-0.5 truncate">{selectedSupplier.contactEmail}</p>
              </div>
              <div>
                <span className="text-outline font-medium">Tipos de Insumo (Categoria)</span>
                <p className="font-bold text-secondary mt-0.5">{selectedSupplier.categories.join(', ')}</p>
              </div>
            </div>

            {/* Qualificação N3 View */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs">
              <div>
                <span className="text-outline font-medium flex items-center gap-1"><span className="material-symbols-outlined notranslate text-[14px]">checklist</span> Passa Triagem?</span>
                <p className={`font-bold mt-1 ${selectedSupplier.passa_triagem ? 'text-tertiary' : 'text-outline-variant'}`}>
                  {selectedSupplier.passa_triagem ? 'Sim' : 'Não'}
                </p>
              </div>
              <div>
                <span className="text-outline font-medium flex items-center gap-1"><span className="material-symbols-outlined notranslate text-[14px]">label_off</span> Extraído Rótulo?</span>
                <p className={`font-bold mt-1 ${selectedSupplier.extraido_rotulo ? 'text-tertiary' : 'text-outline-variant'}`}>
                  {selectedSupplier.extraido_rotulo ? 'Sim' : 'Não'}
                </p>
              </div>
              <div>
                <span className="text-outline font-medium flex items-center gap-1"><span className="material-symbols-outlined notranslate text-[14px]">water_drop</span> Moagem & Lavagem?</span>
                <p className={`font-bold mt-1 ${selectedSupplier.moagem_inicia_lavagem ? 'text-tertiary' : 'text-outline-variant'}`}>
                  {selectedSupplier.moagem_inicia_lavagem ? 'Sim' : 'Não'}
                </p>
              </div>
              <div>
                <span className="text-outline font-medium flex items-center gap-1"><span className="material-symbols-outlined notranslate text-[14px]">dry</span> Lavagem a Seco?</span>
                <p className={`font-bold mt-1 ${selectedSupplier.lavagem_a_seco ? 'text-tertiary' : 'text-outline-variant'}`}>
                  {selectedSupplier.lavagem_a_seco ? 'Sim' : 'Não'}
                </p>
              </div>
              <div>
                <span className="text-outline font-medium flex items-center gap-1"><span className="material-symbols-outlined notranslate text-[14px]">local_laundry_service</span> Lavadora?</span>
                <p className={`font-bold mt-1 ${selectedSupplier.possui_lavadora ? 'text-tertiary' : 'text-outline-variant'}`}>
                  {selectedSupplier.possui_lavadora ? 'Sim' : 'Não'}
                </p>
              </div>
              <div>
                <span className="text-outline font-medium flex items-center gap-1"><span className="material-symbols-outlined notranslate text-[14px]">waves</span> Decantação?</span>
                <p className={`font-bold mt-1 ${selectedSupplier.possui_tanque_decantacao ? 'text-tertiary' : 'text-outline-variant'}`}>
                  {selectedSupplier.possui_tanque_decantacao ? 'Sim' : 'Não'}
                </p>
              </div>
              <div>
                <span className="text-outline font-medium flex items-center gap-1"><span className="material-symbols-outlined notranslate text-[14px]">heat_pump</span> Secadora?</span>
                <p className={`font-bold mt-1 ${selectedSupplier.possui_secadora ? 'text-tertiary' : 'text-outline-variant'}`}>
                  {selectedSupplier.possui_secadora ? 'Sim' : 'Não'}
                </p>
              </div>
              <div>
                <span className="text-outline font-medium flex items-center gap-1"><span className="material-symbols-outlined notranslate text-[14px]">air</span> Sopro/Silo/Bag?</span>
                <p className={`font-bold mt-1 ${selectedSupplier.possui_sopro_silo_bag ? 'text-tertiary' : 'text-outline-variant'}`}>
                  {selectedSupplier.possui_sopro_silo_bag ? 'Sim' : 'Não'}
                </p>
              </div>
            </div>

            {/* Change Score Interactive Control */}
            <div className="p-4 bg-surface-bright rounded-xl border border-outline-variant/30 max-w-md space-y-2">
              <div className="flex justify-between items-center text-xs font-bold text-primary">
                <span>Modificar Avaliação Pelo CQ (Controle de Qualidade)</span>
                <span className="text-secondary font-extrabold">{selectedSupplier.rating}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={selectedSupplier.rating}
                onChange={(e) => handleUpdateRating(Number(e.target.value))}
                className="w-full accent-secondary"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Documents Check Section */}
            <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
              <div className="border-b border-surface-container pb-3 flex justify-between items-center">
                <div>
                  <h4 className="text-sm font-bold text-primary">Documentação Regulatória</h4>
                  <p className="text-xs text-outline">Exigências sanitárias, fiscais e ambientais</p>
                </div>
                <span className="text-[10px] font-bold text-outline">ISO 9001:2015</span>
              </div>

              <div className="space-y-3">
                <div className="p-6 bg-surface-bright border border-outline-variant/50 rounded-xl flex flex-col items-center justify-center text-center space-y-2">
                  <span className="material-symbols-outlined notranslate text-[32px] text-outline-variant">construction</span>
                  <p className="text-sm font-bold text-primary">Módulo em Desenvolvimento</p>
                  <p className="text-xs text-outline max-w-xs">A gestão de documentação regulatória (ISO, licenças ambientais, contratos) será implementada em futuras atualizações.</p>
                </div>
              </div>
            </div>

            {/* Past OP/Delivery History section */}
            <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs">
              <h3 className="text-base font-bold text-primary flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined notranslate text-secondary">history</span>
                Histórico de Entradas no Almoxarifado
              </h3>

              <div className="space-y-3">
                {selectedSupplier.history.length === 0 ? (
                  <p className="text-xs text-outline font-semibold">Nenhuma entrada registrada para este fornecedor ainda.</p>
                ) : (
                  selectedSupplier.history.map(item => (
                    <div key={item.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-surface-container-low rounded-xl border border-outline-variant/30 hover:border-secondary/30 transition-colors gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-secondary-container flex items-center justify-center shrink-0">
                          <span className="material-symbols-outlined notranslate text-on-secondary-container text-lg">local_shipping</span>
                        </div>
                        <div>
                          <p className="text-sm font-bold text-primary">{item.item}</p>
                          <p className="text-xs text-outline font-medium">Data Prevista: {item.date}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-bold sm:text-right">
                        <div>
                          <p className="text-outline mb-0.5">Quantidade</p>
                          <p className="text-primary">{item.amount}</p>
                        </div>
                        <div>
                          <p className="text-outline mb-0.5">Valor Total</p>
                          <p className="text-primary">{item.value}</p>
                        </div>
                        <div className={`px-2 py-1 rounded ${item.status === 'Concluído' ? 'bg-tertiary-fixed text-on-tertiary-fixed' : item.status === 'Pendente' ? 'bg-secondary-container text-on-secondary-container' : 'bg-error-container text-on-error-container'}`}>
                          {item.status}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Audit Log Section */}
            <div className="lg:col-span-12 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs">
              <h3 className="text-base font-bold text-primary flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined notranslate text-secondary">manage_history</span>
                Histórico de Alterações (Auditoria)
              </h3>
              
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
                {loadingLogs ? (
                  <p className="text-xs text-outline animate-pulse">Carregando histórico...</p>
                ) : auditLogs.length === 0 ? (
                  <p className="text-xs text-outline font-semibold bg-surface-container-low p-4 rounded-xl text-center">
                    Nenhuma alteração registrada ainda para este parceiro.
                  </p>
                ) : (
                  auditLogs.map(log => (
                    <div key={log.id} className="relative pl-6 pb-6 border-l-2 border-surface-container-high last:border-transparent last:pb-0">
                      <div className="absolute w-3 h-3 rounded-full bg-secondary left-[-7px] top-1"></div>
                      <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/30">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-sm mr-2 ${
                              log.acao === 'INSERT' ? 'bg-green-100 text-green-700' :
                              log.acao === 'UPDATE' ? 'bg-blue-100 text-blue-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {log.acao}
                            </span>
                            <span className="text-xs font-bold text-primary">{log.usuarios?.email || 'Sistema'}</span>
                          </div>
                          <span className="text-[10px] font-bold text-outline">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                        {log.acao === 'UPDATE' && log.dados_novos && log.dados_antigos && (
                          <div className="text-[11px] text-outline font-mono bg-surface-container-lowest p-2 rounded border border-outline-variant/20 mt-2 overflow-x-auto">
                            Modificações detectadas:
                            <ul className="list-disc list-inside mt-1">
                              {Object.keys(log.dados_novos).map(key => {
                                if (JSON.stringify(log.dados_novos[key]) !== JSON.stringify(log.dados_antigos[key])) {
                                  // Skip metadata like updated_at
                                  if (key === 'updated_at' || key === 'created_at') return null;
                                  return (
                                    <li key={key}>
                                      <span className="font-bold text-primary">{key}:</span>{' '}
                                      <span className="text-red-500 line-through">
                                        {typeof log.dados_antigos[key] === 'object' ? 'Objeto' : String(log.dados_antigos[key])}
                                      </span>{' '}
                                      &rarr;{' '}
                                      <span className="text-green-600">
                                        {typeof log.dados_novos[key] === 'object' ? 'Objeto' : String(log.dados_novos[key])}
                                      </span>
                                    </li>
                                  )
                                }
                                return null;
                              })}
                            </ul>
                          </div>
                        )}
                        {log.acao === 'INSERT' && (
                          <p className="text-[11px] text-outline mt-1">Fornecedor Nível 3 criado no sistema.</p>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>
        </div>
      ) : (
        /* Standard Supplier Grid & filters list */
        <div className="space-y-6">

          {/* Suppliers Grid items list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.length === 0 ? (
              <div className="col-span-full bg-surface-container-lowest p-12 rounded-2xl border border-outline-variant text-center space-y-2">
                <span className="material-symbols-outlined notranslate text-[48px] text-outline">corporate_fare</span>
                <p className="text-sm font-bold text-primary">Nenhum parceiro encontrado com os filtros selecionados.</p>
                <p className="text-xs text-outline">Adicione um novo no menu lateral ou revise as categorias.</p>
              </div>
            ) : (
              filteredSuppliers.map(sup => (
                <div
                  key={sup.id}
                  onClick={() => setSelectedSupplierId(sup.id)}
                  className="bg-surface-container-lowest border border-outline-variant hover:border-outline hover:ring-1 hover:ring-outline p-5 rounded-2xl shadow-xs transition-all duration-200 cursor-pointer flex flex-col justify-between hover:-translate-y-0.5"
                >
                  {/* Top card metadata */}
                  <div className="space-y-4">
                    <div className="flex justify-between items-start">
                      <img
                        src={sup.logo}
                        alt={sup.name}
                        className="w-12 h-12 rounded-lg object-contain border border-outline-variant p-0.5 bg-white shrink-0"
                        referrerPolicy="no-referrer"
                      />
                      <span className={`px-2.5 py-1 rounded-sm text-[10px] font-black tracking-wide ${
                        sup.status === 'Ativo'
                          ? 'bg-tertiary-fixed text-on-tertiary-fixed'
                          : sup.status === 'Em Homologação'
                            ? 'bg-secondary-container text-on-secondary-container'
                            : 'bg-error-container text-on-error-container'
                      }`}>
                        {sup.status}
                      </span>
                    </div>

                    <div>
                      <h4 className="text-sm font-bold text-primary line-clamp-1">{sup.name}</h4>
                      <p className="text-[11px] text-outline font-medium">CNPJ: {sup.cnpj}</p>
                    </div>

                    {/* Category tags */}
                    <div className="flex flex-wrap gap-1">
                      {sup.categories.map(c => (
                        <span key={c} className="bg-surface-container-low text-primary text-[10px] px-2 py-0.5 rounded-sm font-semibold">
                          {c}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Bottom rating score indicators */}
                  <div className="border-t border-outline-variant/50 pt-4 mt-5 flex items-center justify-between text-xs">
                    <div>
                      <span className="text-[10px] text-outline font-bold uppercase tracking-wider block">Última Entrega</span>
                      <span className="font-bold text-primary">{sup.lastDelivery}</span>
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] text-outline font-bold uppercase tracking-wider block">Score OEE</span>
                      <span className={`font-black text-sm ${sup.rating >= 90 ? 'text-on-tertiary-container' : 'text-secondary'}`}>
                        {sup.rating}%
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

        </div>
      )}
    </div>
  );
}
