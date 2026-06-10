'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Users, Settings, Plus, Edit2, X, Loader2, Check } from 'lucide-react'
import { ROLE_LABELS, DEPARTAMENTO_LABELS } from '@/lib/utils'

export default function ConfiguracoesPage() {
  const [aba, setAba] = useState<'usuarios' | 'servicos' | 'custos'>('usuarios')
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [servicos, setServicos] = useState<any[]>([])
  const [custos, setCustos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalUsuario, setModalUsuario] = useState(false)
  const [editServico, setEditServico] = useState<any>(null)
  const [novoServico, setNovoServico] = useState(false)
  const [novaServNome, setNovaServNome] = useState('')
  const [novaServCateg, setNovaServCateg] = useState('')
  const [salvando, setSalvando] = useState(false)

  // Form novo usuário
  const [formUser, setFormUser] = useState({
    nome: '', email: '', senha: '', cargo: '', role: 'ANALISTA', departamento: 'OPERACIONAL_AMBIENTAL', telefone: ''
  })

  useEffect(() => { loadDados() }, [aba])

  async function loadDados() {
    setLoading(true)
    try {
      if (aba === 'usuarios') {
        const res = await fetch('/api/usuarios')
        if (res.ok) setUsuarios((await res.json()).usuarios)
      } else if (aba === 'servicos') {
        const res = await fetch('/api/pre-cadastros?tipo=servicos')
        if (res.ok) setServicos((await res.json()).servicos)
      } else if (aba === 'custos') {
        const res = await fetch('/api/pre-cadastros?tipo=custos')
        if (res.ok) setCustos((await res.json()).custos)
      }
    } finally { setLoading(false) }
  }

  async function criarUsuario() {
    if (!formUser.nome || !formUser.email || !formUser.senha) {
      toast.error('Nome, email e senha são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const res = await fetch('/api/usuarios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formUser),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Erro ao criar usuário')
        return
      }
      toast.success('Usuário criado com sucesso!')
      setModalUsuario(false)
      setFormUser({ nome: '', email: '', senha: '', cargo: '', role: 'ANALISTA', departamento: 'OPERACIONAL_AMBIENTAL', telefone: '' })
      loadDados()
    } finally { setSalvando(false) }
  }

  async function criarServico() {
    if (!novaServNome || !novaServCateg) { toast.error('Preencha nome e categoria'); return }
    setSalvando(true)
    try {
      const res = await fetch('/api/pre-cadastros', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'servico', nome: novaServNome, categoria: novaServCateg }),
      })
      if (!res.ok) throw new Error()
      toast.success('Serviço adicionado!')
      setNovoServico(false)
      setNovaServNome('')
      setNovaServCateg('')
      loadDados()
    } finally { setSalvando(false) }
  }

  async function toggleAtivoServico(s: any) {
    try {
      await fetch('/api/pre-cadastros', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tipo: 'servico', id: s.id, ativo: !s.ativo }),
      })
      loadDados()
    } catch { toast.error('Erro') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configurações</h1>
        <p className="text-gray-500 text-sm mt-1">Gerenciamento de usuários e pré-cadastros do sistema</p>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-100">
        <div className="flex gap-0">
          {[
            { id: 'usuarios', label: '👥 Usuários' },
            { id: 'servicos', label: '🌿 Tipos de Serviço' },
            { id: 'custos', label: '💰 Tipos de Custo' },
          ].map(a => (
            <button
              key={a.id}
              onClick={() => setAba(a.id as any)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                aba === a.id ? 'border-green-600 text-green-700' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* USUÁRIOS */}
      {aba === 'usuarios' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{usuarios.length} usuário(s) cadastrado(s)</p>
            <button
              onClick={() => setModalUsuario(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Usuário
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Nome</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Email</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Cargo / Role</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Departamento</th>
                    <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {usuarios.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-green-700 text-sm font-semibold">
                            {u.nome[0]}
                          </div>
                          <p className="text-sm font-medium text-gray-900">{u.nome}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-4 py-3">
                        <p className="text-sm text-gray-900">{u.cargo || '-'}</p>
                        <p className="text-xs text-gray-400">{ROLE_LABELS[u.role] || u.role}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {DEPARTAMENTO_LABELS[u.departamento] || u.departamento}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${u.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                          {u.ativo ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TIPOS DE SERVIÇO */}
      {aba === 'servicos' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">{servicos.length} tipo(s) de serviço</p>
            <button
              onClick={() => setNovoServico(true)}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Tipo
            </button>
          </div>

          {novoServico && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex gap-3">
              <input
                type="text"
                value={novaServNome}
                onChange={(e) => setNovaServNome(e.target.value)}
                placeholder="Nome do serviço"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                autoFocus
              />
              <input
                type="text"
                value={novaServCateg}
                onChange={(e) => setNovaServCateg(e.target.value)}
                placeholder="Categoria"
                className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
              />
              <button onClick={criarServico} disabled={salvando} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium">
                {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              </button>
              <button onClick={() => setNovoServico(false)} className="px-3 py-2 border border-gray-200 rounded-lg text-sm">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Serviço</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Categoria</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {servicos.map(s => (
                  <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{s.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{s.categoria}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${s.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                        {s.ativo ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleAtivoServico(s)}
                        className="text-xs text-gray-500 hover:text-gray-700 font-medium"
                      >
                        {s.ativo ? 'Desativar' : 'Ativar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TIPOS DE CUSTO */}
      {aba === 'custos' && (
        <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Tipo de Custo</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Categoria</th>
                <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {custos.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{c.nome}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{c.categoria}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${c.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'}`}>
                      {c.ativo ? 'Ativo' : 'Inativo'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Novo Usuário */}
      {modalUsuario && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Novo Usuário</h2>
              <button onClick={() => setModalUsuario(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
                  <input type="text" value={formUser.nome} onChange={(e) => setFormUser(p => ({ ...p, nome: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cargo</label>
                  <input type="text" value={formUser.cargo} onChange={(e) => setFormUser(p => ({ ...p, cargo: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                <input type="email" value={formUser.email} onChange={(e) => setFormUser(p => ({ ...p, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Senha *</label>
                <input type="password" value={formUser.senha} onChange={(e) => setFormUser(p => ({ ...p, senha: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Permissão</label>
                  <select value={formUser.role} onChange={(e) => setFormUser(p => ({ ...p, role: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Departamento</label>
                  <select value={formUser.departamento} onChange={(e) => setFormUser(p => ({ ...p, departamento: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white">
                    {Object.entries(DEPARTAMENTO_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setModalUsuario(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-700">Cancelar</button>
                <button onClick={criarUsuario} disabled={salvando}
                  className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold flex items-center gap-2">
                  {salvando && <Loader2 className="w-4 h-4 animate-spin" />}
                  Criar Usuário
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
