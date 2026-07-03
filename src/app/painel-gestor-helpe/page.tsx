"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Logo from '@/components/Logo'
import LoadingOverlay from '@/components/LoadingOverlay'
import Footer from '@/components/Footer'

interface Empresa {
  id: string
  nome: string
  cnpj: string
  status_assinatura: 'ATIVO' | 'SUSPENSO'
  created_at: string
}

interface Usuario {
  id: string
  nome: string
  cargo: string
  is_super_admin: boolean
  empresa_id: string | null
  empresas: { nome: string } | null
}

interface AuthLog {
  id: string
  email: string
  status: 'SUCESSO' | 'FALHA'
  ip_address: string
  user_agent: string
  dispositivo: string
  browser: string
  so: string
  cidade: string
  regiao: string
  pais: string
  created_at: string
}

export default function PainelGestorHelpe() {
  const router = useRouter()
  const supabase = createClient()
  const [activeTab, setActiveTab] = useState<'empresas' | 'usuarios' | 'logs'>('empresas')
  const [loading, setLoading] = useState(true)
  
  // States - Empresas
  const [empresas, setEmpresas] = useState<Empresa[]>([])
  const [empresaNome, setEmpresaNome] = useState('')
  const [empresaCnpj, setEmpresaCnpj] = useState('')
  
  // States - Usuarios
  const [usuarios, setUsuarios] = useState<Usuario[]>([])
  const [userNome, setUserNome] = useState('')
  const [userCargo, setUserCargo] = useState('')
  const [userEmail, setUserEmail] = useState('')
  const [userPassword, setUserPassword] = useState('')
  const [userEmpresaId, setUserEmpresaId] = useState('')

  // States - Logs
  const [logs, setLogs] = useState<AuthLog[]>([])

  // UI Message States
  const [actionLoading, setActionLoading] = useState(false)
  const [msg, setMsg] = useState({ text: '', type: '' })

  const loadData = async () => {
    setLoading(true)
    
    // Validar se o usuário logado ainda é super admin (por segurança)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/login')
      return
    }

    const { data: profile } = await supabase
      .from('usuarios')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (!profile || !profile.is_super_admin) {
      console.warn("Perfil não lido via RLS client-side, mas middleware já validou o acesso.");
    }

    try {
      const response = await fetch('/api/admin/dashboard')
      if (response.ok) {
        const data = await response.json()
        setEmpresas(data.empresas || [])
        setUsuarios(data.usuarios || [])
        setLogs(data.logs || [])
      } else {
        console.error("Falha ao carregar dados do painel:", await response.text())
      }
    } catch (err) {
      console.error("Erro na requisição do painel:", err)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const showMsg = (text: string, type: 'success' | 'error' = 'success') => {
    setMsg({ text, type })
    setTimeout(() => setMsg({ text: '', type: '' }), 5000)
  }

  // Criar nova empresa
  const handleCreateEmpresa = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)
    
    try {
      const res = await fetch('/api/admin/empresas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nome: empresaNome,
          cnpj: empresaCnpj.replace(/\D/g, ''),
          status_assinatura: 'ATIVO'
        })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      
      showMsg('Empresa cadastrada com sucesso!')
      setEmpresaNome('')
      setEmpresaCnpj('')
      await loadData()
    } catch (err: any) {
      showMsg(`Erro ao criar empresa: ${err.message}`, 'error')
    }
    setActionLoading(false)
  }

  // Alternar assinatura (Bloqueio / Desbloqueio SaaS)
  const handleToggleAssinatura = async (id: string, currentStatus: 'ATIVO' | 'SUSPENSO') => {
    const newStatus = currentStatus === 'ATIVO' ? 'SUSPENSO' : 'ATIVO'
    try {
      const res = await fetch('/api/admin/empresas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status_assinatura: newStatus })
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      showMsg(`Assinatura alterada para ${newStatus}!`)
      await loadData()
    } catch (err: any) {
      showMsg(`Erro ao alterar assinatura: ${err.message}`, 'error')
    }
  }

  // Criar novo usuário associado via API route segura
  const handleCreateUsuario = async (e: React.FormEvent) => {
    e.preventDefault()
    setActionLoading(true)

    try {
      const response = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email: userEmail,
          password: userPassword,
          nome: userNome,
          cargo: userCargo,
          empresa_id: userEmpresaId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Erro desconhecido ao criar conta')
      }

      showMsg('Usuário operacional criado com sucesso!')
      setUserNome('')
      setUserCargo('')
      setUserEmail('')
      setUserPassword('')
      setUserEmpresaId('')
      await loadData()
    } catch (err: any) {
      showMsg(err.message, 'error')
    } finally {
      setActionLoading(false)
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="min-h-screen flex w-full bg-background">
        <LoadingOverlay message="Carregando painel de controle..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex bg-[#f8f9fa] text-[#002046]">
      {/* Sidebar Administrativa */}
      <aside className="w-64 bg-white border-r border-[#e7e8e9] p-6 flex flex-col justify-between shrink-0 select-none">
        <div>
          <div className="mb-8">
            <Logo showText={true} />
            <span className="text-[10px] font-black text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full inline-block mt-2 tracking-wider uppercase">
              Super Admin
            </span>
          </div>

          <nav className="space-y-1">
            <button
              onClick={() => setActiveTab('empresas')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left uppercase tracking-wider ${
                activeTab === 'empresas'
                  ? 'bg-[#1b365d] text-white'
                  : 'text-[#74777f] hover:bg-[#f3f4f5]'
              }`}
            >
              <span className="material-symbols-outlined notranslate">factory</span>
              <span>Empresas (Tenants)</span>
            </button>

            <button
              onClick={() => setActiveTab('usuarios')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left uppercase tracking-wider ${
                activeTab === 'usuarios'
                  ? 'bg-[#1b365d] text-white'
                  : 'text-[#74777f] hover:bg-[#f3f4f5]'
              }`}
            >
              <span className="material-symbols-outlined notranslate">badge</span>
              <span>Usuários Clientes</span>
            </button>

            <button
              onClick={() => setActiveTab('logs')}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold transition-all text-left uppercase tracking-wider ${
                activeTab === 'logs'
                  ? 'bg-[#1b365d] text-white'
                  : 'text-[#74777f] hover:bg-[#f3f4f5]'
              }`}
            >
              <span className="material-symbols-outlined notranslate">history</span>
              <span>Logs de Acesso</span>
            </button>
          </nav>
        </div>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors uppercase tracking-wider text-left"
        >
          <span className="material-symbols-outlined notranslate">logout</span>
          <span>Desconectar</span>
        </button>
      </aside>

      {/* Main Area */}
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="mb-8 border-b border-[#e7e8e9] pb-4 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-black tracking-tight uppercase">Painel de Gestão SaaS</h1>
            <p className="text-xs text-[#74777f]">Configurações centrais, controle de assinaturas e provisionamento</p>
          </div>
          {msg.text && (
            <div className={`px-4 py-2.5 rounded-xl text-xs font-bold ${
              msg.type === 'error' ? 'bg-red-50 text-red-600 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'
            }`}>
              {msg.text}
            </div>
          )}
        </header>

        {activeTab === 'empresas' ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Form criar empresa */}
            <div className="bg-white p-6 rounded-3xl border border-[#e7e8e9] h-fit">
              <h3 className="text-sm font-black uppercase tracking-wider mb-4 border-b pb-2">Cadastrar Inquilino</h3>
              <form onSubmit={handleCreateEmpresa} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#74777f] mb-1">Razão Social / Nome</label>
                  <input
                    type="text"
                    required
                    value={empresaNome}
                    onChange={(e) => setEmpresaNome(e.target.value)}
                    placeholder="Ex: Alcopla Plásticos Ltda"
                    className="w-full bg-[#f3f4f5] text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-[#fc820c] focus:bg-white outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#74777f] mb-1">CNPJ (Apenas números)</label>
                  <input
                    type="text"
                    required
                    maxLength={14}
                    value={empresaCnpj}
                    onChange={(e) => setEmpresaCnpj(e.target.value)}
                    placeholder="Ex: 12345678000199"
                    className="w-full bg-[#f3f4f5] text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-[#fc820c] focus:bg-white outline-hidden transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-[#002046] hover:bg-[#1b365d] text-white text-xs font-bold py-3 rounded-xl uppercase tracking-wider transition-all cursor-pointer flex justify-center items-center"
                >
                  {actionLoading ? 'Processando...' : 'Cadastrar Empresa'}
                </button>
              </form>
            </div>

            {/* Tabela de Empresas */}
            <div className="xl:col-span-2 bg-white rounded-3xl border border-[#e7e8e9] overflow-hidden">
              <div className="p-6 border-b border-[#e7e8e9] flex justify-between items-center bg-[#fcfdfe]">
                <h3 className="text-sm font-black uppercase tracking-wider">Empresas Ativas no SaaS</h3>
                <span className="bg-[#f3f4f5] px-3 py-1 rounded-full text-xs font-bold">Total: {empresas.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f8f9fa] border-b border-[#e7e8e9] font-bold text-[#74777f] uppercase text-[10px] tracking-wider">
                      <th className="p-4">Razão Social</th>
                      <th className="p-4">CNPJ</th>
                      <th className="p-4">Data Registro</th>
                      <th className="p-4 text-center">Assinatura</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e7e8e9]">
                    {empresas.map((emp) => (
                      <tr key={emp.id} className="hover:bg-gray-50/50">
                        <td className="p-4 font-bold">{emp.nome}</td>
                        <td className="p-4 font-mono">{emp.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}</td>
                        <td className="p-4 text-[#74777f]">{new Date(emp.created_at).toLocaleDateString('pt-BR')}</td>
                        <td className="p-4 text-center">
                          <button
                            onClick={() => handleToggleAssinatura(emp.id, emp.status_assinatura)}
                            className={`px-3 py-1.5 rounded-full font-bold cursor-pointer transition-all border ${
                              emp.status_assinatura === 'ATIVO'
                                ? 'bg-green-50 text-green-700 border-green-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200 hover:after:content-["Bloquear"]'
                                : 'bg-red-50 text-red-700 border-red-200 hover:bg-green-50 hover:text-green-700 hover:border-green-200'
                            }`}
                          >
                            {emp.status_assinatura}
                          </button>
                        </td>
                      </tr>
                    ))}
                    {empresas.length === 0 && (
                      <tr>
                        <td colSpan={4} className="p-8 text-center text-[#74777f] font-semibold">Nenhuma empresa cadastrada no momento.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : activeTab === 'usuarios' ? (
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
            {/* Form criar usuario */}
            <div className="bg-white p-6 rounded-3xl border border-[#e7e8e9] h-fit">
              <h3 className="text-sm font-black uppercase tracking-wider mb-4 border-b pb-2">Provisionar Usuário</h3>
              <form onSubmit={handleCreateUsuario} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#74777f] mb-1">Nome Completo</label>
                  <input
                    type="text"
                    required
                    value={userNome}
                    onChange={(e) => setUserNome(e.target.value)}
                    placeholder="Ex: Roberto Carlos"
                    className="w-full bg-[#f3f4f5] text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-[#fc820c] focus:bg-white outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#74777f] mb-1">Cargo / Setor</label>
                  <input
                    type="text"
                    required
                    value={userCargo}
                    onChange={(e) => setUserCargo(e.target.value)}
                    placeholder="Ex: PCP Turno B"
                    className="w-full bg-[#f3f4f5] text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-[#fc820c] focus:bg-white outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#74777f] mb-1">Vincular a Empresa</label>
                  <select
                    required
                    value={userEmpresaId}
                    onChange={(e) => setUserEmpresaId(e.target.value)}
                    className="w-full bg-[#f3f4f5] text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-[#fc820c] focus:bg-white outline-hidden transition-all"
                  >
                    <option value="">Selecione uma empresa...</option>
                    {empresas.map(e => (
                      <option key={e.id} value={e.id}>{e.nome}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#74777f] mb-1">E-mail corporativo (Login)</label>
                  <input
                    type="email"
                    required
                    value={userEmail}
                    onChange={(e) => setUserEmail(e.target.value)}
                    placeholder="Ex: roberto@metalurgicabeta.com"
                    className="w-full bg-[#f3f4f5] text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-[#fc820c] focus:bg-white outline-hidden transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-[#74777f] mb-1">Senha Provisória</label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={userPassword}
                    onChange={(e) => setUserPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full bg-[#f3f4f5] text-sm px-4 py-2.5 rounded-xl border border-transparent focus:border-[#fc820c] focus:bg-white outline-hidden transition-all"
                  />
                </div>

                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full bg-[#002046] hover:bg-[#1b365d] text-white text-xs font-bold py-3 rounded-xl uppercase tracking-wider transition-all cursor-pointer flex justify-center items-center"
                >
                  {actionLoading ? 'Criando Conta...' : 'Provisionar Conta'}
                </button>
              </form>
            </div>

            {/* Tabela de Usuários */}
            <div className="xl:col-span-2 bg-white rounded-3xl border border-[#e7e8e9] overflow-hidden">
              <div className="p-6 border-b border-[#e7e8e9] flex justify-between items-center bg-[#fcfdfe]">
                <h3 className="text-sm font-black uppercase tracking-wider">Usuários Operacionais</h3>
                <span className="bg-[#f3f4f5] px-3 py-1 rounded-full text-xs font-bold">Total: {usuarios.length}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-[#f8f9fa] border-b border-[#e7e8e9] font-bold text-[#74777f] uppercase text-[10px] tracking-wider">
                      <th className="p-4">Nome</th>
                      <th className="p-4">Cargo</th>
                      <th className="p-4">Empresa Vinculada</th>
                      <th className="p-4 text-center">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#e7e8e9]">
                    {usuarios.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50/50">
                        <td className="p-4 font-bold">{user.nome}</td>
                        <td className="p-4 text-[#74777f]">{user.cargo || 'Não especificado'}</td>
                        <td className="p-4 font-bold text-[#1b365d]">
                          {user.is_super_admin ? 'Geral (SaaS)' : (user.empresas?.nome || 'Nenhuma')}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                            user.is_super_admin 
                              ? 'bg-red-50 text-red-600 border border-red-200' 
                              : 'bg-blue-50 text-blue-700 border border-blue-200'
                          }`}>
                            {user.is_super_admin ? 'SUPER ADMIN' : 'CLIENTE'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          /* Tab de Logs de Acesso */
          <div className="bg-white rounded-3xl border border-[#e7e8e9] overflow-hidden">
            <div className="p-6 border-b border-[#e7e8e9] flex justify-between items-center bg-[#fcfdfe]">
              <div>
                <h3 className="text-sm font-black uppercase tracking-wider">Histórico de Logins</h3>
                <p className="text-[10px] text-[#74777f] mt-0.5">Auditoria detalhada de todas as tentativas de login no sistema</p>
              </div>
              <span className="bg-[#f3f4f5] px-3 py-1 rounded-full text-xs font-bold">Eventos: {logs.length}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#f8f9fa] border-b border-[#e7e8e9] font-bold text-[#74777f] uppercase text-[10px] tracking-wider">
                    <th className="p-4">Data/Hora</th>
                    <th className="p-4">E-mail</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">IP</th>
                    <th className="p-4">Localização (Vercel)</th>
                    <th className="p-4">Plataforma / SO</th>
                    <th className="p-4">Navegador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#e7e8e9]">
                  {logs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50">
                      <td className="p-4 font-mono text-[11px] text-[#74777f]">
                        {new Date(log.created_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="p-4 font-bold">{log.email}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                          log.status === 'SUCESSO' 
                            ? 'bg-green-50 text-green-700 border border-green-200' 
                            : 'bg-red-50 text-red-600 border border-red-200'
                        }`}>
                          {log.status}
                        </span>
                      </td>
                      <td className="p-4 font-mono text-[#74777f]">{log.ip_address}</td>
                      <td className="p-4">
                        <span className="font-semibold">{log.cidade}</span>
                        {log.pais !== 'Localhost / Dev' && (
                          <span className="text-[#74777f] text-[10px] ml-1">({log.regiao}, {log.pais})</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className="font-semibold">{log.so}</span>
                        <span className="text-[#74777f] text-[10px] ml-1.5">({log.dispositivo})</span>
                      </td>
                      <td className="p-4 text-[#74777f]">{log.browser}</td>
                    </tr>
                  ))}
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-[#74777f] font-semibold">Nenhum log de acesso registrado ainda.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
        <div className="mt-8">
          <Footer />
        </div>
      </main>
    </div>
  )
}
