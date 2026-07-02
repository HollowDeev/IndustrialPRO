import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    // 1. Verificar se o usuário logado que fez a chamada é Super-Admin
    const supabase = await createServerClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
    }

    // Buscar no banco se ele é super admin
    const { data: profile, error: profileError } = await supabase
      .from('usuarios')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.is_super_admin) {
      return NextResponse.json({ error: 'Acesso negado: privilégios insuficientes' }, { status: 403 })
    }

    // 2. Extrair dados do corpo da requisição
    const { email, password, nome, cargo, empresa_id } = await request.json()

    if (!email || !password || !nome || !empresa_id) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 })
    }

    // 3. Inicializar o cliente Admin do Supabase (com a Service Role Key do .env.local)
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

    // 4. Criar o usuário no auth.users
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { nome }
    })

    if (createError || !newUser.user) {
      return NextResponse.json({ error: createError?.message || 'Erro ao criar usuário no Auth' }, { status: 400 })
    }

    // 5. Inserir o perfil correspondente na tabela public.usuarios
    const { error: insertError } = await adminClient
      .from('usuarios')
      .insert({
        id: newUser.user.id,
        empresa_id,
        nome,
        cargo,
        is_super_admin: false
      })

    if (insertError) {
      // Se falhar a inserção do perfil público, apagamos o usuário do auth para manter integridade
      await adminClient.auth.admin.deleteUser(newUser.user.id)
      return NextResponse.json({ error: `Erro ao criar perfil público do usuário: ${insertError.message}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, userId: newUser.user.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Erro interno de servidor' }, { status: 500 })
  }
}
