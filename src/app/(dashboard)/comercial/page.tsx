'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
<<<<<<< HEAD
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
=======
import { Plus, Search, Eye, Edit2, CheckCircle, ArrowRight, Clock, FileText } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ModalProjeto } from '@/components/modals/ModalProjeto'

const ETAPA_LABELS: Record<string, string> = {
  SOLICITACAO:         'Nova Solicitação',
  EM_ANALISE_RAPIDA:   'Em Análise',
  ANALISE_CONCLUIDA:   'Análise Concluída',
  AGUARDANDO_CONTRATO: 'Aguard. Contrato',
  AGUARDANDO_SINAL:    'Aguard. Sinal',
  OPERACIONAL:         'Operacional',
  EM_EXECUCAO:         'Em Execução',
  CONCLUIDO:           'Concluído',
  CANCELADO:           'Cancelado',
}

const ETAPA_BADGES: Record<string, string> = {
  SOLICITACAO:         'bg-gray-100 text-gray-700',
  EM_ANALISE_RAPIDA:   'bg-yellow-100 text-yellow-800',
  ANALISE_CONCLUIDA:   'bg-blue-100 text-blue-800 font-semibold',
  EM_NEGOCIACAO:       'bg-purple-100 text-purple-800',
  PROPOSTA_ACEITA:     'bg-cyan-100 text-cyan-800',
  AGUARDANDO_CONTRATO: 'bg-pink-100 text-pink-800',
  EM_CONTRATO:         'bg-teal-100 text-teal-800',
  AGUARDANDO_SINAL:    'bg-orange-100 text-orange-800',
  OPERACIONAL:         'bg-indigo-100 text-indigo-800',
  EM_EXECUCAO:         'bg-green-100 text-green-800',
  CONCLUIDO:           'bg-green-200 text-green-900',
  CANCELADO:           'bg-red-100 text-red-800',
}

// Botão de ação rápida por etapa
function BotaoAcaoEtapa({ projeto, onAcao }: { projeto: any; onAcao: (p: any, modo: string) => void }) {
  const etapa = projeto.etapaPipeline
  if (etapa === 'SOLICITACAO') return (
    <button onClick={() => onAcao(projeto, 'analise')}
      className="text-xs px-2.5 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium flex items-center gap-1 transition-colors">
      <Clock className="w-3 h-3" /> Analisar
    </button>
  )
  if (etapa === 'EM_ANALISE_RAPIDA') return (
    <button onClick={() => onAcao(projeto, 'analise')}
      className="text-xs px-2.5 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium flex items-center gap-1 transition-colors">
      <CheckCircle className="w-3 h-3" /> Concluir Análise
    </button>
  )
  if (etapa === 'ANALISE_CONCLUIDA') return (
    <button onClick={() => onAcao(projeto, 'validacao')}
      className="text-xs px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-medium flex items-center gap-1 transition-colors">
      <CheckCircle className="w-3 h-3" /> Validar → Contratos
    </button>
  )
  if (etapa === 'AGUARDANDO_CONTRATO') return (
    <button onClick={() => onAcao(projeto, 'contrato_info')}
      className="text-xs px-2.5 py-1 bg-pink-600 hover:bg-pink-700 text-white rounded-lg font-medium flex items-center gap-1 transition-colors">
      <FileText className="w-3 h-3" /> Elaborar Contrato
    </button>
  )
  if (etapa === 'AGUARDANDO_SINAL') return (
    <button onClick={() => onAcao(projeto, 'financeiro')}
      className="text-xs px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-medium flex items-center gap-1 transition-colors">
      <ArrowRight className="w-3 h-3" /> Registrar Pagamento
    </button>
  )
  if (etapa === 'OPERACIONAL') return (
    <button onClick={() => onAcao(projeto, 'operacional')}
      className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-1 transition-colors">
      <ArrowRight className="w-3 h-3" /> Atribuir Analista
    </button>
  )
  return null
}

// Contadores de etapas para os cards
const ETAPAS_FUNIL = [
  { value: 'SOLICITACAO',         label: 'Solicitações',    cor: 'border-gray-300' },
  { value: 'ANALISE_CONCLUIDA',   label: 'Para validar',    cor: 'border-blue-400', destaque: true },
  { value: 'AGUARDANDO_CONTRATO', label: 'Aguard. Contrato', cor: 'border-pink-400' },
  { value: 'AGUARDANDO_SINAL',    label: 'Aguard. Sinal',   cor: 'border-orange-400' },
  { value: 'OPERACIONAL',         label: 'Operacional',     cor: 'border-indigo-400' },
  { value: 'EM_EXECUCAO',         label: 'Em Execução',     cor: 'border-green-400' },
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
]

export default function ComercialPage() {
  const [projetos, setProjetos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
<<<<<<< HEAD
  const [filtroStatus, setFiltroStatus] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [projetoSelecionado, setProjetoSelecionado] = useState<any>(null)
  const [total, setTotal] = useState(0)

  const loadProjetos = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroStatus) params.set('statusComercial', filtroStatus)
=======
  const [filtroEtapa, setFiltroEtapa] = useState('')
  const [total, setTotal] = useState(0)
  const [modalOpen, setModalOpen] = useState(false)
  const [projetoSelecionado, setProjetoSelecionado] = useState<any>(null)
  const [modoModal, setModoModal] = useState<string>('criar')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtroEtapa) params.set('etapaPipeline', filtroEtapa)
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
      if (search) params.set('search', search)
      const res = await fetch(`/api/projetos?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProjetos(data.projetos)
      setTotal(data.total)
<<<<<<< HEAD
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
=======
    } catch { toast.error('Erro ao carregar projetos') }
    finally { setLoading(false) }
  }, [filtroEtapa, search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  function abrirNovo() { setProjetoSelecionado(null); setModoModal('criar'); setModalOpen(true) }
  function abrirAcao(projeto: any, modo: string) { setProjetoSelecionado(projeto); setModoModal(modo); setModalOpen(true) }
  function abrirEditar(projeto: any) { setProjetoSelecionado(projeto); setModoModal('editar'); setModalOpen(true) }

  // Contadores por etapa (dos projetos carregados)
  const contadores: Record<string, number> = {}
  projetos.forEach(p => { contadores[p.etapaPipeline] = (contadores[p.etapaPipeline] || 0) + 1 })
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
<<<<<<< HEAD
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
=======
          <h1 className="text-2xl font-bold text-gray-900">Pipeline Comercial</h1>
          <p className="text-gray-500 text-sm mt-1">{total} projeto(s) no pipeline</p>
        </div>
        <button onClick={abrirNovo}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus className="w-4 h-4" /> Nova Solicitação
        </button>
      </div>

      {/* Funil — cards de etapa */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {ETAPAS_FUNIL.map(f => (
          <button key={f.value} onClick={() => setFiltroEtapa(filtroEtapa === f.value ? '' : f.value)}
            className={`p-3 rounded-xl border-2 text-left transition-all bg-white ${
              filtroEtapa === f.value ? 'border-green-500 bg-green-50' : f.cor + ' hover:shadow-sm'
            } ${f.destaque && (contadores[f.value] || 0) > 0 ? 'ring-2 ring-offset-1 ring-blue-300' : ''}`}>
            <p className="text-xl font-bold text-gray-900">{contadores[f.value] || 0}</p>
            <p className="text-xs text-gray-500 leading-tight mt-0.5">{f.label}</p>
            {f.destaque && (contadores[f.value] || 0) > 0 && (
              <span className="text-xs text-blue-600 font-medium">⚡ Aguardando</span>
            )}
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
          </button>
        ))}
      </div>

<<<<<<< HEAD
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
=======
      {/* Barra de busca */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por código, imóvel, município, cliente..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm" />
        </div>
        <select value={filtroEtapa} onChange={e => setFiltroEtapa(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500">
          <option value="">Todas as etapas</option>
          {Object.entries(ETAPA_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </div>

      {/* Lista de projetos */}
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projetos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
<<<<<<< HEAD
            <p className="font-medium">Nenhum projeto encontrado</p>
            <p className="text-sm mt-1">Crie o primeiro lead ou ajuste os filtros</p>
=======
            <p className="font-medium">Nenhum projeto nesta etapa</p>
            <p className="text-sm mt-1">Crie uma nova solicitação ou ajuste os filtros</p>
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Código</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Cliente / Imóvel</th>
<<<<<<< HEAD
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Tipo de Serviço</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Município</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Valor</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status Comercial</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status Operacional</th>
=======
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Tipo / Serviço</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Local</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Analista Rápido</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Etapa do Pipeline</th>
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Data</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
<<<<<<< HEAD
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
=======
                {projetos.map(p => (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${
                    p.etapaPipeline === 'ANALISE_CONCLUIDA' ? 'bg-blue-50/50' : ''
                  }`}>
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm font-medium text-gray-900">{p.codigo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{p.cliente?.nome}</p>
                      <p className="text-xs text-gray-400">{p.imovelNome || '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{p.tipoServico}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{p.municipio || '—'}{p.estado ? `/${p.estado}` : ''}</span>
                      {p.areaHectares && <p className="text-xs text-gray-400">{p.areaHectares} ha</p>}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{p.analistaRapido?.nome || <span className="text-gray-300">—</span>}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${ETAPA_BADGES[p.etapaPipeline] || 'bg-gray-100 text-gray-700'}`}>
                        {ETAPA_LABELS[p.etapaPipeline] || p.etapaPipeline}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-gray-500">{formatDate(p.criadoEm)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <BotaoAcaoEtapa projeto={p} onAcao={abrirAcao} />
                        <a href={`/operacional/${p.id}`}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Ver detalhes">
                          <Eye className="w-4 h-4" />
                        </a>
                        <button onClick={() => abrirEditar(p)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
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

<<<<<<< HEAD
      {/* Modal de projeto */}
=======
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
      <ModalProjeto
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projeto={projetoSelecionado}
<<<<<<< HEAD
        onSalvo={() => { setModalOpen(false); loadProjetos() }}
=======
        modoAcao={modoModal as any}
        onSalvo={() => { setModalOpen(false); load() }}
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
      />
    </div>
  )
}
