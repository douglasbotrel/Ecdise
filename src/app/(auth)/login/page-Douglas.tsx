'use client'

import { useState } from 'react'
import Image from 'next/image'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !senha) { toast.error('Preencha email e senha'); return }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error || 'Credenciais inválidas'); return }
      toast.success(`Bem-vindo, ${data.usuario.nome}!`)
      window.location.href = '/dashboard'
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex">

      {/* ── Painel esquerdo — Logo ───────────────────────────── */}
      <div className="hidden lg:flex flex-col items-center justify-center w-1/2 bg-gradient-to-br from-green-800 to-green-600 relative overflow-hidden">
        {/* Círculos decorativos */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-white/5 rounded-full" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-white/5 rounded-full" />
        <div className="absolute top-1/4 right-8 w-48 h-48 bg-white/5 rounded-full" />

        <div className="relative z-10 flex flex-col items-center px-16">
          {/* Logo */}
          <div className="w-64 h-64 flex items-center justify-center mb-8">
            <Image
              src="/logo.png"
              alt="Ecdise"
              width={240}
              height={240}
              className="object-contain drop-shadow-2xl"
              style={{ mixBlendMode: 'multiply' }}
              priority
            />
          </div>
          <p className="text-green-100 text-center text-lg leading-relaxed max-w-xs">
            Sistema de Gestão de<br />Licenciamento Ambiental
          </p>
          <div className="mt-12 flex flex-col items-center gap-2 text-green-200/70 text-xs">
            <div className="w-12 h-px bg-green-400/30" />
            <p>Desenvolvido por Forestsys</p>
          </div>
        </div>
      </div>

      {/* ── Painel direito — Formulário ─────────────────────── */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 bg-gray-50">

        {/* Logo mobile (só aparece em telas pequenas) */}
        <div className="flex flex-col items-center mb-8 lg:hidden">
          <div className="w-24 h-24 flex items-center justify-center mb-3">
            <Image
              src="/logo.png"
              alt="Ecdise"
              width={96}
              height={96}
              className="object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">ecdise</h1>
          <p className="text-gray-500 text-sm">Gestão Ambiental</p>
        </div>

        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-8">
            <h2 className="text-xl font-semibold text-gray-800 mb-1">Bem-vindo</h2>
            <p className="text-sm text-gray-500 mb-6">Entre com suas credenciais para acessar</p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                  autoComplete="email"
                  disabled={loading}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <input
                    type={showSenha ? 'text' : 'password'}
                    value={senha}
                    onChange={e => setSenha(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 pr-12"
                    autoComplete="current-password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowSenha(!showSenha)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors p-1"
                  >
                    {showSenha ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold py-3 px-6 rounded-xl transition-colors duration-200 flex items-center justify-center gap-2 mt-2"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin" /> Entrando...</>
                ) : (
                  'Acessar o sistema'
                )}
              </button>
            </form>
          </div>

          <p className="text-center text-xs text-gray-400 mt-6">
            Desenvolvido por <span className="font-medium text-gray-500">Forestsys</span>
            {' '}· © {new Date().getFullYear()} Ecdise
          </p>
        </div>
      </div>
    </div>
  )
}
