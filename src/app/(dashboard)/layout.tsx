<<<<<<< HEAD
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
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
}

export default function DashboardLayout({
=======
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
  children,
}: {
  children: React.ReactNode
}) {
<<<<<<< HEAD
  const router = useRouter()
  const [collapsed, setCollapsed] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [usuario, setUsuario] = useState<Usuario | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadUser() {
      try {
        const res = await fetch('/api/auth/me')
        if (!res.ok) {
          router.push('/login')
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

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar
        collapsed={collapsed}
        onToggle={handleToggleSidebar}
        mobileOpen={mobileOpen}
        onMobileClose={() => setMobileOpen(false)}
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
          {children}
        </main>
      </div>
    </div>
=======
  // Lê e verifica o token diretamente no servidor
  const cookieStore = cookies()
  const token = cookieStore.get('ecdise_token')?.value

  if (!token) {
    redirect('/login')
  }

  const payload = verifyToken(token)
  if (!payload) {
    redirect('/login')
  }

  // Busca dados atualizados do usuário
  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      nome: true,
      email: true,
      cargo: true,
      role: true,
      departamento: true,
      modulosAcesso: true,
      ativo: true,
    },
  })

  if (!usuario || !usuario.ativo) {
    redirect('/login')
  }

  return (
    <DashboardShell usuario={usuario}>
      {children}
    </DashboardShell>
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
  )
}
