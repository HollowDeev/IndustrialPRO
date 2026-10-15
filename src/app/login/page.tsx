"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image';
import ButtonSpinner from '@/components/ButtonSpinner';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';

const DEMO_EMAIL = 'testeindustrialpro@industrialpro.com';
const DEMO_PASSWORD = 'testeindustrialpro!2024';

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [isDemoModalOpen, setIsDemoModalOpen] = useState(true)
  const [copiedEmail, setCopiedEmail] = useState(false)
  const [copiedPassword, setCopiedPassword] = useState(false)
  const router = useRouter()

  const handleCopy = (text: string, type: 'email' | 'password') => {
    try {
      navigator.clipboard.writeText(text);
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedPassword(true);
        setTimeout(() => setCopiedPassword(false), 2000);
      }
    } catch (e) {
      console.warn('Erro ao copiar para clipboard', e);
    }
  };

  const handleAutoFill = () => {
    setEmail(DEMO_EMAIL);
    setPassword(DEMO_PASSWORD);
    setIsDemoModalOpen(false);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setErrorMsg('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })

      const data = await response.json()

      if (!response.ok) {
        setErrorMsg(data.error === 'Invalid login credentials'
          ? 'E-mail ou senha incorretos.'
          : (data.error || 'Erro ao realizar login'))
        setLoading(false)
        return
      }

      if (data.is_super_admin) {
        window.location.href = '/painel-gestor-helpe';
      } else {
        window.location.href = '/';
      }
    } catch (err) {
      setErrorMsg('Ocorreu um erro ao tentar realizar o login.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-between relative bg-surface-container select-none"
      style={{
        backgroundImage: "url('/bg-quadriculado.jpg')",
        backgroundRepeat: "repeat",
        backgroundSize: "500px"
      }}
    >
      {/* Absolute Bottom Left Logo */}
      <div className="absolute bottom-6 left-6 z-0 pointer-events-none" style={{ width: 250, height: 110 }}>
        <Image
          src="/kore-cor.png"
          alt="Kore Industrial Logotipo"
          fill
          className="object-contain object-left-bottom opacity-30"
          priority
        />
      </div>

      {/* Main Content Centered */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 z-10">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#e7e8e9] p-8 shadow-xs flex flex-col items-center relative">
          
          {/* Logo Kore Industrial */}
          <div className="mb-6 w-full flex justify-center">
            <Logo showText={true} className="justify-center" />
          </div>

          {/* Botão de Atalho para Reabrir Informações de Teste */}
          <button
            type="button"
            onClick={() => setIsDemoModalOpen(true)}
            className="mb-5 px-3 py-1.5 rounded-full bg-secondary/10 hover:bg-secondary/20 border border-secondary/30 text-secondary text-[11px] font-bold flex items-center gap-1.5 transition-all cursor-pointer group"
          >
            <span className="material-symbols-outlined notranslate text-[16px] group-hover:rotate-12 transition-transform">
              key
            </span>
            <span>Credenciais de Demonstração</span>
          </button>

          <div className="text-center mb-6">
            <h2 className="text-lg font-extrabold text-[#002046] tracking-tight">Login Industrial</h2>
            <p className="text-xs text-[#74777f]">Insira suas credenciais para acessar o painel operacional</p>
          </div>

          <form onSubmit={handleLogin} className="w-full space-y-4">
            {errorMsg && (
              <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 text-center animate-shake">
                {errorMsg}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#002046] uppercase mb-1.5 tracking-wider">E-mail corporativo</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="seuemail@empresa.com.br"
                className="w-full bg-[#f3f4f5] text-[#002046] text-sm px-4 py-3 rounded-xl border border-transparent outline-hidden focus:border-[#fc820c] focus:bg-white transition-all font-medium"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#002046] uppercase mb-1.5 tracking-wider">Senha de acesso</label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="••••••••"
                  className="w-full bg-[#f3f4f5] text-[#002046] text-sm px-4 py-3 rounded-xl border border-transparent outline-hidden focus:border-[#fc820c] focus:bg-white transition-all font-medium pr-12"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#74777f] hover:text-[#002046] transition-colors p-1"
                >
                  <span className="material-symbols-outlined notranslate text-[20px]">
                    {showPassword ? "visibility_off" : "visibility"}
                  </span>
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-4 bg-[#002046] text-white font-bold py-3.5 rounded-xl cursor-pointer hover:bg-[#1b365d] active:scale-[0.98] transition-all text-xs tracking-wider uppercase shadow-xs flex items-center justify-center gap-2"
            >
              {loading ? (
                <ButtonSpinner size={16} />
              ) : (
                'Entrar no Sistema'
              )}
            </button>
          </form>
        </div>
      </div>

      <Footer />

      {/* ================= MODAL DE APRESENTAÇÃO & CREDENCIAIS DE AVALIAÇÃO ================= */}
      {isDemoModalOpen && (
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-[9999999] p-4 animate-fade-in select-none">
          <div className="bg-white max-w-xl w-full rounded-3xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col animate-scale-up">
            
            {/* Header com Identidade Visual */}
            <div className="bg-[#002046] p-6 text-white flex justify-between items-start relative overflow-hidden">
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-12 h-12 rounded-2xl bg-secondary flex items-center justify-center text-white shadow-lg shrink-0">
                  <span className="material-symbols-outlined notranslate text-[28px]">verified_user</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 px-2 py-0.5 rounded-md text-white">
                      Ambiente de Avaliação
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Servidor Seguro Ativo
                    </span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-white">Demonstrativo Técnico & Portfólio</h3>
                  <p className="text-xs text-white/80">Kore Industrial • ERP & MRP Fabril</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer relative z-10"
                title="Fechar modal"
              >
                <span className="material-symbols-outlined notranslate text-[20px]">close</span>
              </button>
            </div>

            {/* Conteúdo do Modal */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto bg-surface-container-low">
              
              {/* Mensagem de Boas-Vindas */}
              <div className="bg-white p-4 rounded-2xl border border-outline-variant/70 shadow-xs text-xs text-[#334155] leading-relaxed space-y-2">
                <p className="font-semibold text-primary text-sm flex items-center gap-1.5">
                  <span>👋</span>
                  <span>Olá! Fico feliz que tenha vindo analisar o meu projeto!</span>
                </p>
                <p>
                  Esse é um <strong>ambiente de teste seguro</strong>, hospedado em um servidor dedicado com um banco de dados de teste (Supabase PostgreSQL), estruturado para apresentar a arquitetura, regras de negócio fabril e fluxo de engenharia de ponta a ponta.
                </p>
                <p className="text-[#64748b] text-[11px]">
                  Utilize as credenciais abaixo para ter acesso a um <strong>demonstrativo completo do sistema</strong>, incluindo o tour guiado e formulários com dados técnicos.
                </p>
              </div>

              {/* Card de Credenciais com Botões de Copiar */}
              <div className="bg-white p-4 rounded-2xl border border-secondary/30 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase text-secondary tracking-wider flex items-center gap-1">
                    <span className="material-symbols-outlined notranslate text-[14px]">key</span>
                    Dados de Acesso para Teste
                  </span>
                  <span className="text-[10px] font-bold text-outline">Perfil: Gestor Operacional / Admin</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Campo E-mail */}
                  <div className="bg-[#f8fafc] border border-outline-variant/60 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-[#64748b] uppercase">E-mail:</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-bold text-[#002046] text-[11px] truncate mr-2">
                        {DEMO_EMAIL}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(DEMO_EMAIL, 'email')}
                        className="px-2 py-1 rounded-md bg-white border border-outline-variant hover:border-secondary text-[10px] font-bold text-primary transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <span className="material-symbols-outlined notranslate text-[12px]">
                          {copiedEmail ? 'check' : 'content_copy'}
                        </span>
                        {copiedEmail ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>

                  {/* Campo Senha */}
                  <div className="bg-[#f8fafc] border border-outline-variant/60 rounded-xl p-3 flex flex-col justify-between">
                    <span className="text-[10px] font-bold text-[#64748b] uppercase">Senha:</span>
                    <div className="flex items-center justify-between mt-1">
                      <span className="font-mono font-bold text-[#002046] text-[11px] truncate mr-2">
                        {DEMO_PASSWORD}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleCopy(DEMO_PASSWORD, 'password')}
                        className="px-2 py-1 rounded-md bg-white border border-outline-variant hover:border-secondary text-[10px] font-bold text-primary transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <span className="material-symbols-outlined notranslate text-[12px]">
                          {copiedPassword ? 'check' : 'content_copy'}
                        </span>
                        {copiedPassword ? 'Copiado!' : 'Copiar'}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Botão de Preenchimento Automático com 1 Clique */}
                <button
                  type="button"
                  onClick={handleAutoFill}
                  className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold py-3 rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 group"
                >
                  <span className="material-symbols-outlined notranslate text-[18px] group-hover:scale-110 transition-transform">
                    bolt
                  </span>
                  <span>Preencher Credenciais Automaticamente</span>
                </button>
              </div>

              {/* Card de Aviso Legal / Proibição de Pentest */}
              <div className="bg-red-50/80 border border-red-200/90 rounded-2xl p-4 text-xs space-y-2">
                <div className="flex items-center gap-2 text-red-800 font-bold">
                  <span className="material-symbols-outlined notranslate text-[18px] text-red-600">
                    gpp_bad
                  </span>
                  <span className="text-xs uppercase tracking-wide">Aviso Legal & Restrições de Segurança</span>
                </div>
                
                <p className="text-[11px] text-red-950/90 leading-relaxed">
                  Testes de invasão (<strong>pentest</strong>), varreduras ativas de portas/vulnerabilidades, ataques de força bruta, injeção de scripts maliciosos ou tentativas de engenharia reversa <strong>NÃO estão autorizados</strong> e são estritamente proibidos neste ambiente.
                </p>

                <div className="bg-white/70 border border-red-200 rounded-lg p-2.5 text-[10px] text-red-900 leading-relaxed font-mono">
                  ⚖️ A violação não autorizada configura crime cibernético nos termos da <strong>Lei Federal nº 12.737/2012</strong> (Art. 154-A do Código Penal Brasileiro - Invasão de Dispositivo Informático) e descumprimento da <strong>Lei nº 13.709/2018 (LGPD)</strong>. Todo o tráfego de requisições e acessos à API são monitorados, auditados e armazenados com registro de data, IP e assinatura de cabeçalho.
                </div>
              </div>

            </div>

            {/* Footer */}
            <div className="p-4 bg-white border-t border-outline-variant/40 flex items-center justify-between">
              <span className="text-[11px] text-outline font-semibold">
                🔒 Ambiente restrito para análise de engenharia de software.
              </span>
              <button
                type="button"
                onClick={handleAutoFill}
                className="text-xs font-bold text-secondary hover:text-primary transition-colors cursor-pointer px-3 py-1.5 flex items-center gap-1"
              >
                <span>Acessar Demonstração</span>
                <span className="material-symbols-outlined notranslate text-[16px]">arrow_forward</span>
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  )
}
