import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

async function checkAdmin(supabase: any) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const adminClient = createSupabaseClient(supabaseUrl!, serviceRoleKey!, {
    auth: { autoRefreshToken: false, persistSession: false }
  })

  const { data: profile } = await adminClient
    .from('usuarios')
    .select('is_super_admin')
    .eq('id', user.id)
    .single()

  return profile?.is_super_admin ? adminClient : null;
}

export async function POST(request: Request) {
  const supabase = await createServerClient()
  const adminClient = await checkAdmin(supabase)
  
  if (!adminClient) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { nome, cnpj, status_assinatura } = await request.json()

  const { data, error } = await adminClient
    .from('empresas')
    .insert([{ nome, cnpj, status_assinatura }])
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, empresa: data })
}

export async function PATCH(request: Request) {
  const supabase = await createServerClient()
  const adminClient = await checkAdmin(supabase)
  
  if (!adminClient) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
  }

  const { id, status_assinatura } = await request.json()

  const { data, error } = await adminClient
    .from('empresas')
    .update({ status_assinatura })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  return NextResponse.json({ success: true, empresa: data })
}
