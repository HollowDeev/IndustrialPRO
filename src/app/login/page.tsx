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
        <div className="fixed inset-0 bg-black/65 backdrop-blur-xs flex items-center justify-center z-[9999999] p-4 sm:p-6 animate-fade-in select-none">
          <div className="bg-white max-w-4xl w-full rounded-3xl shadow-2xl border border-outline-variant overflow-hidden flex flex-col animate-scale-up">
            
            {/* Header Panorâmico com Identidade Visual */}
            <div className="bg-[#002046] px-6 py-5 text-white flex justify-between items-center relative overflow-hidden">
              <div className="flex items-center gap-3.5 relative z-10">
                <div className="w-11 h-11 rounded-2xl bg-secondary flex items-center justify-center text-white shadow-lg shrink-0">
                  <span className="material-symbols-outlined notranslate text-[26px]">verified_user</span>
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-white/15 px-2.5 py-0.5 rounded-md text-white">
                      Ambiente de Avaliação Técnica
                    </span>
                    <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                      Servidor Seguro Ativo
                    </span>
                  </div>
                  <h3 className="text-lg font-black tracking-tight text-white">Centro de Apresentação & Portfólio</h3>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsDemoModalOpen(false)}
                className="w-9 h-9 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer relative z-10"
                title="Fechar modal"
              >
                <span className="material-symbols-outlined notranslate text-[20px]">close</span>
              </button>
            </div>

            {/* Conteúdo Disperso em 2 Colunas */}
            <div className="p-6 sm:p-7 space-y-5 max-h-[80vh] overflow-y-auto bg-surface-container-low">
              
              {/* Mensagem de Boas-Vindas Ampla */}
              <div className="bg-white p-5 rounded-2xl border border-outline-variant/70 shadow-xs text-xs text-[#334155] leading-relaxed">
                <div className="flex items-start gap-3">
                  <div className="text-2xl shrink-0">👋</div>
                  <div className="space-y-1.5">
                    <h4 className="font-bold text-primary text-sm sm:text-base">
                      Olá, fico muito feliz que tenha vindo analisar um dos meus projetos mais recentes e completos!
                    </h4>
                    <p className="text-xs sm:text-[13px] text-outline leading-relaxed">
                      Esse é um <strong>ambiente de teste seguro</strong>, em um servidor dedicado na nuvem e com um banco de dados de teste (Supabase PostgreSQL), projetado para demonstrar toda a robustez de engenharia, regras fabris avançadas (MRP I, cálculo geométrico paramétrico de perfis e esteira FIFO) e formação de preço em tempo real.
                    </p>
                  </div>
                </div>
              </div>

              {/* Grid 2 Colunas: Credenciais à Esquerda | Aviso Legal à Direita */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                
                {/* Coluna 1: Dados de Acesso (5 colunas) */}
                <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-secondary/30 shadow-xs flex flex-col justify-between space-y-4">
                  <div>
                    <div className="flex items-center justify-between mb-3 border-b border-outline-variant/40 pb-2">
                      <span className="text-[11px] font-black uppercase text-secondary tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined notranslate text-[16px]">key</span>
                        Credenciais de Demonstração
                      </span>
                      <span className="text-[10px] font-bold text-outline bg-surface-container px-2 py-0.5 rounded-md">
                        Acesso Completo
                      </span>
                    </div>

                    <p className="text-xs text-[#64748b] mb-4">
                      Utilize os dados abaixo para ingressar diretamente no sistema com o perfil de Gestor:
                    </p>

                    <div className="space-y-2.5">
                      {/* Campo E-mail */}
                      <div className="bg-[#f8fafc] border border-outline-variant/70 rounded-xl p-3 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <span className="block text-[9px] font-bold text-[#64748b] uppercase">E-mail de Teste:</span>
                          <span className="font-mono font-bold text-[#002046] text-xs truncate block select-all">
                            {DEMO_EMAIL}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(DEMO_EMAIL, 'email')}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-outline-variant hover:border-secondary text-[11px] font-bold text-primary transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                        >
                          <span className="material-symbols-outlined notranslate text-[13px]">
                            {copiedEmail ? 'check' : 'content_copy'}
                          </span>
                          {copiedEmail ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>

                      {/* Campo Senha */}
                      <div className="bg-[#f8fafc] border border-outline-variant/70 rounded-xl p-3 flex items-center justify-between">
                        <div className="min-w-0 pr-2">
                          <span className="block text-[9px] font-bold text-[#64748b] uppercase">Senha de Acesso:</span>
                          <span className="font-mono font-bold text-[#002046] text-xs truncate block select-all">
                            {DEMO_PASSWORD}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(DEMO_PASSWORD, 'password')}
                          className="px-2.5 py-1.5 rounded-lg bg-white border border-outline-variant hover:border-secondary text-[11px] font-bold text-primary transition-all cursor-pointer flex items-center gap-1 shrink-0 shadow-2xs"
                        >
                          <span className="material-symbols-outlined notranslate text-[13px]">
                            {copiedPassword ? 'check' : 'content_copy'}
                          </span>
                          {copiedPassword ? 'Copiado!' : 'Copiar'}
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Botão de Ação Rápida */}
                  <button
                    type="button"
                    onClick={handleAutoFill}
                    className="w-full bg-secondary hover:bg-secondary/90 text-white font-bold py-3.5 rounded-xl transition-all cursor-pointer text-xs uppercase tracking-wider shadow-sm flex items-center justify-center gap-2 group active:scale-[0.99]"
                  >
                    <span className="material-symbols-outlined notranslate text-[18px] group-hover:scale-110 transition-transform">
                      bolt
                    </span>
                    <span>Preencher e Acessar Automaticamente</span>
                  </button>
                </div>

                {/* Coluna 2: Aviso Legal & Proibição de Pentest (6 colunas) */}
                <div className="lg:col-span-6 bg-red-50/70 border border-red-200/90 rounded-2xl p-5 flex flex-col justify-between space-y-3">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-red-800 font-bold border-b border-red-200/80 pb-2">
                      <span className="material-symbols-outlined notranslate text-[20px] text-red-600">
                        gpp_bad
                      </span>
                      <span className="text-xs uppercase tracking-wide">Aviso Legal & Restrições de Segurança</span>
                    </div>
                    
                    <p className="text-xs text-red-950/90 leading-relaxed">
                      Testes de intrusão (<strong>pentest</strong>), varreduras automatizadas de portas/vulnerabilidades, ataques de força bruta, injeção de scripts maliciosos ou tentativas de engenharia reversa <strong>NÃO estão autorizados</strong> e são expressamente proibidos neste ambiente.
                    </p>

                    <div className="bg-white/80 border border-red-200/80 rounded-xl p-3 text-[11px] text-red-900 leading-relaxed space-y-1.5">
                      <p className="font-semibold text-red-800 flex items-center gap-1">
                        <span>⚖️</span>
                        <span>Legislação Aplicável:</span>
                      </p>
                      <p>
                        A execução de testes ofensivos não autorizados configura infração penal segundo a <strong>Lei Federal nº 12.737/2012</strong> (Art. 154-A do Código Penal Brasileiro - Invasão de Dispositivo Informático) e violação da <strong>Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018)</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-red-200/60 flex items-center gap-2 text-[10px] text-red-800/80 font-mono">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500"></span>
                    <span>Tráfego, IPs e requisições à API monitorados por logs de auditoria contínua.</span>
                  </div>
                </div>

              </div>

            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white border-t border-outline-variant/40 flex items-center justify-between">
              <span className="text-[11px] text-outline font-semibold flex items-center gap-1.5">
                <span className="material-symbols-outlined notranslate text-[14px]">lock</span>
                Ambiente de demonstração protegido e monitorado.
              </span>
              <button
                type="button"
                onClick={handleAutoFill}
                className="text-xs font-bold text-secondary hover:text-primary transition-colors cursor-pointer px-4 py-2 rounded-lg hover:bg-secondary/10 flex items-center gap-1.5"
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
