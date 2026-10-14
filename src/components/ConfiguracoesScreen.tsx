"use client"

import React, { useState, useEffect } from 'react'
import { createClient } from '@/utils/supabase/client'
import LoadingOverlay from './LoadingOverlay'
import ButtonSpinner from './ButtonSpinner'

export default function ConfiguracoesScreen() {
  const supabase = createClient()
  const [loading, setLoading] = useState(true)

  // Dados da Empresa
  const [empresaId, setEmpresaId] = useState<string | null>(null)
  const [empresaNome, setEmpresaNome] = useState('')
  const [empresaCnpj, setEmpresaCnpj] = useState('')
  const [empresaStatus, setEmpresaStatus] = useState('')
  
  // Senha
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // UI States
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 4000)
  }

  // Carregar dados da empresa
  const loadData = async () => {
    try {
      setLoading(true)
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Buscar a empresa vinculada ao usuário
      const { data: profile } = await supabase
        .from('usuarios')
        .select('empresa_id')
        .eq('id', user.id)
        .maybeSingle()

      const empId = profile?.empresa_id

      if (empId) {
        setEmpresaId(empId)
        const { data: empData } = await supabase
          .from('empresas')
          .select('*')
          .eq('id', empId)
          .single()

        if (empData) {
          setEmpresaNome(empData.nome)
          setEmpresaCnpj(empData.cnpj || '')
          setEmpresaStatus(empData.status_assinatura || 'ATIVO')
        }
      }
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Salvar dados da empresa
  const handleSaveEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!empresaId) return
    setActionLoading(true)

    const { error } = await supabase
      .from('empresas')
      .update({
        nome: empresaNome,
        cnpj: empresaCnpj
      })
      .eq('id', empresaId)

    if (error) {
      showMsg(`Erro ao salvar empresa: ${error.message}`, 'error')
    } else {
      showMsg('Dados da empresa atualizados com sucesso!')
      await loadData()
    }
    setActionLoading(false)
  }

  // Alterar Senha de Acesso
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPassword) return

    if (newPassword !== confirmPassword) {
      showMsg('A confirmação de senha não coincide.', 'error')
      return
    }

    if (newPassword.length < 6) {
      showMsg('A senha deve ter pelo menos 6 caracteres.', 'error')
      return
    }

    setActionLoading(true)

    const { error } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (error) {
      showMsg(`Erro ao alterar senha: ${error.message}`, 'error')
    } else {
      showMsg('Sua senha de acesso foi alterada com sucesso!')
      setNewPassword('')
      setConfirmPassword('')
    }
    setActionLoading(false)
  }

  if (loading) {
    return <LoadingOverlay message="Carregando Configurações..." />;
  }

  return (
    <div className="space-y-6">
      {/* Header com mensagens */}
      <div className="flex justify-between items-center border-b border-outline-variant pb-4">
        <div>
          <h3 className="text-base font-bold text-primary">Configurações do Sistema</h3>
          <p className="text-xs text-outline">KORE INDUSTRIAL v1.0.0 (Módulo Core & ERP)</p>
        </div>
        {msg.text && (
          <span className={`text-xs px-3 py-1.5 rounded-lg font-bold border ${
            msg.type === 'error' ? 'bg-red-50 text-red-600 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
          }`}>
            {msg.text}
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Painel do Perfil da Empresa */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-2 border-b pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined notranslate text-sm">business</span>
            Dados da Empresa
          </h4>

          {empresaId ? (
            <form onSubmit={handleSaveEmpresa} className="space-y-4">
              <div>
                <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Razão Social</label>
                <input
                  type="text"
                  required
                  value={empresaNome}
                  onChange={(e) => setEmpresaNome(e.target.value)}
                  className="w-full bg-surface-container-low text-xs px-3 py-2.5 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">CNPJ</label>
                  <input
                    type="text"
                    required
                    value={empresaCnpj}
                    onChange={(e) => setEmpresaCnpj(e.target.value)}
                    className="w-full bg-surface-container-low text-xs px-3 py-2.5 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Assinatura SaaS</label>
                  <div className={`w-full text-xs px-3 py-2.5 rounded-lg font-bold border text-center ${
                    empresaStatus === 'ATIVO' 
                      ? 'bg-green-50 text-green-700 border-green-100' 
                      : 'bg-red-50 text-red-700 border-red-100'
                  }`}>
                    {empresaStatus}
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={actionLoading}
                className="bg-secondary hover:brightness-95 text-white text-xs font-bold py-2.5 px-6 rounded-lg transition-all cursor-pointer"
              >
                {actionLoading ? <ButtonSpinner size={16} /> : 'Salvar Alterações'}
              </button>
            </form>
          ) : (
            <p className="text-xs text-outline">Nenhuma empresa vinculada ao seu perfil.</p>
          )}
        </div>

        {/* Painel de Segurança (Alteração de Senha) */}
        <div className="bg-surface-container-lowest p-6 rounded-2xl border border-outline-variant shadow-xs space-y-4">
          <h4 className="text-xs font-black text-primary uppercase tracking-wider mb-2 border-b pb-2 flex items-center gap-2">
            <span className="material-symbols-outlined notranslate text-sm">lock</span>
            Segurança da Conta
          </h4>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div>
              <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Nova Senha</label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Mínimo de 6 caracteres"
                className="w-full bg-surface-container-low text-xs px-3 py-2.5 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase text-[#74777f] mb-1">Confirmar Nova Senha</label>
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a nova senha"
                className="w-full bg-surface-container-low text-xs px-3 py-2.5 rounded-lg border border-transparent focus:border-secondary focus:bg-white outline-hidden"
              />
            </div>

            <button
              type="submit"
              disabled={actionLoading}
              className="bg-secondary hover:bg-secondary/95 text-white text-xs font-bold py-2.5 px-6 rounded-lg transition-all cursor-pointer"
            >
              {actionLoading ? 'Atualizando senha...' : 'Alterar Senha'}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
