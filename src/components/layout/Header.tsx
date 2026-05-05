'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Bell, Menu, ChevronDown, User, LogOut, Settings } from 'lucide-react'
import { ROLE_LABELS, DEPARTAMENTO_LABELS } from '@/lib/utils'

interface HeaderProps {
  onMobileMenuOpen: () => void
  usuario: {
    id: string
    nome: string
    email: string
    role: string
    departamento: string
    cargo?: string | null
  }
}

export function Header({ onMobileMenuOpen, usuario }: HeaderProps) {
  const router = useRouter()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [notificacoes, setNotificacoes] = useState<any[]>([])
  const [notifOpen, setNotifOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const notifRef = useRef<HTMLDivElement>(null)

  // Fecha dropdowns ao clicar fora
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setNotifOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Carrega notificações
  useEffect(() => {
    async function loadNotificacoes() {
      try {
        const res = await fetch('/api/notificacoes?lida=false&limit=5')
        if (res.ok) {
          const data = await res.json()
          setNotificacoes(data.notificacoes || [])
        }
      } catch {}
    }
    loadNotificacoes()
    const interval = setInterval(loadNotificacoes, 30000)
    return () => clearInterval(interval)
  }, [])

  async function handleLogout() {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
      toast.success('Logout realizado com sucesso')
      router.push('/login')
    } catch {
      toast.error('Erro ao fazer logout')
    }
  }

  const initials = usuario.nome
    .split(' ')
    .slice(0, 2)
    .map(n => n[0])
    .join('')
    .toUpperCase()

  const naoLidas = notificacoes.filter(n => !n.lida).length

  return (
    <header className="h-16 bg-white border-b border-gray-100 flex items-center justify-between px-4 gap-4 flex-shrink-0">
      {/* Mobile menu button */}
      <button
        onClick={onMobileMenuOpen}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Breadcrumb area - pode ser expandido */}
      <div className="flex-1" />

      {/* Right side */}
      <div className="flex items-center gap-2">
        {/* Notificações */}
        <div className="relative" ref={notifRef}>
          <button
            onClick={() => setNotifOpen(!notifOpen)}
            className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <Bell className="w-5 h-5" />
            {naoLidas > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center font-medium">
                {naoLidas > 9 ? '9+' : naoLidas}
              </span>
            )}
          </button>

          {notifOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-100 z-50">
              <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Notificações</h3>
                {naoLidas > 0 && (
                  <span className="text-xs text-green-600 font-medium">{naoLidas} não lida(s)</span>
                )}
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notificacoes.length === 0 ? (
                  <div className="px-4 py-8 text-center text-gray-400 text-sm">
                    Nenhuma notificação
                  </div>
                ) : (
                  notificacoes.map((notif) => (
                    <div
                      key={notif.id}
                      className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${!notif.lida ? 'bg-green-50/50' : ''}`}
                    >
                      <p className="text-sm font-medium text-gray-900">{notif.titulo}</p>
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{notif.mensagem}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="px-4 py-3 border-t border-gray-100">
                <button
                  onClick={() => { setNotifOpen(false); router.push('/notificacoes') }}
                  className="text-xs text-green-600 hover:text-green-700 font-medium"
                >
                  Ver todas as notificações →
                </button>
              </div>
            </div>
          )}
        </div>

        {/* User menu */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
          >
            {/* Avatar */}
            <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {initials}
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 leading-none">{usuario.nome.split(' ')[0]}</p>
              <p className="text-xs text-gray-400 mt-0.5">{ROLE_LABELS[usuario.role] || usuario.role}</p>
            </div>
            <ChevronDown className="w-4 h-4 text-gray-400 hidden sm:block" />
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 z-50 overflow-hidden">
              {/* User info */}
              <div className="px-4 py-3 border-b border-gray-100">
                <p className="text-sm font-semibold text-gray-900">{usuario.nome}</p>
                <p className="text-xs text-gray-500">{usuario.email}</p>
                <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
                  {DEPARTAMENTO_LABELS[usuario.departamento] || usuario.departamento}
                </span>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <button
                  onClick={() => { setDropdownOpen(false); router.push('/perfil') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Meu Perfil
                </button>
                <button
                  onClick={() => { setDropdownOpen(false); router.push('/configuracoes') }}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Configurações
                </button>
              </div>

              <div className="border-t border-gray-100 py-1">
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}
