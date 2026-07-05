'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import Image from 'next/image'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [senha, setSenha]       = useState('')
  const [showSenha, setShowSenha] = useState(false)
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email || !senha) {
      toast.error('Preencha email e senha')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, senha }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error || 'Credenciais inválidas')
        return
      }
      toast.success(`Bem-vindo, ${data.usuario.nome}!`)
      window.location.href = '/dashboard'
    } catch {
      toast.error('Erro ao conectar com o servidor')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-green-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Image
            src="/logo.png"
            alt="Ecdise"
            width={200}
            height={120}
            className="mx-auto mb-2 object-contain"
            priority
          />
          <p className="text-gray-500 mt-1">Gestão de Licenciamento Ambiental</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Entrar no sistema</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400"
                autoComplete="off"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
              <div className="relative">
                <input
                  type={showSenha ? 'text' : 'password'}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all text-gray-900 placeholder-gray-400 pr-12"
                  autoComplete="off"
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
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Entrando...
                </>
              ) : (
                'Acessar o sistema'
              )}
            </button>
          </form>
        </div>

        {/* Link de teste gratuito — fora do card */}
        <a
          href="/cadastro-teste"
          className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 px-6 rounded-xl border-2 border-red-500 text-red-600 font-semibold text-sm hover:bg-red-500 hover:text-white transition-all duration-200 shadow-sm"
        >
          📋 Questionário para acessar 3 meses de teste grátis
        </a>

        <p className="text-center text-xs text-gray-400 mt-6">
          © {new Date().getFullYear()} Ecdise — Sistema de Gestão Ambiental
        </p>
      </div>
    </div>
  )
}
