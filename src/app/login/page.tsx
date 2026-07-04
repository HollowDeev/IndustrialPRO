"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image';
import ButtonSpinner from '@/components/ButtonSpinner';
import Logo from '@/components/Logo';
import Footer from '@/components/Footer';

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

      if (data.is_super_admin) {
        router.push('/painel-gestor-helpe')
      } else {
        router.push('/')
      }
    } catch (err) {
      setErrorMsg('Ocorreu um erro ao tentar realizar o login.')
      setLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex flex-col justify-between relative bg-surface-container"
      style={{
        backgroundImage: "url('/bg-quadriculado.jpg')",
        backgroundRepeat: "repeat",
        backgroundSize: "500px"
      }}
    >
      {/* Absolute Bottom Left Logo */}
      <div className="absolute bottom-6 left-6 z-0 pointer-events-none" style={{ width: 250, height: 110 }}>
        <Image
          src="/HelpeLife_Logotipo.png"
          alt="Helpe Life Logotipo"
          fill
          className="object-contain object-left-bottom opacity-30"
          priority
        />
      </div>

      {/* Main Content Centered */}
      <div className="flex-1 flex items-center justify-center px-4 py-12 z-10">
        <div className="max-w-md w-full bg-white rounded-3xl border border-[#e7e8e9] p-8 shadow-xs flex flex-col items-center">
          
          {/* Logo Helpe */}
          <div className="mb-8 w-full flex justify-center">
            <Logo showText={true} className="justify-center" />
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
    </div>
  )
}
