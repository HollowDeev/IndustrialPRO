import React, { useState, useEffect } from 'react';
import { RawMaterial, RawMaterialSupplierRating, Supplier } from '../types';
import { 
  Layers, 
  Plus, 
  Search, 
  Edit3, 
  Check, 
  X, 
  Trash2, 
  ChevronRight, 
  DollarSign, 
  Calendar, 
  TrendingUp, 
  Star, 
  Sliders, 
  Building, 
  Package, 
  Award
} from 'lucide-react';

interface MateriasPrimasProps {
  suppliers: Supplier[];
  triggerAddNew?: number;
}

const INITIAL_MATERIALS: RawMaterial[] = [
  {
    id: "MP-001",
    description: "Resina PVC Flexível Cristal 70 ShA",
    purchaseUnit: "Kg",
    supplierId: "SUP-004", // Polímeros Norte Ltda.
    lastPurchaseDate: "2026-06-15",
    lastPurchasePrice: 12.50,
    lastPurchaseQty: 5000,
    currentStock: 12500,
    supplierRankings: [
      { supplierId: "SUP-004", averagePrice: 12.40, punctualityRating: 98, qualityRating: 99 },
      { supplierId: "SUP-002", averagePrice: 13.10, punctualityRating: 90, qualityRating: 92 }
    ]
  },
  {
    id: "MP-002",
    description: "Chapa de Aço Carbono 1020 - 3mm",
    purchaseUnit: "Kg",
    supplierId: "SUP-001", // SteelTech Soluções Metálicas
    lastPurchaseDate: "2026-05-20",
    lastPurchasePrice: 8.90,
    lastPurchaseQty: 1500,
    currentStock: 850,
    supplierRankings: [
      { supplierId: "SUP-001", averagePrice: 8.85, punctualityRating: 95, qualityRating: 96 },
      { supplierId: "SUP-002", averagePrice: 9.20, punctualityRating: 92, qualityRating: 94 }
    ]
  },
  {
    id: "MP-003",
    description: "Perfil Rígido de PVC Cinza Industrial",
    purchaseUnit: "Metro",
    supplierId: "SUP-002", // Metalúrgica Precision S.A.
    lastPurchaseDate: "2026-06-02",
    lastPurchasePrice: 4.20,
    lastPurchaseQty: 2000,
    currentStock: 4200,
    supplierRankings: [
      { supplierId: "SUP-002", averagePrice: 4.15, punctualityRating: 92, qualityRating: 93 },
      { supplierId: "SUP-004", averagePrice: 4.35, punctualityRating: 96, qualityRating: 95 }
    ]
  }
];

export default function MateriasPrimas({ suppliers, triggerAddNew }: MateriasPrimasProps) {
  useEffect(() => {
    if (triggerAddNew !== undefined && triggerAddNew > 0) {
      handleStartAddNew();
    }
  }, [triggerAddNew]);

  const [materials, setMaterials] = useState<RawMaterial[]>(() => {
    const saved = localStorage.getItem('helpe_raw_materials');
    return saved ? JSON.parse(saved) : INITIAL_MATERIALS;
  });

  const [selectedMaterialId, setSelectedMaterialId] = useState<string>(() => {
    const saved = localStorage.getItem('helpe_raw_materials');
    const list = saved ? JSON.parse(saved) : INITIAL_MATERIALS;
    return list.length > 0 ? list[0].id : '';
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [isRankingModalOpen, setIsRankingModalOpen] = useState(false);

  // New Raw Material Form State
  const [newMat, setNewMat] = useState<Partial<RawMaterial>>({
    id: '',
    description: '',
    purchaseUnit: 'Kg',
    supplierId: '',
    lastPurchaseDate: new Date().toISOString().substring(0, 10),
    lastPurchasePrice: 0,
    lastPurchaseQty: 0,
    currentStock: 0,
    supplierRankings: []
  });

  // Edit Raw Material Form State
  const [editForm, setEditForm] = useState<RawMaterial | null>(null);

  // New Supplier Ranking Form State (Inline modal sub-form)
  const [newRanking, setNewRanking] = useState({
    supplierId: '',
    averagePrice: 0,
    punctualityRating: 90,
    qualityRating: 90
  });

  // Save to local storage on change
  useEffect(() => {
    localStorage.setItem('helpe_raw_materials', JSON.stringify(materials));
  }, [materials]);

  // Set selected item to edit form
  const currentMaterial = materials.find(m => m.id === selectedMaterialId);

  useEffect(() => {
    if (currentMaterial) {
      setEditForm({ ...currentMaterial });
    } else {
      setEditForm(null);
    }
    setIsEditing(false);
  }, [selectedMaterialId, materials]);

  // Helper to get Supplier Name by ID
  const getSupplierName = (id: string): string => {
    const found = suppliers.find(s => s.id === id);
    return found ? found.name : 'Fornecedor não encontrado';
  };

  // Helper to render stars or percentage for rankings
  const renderRankingValue = (rating: number) => {
    return (
      <div className="flex items-center gap-1">
        <span className="font-bold text-primary font-mono">{rating}%</span>
        <div className="flex text-amber-500">
          {Array.from({ length: 5 }).map((_, i) => {
            const starValue = (i + 1) * 20;
            return (
              <Star
                key={i}
                size={11}
                className={rating >= starValue ? "fill-amber-500" : rating >= starValue - 10 ? "fill-amber-500/50" : "text-outline-variant"}
              />
            );
          })}
        </div>
      </div>
    );
  };

  // Filter raw materials
  const filteredMaterials = materials.filter(m => {
    const query = searchTerm.toLowerCase();
    const primarySupplier = getSupplierName(m.supplierId).toLowerCase();
    return m.description.toLowerCase().includes(query) || 
           m.id.toLowerCase().includes(query) || 
           primarySupplier.includes(query);
  });

  const handleStartAddNew = () => {
    const nextCodeNum = materials.length + 1;
    const autoCode = `MP-${nextCodeNum.toString().padStart(3, '0')}`;
    setNewMat({
      id: autoCode,
      description: '',
      purchaseUnit: 'Kg',
      supplierId: suppliers.length > 0 ? suppliers[0].id : '',
      lastPurchaseDate: new Date().toISOString().substring(0, 10),
      lastPurchasePrice: 0,
      lastPurchaseQty: 0,
      currentStock: 0,
      supplierRankings: []
    });
    setIsAddingNew(true);
  };

  const handleCreateMaterial = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMat.id || !newMat.description || !newMat.supplierId) {
      alert('Por favor, preencha o Código, Descrição e Fornecedor Principal.');
      return;
    }

    // Check code duplication
    if (materials.some(m => m.id === newMat.id)) {
      alert(`Já existe uma matéria-prima cadastrada com o código ${newMat.id}.`);
      return;
    }

    const created: RawMaterial = {
      id: newMat.id,
      description: newMat.description,
      purchaseUnit: newMat.purchaseUnit as 'Kg' | 'Litro' | 'Metro',
      supplierId: newMat.supplierId,
      lastPurchaseDate: newMat.lastPurchaseDate || '',
      lastPurchasePrice: Number(newMat.lastPurchasePrice) || 0,
      lastPurchaseQty: Number(newMat.lastPurchaseQty) || 0,
      currentStock: Number(newMat.currentStock) || 0,
      supplierRankings: []
    };

    const updatedList = [...materials, created];
    setMaterials(updatedList);
    setSelectedMaterialId(created.id);
    setIsAddingNew(false);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editForm) return;

    if (!editForm.description || !editForm.supplierId) {
      alert('Por favor, preencha a Descrição e o Fornecedor Principal.');
      return;
    }

    const updatedList = materials.map(m => m.id === editForm.id ? editForm : m);
    setMaterials(updatedList);
    setIsEditing(false);
  };

  const handleDeleteMaterial = (id: string) => {
    if (confirm('Deseja realmente excluir esta matéria-prima?')) {
      const updatedList = materials.filter(m => m.id !== id);
      setMaterials(updatedList);
      if (selectedMaterialId === id && updatedList.length > 0) {
        setSelectedMaterialId(updatedList[0].id);
      } else if (updatedList.length === 0) {
        setSelectedMaterialId('');
      }
    }
  };

  // Supplier Rankings Sub-Form Actions
  const handleAddRanking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentMaterial || !newRanking.supplierId) return;

    // Check if supplier ranking already exists
    if (currentMaterial.supplierRankings.some(r => r.supplierId === newRanking.supplierId)) {
      alert('Já existe um ranking cadastrado para este fornecedor nesta matéria-prima.');
      return;
    }

    const added: RawMaterialSupplierRating = {
      supplierId: newRanking.supplierId,
      averagePrice: Number(newRanking.averagePrice) || 0,
      punctualityRating: Number(newRanking.punctualityRating) || 90,
      qualityRating: Number(newRanking.qualityRating) || 90
    };

    const updatedRankings = [...currentMaterial.supplierRankings, added];
    
    // Sort rankings by lowest average price or highest quality
    updatedRankings.sort((a, b) => a.averagePrice - b.averagePrice);

    const updatedMaterial: RawMaterial = {
      ...currentMaterial,
      supplierRankings: updatedRankings
    };

    setMaterials(materials.map(m => m.id === currentMaterial.id ? updatedMaterial : m));
    setIsRankingModalOpen(false);
    
    // Reset form
    setNewRanking({
      supplierId: '',
      averagePrice: 0,
      punctualityRating: 90,
      qualityRating: 90
    });
  };

  const handleDeleteRanking = (supplierId: string) => {
    if (!currentMaterial) return;

    if (confirm('Deseja remover este fornecedor do ranking desta matéria-prima?')) {
      const updatedRankings = currentMaterial.supplierRankings.filter(r => r.supplierId !== supplierId);
      const updatedMaterial: RawMaterial = {
        ...currentMaterial,
        supplierRankings: updatedRankings
      };
      setMaterials(materials.map(m => m.id === currentMaterial.id ? updatedMaterial : m));
    }
  };

  return (
    <div className="space-y-6" id="materias-primas-screen-container">
      {/* Title Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-outline-variant pb-5">
        <div>
          <h2 className="text-xl font-black text-primary tracking-tight">CADASTRO E GESTÃO DE MATÉRIAS-PRIMAS</h2>
          <p className="text-xs text-outline font-medium">Controle de especificações de insumos, histórico de aquisição e ranking comparativo de fornecedores.</p>
        </div>
        <button
          onClick={handleStartAddNew}
          className="flex items-center gap-2 bg-secondary hover:bg-secondary/95 text-white font-bold py-2.5 px-4 rounded-xl text-xs tracking-wider transition-all shadow-sm cursor-pointer"
        >
          <Plus size={16} />
          CADASTRAR MATÉRIA-PRIMA
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: List of Raw Materials */}
        <div className="lg:col-span-4 bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <div className="flex items-center gap-2 bg-surface-container-low px-3 py-2 rounded-xl border border-outline-variant/60">
            <Search size={16} className="text-outline" />
            <input
              type="text"
              placeholder="Buscar matéria-prima ou código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none text-xs focus:outline-none w-full text-primary"
            />
          </div>

          <div className="space-y-2 overflow-y-auto max-h-[600px] pr-1">
            {filteredMaterials.length === 0 ? (
              <p className="text-xs text-center text-outline py-8">Nenhuma matéria-prima encontrada.</p>
            ) : (
              filteredMaterials.map(m => {
                const isSelected = m.id === selectedMaterialId && !isAddingNew;
                return (
                  <div
                    key={m.id}
                    onClick={() => {
                      setSelectedMaterialId(m.id);
                      setIsAddingNew(false);
                    }}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                      isSelected
                        ? 'bg-primary-container/25 border-primary text-primary font-medium'
                        : 'bg-surface-bright hover:bg-surface-container-low border-outline-variant/60'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-primary text-white' : 'bg-surface-container-high text-primary'
                      }`}>
                        <Layers size={14} />
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-bold text-left line-clamp-1">{m.description}</span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-outline text-left">
                          <span className="font-mono bg-surface-container px-1 py-0.2 rounded text-outline font-bold">{m.id}</span>
                          <span>•</span>
                          <span>Un: {m.purchaseUnit}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end shrink-0 pl-2">
                      <span className="text-[10px] bg-secondary-container/30 text-on-secondary-container px-1.5 py-0.5 rounded font-bold">
                        {m.currentStock.toLocaleString()} {m.purchaseUnit}
                      </span>
                      <ChevronRight size={14} className="text-outline mt-1" />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Detailed View & Forms */}
        <div className="lg:col-span-8 space-y-6">
          
          {isAddingNew ? (
            /* ================= CREATE RAW MATERIAL FORM ================= */
            <form onSubmit={handleCreateMaterial} className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-6">
              <div className="flex justify-between items-center border-b border-outline-variant pb-4">
                <div className="flex items-center gap-2 text-primary">
                  <Plus size={20} className="text-secondary" />
                  <div>
                    <h3 className="text-base font-bold">Novo Cadastro de Matéria-Prima</h3>
                    <p className="text-xs text-outline">Insira as informações técnicas para integrar este insumo ao sistema.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="p-2 hover:bg-surface-container rounded-full text-outline hover:text-primary transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* PRIMEIRO BLOCO: Dados e Unidade de Compra */}
              <div className="space-y-4">
                <h4 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Sliders size={13} />
                  <span>1. Especificações Iniciais</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                  <div className="md:col-span-3">
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Código</label>
                    <input
                      type="text"
                      required
                      value={newMat.id}
                      onChange={(e) => setNewMat({ ...newMat, id: e.target.value.toUpperCase() })}
                      placeholder="Ex: MP-004"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div className="md:col-span-9">
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Descrição / Nome do Insumo</label>
                    <input
                      type="text"
                      required
                      value={newMat.description}
                      onChange={(e) => setNewMat({ ...newMat, description: e.target.value })}
                      placeholder="Ex: Resina Polietileno de Alta Densidade (HDPE)"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Unidade de Compra</label>
                    <select
                      value={newMat.purchaseUnit}
                      onChange={(e) => setNewMat({ ...newMat, purchaseUnit: e.target.value as 'Kg' | 'Litro' | 'Metro' })}
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="Kg">Kg (Quilograma)</option>
                      <option value="Litro">Litro</option>
                      <option value="Metro">Metro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Fornecedor Principal</label>
                    <select
                      value={newMat.supplierId}
                      required
                      onChange={(e) => setNewMat({ ...newMat, supplierId: e.target.value })}
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    >
                      <option value="" disabled>Selecione um fornecedor homologado...</option>
                      {suppliers.map(sup => (
                        <option key={sup.id} value={sup.id}>
                          {sup.name} ({sup.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* SEGUNDO BLOCO: Histórico Inicial */}
              <div className="space-y-4 pt-4 border-t border-outline-variant/60">
                <h4 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={13} />
                  <span>2. Histórico de Estoque & Última Compra</span>
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Última Compra</label>
                    <input
                      type="date"
                      value={newMat.lastPurchaseDate}
                      onChange={(e) => setNewMat({ ...newMat, lastPurchaseDate: e.target.value })}
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">R$ Última Compra (Unitário)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-2.5 text-xs text-outline">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        value={newMat.lastPurchasePrice || ''}
                        onChange={(e) => setNewMat({ ...newMat, lastPurchasePrice: Number(e.target.value) })}
                        placeholder="0.00"
                        className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 pl-8 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Qtd Última Compra</label>
                    <input
                      type="number"
                      value={newMat.lastPurchaseQty || ''}
                      onChange={(e) => setNewMat({ ...newMat, lastPurchaseQty: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-outline uppercase mb-1">Estoque Atual ({newMat.purchaseUnit})</label>
                    <input
                      type="number"
                      value={newMat.currentStock || ''}
                      onChange={(e) => setNewMat({ ...newMat, currentStock: Number(e.target.value) })}
                      placeholder="0"
                      className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsAddingNew(false)}
                  className="bg-surface-container-high hover:bg-surface-container-highest text-primary font-bold py-2.5 px-5 rounded-xl text-xs transition-colors cursor-pointer"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  className="bg-secondary hover:bg-secondary/95 text-white font-bold py-2.5 px-5 rounded-xl text-xs tracking-wider transition-all shadow-sm cursor-pointer"
                >
                  GRAVAR MATÉRIA-PRIMA
                </button>
              </div>
            </form>
          ) : currentMaterial ? (
            /* ================= DETAIL PROFILE VIEW ================= */
            <div className="space-y-6">
              
              {/* Material Top Header Box */}
              <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-secondary text-white flex items-center justify-center text-lg font-black shadow-inner">
                    <Layers size={24} />
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-extrabold text-primary text-left leading-tight">{currentMaterial.description}</h3>
                    </div>
                    <p className="text-xs text-outline font-medium flex items-center gap-2">
                      <span className="font-mono bg-surface-container px-2 py-0.5 rounded text-outline font-bold">{currentMaterial.id}</span>
                      <span>•</span>
                      <span>Unidade de Compra: <strong className="text-primary">{currentMaterial.purchaseUnit}</strong></span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (editForm) {
                        setIsEditing(!isEditing);
                      }
                    }}
                    className={`flex items-center gap-1.5 font-bold py-2 px-3.5 rounded-xl text-xs transition-all cursor-pointer border ${
                      isEditing 
                        ? 'bg-primary border-primary text-white hover:brightness-110' 
                        : 'bg-surface-bright border-outline-variant/80 text-primary hover:bg-surface-container-low'
                    }`}
                  >
                    {isEditing ? <Check size={14} /> : <Edit3 size={14} />}
                    {isEditing ? 'Visualizar' : 'Editar Dados'}
                  </button>
                  
                  <button
                    onClick={() => handleDeleteMaterial(currentMaterial.id)}
                    className="p-2 bg-error-container/20 hover:bg-error-container text-on-error-container rounded-xl transition-colors cursor-pointer"
                    title="Excluir Matéria-Prima"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Main Content Fields: Block 1 & 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                {/* FIRST BLOCK: Dados do Cadastro */}
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs space-y-4">
                  <div className="flex justify-between items-center border-b border-surface-container pb-2">
                    <h4 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <Sliders size={14} className="text-secondary" />
                      <span>Bloco 1: Especificações</span>
                    </h4>
                  </div>

                  {isEditing && editForm ? (
                    <div className="space-y-3.5 text-xs">
                      <div>
                        <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Descrição</label>
                        <input
                          type="text"
                          required
                          value={editForm.description}
                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                          className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Unidade de Compra</label>
                          <select
                            value={editForm.purchaseUnit}
                            onChange={(e) => setEditForm({ ...editForm, purchaseUnit: e.target.value as 'Kg' | 'Litro' | 'Metro' })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                          >
                            <option value="Kg">Kg</option>
                            <option value="Litro">Litro</option>
                            <option value="Metro">Metro</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Fornecedor Principal</label>
                          <select
                            value={editForm.supplierId}
                            onChange={(e) => setEditForm({ ...editForm, supplierId: e.target.value })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none text-[11px]"
                          >
                            {suppliers.map(sup => (
                              <option key={sup.id} value={sup.id}>{sup.name}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm({ ...currentMaterial });
                            setIsEditing(false);
                          }}
                          className="px-3 py-1.5 bg-surface-container rounded-lg text-[11px] font-bold"
                        >
                          Descartar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 bg-secondary text-white rounded-lg text-[11px] font-bold"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      <div>
                        <span className="block text-[10px] font-bold text-outline uppercase text-left">Insumo</span>
                        <span className="font-semibold text-primary block text-left">{currentMaterial.description}</span>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase text-left">Código do Sistema</span>
                          <span className="font-mono font-bold text-primary block text-left">{currentMaterial.id}</span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase text-left">Unidade de Medida</span>
                          <span className="font-bold text-primary block text-left">{currentMaterial.purchaseUnit}</span>
                        </div>
                      </div>

                      <div>
                        <span className="block text-[10px] font-bold text-outline uppercase text-left">Fornecedor Principal homologado</span>
                        <div className="flex items-center gap-2 mt-1">
                          <Building size={14} className="text-secondary" />
                          <span className="font-semibold text-primary block text-left">
                            {getSupplierName(currentMaterial.supplierId)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* SECOND BLOCK: Histórico de Consumo/Estoque */}
                <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs space-y-4">
                  <div className="flex justify-between items-center border-b border-surface-container pb-2">
                    <h4 className="text-xs font-black text-secondary uppercase tracking-wider flex items-center gap-1.5">
                      <TrendingUp size={14} className="text-secondary" />
                      <span>Bloco 2: Histórico & Estoque</span>
                    </h4>
                  </div>

                  {isEditing && editForm ? (
                    <div className="space-y-3.5 text-xs">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Última Compra</label>
                          <input
                            type="date"
                            value={editForm.lastPurchaseDate}
                            onChange={(e) => setEditForm({ ...editForm, lastPurchaseDate: e.target.value })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">R$ Última Compra</label>
                          <input
                            type="number"
                            step="0.01"
                            value={editForm.lastPurchasePrice}
                            onChange={(e) => setEditForm({ ...editForm, lastPurchasePrice: Number(e.target.value) })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Qtd Última compra</label>
                          <input
                            type="number"
                            value={editForm.lastPurchaseQty}
                            onChange={(e) => setEditForm({ ...editForm, lastPurchaseQty: Number(e.target.value) })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-bold text-outline uppercase mb-0.5">Estoque Atual ({editForm.purchaseUnit})</label>
                          <input
                            type="number"
                            value={editForm.currentStock}
                            onChange={(e) => setEditForm({ ...editForm, currentStock: Number(e.target.value) })}
                            className="w-full bg-surface-bright border border-outline-variant rounded-lg p-2 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setEditForm({ ...currentMaterial });
                            setIsEditing(false);
                          }}
                          className="px-3 py-1.5 bg-surface-container rounded-lg text-[11px] font-bold"
                        >
                          Descartar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveEdit}
                          className="px-3 py-1.5 bg-secondary text-white rounded-lg text-[11px] font-bold"
                        >
                          Salvar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 text-xs">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase text-left">Data Última Compra</span>
                          <span className="font-semibold text-primary block text-left">
                            {currentMaterial.lastPurchaseDate ? currentMaterial.lastPurchaseDate.split('-').reverse().join('/') : 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase text-left">Valor Unitário</span>
                          <span className="font-semibold font-mono text-primary block text-left">
                            R$ {currentMaterial.lastPurchasePrice.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase text-left">Quantidade Comprada</span>
                          <span className="font-semibold text-primary block text-left">
                            {currentMaterial.lastPurchaseQty.toLocaleString()} {currentMaterial.purchaseUnit}
                          </span>
                        </div>
                        <div>
                          <span className="block text-[10px] font-bold text-outline uppercase text-left text-secondary font-black">Estoque Físico Atual</span>
                          <span className="text-sm font-black text-secondary block text-left flex items-center gap-1.5 mt-0.5">
                            <Package size={14} />
                            {currentMaterial.currentStock.toLocaleString()} {currentMaterial.purchaseUnit}
                          </span>
                        </div>
                      </div>

                      <div className="bg-surface-container/30 px-3.5 py-2.5 rounded-xl border border-outline-variant/40">
                        <span className="block text-[9px] font-bold text-outline uppercase text-left">Valor do Estoque imobilizado</span>
                        <span className="text-xs font-black text-primary font-mono block text-left mt-0.5">
                          R$ {(currentMaterial.currentStock * currentMaterial.lastPurchasePrice).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* THIRD BLOCK: Ranking de Fornecedores */}
              <div className="bg-surface-container-lowest p-5 rounded-2xl border border-outline-variant shadow-xs space-y-4">
                <div className="flex justify-between items-center border-b border-surface-container pb-3">
                  <div className="flex items-center gap-2">
                    <Award size={15} className="text-amber-500" />
                    <div className="text-left">
                      <h4 className="text-xs font-black text-primary uppercase tracking-wider">
                        Bloco 3: Ranking comparativo de Fornecedores
                      </h4>
                      <p className="text-[10px] text-outline font-medium">Fornecedores habilitados para cotação e notas de auditoria.</p>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      // Pre-fill selection
                      const remainingSuppliers = suppliers.filter(s => !currentMaterial.supplierRankings.some(r => r.supplierId === s.id));
                      setNewRanking({
                        supplierId: remainingSuppliers.length > 0 ? remainingSuppliers[0].id : '',
                        averagePrice: currentMaterial.lastPurchasePrice,
                        punctualityRating: 90,
                        qualityRating: 90
                      });
                      setIsRankingModalOpen(true);
                    }}
                    className="flex items-center gap-1 bg-surface-container hover:bg-surface-container-high text-primary font-bold py-1.5 px-3 rounded-lg text-[10px] tracking-wide transition-all border border-outline-variant cursor-pointer"
                  >
                    <Plus size={12} />
                    ADICIONAR AO COMPARATIVO
                  </button>
                </div>

                {currentMaterial.supplierRankings.length === 0 ? (
                  <div className="text-center py-8 bg-surface-container/10 rounded-xl border border-dashed border-outline-variant/60">
                    <Award size={24} className="text-outline-variant mx-auto mb-2" />
                    <p className="text-xs text-outline">Nenhum fornecedor cadastrado no ranking desta matéria-prima.</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-outline-variant text-[10px] font-black text-outline uppercase tracking-wider">
                          <th className="py-2.5">Fornecedor</th>
                          <th className="py-2.5">Preço Médio</th>
                          <th className="py-2.5">Pontualidade</th>
                          <th className="py-2.5">Qualidade</th>
                          <th className="py-2.5 text-right">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-outline-variant/40">
                        {currentMaterial.supplierRankings.map((ranking, index) => {
                          const isPrimary = ranking.supplierId === currentMaterial.supplierId;
                          return (
                            <tr key={ranking.supplierId} className="hover:bg-surface-container/10 transition-colors">
                              <td className="py-3 pr-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="font-bold text-primary">{getSupplierName(ranking.supplierId)}</span>
                                    {isPrimary && (
                                      <span className="text-[8px] bg-secondary/15 text-secondary font-black px-1 rounded uppercase tracking-wider shrink-0">
                                        Principal
                                      </span>
                                    )}
                                  </div>
                                  <span className="font-mono text-[9px] text-outline bg-surface-container px-1 py-0.2 rounded font-bold">
                                    {ranking.supplierId}
                                  </span>
                                </div>
                              </td>
                              <td className="py-3 font-mono font-bold text-primary">
                                R$ {ranking.averagePrice.toFixed(2)}
                              </td>
                              <td className="py-3">
                                {renderRankingValue(ranking.punctualityRating)}
                              </td>
                              <td className="py-3">
                                {renderRankingValue(ranking.qualityRating)}
                              </td>
                              <td className="py-3 text-right">
                                <button
                                  onClick={() => handleDeleteRanking(ranking.supplierId)}
                                  className="p-1.5 hover:bg-error-container/20 text-outline hover:text-error rounded-md transition-all cursor-pointer"
                                  title="Remover Fornecedor"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-surface-container-lowest border border-outline-variant rounded-2xl p-12 text-center">
              <p className="text-xs text-outline">Selecione uma matéria-prima na barra lateral ou cadastre uma nova para detalhar.</p>
            </div>
          )}
        </div>
      </div>

      {/* ================= MODAL SUB-FORM: ADD SUPPLIER TO COMPARATIVE RANKINGS ================= */}
      {isRankingModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-outline-variant shadow-xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center border-b border-outline-variant p-4 bg-surface-container-low">
              <div className="flex items-center gap-2">
                <Award size={16} className="text-amber-500" />
                <h4 className="text-xs font-black text-primary uppercase tracking-wider">Habilitar Fornecedor</h4>
              </div>
              <button
                onClick={() => setIsRankingModalOpen(false)}
                className="p-1 hover:bg-surface-container rounded-full text-outline hover:text-primary transition-all cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleAddRanking} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-outline uppercase mb-1">Selecionar Fornecedor</label>
                <select
                  value={newRanking.supplierId}
                  required
                  onChange={(e) => setNewRanking({ ...newRanking, supplierId: e.target.value })}
                  className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none"
                >
                  <option value="" disabled>Selecione um fornecedor para ranquear...</option>
                  {suppliers
                    .filter(s => !currentMaterial?.supplierRankings.some(r => r.supplierId === s.id))
                    .map(sup => (
                      <option key={sup.id} value={sup.id}>
                        {sup.name} ({sup.id})
                      </option>
                    ))}
                </select>
                {suppliers.filter(s => !currentMaterial?.supplierRankings.some(r => r.supplierId === s.id)).length === 0 && (
                  <p className="text-[10px] text-error mt-1 font-semibold">Todos os fornecedores homologados já estão ranqueados.</p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-outline uppercase mb-1">Preço Médio Praticado</label>
                <div className="relative">
                  <span className="absolute left-2.5 top-2.5 text-xs text-outline">R$</span>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={newRanking.averagePrice || ''}
                    onChange={(e) => setNewRanking({ ...newRanking, averagePrice: Number(e.target.value) })}
                    placeholder="0.00"
                    className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 pl-8 text-primary focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-outline uppercase mb-1">Pontualidade (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={newRanking.punctualityRating}
                    onChange={(e) => setNewRanking({ ...newRanking, punctualityRating: Number(e.target.value) })}
                    className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none"
                  />
                  <span className="text-[9px] text-outline">Nota de 0 a 100</span>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-outline uppercase mb-1">Qualidade (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={newRanking.qualityRating}
                    onChange={(e) => setNewRanking({ ...newRanking, qualityRating: Number(e.target.value) })}
                    className="w-full text-xs bg-surface-bright border border-outline-variant rounded-lg p-2.5 text-primary focus:outline-none"
                  />
                  <span className="text-[9px] text-outline">Nota de 0 a 100</span>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-outline-variant">
                <button
                  type="button"
                  onClick={() => setIsRankingModalOpen(false)}
                  className="px-4 py-2 bg-surface-container rounded-lg font-bold hover:bg-surface-container-high transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!newRanking.supplierId}
                  className="px-4 py-2 bg-secondary text-white font-bold rounded-lg hover:bg-secondary/95 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Adicionar ao Comparativo
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
