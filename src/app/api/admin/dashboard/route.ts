import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  const supabase = await createServerClient()
  
  // Verify authentication
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Create admin client to bypass RLS
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

  if (!serviceRoleKey || !supabaseUrl) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 })
  }

  const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  // Verify super admin status securely
  const { data: profile } = await adminClient
    .from('usuarios')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_super_admin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch all necessary data bypassing RLS
  const [empresasRes, usuariosRes, logsRes] = await Promise.all([
    adminClient.from('empresas').select('*').order('created_at', { ascending: false }),
    adminClient.from('usuarios').select('*, empresas(nome)').order('nome'),
    adminClient.from('logs_autenticacao').select('*').order('created_at', { ascending: false })
  ])

  return NextResponse.json({
    empresas: empresasRes.data || [],
    usuarios: usuariosRes.data || [],
    logs: logsRes.data || []
  })
}
