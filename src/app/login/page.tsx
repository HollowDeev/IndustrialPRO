"use client"

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ButtonSpinner from '@/components/ButtonSpinner';

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

  // Animation sequence states
  // 0 = background only
  // 1 = kore-black logo
  // 2 = assinatura logo
  // 3 = modal appears
  const [stage, setStage] = useState(0)

  useEffect(() => {
    const t1 = setTimeout(() => setStage(1), 300) // kore-black entra
    const t2 = setTimeout(() => setStage(2), 2800) // 2.5s depois: assinatura entra
    const t3 = setTimeout(() => setStage(3), 5300) // 2.5s depois: modal de login entra
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])


  return (
    <div
      className="min-h-screen flex items-center justify-center px-4 select-none relative overflow-hidden"
      style={{
        backgroundImage: "url('/bg-quadriculado.jpg')",
        backgroundRepeat: "repeat",
        backgroundSize: "500px" // Ajuste este valor para controlar o tamanho do quadriculado
      }}
    >
      <AnimatePresence mode="wait">
        {stage === 1 && (
          <motion.div
            key="stage1"
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative" style={{ width: 350, height: 160 }}>
              <Image
                src="/kore-black.png"
                alt="Logo Black"
                fill
                className="object-contain"
                priority
              />
            </div>
          </motion.div>
        )}
        
        {stage === 2 && (
          <motion.div
            key="stage2"
            className="absolute inset-0 flex items-center justify-center z-50 pointer-events-none"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            transition={{ duration: 0.8 }}
          >
            <div className="relative" style={{ width: 450, height: 200 }}>
              <Image
                src="/assinatura.png"
                alt="Assinatura"
                fill
                className="object-contain"
                priority
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {stage === 3 && (
          <motion.div
            key="stage3"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="max-w-md w-full bg-white rounded-3xl border border-[#e7e8e9] p-8 shadow-xs flex flex-col items-center z-10"
          >
            {/* Logo */}
            <div className="mb-8 relative" style={{ width: 250, height: 100 }}>
              <Image src="/kore-cor.png" alt="KORE Industrial" fill className="object-contain object-top" priority />
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
                className="w-full mt-4 bg-[#fd790b] text-white font-bold py-3.5 rounded-xl cursor-pointer hover:bg-[#1b365d] active:scale-[0.98] transition-all text-xs tracking-wider uppercase shadow-xs flex items-center justify-center gap-2"
              >
                {loading ? (
                  <ButtonSpinner size={16} />
                ) : (
                  'Entrar no Sistema'
                )}
              </button>
            </form>

            <div className="mt-8 border-t border-[#e7e8e9] pt-4 w-full text-center flex flex-col items-center gap-2">
              <Image
                src="/assinatura.png"
                alt="Tecnologia por Agência Karamello"
                width={200}
                height={50}
                loading="eager"
              />
              <p className="text-[10px] text-[#74777f] font-semibold tracking-wider uppercase">
                Kore Industrial ERP © 2026. Tecnologia por Agência Karamello.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
