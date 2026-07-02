"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Logo from '@/components/Logo'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const router = useRouter()
  const supabase = createClient()

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

      // Login bem sucedido. O cookie de sessão foi inserido nos headers da resposta
      // Agora buscamos se o usuário é Super-Admin para redirecioná-lo.
      // Precisamos recriar o cliente Supabase para ler o cookie recém-adquirido
      const sessionClient = createClient()
      const { data: { user } } = await sessionClient.auth.getUser()

      if (user) {
        const { data: profile } = await sessionClient
          .from('usuarios')
          .select('is_super_admin')
          .eq('id', user.id)
          .single()

        if (profile?.is_super_admin) {
          router.push('/painel-gestor-helpe')
        } else {
          router.push('/')
        }
      }
    } catch (err) {
      setErrorMsg('Ocorreu um erro ao tentar realizar o login.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] px-4 select-none">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#e7e8e9] p-8 shadow-xs flex flex-col items-center">
        {/* Logo */}
        <div className="mb-8">
          <Logo showText={true} className="scale-110" />
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-extrabold text-[#002046] tracking-tight">Login Industrial</h2>
          <p className="text-xs text-[#74777f]">Insira suas credenciais para acessar o painel operacional</p>
        </div>

        <form onSubmit={handleLogin} className="w-full space-y-4">
          {errorMsg && (
            <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 text-center">
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
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full bg-[#f3f4f5] text-[#002046] text-sm px-4 py-3 rounded-xl border border-transparent outline-hidden focus:border-[#fc820c] focus:bg-white transition-all font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 bg-[#002046] text-white font-bold py-3.5 rounded-xl cursor-pointer hover:bg-[#1b365d] active:scale-[0.98] transition-all text-xs tracking-wider uppercase shadow-xs flex items-center justify-center gap-2"
          >
            {loading ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
            ) : (
              'Entrar no Sistema'
            )}
          </button>
        </form>

        <div className="mt-8 border-t border-[#e7e8e9] pt-4 w-full text-center">
          <p className="text-[10px] text-[#74777f] font-semibold tracking-wider uppercase">
            Helpe Gestão Industrial © 2026
          </p>
        </div>
      </div>
    </div>
  )
}
