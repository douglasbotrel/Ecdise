'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Edit2, X, Users, Loader2 } from 'lucide-react'

interface ClienteForm {
  nome: string
  cpfCnpj: string
  email: string
  telefone: string
  endereco: string
  municipio: string
  estado: string
  cep: string
  observacoes: string
}

const FORM_VAZIO: ClienteForm = {
  nome: '', cpfCnpj: '', email: '', telefone: '',
  endereco: '', municipio: '', estado: '', cep: '', observacoes: '',
}

function formFromCliente(c: any): ClienteForm {
  return {
    nome: c.nome || '',
    cpfCnpj: c.cpfCnpj || '',
    email: c.email || '',
    telefone: c.telefone || '',
    endereco: c.endereco || '',
    municipio: c.municipio || '',
    estado: c.estado || '',
    cep: c.cep || '',
    observacoes: c.observacoes || '',
  }
}

export default function ClientesPage() {
  const [clientes, setClientes] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  const [modalOpen, setModalOpen]             = useState(false)
  const [clienteSelecionado, setClienteSelecionado] = useState<any | null>(null)
  const [form, setForm]                       = useState<ClienteForm>(FORM_VAZIO)
  const [salvando, setSalvando]               = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      const res = await fetch(`/api/clientes?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setClientes(data.clientes || [])
    } catch {
      toast.error('Erro ao carregar clientes')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  function abrirNovo() {
    setClienteSelecionado(null)
    setForm(FORM_VAZIO)
    setModalOpen(true)
  }

  function abrirEditar(cliente: any) {
    setClienteSelecionado(cliente)
    setForm(formFromCliente(cliente))
    setModalOpen(true)
  }

  function fecharModal() {
    setModalOpen(false)
    setClienteSelecionado(null)
  }

  async function salvar() {
    if (!form.nome.trim() || !form.cpfCnpj.trim()) {
      toast.error('Nome e CPF/CNPJ são obrigatórios')
      return
    }
    setSalvando(true)
    try {
      const editando = !!clienteSelecionado
      const res = await fetch(
        editando ? `/api/clientes/${clienteSelecionado.id}` : '/api/clientes',
        {
          method: editando ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        }
      )
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || 'Erro ao salvar cliente')
        return
      }
      toast.success(editando ? 'Cliente atualizado!' : 'Cliente cadastrado!')
      fecharModal()
      load()
    } catch {
      toast.error('Erro ao salvar cliente')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clientes</h1>
          <p className="text-gray-500 text-sm mt-1">{clientes.length} cliente(s) cadastrado(s)</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Novo Cliente
        </button>
      </div>

      {/* Barra de busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, CPF/CNPJ, e-mail ou município..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
      </div>

      {/* Lista de clientes */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : clientes.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <Users className="w-8 h-8 mb-2" />
            <p className="font-medium">Nenhum cliente encontrado</p>
            <p className="text-sm mt-1">Cadastre um novo cliente ou ajuste a busca</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Nome</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">CPF/CNPJ</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Contato</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Local</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Projetos</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {clientes.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{c.nome}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-700">{c.cpfCnpj}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-700">{c.email || <span className="text-gray-300">—</span>}</p>
                      <p className="text-xs text-gray-400">{c.telefone || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">
                        {c.municipio || '—'}{c.estado ? `/${c.estado}` : ''}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{c._count?.projetos ?? 0}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button onClick={() => abrirEditar(c)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal de cadastro/edição ─────────────────────────── */}
      {modalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={fecharModal}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 sticky top-0 bg-white z-10">
              <p className="font-bold text-gray-900">{clienteSelecionado ? 'Editar Cliente' : 'Novo Cliente'}</p>
              <button onClick={fecharModal} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nome / Razão Social *</label>
                  <input type="text" value={form.nome} onChange={e => setForm(f => ({ ...f, nome: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">CPF/CNPJ *</label>
                  <input type="text" value={form.cpfCnpj} onChange={e => setForm(f => ({ ...f, cpfCnpj: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">E-mail</label>
                  <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Telefone</label>
                  <input type="text" value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Endereço</label>
                  <input type="text" value={form.endereco} onChange={e => setForm(f => ({ ...f, endereco: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Município</label>
                  <input type="text" value={form.municipio} onChange={e => setForm(f => ({ ...f, municipio: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">UF</label>
                    <input type="text" maxLength={2} value={form.estado} onChange={e => setForm(f => ({ ...f, estado: e.target.value.toUpperCase() }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">CEP</label>
                    <input type="text" value={form.cep} onChange={e => setForm(f => ({ ...f, cep: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observações</label>
                  <textarea value={form.observacoes} onChange={e => setForm(f => ({ ...f, observacoes: e.target.value }))}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-gray-100 sticky bottom-0 bg-white">
              <button onClick={fecharModal}
                className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-xl transition-colors">
                Cancelar
              </button>
              <button onClick={salvar} disabled={salvando}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl transition-colors disabled:opacity-50">
                {salvando && <Loader2 className="w-4 h-4 animate-spin" />} Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
