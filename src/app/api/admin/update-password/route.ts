import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 1. Check if the user making the request is a Super-Admin
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // 2. Initialize Supabase Admin Client
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'Configuração do servidor ausente: SUPABASE_SERVICE_ROLE_KEY não configurada no .env.local' }, { status: 500 })
    }

    const adminClient = createSupabaseClient(supabaseUrl!, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    })

    // Check if user is super admin in DB bypassing RLS
    const { data: profile, error: profileError } = await adminClient
      .from('usuarios')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.is_super_admin) {
      return NextResponse.json({ error: 'Acesso negado: privilégios insuficientes' }, { status: 403 })
    }

    // 3. Extract data
    const { userId, newPassword } = await request.json()

    if (!userId || !newPassword) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    // 4. Update the user password in auth.users
    const { data: updatedUser, error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
      password: newPassword
    })

    if (updateError || !updatedUser.user) {
      return NextResponse.json({ error: updateError?.message || 'Erro ao atualizar senha' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno de servidor' }, { status: 500 })
  }
}
