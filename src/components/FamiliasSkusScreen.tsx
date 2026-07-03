"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import LoadingOverlay from './LoadingOverlay'

interface Familia {
  id: string
  nome: string
  geometria_base: string
  area_secao_externa: number
  volume_aco_metro: number
  densidade_g_cm3: number
}

interface SKU {
  id: string
  codigo: string
  comprimento_mm: number
  desconto_aco_mm: number
  familia_id: string
}

export default function FamiliasSkusScreen({ triggerAddNew }: { triggerAddNew?: number }) {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  
  // Lista de Famílias e SKUs
  const [familias, setFamilias] = useState<Familia[]>([])
  const [selectedFamiliaId, setSelectedFamiliaId] = useState<string | null>(null)
  const [skus, setSkus] = useState<SKU[]>([])

  // Formulário - Nova Família
  const [famNome, setFamNome] = useState('')
  const [famGeometria, setFamGeometria] = useState('Perfil Maciço')
  const [famAreaSecao, setFamAreaSecao] = useState('0.0064')
  const [famVolAco, setFamVolAco] = useState('0.0000')
  const [famDensidade, setFamDensidade] = useState('0.95')

  // Formulário - Novo SKU
  const [skuCodigo, setSkuCodigo] = useState('')
  const [skuComprimento, setSkuComprimento] = useState('2200')
  const [skuDescontoAco, setSkuDescontoAco] = useState('70')

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
      .order('codigo')

    if (error) {
      showMsg(`Erro ao carregar SKUs: ${error.message}`, 'error')
    } else if (data) {
      setSkus(data)
    }
  }

  useEffect(() => {
    loadFamilias()
  }, [])

  useEffect(() => {
    if (selectedFamiliaId) {
      loadSkus(selectedFamiliaId)
    } else {
      setSkus([])
    }
  }, [selectedFamiliaId])

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
        area_secao_externa: parseFloat(famAreaSecao),
        volume_aco_metro: parseFloat(famVolAco),
        densidade_g_cm3: parseFloat(famDensidade)
      })
      .select()
      .single()

    if (error) {
      showMsg(`Erro ao criar família: ${error.message}`, 'error')
    } else {
      showMsg('Família de produto criada!')
      setFamNome('')
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

    const { error } = await supabase
      .from('skus')
      .insert({
        empresa_id: empresaId,
        familia_id: selectedFamiliaId,
        codigo: skuCodigo,
        comprimento_mm: parseInt(skuComprimento),
        desconto_aco_mm: parseInt(skuDescontoAco)
      })

    if (error) {
      showMsg(`Erro ao criar variação SKU: ${error.message}`, 'error')
    } else {
      showMsg('Variação SKU cadastrada com sucesso!')
      setSkuCodigo('')
      await loadSkus(selectedFamiliaId)
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
          <h3 className="text-base font-bold text-primary">Engenharia de Catálogo e SKU</h3>
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
              Famílias de Produto
            </h4>
            
            <form onSubmit={handleSaveFamilia} className="space-y-3.5 mb-6">
              <div>
                <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Nome da Geometria / Família</label>
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
                  <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Geometria Base</label>
                  <select
                    value={famGeometria}
                    onChange={(e) => setFamGeometria(e.target.value)}
                    className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                  >
                    <option value="Perfil Maciço">Perfil Maciço</option>
                    <option value="Perfil Vazado">Perfil Vazado</option>
                    <option value="Perfil Coextrusado">Perfil Coextrusado</option>
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
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Área da Seção (m²)</label>
                  <input
                    type="number"
                    step="0.0001"
                    required
                    value={famAreaSecao}
                    onChange={(e) => setFamAreaSecao(e.target.value)}
                    className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Vol Aço p/ Metro (m³)</label>
                  <input
                    type="number"
                    step="0.00001"
                    required
                    value={famVolAco}
                    onChange={(e) => setFamVolAco(e.target.value)}
                    className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="w-full bg-primary hover:bg-primary-container text-white text-xs font-bold py-2 rounded-lg transition-all cursor-pointer"
              >
                {actionLoading ? 'Gravando...' : '+ Cadastrar Família'}
              </button>
            </form>
          </div>

          {/* Listagem de Famílias cadastradas */}
          <div className="border-t pt-4 space-y-1.5 flex-1 max-h-[300px] overflow-y-auto">
            <span className="text-[10px] font-black uppercase text-[#74777f]">Famílias Ativas</span>
            {familias.map(fam => (
              <div
                key={fam.id}
                onClick={() => setSelectedFamiliaId(fam.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all flex justify-between items-center ${
                  selectedFamiliaId === fam.id
                    ? 'bg-primary-container text-on-primary-container border-secondary font-bold'
                    : 'bg-surface-bright text-primary border-outline-variant/50 hover:bg-surface-container-low'
                }`}
              >
                <span>{fam.nome}</span>
                <span className="text-[9px] uppercase bg-surface-container-high px-2 py-0.5 rounded-sm">
                  {fam.geometria_base}
                </span>
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
                Variantes SKU da Família: <strong className="text-secondary">{selectedFamilia?.nome || 'Nenhuma'}</strong>
              </span>
              <span className="bg-surface-container text-outline px-2.5 py-0.5 rounded-sm text-[10px]">
                Total: {skus.length} SKUs
              </span>
            </h4>

            {selectedFamiliaId ? (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                {/* Cadastrar SKU */}
                <div className="md:col-span-4 bg-surface-bright border border-outline-variant/60 p-4 rounded-xl h-fit">
                  <h5 className="text-[11px] font-bold text-primary uppercase tracking-wider mb-3">Inserir Variação</h5>
                  
                  <form onSubmit={handleSaveSku} className="space-y-3.5">
                    <div>
                      <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Código do SKU</label>
                      <input
                        type="text"
                        required
                        value={skuCodigo}
                        onChange={(e) => setSkuCodigo(e.target.value)}
                        placeholder="Ex: SKU-8080-2200"
                        className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                      />
                    </div>

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

                    <button
                      type="submit"
                      disabled={actionLoading}
                      className="w-full bg-secondary text-white text-xs font-bold py-2 rounded-lg transition-all hover:bg-secondary/95 cursor-pointer"
                    >
                      {actionLoading ? 'Registrando...' : 'Cadastrar SKU'}
                    </button>
                  </form>
                </div>

                {/* Listagem de SKUs */}
                <div className="md:col-span-8 overflow-hidden rounded-xl border border-outline-variant/60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low font-bold text-[#74777f] uppercase text-[9px] tracking-wider border-b border-outline-variant">
                        <th className="p-3">Código</th>
                        <th className="p-3">Comprimento</th>
                        <th className="p-3">Aço Interno</th>
                        <th className="p-3">Deltas (Desconto)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {skus.map(sku => (
                        <tr key={sku.id} className="hover:bg-surface-container-low/40">
                          <td className="p-3 font-mono font-bold text-primary">{sku.codigo}</td>
                          <td className="p-3">{sku.comprimento_mm} mm</td>
                          <td className="p-3 font-bold text-secondary">{sku.comprimento_mm - sku.desconto_aco_mm} mm</td>
                          <td className="p-3 text-outline">-{sku.desconto_aco_mm} mm</td>
                        </tr>
                      ))}
                      {skus.length === 0 && (
                        <tr>
                          <td colSpan={4} className="p-6 text-center text-outline font-semibold">
                            Nenhum SKU cadastrado para esta família.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-12 text-outline bg-surface-bright rounded-xl border border-dashed">
                Selecione ou cadastre uma Família à esquerda para ver suas variações SKU.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
