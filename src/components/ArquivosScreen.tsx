"use client"

import React, { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import LoadingOverlay from './LoadingOverlay'
import { ArquivoPlanejamento } from '@/types'

export default function ArquivosScreen() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [arquivos, setArquivos] = useState<ArquivoPlanejamento[]>([])
  const [msg, setMsg] = useState({ text: '', type: '' })
  
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 4000)
  }

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  useEffect(() => {
    loadArquivos()
  }, [])

  const loadArquivos = async () => {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase.from('usuarios').select('empresa_id').eq('id', user.id).single()
      if (!profile?.empresa_id) return
      
      setEmpresaId(profile.empresa_id)

      const { data, error } = await supabase
        .from('arquivos_planejamento')
        .select('*')
        .eq('empresa_id', profile.empresa_id)
        .eq('excluido', false)
        .order('criado_em', { ascending: false })

      if (error) throw error
      setArquivos(data || [])
    } catch (err: any) {
      showMsg(`Erro ao carregar arquivos: ${err.message}`, 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !empresaId) return

    if (file.type !== 'application/pdf') {
      showMsg('Por favor, selecione um arquivo PDF.', 'error')
      return
    }

    setActionLoading(true)
    try {
      const fileName = `${Date.now()}_${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`
      const filePath = `${empresaId}/${fileName}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('arquivos_planejamento')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // Get user ID
      const { data: { user } } = await supabase.auth.getUser()

      // Insert metadata into table
      const { error: dbError } = await supabase
        .from('arquivos_planejamento')
        .insert({
          empresa_id: empresaId,
          nome_arquivo: file.name,
          storage_path: filePath,
          tamanho_bytes: file.size,
          criado_por: user?.id
        })

      if (dbError) {
        // Rollback storage if DB fails
        await supabase.storage.from('arquivos_planejamento').remove([filePath])
        throw dbError
      }

      showMsg('Arquivo enviado com sucesso!')
      loadArquivos()
    } catch (err: any) {
      showMsg(`Erro ao enviar arquivo: ${err.message}`, 'error')
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = ''
      setActionLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este arquivo?')) return

    setActionLoading(true)
    try {
      const { error } = await supabase
        .from('arquivos_planejamento')
        .update({ excluido: true })
        .eq('id', id)

      if (error) throw error

      showMsg('Arquivo excluído com sucesso!')
      loadArquivos()
    } catch (err: any) {
      showMsg(`Erro ao excluir: ${err.message}`, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleDownload = async (arquivo: ArquivoPlanejamento) => {
    setActionLoading(true)
    try {
      const { data, error } = await supabase.storage
        .from('arquivos_planejamento')
        .download(arquivo.storage_path)

      if (error) throw error
      
      // Create an object URL and trigger download
      const url = window.URL.createObjectURL(data)
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', arquivo.nome_arquivo)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
    } catch (err: any) {
      showMsg(`Erro ao baixar documento: ${err.message}`, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleOpenPdf = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('arquivos_planejamento')
        .createSignedUrl(path, 60 * 60) // 1 hour

      if (error) throw error
      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank')
      }
    } catch (err: any) {
      showMsg(`Erro ao abrir documento: ${err.message}`, 'error')
    }
  }

  if (loading) return <LoadingOverlay message="Carregando arquivos..." />
  if (actionLoading) return <LoadingOverlay message="Processando..." />

  return (
    <div className="space-y-6">
      {msg.text && (
        <div className={`p-4 rounded-xl font-bold text-sm ${msg.type === 'error' ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-green-100 text-green-800 border border-green-200'}`}>
          {msg.text}
        </div>
      )}

      <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-surface-container">
          <div>
            <h3 className="text-xl font-black text-primary">Arquivos do Planejamento</h3>
            <p className="text-sm text-outline mt-1">Gerencie plantas, especificações e relatórios em PDF.</p>
          </div>
          <div>
            <input 
              type="file" 
              accept=".pdf,application/pdf"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileUpload}
            />
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="bg-secondary text-white px-6 py-3 rounded-xl font-bold text-sm hover:brightness-95 transition-all flex items-center gap-2 cursor-pointer shadow-sm hover:shadow-md"
            >
              <span className="material-symbols-outlined notranslate">upload_file</span>
              Fazer Upload de PDF
            </button>
          </div>
        </div>

        {arquivos.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center bg-surface-container-low/50 rounded-2xl border border-dashed border-outline-variant">
            <span className="material-symbols-outlined notranslate text-6xl text-outline mb-4">folder_open</span>
            <h4 className="text-lg font-bold text-primary mb-2">Nenhum arquivo encontrado</h4>
            <p className="text-sm text-outline max-w-sm">Faça o upload do seu primeiro PDF para começar a organizar seus documentos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {arquivos.map(arquivo => (
              <div key={arquivo.id} className="bg-white border border-outline-variant rounded-2xl p-5 hover:border-secondary hover:shadow-md transition-all flex flex-col">
                <div className="flex items-start gap-4 mb-4">
                  <div className="bg-red-100 text-red-600 p-3 rounded-xl shrink-0">
                    <span className="material-symbols-outlined notranslate text-3xl">picture_as_pdf</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-primary truncate text-sm" title={arquivo.nome_arquivo}>
                      {arquivo.nome_arquivo}
                    </h4>
                    <p className="text-xs text-outline mt-1">
                      {formatBytes(arquivo.tamanho_bytes)} • {new Date(arquivo.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
                
                <div className="mt-auto pt-4 border-t border-outline-variant/50 flex flex-wrap gap-2">
                  <button 
                    onClick={() => handleOpenPdf(arquivo.storage_path)}
                    className="flex-1 min-w-[80px] bg-[#f4f3f9] hover:bg-[#e3e2e8] text-primary px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined notranslate text-[16px]">visibility</span>
                    Abrir
                  </button>
                  <button 
                    onClick={() => handleDownload(arquivo)}
                    className="flex-1 min-w-[80px] bg-secondary-container hover:bg-secondary text-on-secondary-container hover:text-white px-3 py-2 rounded-lg text-xs font-bold transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined notranslate text-[16px]">download</span>
                    Baixar
                  </button>
                  <button 
                    onClick={() => handleDelete(arquivo.id)}
                    className="flex-none bg-red-50 hover:bg-red-100 text-red-600 px-3 py-2 rounded-lg transition-colors cursor-pointer"
                    title="Excluir logicamente"
                  >
                    <span className="material-symbols-outlined notranslate text-[18px]">delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
