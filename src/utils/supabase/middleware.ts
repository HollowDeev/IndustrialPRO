import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const url = new URL(request.url)
  const pathname = url.pathname

  console.log(`[Middleware] Path: ${pathname} | User Logado: ${user?.email || 'Nenhum'}`)

  // Permitir acesso direto a ativos estáticos e rotas de API sem interceptação do Middleware de páginas
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api') ||
    pathname.includes('.') ||
    pathname === '/favicon.ico'
  ) {
    return supabaseResponse
  }

  // 1. Caso de uso: Tentativa de acesso à rota oculta do Super-Admin
  if (pathname === '/painel-gestor-helpe') {
    if (!user) {
      console.log(`[Middleware] Acesso negado a ${pathname}: usuário não autenticado. Retornando 404.`)
      return NextResponse.rewrite(new URL('/404', request.url))
    }

    // Buscar perfil para verificar se é de fato Super Admin
    const { data: profile, error: dbError } = await supabase
      .from('usuarios')
      .select('is_super_admin')
      .eq('id', user.id)
      .single()

    if (dbError) {
      console.error(`[Middleware] Erro ao buscar perfil no banco: ${dbError.message}`)
    }

    console.log(`[Middleware] Perfil carregado:`, profile)

    if (!profile || !profile.is_super_admin) {
      console.log(`[Middleware] Acesso negado a ${pathname}: usuário não é Super Admin. Retornando 404.`)
      return NextResponse.rewrite(new URL('/404', request.url))
    }

    console.log(`[Middleware] Acesso concedido a ${pathname} para o Super Admin.`)
    return supabaseResponse
  }

  // 2. Rotas públicas permitidas sem estar autenticado
  const publicRoutes = ['/login', '/assinatura-suspensa']
  if (publicRoutes.includes(pathname)) {
    // Se estiver logado e tentar ir para o login, redireciona para a home
    if (user && pathname === '/login') {
      const { data: profile } = await supabase
        .from('usuarios')
        .select('is_super_admin')
        .eq('id', user.id)
        .single()
      
      if (profile?.is_super_admin) {
        return NextResponse.redirect(new URL('/painel-gestor-helpe', request.url))
      }
      return NextResponse.redirect(new URL('/', request.url))
    }
    return supabaseResponse
  }

  // 3. Proteção das rotas internas do aplicativo
  if (!user) {
    // Redireciona para o login comum
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // 4. Verificação de Assinatura Suspensa (para usuários logados comuns)
  const { data: profile } = await supabase
    .from('usuarios')
    .select('is_super_admin, empresa_id')
    .eq('id', user.id)
    .single()

  if (profile) {
    // Se for o Super Admin tentando acessar a home comum, permitimos
    if (profile.is_super_admin) {
      return supabaseResponse
    }

    // Se for usuário de empresa, verificamos se a assinatura está ATIVA
    if (profile.empresa_id) {
      const { data: empresa } = await supabase
        .from('empresas')
        .select('status_assinatura')
        .eq('id', profile.empresa_id)
        .single()

      if (empresa && empresa.status_assinatura === 'SUSPENSO') {
        // Redireciona para a tela de aviso de suspensão
        return NextResponse.redirect(new URL('/assinatura-suspensa', request.url))
      }
    }
  }

  return supabaseResponse
}
