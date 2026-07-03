import React, { useState } from 'react';
import { Supplier, SupplierDocument } from '../types';

interface FornecedoresProps {
  suppliers: Supplier[];
  onAddSupplier: (supplier: Supplier) => void;
  onUpdateSupplier: (supplier: Supplier) => void;
  isAddingNew: boolean;
  setIsAddingNew: (val: boolean) => void;
}

export default function Fornecedores({
  suppliers,
  onAddSupplier,
  onUpdateSupplier,
  isAddingNew,
  setIsAddingNew
}: FornecedoresProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [selectedStatus, setSelectedStatus] = useState('Todos');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // New Supplier Form State
  const [newName, setNewName] = useState('');
  const [newCnpj, setNewCnpj] = useState('');
  const [newIe, setNewIe] = useState('');
  const [newContact, setNewContact] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newAddress, setNewAddress] = useState('');
  const [newCategories, setNewCategories] = useState<string[]>([]);
  const [rating, setRating] = useState(90);

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
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          s.cnpj.includes(searchQuery) ||
                          s.contact.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesCategory = selectedCategory === 'Todas' || s.categories.includes(selectedCategory);
    
    const matchesStatus = selectedStatus === 'Todos' || s.status === selectedStatus;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const handleCreateSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newCnpj.trim() || newCategories.length === 0) {
      alert('Por favor, preencha o Nome, CNPJ e selecione pelo menos uma Categoria!');
      return;
    }

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
      history: []
    };

    onAddSupplier(newSupplier);
    setIsAddingNew(false);

    // Reset Form
    setNewName('');
    setNewCnpj('');
    setNewIe('');
    setNewContact('');
    setNewEmail('');
    setNewAddress('');
    setNewCategories([]);
    setRating(90);
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
              <h3 className="text-lg font-bold text-primary flex items-center gap-2">
                <span className="material-symbols-outlined text-secondary">add_business</span>
                Cadastrar Novo Parceiro Homologado
              </h3>
              <p className="text-xs text-outline mt-0.5">Seus dados serão auditados pela equipe de suprimentos</p>
            </div>
            <button
              onClick={() => setIsAddingNew(false)}
              className="p-1 text-outline hover:text-primary rounded-full hover:bg-surface-container-high transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">close</span>
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
                      checked={newCategories.includes('Aço')}
                      onChange={(e) => {
                        if (e.target.checked) setNewCategories([...newCategories, 'Aço']);
                        else setNewCategories(newCategories.filter(c => c !== 'Aço'));
                      }}
                    />
                    Aço
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-primary cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="accent-secondary h-4 w-4"
                      checked={newCategories.includes('Químico (Blend)')}
                      onChange={(e) => {
                        if (e.target.checked) setNewCategories([...newCategories, 'Químico (Blend)']);
                        else setNewCategories(newCategories.filter(c => c !== 'Químico (Blend)'));
                      }}
                    />
                    Químico (Blend)
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

            <div className="pt-4 border-t border-surface-container flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="bg-surface-container-high text-primary px-5 py-2.5 rounded-lg text-xs font-bold cursor-pointer hover:bg-surface-container-highest transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="bg-primary text-white px-5 py-2.5 rounded-lg text-xs font-bold hover:bg-primary-container transition-colors cursor-pointer"
              >
                Salvar Cadastro
              </button>
            </div>
          </form>
        </div>
      ) : selectedSupplierId && selectedSupplier ? (
        /* Detailed View of Single Provider (e.g. SteelTech mock page) */
        <div className="space-y-6">
          {/* Back button */}
          <button
            onClick={() => setSelectedSupplierId(null)}
            className="inline-flex items-center gap-2 text-xs font-bold text-outline hover:text-primary transition-colors cursor-pointer select-none bg-surface-container-low px-3 py-2 rounded-full border border-outline/10"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Voltar para Listagem de Fornecedores
          </button>

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
            <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 text-xs">
              <div>
                <span className="text-outline font-medium">Contato Comercial</span>
                <p className="font-bold text-primary mt-0.5">{selectedSupplier.contact}</p>
              </div>
              <div>
                <span className="text-outline font-medium">E-mail</span>
                <p className="font-bold text-primary mt-0.5 truncate">{selectedSupplier.contactEmail}</p>
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
                  <span className="material-symbols-outlined text-[32px] text-outline-variant">construction</span>
                  <p className="text-sm font-bold text-primary">Módulo em Desenvolvimento</p>
                  <p className="text-xs text-outline max-w-xs">A gestão de documentação regulatória (ISO, licenças ambientais, contratos) será implementada em futuras atualizações.</p>
                </div>
              </div>
            </div>

            {/* Past OP/Delivery History section */}
            <div className="lg:col-span-6 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
              <div>
                <h4 className="text-sm font-bold text-primary">Ordens de Abastecimento (Histórico)</h4>
                <p className="text-xs text-outline">Últimos pedidos de matéria-prima e insumos</p>
              </div>

              <div className="space-y-3">
                {selectedSupplier.history.length === 0 ? (
                  <p className="text-xs text-outline p-4 text-center">Nenhuma ordem de abastecimento registrada.</p>
                ) : (
                  selectedSupplier.history.map(item => (
                    <div
                      key={item.id}
                      className="p-3 bg-surface-bright border border-outline-variant/50 rounded-xl flex items-center justify-between text-xs"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-primary">{item.id}</span>
                          <span className="w-1.5 h-1.5 rounded-full bg-outline-variant"></span>
                          <span className="text-[11px] text-outline">{item.orderDate}</span>
                        </div>
                        <p className="text-[11px] text-primary font-medium truncate max-w-[280px]">{item.items}</p>
                      </div>

                      <div className="text-right">
                        <p className="font-extrabold text-primary">R$ {item.totalValue.toLocaleString()}</p>
                        <span className="text-[10px] font-bold text-on-tertiary-container">{item.status}</span>
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
          
          {/* Filtering bar panel */}
          <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
            
            {/* Search Box inputs inside */}
            <div className="relative w-full md:max-w-xs">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-[20px] text-outline">
                search
              </span>
              <input
                type="text"
                placeholder="Razão Social, CNPJ ou email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-surface-container-low text-primary text-xs px-10 py-2.5 rounded-lg border border-outline/10 focus:border-secondary outline-hidden"
              />
            </div>

            {/* Categories pills list */}
            <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
              <span className="text-xs font-bold text-outline uppercase mr-2 tracking-wider">Filtrar:</span>
              {categoriesList.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-bold rounded-full cursor-pointer select-none transition-all ${
                    selectedCategory === cat
                      ? 'bg-primary text-white border-primary shadow-xs'
                      : 'bg-surface-bright text-outline border border-outline-variant hover:bg-surface-container-low'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>

            {/* Status dropdown */}
            <div>
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="bg-surface-container-low border border-outline/10 text-xs font-bold text-primary rounded-lg p-2.5 cursor-pointer outline-hidden focus:border-secondary"
              >
                <option value="Todos">Auditoria: Todos</option>
                <option value="Ativo">Ativo (Homologado)</option>
                <option value="Em Homologação">Em Homologação</option>
                <option value="Bloqueado">Bloqueado</option>
              </select>
            </div>

          </div>

          {/* Suppliers Grid items list */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSuppliers.length === 0 ? (
              <div className="col-span-full bg-surface-container-lowest p-12 rounded-2xl border border-outline-variant text-center space-y-2">
                <span className="material-symbols-outlined text-[48px] text-outline">corporate_fare</span>
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
