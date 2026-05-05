'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Filter, Eye, Edit2, ChevronRight } from 'lucide-react'
import { formatDate, formatCurrency, STATUS_COMERCIAL_LABELS, STATUS_OPERACIONAL_LABELS, STATUS_COLORS } from '@/lib/utils'
import { ModalProjeto } from '@/components/modals/ModalProjeto'

const FILTROS_STATUS = [
  { label: 'Todos', value: '' },
  { label: 'Recebido', value: 'RECEBIDO' },
  { label: 'Em Análise', value: 'EM_ANALISE' },
  { label: 'Proposta Enviada', value: 'PROPOSTA_ENVIADA' },
  { label: 'Aceito', value: 'ACEITO' },
  { label: 'Recusado', value: 'RECUSADO' },
]

export default function ComercialPage() {
  const [projetos, setProjetos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroStatus, setFiltroStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [projetoSelecionado, setProjetoSelecionado] = useState<any>(null)
  const [total, setTotal] = useState(0)

  const loadProjetos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroStatus) params.set('statusComercial', filtroStatus)
      if (search) params.set('search', search)
      const res = await fetch(`/api/projetos?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProjetos(data.projetos)
      setTotal(data.total)
    } catch {
      toast.error('Erro ao carregar projetos')
    } finally {
      setLoading(false)
    }
  }, [filtroStatus, search])

  useEffect(() => {
    const timer = setTimeout(loadProjetos, 300)
    return () => clearTimeout(timer)
  }, [loadProjetos])

  function abrirNovoProjeto() {
    setProjetoSelecionado(null)
    setModalOpen(true)
  }

  function abrirEdicao(projeto: any) {
    setProjetoSelecionado(projeto)
    setModalOpen(true)
  }

  async function atualizarStatus(id: string, novoStatus: string) {
    try {
      const res = await fetch(`/api/projetos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusComercial: novoStatus }),
      })
      if (!res.ok) throw new Error()
      toast.success('Status atualizado')
      loadProjetos()
    } catch {
      toast.error('Erro ao atualizar status')
    }
  }

  // Contadores por status
  const contadores = FILTROS_STATUS.slice(1).reduce((acc, f) => {
    acc[f.value] = projetos.filter(p => p.statusComercial === f.value).length
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão Comercial</h1>
          <p className="text-gray-500 text-sm mt-1">{total} projeto(s) encontrado(s)</p>
        </div>
        <button
          onClick={abrirNovoProjeto}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Lead / Projeto
        </button>
      </div>

      {/* Cards de status */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {FILTROS_STATUS.slice(1).map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltroStatus(filtroStatus === f.value ? '' : f.value)}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              filtroStatus === f.value
                ? 'border-green-500 bg-green-50'
                : 'border-gray-100 bg-white hover:border-gray-200'
            }`}
          >
            <p className="text-2xl font-bold text-gray-900">{contadores[f.value] || 0}</p>
            <p className="text-xs text-gray-500 mt-1">{f.label}</p>
          </button>
        ))}
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por código, imóvel, município, cliente..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
          />
        </div>
        <select
          value={filtroStatus}
          onChange={(e) => setFiltroStatus(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
        >
          {FILTROS_STATUS.map(f => (
            <option key={f.value} value={f.value}>{f.label}</option>
          ))}
        </select>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projetos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="font-medium">Nenhum projeto encontrado</p>
            <p className="text-sm mt-1">Crie o primeiro lead ou ajuste os filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Código</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Cliente / Imóvel</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Tipo de Serviço</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Município</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Valor</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status Comercial</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status Operacional</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Data</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projetos.map((projeto) => (
                  <tr key={projeto.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-gray-900">{projeto.codigo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{projeto.cliente?.nome}</p>
                      {projeto.imovelNome && (
                        <p className="text-xs text-gray-400">{projeto.imovelNome}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{projeto.tipoServico}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{projeto.municipio || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm font-medium text-gray-900">
                        {projeto.valorProposto ? formatCurrency(projeto.valorProposto) : '-'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={projeto.statusComercial}
                        onChange={(e) => atualizarStatus(projeto.id, e.target.value)}
                        className={`text-xs font-medium px-2 py-1 rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-green-500 ${STATUS_COLORS[projeto.statusComercial] || 'bg-gray-100 text-gray-800'}`}
                      >
                        {Object.entries(STATUS_COMERCIAL_LABELS).map(([k, v]) => (
                          <option key={k} value={k}>{v}</option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[projeto.statusOperacional] || 'bg-gray-100 text-gray-800'}`}>
                        {STATUS_OPERACIONAL_LABELS[projeto.statusOperacional] || projeto.statusOperacional}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{formatDate(projeto.criadoEm)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <a
                          href={`/operacional/${projeto.id}`}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                          title="Ver projeto"
                        >
                          <Eye className="w-4 h-4" />
                        </a>
                        <button
                          onClick={() => abrirEdicao(projeto)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal de projeto */}
      <ModalProjeto
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projeto={projetoSelecionado}
        onSalvo={() => { setModalOpen(false); loadProjetos() }}
      />
    </div>
  )
}
