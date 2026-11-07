import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_ROUTES = ['/login', '/api/auth/login', '/cadastro-teste', '/api/cadastro-teste', '/api/sigla/projetos', '/api/sigla/status']

// Verifica assinatura HMAC-SHA256 do JWT usando Web Crypto API (compatível com Edge Runtime).
// O jsonwebtoken não roda no Edge — mas o crypto.subtle sim.
async function verifyJWT(token: string): Promise<Record<string, any> | null> {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) return null

    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [header, payloadB64, sigB64] = parts

    // Importa chave para verificação HMAC-SHA256
    const keyData = new TextEncoder().encode(secret)
    const key = await crypto.subtle.importKey(
      'raw', keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false, ['verify']
    )

    // Converte assinatura de base64url para bytes
    const sigStr = sigB64.replace(/-/g, '+').replace(/_/g, '/')
    const sigPadded = sigStr + '='.repeat((4 - sigStr.length % 4) % 4)
    const sigBytes = Uint8Array.from(atob(sigPadded), c => c.charCodeAt(0))

    // Verifica a assinatura sobre "header.payload"
    const isValid = await crypto.subtle.verify(
      'HMAC', key, sigBytes,
      new TextEncoder().encode(`${header}.${payloadB64}`)
    )
    if (!isValid) return null

    // Decodifica payload e verifica expiração
    const payloadStr = payloadB64.replace(/-/g, '+').replace(/_/g, '/')
    const payloadPadded = payloadStr + '='.repeat((4 - payloadStr.length % 4) % 4)
    const payload = JSON.parse(atob(payloadPadded))
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) return null

    return payload
  } catch {
    return null
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Rotas públicas — sem verificação
  if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
    return NextResponse.next()
  }

  const isApi = pathname.startsWith('/api/')

  // Arquivos estáticos públicos (logo, ícones...). Anexos em /uploads exigem login.
  if (
    pathname.startsWith('/_next') ||
    (!isApi && !pathname.startsWith('/uploads') && pathname.includes('.'))
  ) {
    return NextResponse.next()
  }

  // Sem sessão válida: API responde 401 (a tela trata e leva ao login);
  // página redireciona para o login lembrando de onde o usuário veio.
  function semSessao(limparCookie: boolean) {
    const response = isApi
      ? NextResponse.json({ error: 'Sessão expirada. Faça login novamente.' }, { status: 401 })
      : (() => {
          const loginUrl = new URL('/login', request.url)
          loginUrl.searchParams.set('redirect', pathname + request.nextUrl.search)
          return NextResponse.redirect(loginUrl)
        })()
    if (limparCookie) response.cookies.delete('ecdise_token')
    return response
  }

  const token = request.cookies.get('ecdise_token')?.value
  if (!token) return semSessao(false)

  // Verifica assinatura criptográfica — rejeita JWTs forjados
  const payload = await verifyJWT(token)
  if (!payload) return semSessao(true)

  // Repassa dados do usuário via headers
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-user-id', payload.id || '')
  requestHeaders.set('x-user-role', payload.role || '')
  requestHeaders.set('x-user-departamento', payload.departamento || '')

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
