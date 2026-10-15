"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import LoadingOverlay from './LoadingOverlay'
import { calculatePreviewCustoBase } from './FormacaoPrecoScreen'

interface Familia {
  id: string
  nome: string
  geometria_base: string
  area_secao_externa: number
  densidade_g_cm3: number
  deleted_at?: string
}

interface SKU {
  id: string
  codigo: string
  comprimento_mm: number
  desconto_aco_mm: number
  preco_base_venda?: number
  familia_id: string
  deleted_at?: string
}

export default function FamiliasSkusScreen({ 
  triggerAddNew,
  tourDemoMode = false
}: { 
  triggerAddNew?: number;
  tourDemoMode?: boolean;
}) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  
  // Lista de Famílias e SKUs
  const [familias, setFamilias] = useState<Familia[]>([])
  const [selectedFamiliaId, setSelectedFamiliaId] = useState<string | null>(null)
  const [skus, setSkus] = useState<SKU[]>([])
  const [localBoms, setLocalBoms] = useState<any[]>([])
  const [localInsumos, setLocalInsumos] = useState<any[]>([])
  const [configFinanceira, setConfigFinanceira] = useState<any>(null)

  // Formulário - Nova Medida (Antiga Família)
  const [famNome, setFamNome] = useState('')
  const [famGeometria, setFamGeometria] = useState('Quadrado')
  const [dim1, setDim1] = useState('')
  const [dim2, setDim2] = useState('')
  const [famDensidade, setFamDensidade] = useState('0.95')
  const [famNcm, setFamNcm] = useState('')
  const [famClassificacao, setFamClassificacao] = useState('')

  // Formulário - Nova Família (Antiga SKU)
  const [skuComprimento, setSkuComprimento] = useState('2200')
  const [skuDescontoAco, setSkuDescontoAco] = useState('70')
  const [skuPrecoBase, setSkuPrecoBase] = useState('')
  const [editingSkuId, setEditingSkuId] = useState<string | null>(null)

  // Estado para Exclusão (Soft Delete)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [deleteEntityId, setDeleteEntityId] = useState('')
  const [deleteEntityType, setDeleteEntityType] = useState<'FAMILIA' | 'SKU'>('FAMILIA')
  const [deleteEntityName, setDeleteEntityName] = useState('')
  const [deleteReason, setDeleteReason] = useState('')

  // Efeito para preencher dados de demonstração no Tour Interativo
  useEffect(() => {
    if (tourDemoMode) {
      setFamNome('Tubo Coextrusado PEAD 32mm');
      setFamGeometria('Redondo');
      setDim1('32');
      setFamDensidade('0.95');
      setSkuComprimento('3000');
      setSkuDescontoAco('75');
      setSkuPrecoBase('28.50');
    }
  }, [tourDemoMode]);

  useEffect(() => {
    if (famGeometria === 'Quadrado') {
      const match = famNome.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
      if (match) {
        setDim1(match[1]);
        setDim2(match[2]);
      }
    } else {
      const match = famNome.match(/(\d+(?:\.\d+)?)/);
      if (match) {
        setDim1(match[1]);
      }
    }
  }, [famNome, famGeometria]);

  const getCalculatedArea = () => {
    const v1 = parseFloat(dim1) || 0;
    const v2 = parseFloat(dim2) || 0;
    if (famGeometria === 'Quadrado') {
      return (v1 * v2) / 1000000;
    } else {
      return (Math.PI * Math.pow(v1 / 2, 2)) / 1000000;
    }
  }

  // UI States
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const famNomeRef = React.useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (triggerAddNew !== undefined && triggerAddNew > 0 && famNomeRef.current) {
      famNomeRef.current.focus()
    }
  }, [triggerAddNew])

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 4000)
  }

  // Carregar dados
  const loadFamilias = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('familias_produto')
      .select('*')
      .is('deleted_at', null)
      .order('nome')

    if (error) {
      showMsg(`Erro ao carregar famílias: ${error.message}`, 'error')
    } else if (data) {
      setFamilias(data)
      if (data.length > 0 && !selectedFamiliaId) {
        setSelectedFamiliaId(data[0].id)
      }
    }
    setLoading(false)
  }

  const loadSkus = async (familiaId: string) => {
    const { data, error } = await supabase
      .from('skus')
      .select('*')
      .eq('familia_id', familiaId)
      .is('deleted_at', null)
      .order('codigo')

    if (error) {
      showMsg(`Erro ao carregar SKUs: ${error.message}`, 'error')
    } else if (data) {
      setSkus(data)
    }

    // Load BOMs for this familia
    const { data: boms } = await supabase
      .from('bom')
      .select('*')
      .eq('familia_id', familiaId)
    if (boms) setLocalBoms(boms)

    // Load all insumos (since we need them for BOM calculation)
    const { data: insumos } = await supabase
      .from('insumos')
      .select('*')
    if (insumos) setLocalInsumos(insumos)
    
    // Load config financeira to get stable margin
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single()
      if (profile?.empresa_id) {
        const { data: config } = await supabase.from('configuracoes_financeiras').select('*').eq('empresa_id', profile.empresa_id).single()
        if (config) setConfigFinanceira(config)
      }
    }
  }

  useEffect(() => {
    loadFamilias()
  }, [])

  const openDeleteModal = (id: string, type: 'FAMILIA' | 'SKU', name: string) => {
    setDeleteEntityId(id)
    setDeleteEntityType(type)
    setDeleteEntityName(name)
    setDeleteReason('')
    setDeleteModalOpen(true)
  }

  const submitDelete = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!deleteReason.trim()) {
      showMsg('O motivo da exclusão é obrigatório', 'error')
      return
    }

    setActionLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Usuário não autenticado')

      const { data: profile } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .single()

      if (!profile?.empresa_id) throw new Error('Empresa não identificada')

      // Soft Delete
      const tableName = deleteEntityType === 'FAMILIA' ? 'familias_produto' : 'skus'
      const { error: delError } = await supabase
        .from(tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', deleteEntityId)

      if (delError) throw delError

      // Log Exclusão
      const { error: logError } = await supabase
        .from('logs_exclusao')
        .insert({
          empresa_id: profile.empresa_id,
          usuario_id: user.id,
          entidade: deleteEntityType,
          entidade_id: deleteEntityId,
          nome_entidade: deleteEntityName,
          motivo: deleteReason
        })

      if (logError) throw logError

      showMsg(`${deleteEntityType === 'FAMILIA' ? 'Medida' : 'Família'} excluída com sucesso!`)
      setDeleteModalOpen(false)
      
      if (deleteEntityType === 'FAMILIA') {
        if (selectedFamiliaId === deleteEntityId) {
          setSelectedFamiliaId(null)
          setSkus([])
        }
        await loadFamilias()
      } else {
        if (selectedFamiliaId) await loadSkus(selectedFamiliaId)
      }
    } catch (err: any) {
      showMsg(`Erro ao excluir: ${err.message}`, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  useEffect(() => {
    if (selectedFamiliaId) {
      loadSkus(selectedFamiliaId)
    } else {
      setSkus([])
    }
  }, [selectedFamiliaId])

  const parsePrice = (val: string) => {
    if (!val) return 0;
    let cleaned = val.replace(/[R$\s]/gi, '');
    if (cleaned.includes('.') && cleaned.includes(',')) {
      cleaned = cleaned.replace(/\./g, '');
    }
    cleaned = cleaned.replace(',', '.');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  };

  // Salvar Família
  const handleSaveFamilia = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)

    // Buscar a empresa_id do usuário logado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    const empresaId = profile?.empresa_id

    if (!empresaId) {
      showMsg('Empresa não identificada.', 'error')
      setActionLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('familias_produto')
      .insert({
        empresa_id: empresaId,
        nome: famNome,
        geometria_base: famGeometria,
        area_secao_externa: getCalculatedArea(),
        densidade_g_cm3: parseFloat(famDensidade),
        ncm: famNcm,
        classificacao_fiscal: famClassificacao
      })
      .select()
      .single()

    if (error) {
      showMsg(`Erro ao criar família: ${error.message}`, 'error')
    } else {
      showMsg('Família de produto criada!')
      setFamNome('')
      setFamNcm('')
      setFamClassificacao('')
      await loadFamilias()
      if (data) setSelectedFamiliaId(data.id)
    }
    setActionLoading(false)
  }

  // Salvar SKU
  const handleSaveSku = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedFamiliaId) return
    setActionLoading(true)

    // Buscar a empresa_id
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: profile } = await supabase
      .from('usuarios')
      .select('empresa_id')
      .eq('id', user.id)
      .single()

    const empresaId = profile?.empresa_id

    if (!empresaId) {
      showMsg('Empresa não identificada.', 'error')
      setActionLoading(false)
      return
    }

    const medidaExtraida = selectedFamilia?.nome || 'Medida';
    const autoCodigo = `SKU-${medidaExtraida.replace(/\s+/g, '-')}-${skuComprimento}`;

    if (editingSkuId) {
      const { error } = await supabase
        .from('skus')
        .update({
          codigo: autoCodigo,
          comprimento_mm: parseInt(skuComprimento),
          desconto_aco_mm: parseInt(skuDescontoAco),
          preco_base_venda: parsePrice(skuPrecoBase)
        })
        .eq('id', editingSkuId)

      if (error) {
        showMsg(`Erro ao atualizar Família: ${error.message}`, 'error')
      } else {
        showMsg('Família atualizada com sucesso!')
        
        // Atualizar o estado localmente para refletir a mudança instantaneamente (evita cache do Next.js)
        setSkus(prev => prev.map(s => {
          if (s.id === editingSkuId) {
            return {
              ...s,
              codigo: autoCodigo,
              comprimento_mm: parseInt(skuComprimento),
              desconto_aco_mm: parseInt(skuDescontoAco),
              preco_base_venda: parsePrice(skuPrecoBase)
            }
          }
          return s;
        }))
        
        setEditingSkuId(null)
        setSkuComprimento('2200')
        setSkuDescontoAco('70')
        setSkuPrecoBase('')
        await loadSkus(selectedFamiliaId)
      }
    } else {
      const { error } = await supabase
        .from('skus')
        .insert({
          empresa_id: empresaId,
          familia_id: selectedFamiliaId,
          codigo: autoCodigo,
          comprimento_mm: parseInt(skuComprimento),
          desconto_aco_mm: parseInt(skuDescontoAco),
          preco_base_venda: parsePrice(skuPrecoBase)
        })

      if (error) {
        showMsg(`Erro ao criar variação SKU: ${error.message}`, 'error')
      } else {
        showMsg('Variação de Família cadastrada com sucesso!')
        setSkuComprimento('2200')
        setSkuDescontoAco('70')
        setSkuPrecoBase('')
        await loadSkus(selectedFamiliaId)
      }
    }
    setActionLoading(false)
  }

  if (loading) {
    return <LoadingOverlay message="Carregando Catálogo Técnico..." />;
  }

  const selectedFamilia = familias.find(f => f.id === selectedFamiliaId)

  return (
    <div className="space-y-6">
      {/* Header com mensagens de retorno */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h3 className="text-base font-bold text-primary">Engenharia de Catálogo e Família</h3>
          <p className="text-xs text-outline">Defina geometrias base, constantes físicas e variações dimensionais dos perfis</p>
        </div>
        {msg.text && (
          <span className={`text-xs px-3 py-1.5 rounded-lg font-bold border ${
            msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {msg.text}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Lado Esquerdo - Criação e Listagem de Famílias */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-4 border-b pb-2 flex items-center gap-2">
              <span className="material-symbols-outlined notranslate text-sm">category</span>
              Medidas de Produto
            </h4>
            
            <form id="tour-form-familia" onSubmit={handleSaveFamilia} className="space-y-3.5 mb-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Nome da Medida</label>
                <input
                  ref={famNomeRef}
                  type="text"
                  required
                  value={famNome}
                  onChange={(e) => setFamNome(e.target.value)}
                  placeholder="Ex: Suporte Polimérico 80x80"
                  className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Perfil Geométrico</label>
                  <select
                    value={famGeometria}
                    onChange={(e) => setFamGeometria(e.target.value)}
                    className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                  >
                    <option value="Quadrado">Quadrado / Retangular</option>
                    <option value="Redondo">Redondo / Tubular</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Densidade (g/cm³)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={famDensidade}
                    onChange={(e) => setFamDensidade(e.target.value)}
                    className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Dimensões da Seção (mm)</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={dim1}
                      onChange={(e) => setDim1(e.target.value)}
                      placeholder="Valor 1"
                      className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                    />
                    {famGeometria === 'Quadrado' && (
                      <>
                        <span className="text-xs text-outline font-bold">X</span>
                        <input
                          type="number"
                          step="0.01"
                          required
                          value={dim2}
                          onChange={(e) => setDim2(e.target.value)}
                          placeholder="Valor 2"
                          className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                        />
                      </>
                    )}
                    <span className="text-xs text-outline font-bold">mm</span>
                  </div>
                  <div className="mt-1.5 text-[10px] text-outline">
                    Área calculada: <strong className="text-primary">{getCalculatedArea().toFixed(6)} m²</strong>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pb-2">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">NCM (Fiscal)</label>
                  <input
                    type="text"
                    value={famNcm}
                    onChange={(e) => setFamNcm(e.target.value)}
                    placeholder="Ex: 3917.23.00"
                    className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Classificação</label>
                  <input
                    type="text"
                    value={famClassificacao}
                    onChange={(e) => setFamClassificacao(e.target.value)}
                    placeholder="Ex: Tubos Rígidos"
                    className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-primary hover:bg-primary-container text-white text-xs font-bold py-2 rounded-lg transition-all cursor-pointer"
              >
                {actionLoading ? 'Gravando...' : '+ Cadastrar Medida'}
              </button>
            </form>
          </div>

          {/* Listagem de Famílias cadastradas */}
          <div className="border-t pt-4 space-y-1.5 flex-1 max-h-[300px] overflow-y-auto">
            <span className="text-[10px] font-black uppercase text-[#74777f]">Medidas Ativas</span>
            {familias.map(fam => (
              <div
                key={fam.id}
                className={`p-3 rounded-xl border transition-all flex justify-between items-center group ${
                  selectedFamiliaId === fam.id
                    ? 'bg-primary-container text-on-primary-container border-secondary font-bold'
                    : 'bg-surface-bright text-primary border-outline-variant/50 hover:bg-surface-container-low'
                }`}
              >
                <div 
                  className="flex-1 cursor-pointer flex items-center justify-between"
                  onClick={() => setSelectedFamiliaId(fam.id)}
                >
                  <span>{fam.nome}</span>
                  <span className="text-[9px] uppercase bg-surface-container-high px-2 py-0.5 rounded-sm mr-2">
                    {fam.geometria_base}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); openDeleteModal(fam.id, 'FAMILIA', fam.nome) }}
                  className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer opacity-0 group-hover:opacity-100 focus:opacity-100"
                  title="Excluir Medida"
                >
                  <span className="material-symbols-outlined notranslate text-[18px] block">delete</span>
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Lado Direito - Variações SKU da Família Selecionada */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-4 border-b pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <span className="material-symbols-outlined notranslate text-sm">straighten</span>
                Famílias da Medida: <strong className="text-secondary">{selectedFamilia?.nome || 'Nenhuma'}</strong>
              </span>
              <span className="bg-surface-container text-outline px-2.5 py-0.5 rounded-sm text-[10px]">
                Total: {skus.length} Famílias
              </span>
            </h4>

            {selectedFamiliaId ? (() => {
              const previewCusto = selectedFamilia ? calculatePreviewCustoBase(
                selectedFamilia, 
                parseFloat(skuComprimento) || 0, 
                parseFloat(skuDescontoAco) || 0, 
                localBoms, 
                localInsumos
              ) : 0;
              const pv = parseFloat(skuPrecoBase);
              const previewMargem = (pv && previewCusto > 0) ? ((pv - previewCusto) / pv) * 100 : 0;
              const targetMargin = configFinanceira?.margem_alvo_estavel || 30;
              const riskMargin = configFinanceira?.margem_risco_instavel || 15;
              
              let marginColor = 'text-outline';
              let marginBg = 'bg-surface-container';
              if (pv > 0) {
                if (previewMargem >= targetMargin) {
                  marginColor = 'text-emerald-700';
                  marginBg = 'bg-emerald-100';
                } else if (previewMargem >= riskMargin) {
                  marginColor = 'text-amber-700';
                  marginBg = 'bg-amber-100';
                } else {
                  marginColor = 'text-red-700';
                  marginBg = 'bg-red-100';
                }
              }

              return (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Cadastrar SKU */}
                <div className="md:col-span-4 bg-surface-bright border border-outline-variant/60 p-4 rounded-xl h-fit">
                  <h5 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-3">Inserir Família</h5>
                  
                  <form onSubmit={handleSaveSku} className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Comprimento total (mm)</label>
                      <input
                        type="number"
                        required
                        value={skuComprimento}
                        onChange={(e) => setSkuComprimento(e.target.value)}
                        placeholder="Ex: 2200"
                        className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Desconto Técnico de Aço (mm)</label>
                      <input
                        type="number"
                        required
                        value={skuDescontoAco}
                        onChange={(e) => setSkuDescontoAco(e.target.value)}
                        placeholder="Ex: 70"
                        className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Preço de Venda Base (R$)</label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={skuPrecoBase}
                        onChange={(e) => setSkuPrecoBase(e.target.value)}
                        placeholder="Ex: 15.50"
                        className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                      />
                      {pv > 0 && (
                        <div className="mt-2 text-[10px] flex flex-col gap-1">
                          <div className="flex justify-between items-center text-outline">
                            <span>Custo BOM estimado:</span>
                            <span className="font-bold">R$ {previewCusto.toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between items-center">
                            <span className="text-outline">Margem de Lucro Bruto:</span>
                            <span className={`font-black px-1.5 py-0.5 rounded-sm ${marginColor} ${marginBg}`}>
                              {previewMargem.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full bg-secondary text-white text-xs font-bold py-2 rounded-lg transition-all hover:bg-secondary/95 cursor-pointer"
                    >
                      {actionLoading ? 'Gravando...' : editingSkuId ? 'Atualizar Família' : 'Cadastrar Família'}
                    </button>
                    {editingSkuId && (
                      <button
                        type="button"
                        disabled={actionLoading}
                        onClick={() => {
                          setEditingSkuId(null);
                          setSkuComprimento('2200');
                          setSkuDescontoAco('70');
                          setSkuPrecoBase('');
                        }}
                        className="w-full bg-surface-container-high hover:bg-surface-container-highest text-[#74777f] text-xs font-bold py-2 rounded-lg transition-all cursor-pointer mt-2"
                      >
                        Cancelar Edição
                      </button>
                    )}
                  </form>
                </div>

                {/* Listagem de SKUs */}
                <div className="md:col-span-8 overflow-hidden rounded-xl border border-outline-variant/60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low font-bold text-[#74777f] uppercase text-[9px] tracking-wider border-b border-outline-variant">
                        <th className="p-3">Família (Código e Nome)</th>
                        <th className="p-3">Comprimento</th>
                        <th className="p-3">Aço Interno</th>
                        <th className="p-3">Preço Base</th>
                        <th className="p-3 w-10"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {skus.map(sku => (
                        <tr key={sku.id} className="hover:bg-surface-container-low/40">
                          <td className="p-3 font-mono font-bold text-primary">
                            <div>{selectedFamilia?.nome} - {sku.comprimento_mm}mm</div>
                          </td>
                          <td className="p-3">{sku.comprimento_mm} mm</td>
                          <td className="p-3 font-bold text-secondary">{sku.comprimento_mm - sku.desconto_aco_mm} mm</td>
                          <td className="p-3 font-semibold text-emerald-600">
                            {Number(sku.preco_base_venda) > 0 ? `R$ ${Number(sku.preco_base_venda).toFixed(2)}` : 'Não definido'}
                          </td>
                          <td className="p-3 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingSkuId(sku.id);
                                setSkuComprimento(sku.comprimento_mm.toString());
                                setSkuDescontoAco(sku.desconto_aco_mm.toString());
                                setSkuPrecoBase(sku.preco_base_venda ? sku.preco_base_venda.toString() : '');
                              }}
                              className="p-1.5 text-blue-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer mr-1 inline-block"
                              title="Editar Família"
                            >
                              <span className="material-symbols-outlined notranslate text-[16px] block">edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => openDeleteModal(sku.id, 'SKU', `${selectedFamilia?.nome} - ${sku.comprimento_mm}mm`)}
                              className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer inline-block"
                              title="Excluir Família"
                            >
                              <span className="material-symbols-outlined notranslate text-[16px] block">delete</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {skus.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-outline font-semibold">
                            Nenhuma Família cadastrada para esta Medida.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            );})() : (
              <div className="flex-1 flex items-center justify-center p-12 text-outline bg-surface-bright rounded-xl border border-dashed">
                Selecione ou cadastre uma Medida à esquerda para ver suas Famílias.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Modal */}
      {deleteModalOpen && (
        <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-surface-container-lowest w-full max-w-md rounded-3xl shadow-2xl p-6 relative">
            <button 
              onClick={() => setDeleteModalOpen(false)}
              className="absolute top-4 right-4 text-outline hover:text-primary transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined notranslate">close</span>
            </button>
            
            <div className="mb-6 flex items-center gap-3">
              <div className="bg-red-100 text-red-600 p-2 rounded-lg">
                <span className="material-symbols-outlined notranslate">warning</span>
              </div>
              <h3 className="text-xl font-black text-primary">Confirmar Exclusão</h3>
            </div>
            
            <p className="text-sm text-on-surface-variant mb-4">
              Você está prestes a excluir {deleteEntityType === 'FAMILIA' ? 'a Medida' : 'a Família'}:
              <br/>
              <strong className="text-primary mt-1 inline-block">{deleteEntityName}</strong>
            </p>
            
            <p className="text-xs text-red-600 bg-red-50 p-3 rounded-lg border border-red-100 mb-6 font-medium">
              A exclusão é um processo lógico. Os registros antigos de produção desta {deleteEntityType === 'FAMILIA' ? 'Medida' : 'Família'} serão mantidos no sistema para fins de auditoria, mas ela deixará de aparecer em novos apontamentos ou criações de ordens.
            </p>

            <form onSubmit={submitDelete} className="space-y-4 border-t border-outline-variant/50 pt-6">
              <div>
                <label className="block text-xs font-bold text-primary uppercase tracking-wider mb-2">
                  Motivo da Exclusão (Obrigatório) *
                </label>
                <textarea 
                  required
                  rows={3}
                  value={deleteReason}
                  onChange={(e) => setDeleteReason(e.target.value)}
                  placeholder="Explique detalhadamente por que este item está sendo removido do sistema..."
                  className="w-full bg-surface-container-low border border-outline-variant rounded-xl p-3 text-sm font-medium focus:border-secondary outline-none transition-colors resize-none"
                />
              </div>
              
              <div className="pt-2 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setDeleteModalOpen(false)}
                  className="flex-1 bg-surface-container hover:bg-surface-container-high text-primary font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={actionLoading || !deleteReason.trim()}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl text-sm transition-colors cursor-pointer shadow-sm hover:shadow-md disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {actionLoading ? (
                    'Excluindo...'
                  ) : (
                    <>
                      <span className="material-symbols-outlined notranslate text-[18px]">delete</span>
                      Excluir Definitivamente
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
