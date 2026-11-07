'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { Header } from '@/components/layout/Header'
import { cn } from '@/lib/utils'

interface Usuario {
  id: string
  nome: string
  email: string
  role: string
  departamento: string
  cargo?: string | null
  modulos?: string[] | null // null = sem restrição
}

// Rotas que não pertencem a um módulo do menu e ficam sempre liberadas
const ROTAS_LIVRES = ['perfil', 'notificacoes']

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  // Sessão expirada: qualquer chamada /api que volte 401 leva ao login,
  // preservando a página atual (em vez de só mostrar "Erro ao carregar").
  useEffect(() => {
    const original = window.fetch
    let redirecionando = false
    window.fetch = async (...args) => {
      const res = await original(...args)
      const url = typeof args[0] === 'string' ? args[0] : (args[0] as any)?.url || ''
      const ehApi = url.startsWith('/api/') || url.startsWith(`${window.location.origin}/api/`)
      if (res.status === 401 && !redirecionando && ehApi && !url.includes('/api/auth/')) {
        redirecionando = true
        const voltar = window.location.pathname + window.location.search
        window.location.href = `/login?redirect=${encodeURIComponent(voltar)}&expirou=1`
      }
      return res
    }
    return () => { window.fetch = original }
  }, [])

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          router.push(`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`)
          return
        }
        const data = await res.json()
        setUsuario(data.usuario)
      } catch {
        router.push('/login')
      } finally {
        setLoading(false)
      }
    }
    loadUser()

    // Carrega preferência de sidebar
    const savedCollapsed = localStorage.getItem('sidebar_collapsed')
    if (savedCollapsed) setCollapsed(JSON.parse(savedCollapsed))
  }, [router])

  function handleToggleSidebar() {
    const newValue = !collapsed
    setCollapsed(newValue)
    localStorage.setItem('sidebar_collapsed', JSON.stringify(newValue))
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!usuario) return null

  const modulosPermitidos = usuario.modulos ?? null
  const moduloAtual = (pathname || '').split('/')[1] || 'dashboard'
  const semAcesso = modulosPermitidos !== null &&
    !ROTAS_LIVRES.includes(moduloAtual) &&
    !modulosPermitidos.includes(moduloAtual)

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggleSidebar}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
        modulosPermitidos={modulosPermitidos}
      />

      {/* Main content */}
      <div className={cn(
        'flex flex-col min-h-screen transition-all duration-300',
        collapsed ? 'lg:pl-16' : 'lg:pl-64'
      )}>
        <Header
          onMobileMenuOpen={() => setMobileOpen(true)}
          usuario={usuario}
        />

        <main className="flex-1 p-4 md:p-6">
          {semAcesso ? (
            <div className="mx-auto mt-16 max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center">
              <h1 className="text-lg font-semibold text-gray-900">Sem acesso a este módulo</h1>
              <p className="mt-2 text-sm text-gray-500">Seu perfil não tem permissão para esta área. Fale com o administrador se precisar de acesso.</p>
              <Link href="/dashboard" className="mt-4 inline-block text-sm font-medium text-green-700 hover:underline">Ir para o início</Link>
            </div>
          ) : children}
        </main>
      </div>
    </div>
  )
}
