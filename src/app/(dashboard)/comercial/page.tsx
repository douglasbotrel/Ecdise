'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, Search, Eye, Edit2, CheckCircle, ArrowRight, Clock, FileText, FolderOpen, Trash2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ModalProjeto } from '@/components/modals/ModalProjeto'
import { ModalDocumentos } from '@/components/modals/ModalDocumentos'
import { pedirTexto } from '@/components/ui/dialogo'
import { useFiltrosNaUrl } from '@/hooks/useFiltrosNaUrl'

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
  if (etapa === 'AGUARDANDO_SINAL') {
    const semValor = !projeto?.contrato?.valorTotal || Number(projeto?.contrato?.valorTotal) <= 0
    return (
      <button onClick={() => onAcao(projeto, 'financeiro')}
        className={`text-xs px-2.5 py-1 text-white rounded-lg font-medium flex items-center gap-1 transition-colors ${semValor ? 'bg-blue-500 hover:bg-blue-600' : 'bg-orange-500 hover:bg-orange-600'}`}>
        <ArrowRight className="w-3 h-3" />
        {semValor ? 'Liberar para Operacional' : 'Registrar Pagamento'}
      </button>
    )
  }
  if (etapa === 'OPERACIONAL') return (
    <button onClick={() => onAcao(projeto, 'operacional')}
      className="text-xs px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-1 transition-colors">
      <ArrowRight className="w-3 h-3" /> Atribuir Analista
    </button>
  )
  return null
}

const ETAPAS_FUNIL = [
  { value: 'SOLICITACAO',         label: 'Solicitações',    cor: 'border-gray-300' },
  { value: 'ANALISE_CONCLUIDA',   label: 'Para validar',    cor: 'border-blue-400', destaque: true },
  { value: 'AGUARDANDO_CONTRATO', label: 'Aguard. Contrato', cor: 'border-pink-400' },
  { value: 'AGUARDANDO_SINAL',    label: 'Aguard. Sinal',   cor: 'border-orange-400' },
  { value: 'OPERACIONAL',         label: 'Operacional',     cor: 'border-indigo-400' },
  { value: 'EM_EXECUCAO',         label: 'Em Execução',     cor: 'border-green-400' },
]

export default function ComercialPage() {
  const [projetos, setProjetos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtroEtapa, setFiltroEtapa] = useState('')
  useFiltrosNaUrl({ busca: [search, setSearch], etapa: [filtroEtapa, setFiltroEtapa] })
  const [total, setTotal] = useState(0)
  const [pagina, setPagina] = useState(1)
  const [contadores, setContadores] = useState<Record<string, number>>({})
  const [carregandoMais, setCarregandoMais] = useState(false)
  const POR_PAGINA = 50
  const [modalOpen, setModalOpen] = useState(false)
  const [projetoSelecionado, setProjetoSelecionado] = useState<any>(null)
  const [modoModal, setModoModal] = useState<string>('criar')
  const [docModalOpen, setDocModalOpen] = useState(false)
  const [projetoDocumentos, setProjetoDocumentos] = useState<any>(null)
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [excluindoId, setExcluindoId] = useState<string | null>(null)

  const isAdmin = currentUser?.role === 'ADMIN'

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(d => setCurrentUser(d.usuario || null))
  }, [])

  const buscar = useCallback(async (pg: number) => {
    const params = new URLSearchParams()
    if (filtroEtapa) params.set('etapaPipeline', filtroEtapa)
    if (search) params.set('search', search)
    params.set('page', String(pg))
    params.set('limit', String(POR_PAGINA))
    // contagem por etapa feita no servidor, sem o filtro de etapa: os cards
    // não zeram ao clicar e não ficam limitados aos 50 primeiros
    params.set('contagem', 'etapaPipeline')
    const res = await fetch(`/api/projetos?${params}`)
    if (!res.ok) throw new Error()
    return res.json()
  }, [filtroEtapa, search])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await buscar(1)
      setProjetos(data.projetos)
      setTotal(data.total)
      setContadores(data.contagens || {})
      setPagina(1)
    } catch { toast.error('Erro ao carregar projetos') }
    finally { setLoading(false) }
  }, [buscar])

  async function carregarMais() {
    setCarregandoMais(true)
    try {
      const data = await buscar(pagina + 1)
      setProjetos(prev => [...prev, ...data.projetos])
      setPagina(pagina + 1)
    } catch { toast.error('Erro ao carregar mais projetos') }
    finally { setCarregandoMais(false) }
  }

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  function abrirNovo() { setProjetoSelecionado(null); setModoModal('criar'); setModalOpen(true) }
  function abrirAcao(projeto: any, modo: string) { setProjetoSelecionado(projeto); setModoModal(modo); setModalOpen(true) }
  function abrirEditar(projeto: any) { setProjetoSelecionado(projeto); setModoModal('editar'); setModalOpen(true) }
  function abrirDocumentos(projeto: any) { setProjetoDocumentos(projeto); setDocModalOpen(true) }

  async function excluirProjeto(projeto: any) {
    const motivo = await pedirTexto({
      titulo: `Excluir a solicitação ${projeto.codigo}?`,
      mensagem: projeto.cliente?.nome || undefined,
      label: 'Motivo da exclusão',
      textoConfirmar: 'Excluir',
      perigo: true,
      multilinha: true,
    })
    if (motivo === null) return // cancelou

    setExcluindoId(projeto.id)
    try {
      const res = await fetch(`/api/projetos/${projeto.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivo.trim() }),
      })
      if (!res.ok) { const d = await res.json().catch(() => ({})); toast.error(d.error || 'Erro ao excluir'); return }
      toast.success('Solicitação excluída')
      load()
    } catch { toast.error('Erro ao excluir') }
    finally { setExcluindoId(null) }
  }


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
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
            } ${(f as any).destaque && (contadores[f.value] || 0) > 0 ? 'ring-2 ring-offset-1 ring-blue-300' : ''}`}>
            <p className="text-xl font-bold text-gray-900">{contadores[f.value] || 0}</p>
            <p className="text-xs text-gray-500 leading-tight mt-0.5">{f.label}</p>
            {(f as any).destaque && (contadores[f.value] || 0) > 0 && (
              <span className="text-xs text-blue-600 font-medium">Aguardando</span>
            )}
          </button>
        ))}
      </div>

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
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : projetos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-400">
            <p className="font-medium">Nenhum projeto nesta etapa</p>
            <p className="text-sm mt-1">Crie uma nova solicitação ou ajuste os filtros</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Código</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Cliente / Imóvel</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Tipo / Serviço</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Local</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Analista Rápido</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Etapa do Pipeline</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Data</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
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
                        <button onClick={() => abrirEditar(p)}
                          className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors" title="Ver detalhes">
                          <Eye className="w-4 h-4" />
                        </button>
                        <button onClick={() => abrirDocumentos(p)}
                          className="p-1.5 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors" title="Documentos">
                          <FolderOpen className="w-4 h-4" />
                        </button>
                        <button onClick={() => abrirEditar(p)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Editar">
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {isAdmin && (
                          <button onClick={() => excluirProjeto(p)} disabled={excluindoId === p.id}
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50" title="Excluir solicitação">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && projetos.length < total && (
          <div className="border-t border-gray-100 p-3 text-center">
            <button type="button" onClick={carregarMais} disabled={carregandoMais}
              className="text-sm font-medium text-green-700 hover:underline disabled:opacity-50">
              {carregandoMais ? 'Carregando...' : `Carregar mais (${projetos.length} de ${total})`}
            </button>
          </div>
        )}
      </div>

      <ModalProjeto
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        projeto={projetoSelecionado}
        modoAcao={modoModal as any}
        onSalvo={() => { setModalOpen(false); load() }}
      />

      <ModalDocumentos
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        projeto={projetoDocumentos}
      />
    </div>
  )
}
