"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'

export default function AssinaturaSuspensaPage() {
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa] px-4 select-none">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#ffdad6] p-8 shadow-xs flex flex-col items-center">
        {/* Warning Icon */}
        <div className="w-16 h-16 rounded-full bg-[#ffdad6] flex items-center justify-center text-[#93000a] mb-6">
          <span className="material-symbols-outlined text-[36px]">warning</span>
        </div>

        <div className="text-center mb-6">
          <h2 className="text-lg font-extrabold text-[#93000a] tracking-tight">Acesso Suspenso</h2>
          <p className="text-sm text-[#74777f] mt-2 leading-relaxed">
            A assinatura da sua empresa encontra-se suspensa por pendências administrativas.
          </p>
          <p className="text-xs text-[#74777f] mt-1">
            Por favor, entre em contato com a diretoria do HELPE para regularizar seu acesso.
          </p>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={() => window.location.reload()}
            className="w-full bg-[#002046] text-white font-bold py-3.5 rounded-xl cursor-pointer hover:bg-[#1b365d] active:scale-[0.98] transition-all text-xs tracking-wider uppercase"
          >
            Tentar Novamente
          </button>
          
          <button
            onClick={handleLogout}
            className="w-full bg-[#f3f4f5] text-[#002046] font-bold py-3.5 rounded-xl cursor-pointer hover:bg-[#e7e8e9] active:scale-[0.98] transition-all text-xs tracking-wider uppercase"
          >
            Sair da Conta
          </button>
        </div>

        <div className="mt-8 border-t border-[#e7e8e9] pt-4 w-full text-center">
          <p className="text-[10px] text-[#74777f] font-semibold tracking-wider uppercase">
            Helpe Gestão Industrial © 2026
          </p>
        </div>
      </div>
    </div>
  )
}
