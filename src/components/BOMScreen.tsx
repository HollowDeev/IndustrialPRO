"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'

interface Familia {
  id: string
  nome: string
}

interface Insumo {
  id: string
  nome: string
  categoria: 'ACO' | 'QUIMICO' | 'EMBALAGEM' | 'OUTROS'
  unidade_medida: string
}

interface BOMItem {
  id?: string
  insumo_id: string
  quantidade_por_unidade: number
  percentual_blend: number | null
  insumo?: Insumo
}

export default function BOMScreen() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  // Listas de dados
  const [familias, setFamilias] = useState<Familia[]>([])
  const [insumos, setInsumos] = useState<Insumo[]>([])
  const [selectedFamiliaId, setSelectedFamiliaId] = useState<string | null>(null)
  
  // Lista local da receita (BOM) em edição
  const [bomItems, setBomItems] = useState<BOMItem[]>([])

  // Formulário - Novo Item da Receita
  const [selectedInsumoId, setSelectedInsumoId] = useState('')
  const [qtdPorUnidade, setQtdPorUnidade] = useState('1.0')
  const [pctBlend, setPctBlend] = useState('')

  // UI States
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 4000)
  }

  // Carregar dados de base
  const loadBaseData = async () => {
    setLoading(true)
    const { data: famData } = await supabase.from('familias_produto').select('id, nome').order('nome')
    const { data: insData } = await supabase.from('insumos').select('id, nome, categoria, unidade_medida').order('nome')

    if (famData) {
      setFamilias(famData)
      if (famData.length > 0 && !selectedFamiliaId) {
        setSelectedFamiliaId(famData[0].id)
      }
    }
    if (insData) {
      setInsumos(insData)
    }
    setLoading(false)
  }

  // Carregar receita da família selecionada
  const loadBOM = async (familiaId: string) => {
    const { data, error } = await supabase
      .from('bom')
      .select('id, insumo_id, quantidade_por_unidade, percentual_blend, insumos(id, nome, categoria, unidade_medida)')
      .eq('familia_id', familiaId)

    if (data) {
      // Cast do resultado para o tipo correto
      const items: BOMItem[] = data.map((item: any) => ({
        id: item.id,
        insumo_id: item.insumo_id,
        quantidade_por_unidade: Number(item.quantidade_por_unidade),
        percentual_blend: item.percentual_blend !== null ? Number(item.percentual_blend) : null,
        insumo: item.insumos
      }))
      setBomItems(items)
    }
  }

  useEffect(() => {
    loadBaseData()
  }, [])

  useEffect(() => {
    if (selectedFamiliaId) {
      loadBOM(selectedFamiliaId)
    } else {
      setBomItems([])
    }
  }, [selectedFamiliaId])

  // Adicionar ingrediente na tabela temporária local
  const handleAddLocalItem = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedInsumoId) return

    const insumo = insumos.find(i => i.id === selectedInsumoId)
    if (!insumo) return

    // Evitar duplicados locais
    if (bomItems.some(item => item.insumo_id === selectedInsumoId)) {
      showMsg('Este ingrediente já faz parte da receita.', 'error')
      return
    }

    const newItem: BOMItem = {
      insumo_id: selectedInsumoId,
      quantidade_por_unidade: parseFloat(qtdPorUnidade) || 0,
      percentual_blend: pctBlend !== '' ? parseFloat(pctBlend) : null,
      insumo
    }

    setBomItems([...bomItems, newItem])
    setSelectedInsumoId('')
    setQtdPorUnidade('1.0')
    setPctBlend('')
  }

  // Remover item local da receita
  const handleRemoveLocalItem = (index: number) => {
    setBomItems(bomItems.filter((_, idx) => idx !== index))
  }

  // Salvar a receita inteira no banco (Tratamento Atômico)
  const handleSaveRecipe = async () => {
    if (!selectedFamiliaId) return
    setActionLoading(true)

    // 1. Validar regra química: O somatório do percentual_blend dos químicos na receita deve somar exatamente 100%
    const blendQuimicos = bomItems.filter(item => item.insumo?.categoria === 'QUIMICO' && item.percentual_blend !== null)
    const somaPercentual = blendQuimicos.reduce((sum, item) => sum + (item.percentual_blend || 0), 0)

    if (blendQuimicos.length > 0 && Math.abs(somaPercentual - 100) > 0.01) {
      showMsg(`Atenção: A soma dos polímeros secos da receita é de ${somaPercentual}%. Ela deve fechar em exatamente 100%!`, 'error')
      setActionLoading(false)
      return
    }

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

    // 2. Limpar a receita antiga no banco de dados
    const { error: deleteError } = await supabase
      .from('bom')
      .delete()
      .eq('familia_id', selectedFamiliaId)

    if (deleteError) {
      showMsg(`Erro ao limpar receita antiga: ${deleteError.message}`, 'error')
      setActionLoading(false)
      return
    }

    // 3. Inserir a nova receita estruturada
    if (bomItems.length > 0) {
      const inserts = bomItems.map(item => ({
        empresa_id: empresaId,
        familia_id: selectedFamiliaId,
        insumo_id: item.insumo_id,
        quantidade_por_unidade: item.quantidade_por_unidade,
        percentual_blend: item.percentual_blend
      }))

      const { error: insertError } = await supabase.from('bom').insert(inserts)

      if (insertError) {
        showMsg(`Erro ao salvar nova receita: ${insertError.message}`, 'error')
      } else {
        showMsg('Composição da receita (BOM) salva com sucesso!')
        await loadBOM(selectedFamiliaId)
      }
    } else {
      showMsg('A receita foi limpa com sucesso!')
    }

    setActionLoading(false)
  }

  const selectedFamilia = familias.find(f => f.id === selectedFamiliaId)

  return (
    <div className="space-y-6">
      {/* Header com mensagens */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h3 className="text-base font-bold text-primary">Engenharia de Produto - BOM (Fórmulas)</h3>
          <p className="text-xs text-outline">Defina a formulação química do blend de plástico e aditivos estruturais</p>
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
        {/* Seletor de Família */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs h-fit space-y-4">
          <div>
            <span className="text-[10px] font-black uppercase text-[#74777f]">1. Selecionar Família de Extrusão</span>
            <select
              value={selectedFamiliaId || ''}
              onChange={(e) => setSelectedFamiliaId(e.target.value)}
              className="w-full mt-1.5 bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
            >
              <option value="">Selecione...</option>
              {familias.map(f => (
                <option key={f.id} value={f.id}>{f.nome}</option>
              ))}
            </select>
          </div>

          {selectedFamiliaId && (
            <div className="border-t pt-4">
              <span className="text-[10px] font-black uppercase text-[#74777f]">2. Adicionar Ingrediente / Insumo</span>
              <form onSubmit={handleAddLocalItem} className="space-y-3 mt-2">
                <div>
                  <select
                    required
                    value={selectedInsumoId}
                    onChange={(e) => setSelectedInsumoId(e.target.value)}
                    className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                  >
                    <option value="">Selecione o insumo...</option>
                    {insumos.map(i => (
                      <option key={i.id} value={i.id}>{i.nome} ({i.categoria})</option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[9px] font-black uppercase text-[#74777f] mb-1">Dosagem Nominal</label>
                    <input
                      type="number"
                      step="0.0001"
                      required
                      value={qtdPorUnidade}
                      onChange={(e) => setQtdPorUnidade(e.target.value)}
                      className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                    />
                  </div>

                  <div>
                    <label className="block text-[9px] font-black uppercase text-[#74777f] mb-1">% no Blend Seco</label>
                    <input
                      type="number"
                      step="0.1"
                      value={pctBlend}
                      onChange={(e) => setPctBlend(e.target.value)}
                      placeholder="Ex: 30"
                      className="w-full bg-surface-container-low text-xs px-3 py-2 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-secondary text-white text-xs font-bold py-2 rounded-lg transition-all hover:bg-secondary/95 cursor-pointer"
                >
                  + Inserir na Fórmula
                </button>
              </form>
            </div>
          )}
        </div>

        {/* Lado Direito - Estrutura da Fórmula (BOM) */}
        <div className="lg:col-span-2 bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-4 border-b pb-2 flex items-center justify-between">
              <span>Fórmula Química Ativa: <strong className="text-secondary">{selectedFamilia?.nome || 'Nenhuma'}</strong></span>
              <span className="text-[10px] bg-surface-container text-outline px-2 py-0.5 rounded-sm">Ficha Técnica</span>
            </h4>

            {selectedFamiliaId ? (
              <div className="space-y-4">
                <div className="overflow-hidden rounded-xl border border-outline-variant/60">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-surface-container-low font-bold text-[#74777f] uppercase text-[9px] tracking-wider border-b border-outline-variant">
                        <th className="p-3">Insumo</th>
                        <th className="p-3">Categoria</th>
                        <th className="p-3 text-center">Dosagem Nominal</th>
                        <th className="p-3 text-center">Proporção no Blend Seco</th>
                        <th className="p-3 text-center">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-outline-variant/30">
                      {bomItems.map((item, idx) => (
                        <tr key={idx} className="hover:bg-surface-container-low/40">
                          <td className="p-3 font-bold text-primary">{item.insumo?.nome}</td>
                          <td className="p-3 text-outline text-[10px]">{item.insumo?.categoria}</td>
                          <td className="p-3 text-center font-bold">
                            {item.quantidade_por_unidade} <span className="font-semibold text-outline text-[10px]">{item.insumo?.unidade_medida}</span>
                          </td>
                          <td className="p-3 text-center font-bold text-secondary">
                            {item.percentual_blend !== null ? `${item.percentual_blend}%` : '-'}
                          </td>
                          <td className="p-3 text-center">
                            <button
                              onClick={() => handleRemoveLocalItem(idx)}
                              className="text-red-500 hover:text-red-700 font-bold px-2 py-1 cursor-pointer transition-colors"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                      {bomItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-outline font-semibold">
                            Nenhum componente cadastrado nesta fórmula. Adicione os insumos à esquerda.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="text-[10px] text-outline leading-relaxed max-w-md">
                    * Componentes do tipo **QUIMICO** com percentual (%) preenchido farão parte do OEE/MRP em base de mistura de 100%. Aditivos operacionais líquidos não contam na base seca.
                  </div>
                  
                  <button
                    onClick={handleSaveRecipe}
                    disabled={actionLoading}
                    className="bg-[#002046] hover:bg-[#1b365d] text-white text-xs font-bold py-2.5 px-6 rounded-lg transition-all cursor-pointer"
                  >
                    {actionLoading ? 'Gravando Receita...' : 'Salvar Fórmula (BOM)'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 text-center text-outline bg-surface-bright rounded-xl border border-dashed">
                Selecione uma família à esquerda para carregar ou criar a sua composição química.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
