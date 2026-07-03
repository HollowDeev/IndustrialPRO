import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

// Função simples para parsear informações básicas do User Agent
function parseUA(ua: string | null) {
  if (!ua) return { dispositivo: 'Desconhecido', browser: 'Desconhecido', so: 'Desconhecido' }
  
  let so = 'Outro'
  if (ua.includes('Windows')) so = 'Windows'
  else if (ua.includes('Macintosh') || ua.includes('Mac OS')) so = 'macOS'
  else if (ua.includes('Linux')) so = 'Linux'
  else if (ua.includes('Android')) so = 'Android'
  else if (ua.includes('iPhone') || ua.includes('iPad')) so = 'iOS'

  let browser = 'Outro'
  if (ua.includes('Firefox')) browser = 'Firefox'
  else if (ua.includes('Chrome') && !ua.includes('Chromium')) browser = 'Chrome'
  else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari'
  else if (ua.includes('Edge') || ua.includes('Edg')) browser = 'Edge'

  let dispositivo = 'Desktop'
  if (ua.includes('Mobi') || ua.includes('Android') || ua.includes('iPhone')) {
    dispositivo = 'Mobile'
  } else if (ua.includes('Tablet') || ua.includes('iPad')) {
    dispositivo = 'Tablet'
  }
  
  return { dispositivo, browser, so }
}

export async function POST(request: Request) {
  const body = await request.json()
  const { email, password } = body

  if (!email || !password) {
    return NextResponse.json({ error: 'E-mail e senha são obrigatórios' }, { status: 400 })
  }

  // 1. Coletar dados da requisição
  const headers = request.headers
  const ip = headers.get('x-forwarded-for') || headers.get('x-real-ip') || '127.0.0.1'
  const uaString = headers.get('user-agent')
  
  // Localização via Headers do Vercel (se existirem, caso contrário padrão local)
  const cidade = headers.get('x-vercel-ip-city') || 'Localhost / Dev'
  const regiao = headers.get('x-vercel-ip-country-region') || 'Localhost / Dev'
  const pais = headers.get('x-vercel-ip-country') || 'Localhost / Dev'

  const { dispositivo, browser, so } = parseUA(uaString)

  // 2. Tentar autenticação no Supabase Auth usando o cliente padrão (para persistir os cookies de sessão)
  const supabase = await createServerClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  })

  const status = error ? 'FALHA' : 'SUCESSO'

  // 3. Gravar o log no banco de dados usando o Service Role (ignora RLS, permitindo salvar falhas anonimamente)
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (serviceRoleKey && supabaseUrl) {
      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })

      await adminClient.from('logs_autenticacao').insert({
        email,
        status,
        ip_address: ip.split(',')[0].trim(), // Pega o primeiro IP caso venha em cadeia
        user_agent: uaString,
        dispositivo,
        browser,
        so,
        cidade,
        regiao,
        pais
      })
    }
  } catch (logErr) {
    console.error('Erro ao salvar log de autenticação:', logErr)
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 401 })
  }

  let is_super_admin = false;
  try {
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (serviceRoleKey && supabaseUrl) {
      const adminClient = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false }
      })
      const { data: profile } = await adminClient
        .from('usuarios')
        .select('is_super_admin')
        .eq('id', data.user.id)
        .single()
      
      if (profile) {
        is_super_admin = profile.is_super_admin;
      }
    }
  } catch (err) {
    console.error('Erro ao verificar perfil do admin:', err);
  }

  return NextResponse.json({ 
    success: true, 
    user: data.user, 
    is_super_admin: is_super_admin 
  })
}
