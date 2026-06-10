'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Check, Clock, AlertCircle,
  FileText, MapPin, DollarSign, User, Calendar, Edit2, Loader2
} from 'lucide-react'
import { formatDate, formatCurrency, STATUS_OPERACIONAL_LABELS, STATUS_COLORS, STATUS_TAREFA_LABELS } from '@/lib/utils'

const ETAPAS_PADRAO = ['CAR', 'USO', 'PA', 'VISTORIA', 'DOCS', 'PROTOCOLO', 'FINALIZAÇÃO']

export default function ProjetoDetalhe() {
  const params = useParams()
  const router = useRouter()
  const [projeto, setProjeto] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [abaNativa, setAbaNativa] = useState<'timeline' | 'tarefas' | 'documentos' | 'historico'>('timeline')
  const [novaT, setNovaT] = useState(false)
  const [formTarefa, setFormTarefa] = useState({ titulo: '', etapa: '', prazo: '', responsavelId: '' })
  const [salvando, setSalvando] = useState(false)
  const [usuarios, setUsuarios] = useState<any[]>([])

  useEffect(() => {
    loadProjeto()
    fetch('/api/usuarios?ativo=true').then(r => r.json()).then(d => setUsuarios(d.usuarios || []))
  }, [params.id])

  async function loadProjeto() {
    setLoading(true)
    try {
      const res = await fetch(`/api/projetos/${params.id}`)
      if (!res.ok) { router.push('/operacional'); return }
      const data = await res.json()
      setProjeto(data.projeto)
    } catch {
      toast.error('Erro ao carregar projeto')
    } finally {
      setLoading(false)
    }
  }

  async function atualizarStatus(novoStatus: string) {
    try {
      await fetch(`/api/projetos/${params.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusOperacional: novoStatus }),
      })
      toast.success('Status atualizado')
      loadProjeto()
    } catch { toast.error('Erro') }
  }

  async function criarTarefa() {
    if (!formTarefa.titulo) { toast.error('Título obrigatório'); return }
    setSalvando(true)
    try {
      const res = await fetch('/api/tarefas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projetoId: params.id,
          titulo: formTarefa.titulo,
          etapa: formTarefa.etapa,
          prazo: formTarefa.prazo || null,
          responsavelId: formTarefa.responsavelId || null,
          ordem: (projeto?.tarefas?.length || 0) + 1,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Tarefa criada')
      setNovaT(false)
      setFormTarefa({ titulo: '', etapa: '', prazo: '', responsavelId: '' })
      loadProjeto()
    } catch { toast.error('Erro ao criar tarefa') }
    finally { setSalvando(false) }
  }

  async function atualizarTarefa(id: string, status: string) {
    try {
      await fetch('/api/tarefas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      loadProjeto()
    } catch { toast.error('Erro') }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!projeto) return null

  // Agrupa tarefas por etapa para a timeline
  const tarefasPorEtapa = projeto.tarefas?.reduce((acc: any, t: any) => {
    const etapa = t.etapa || 'GERAL'
    if (!acc[etapa]) acc[etapa] = []
    acc[etapa].push(t)
    return acc
  }, {})

  const etapas = Object.keys(tarefasPorEtapa || {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          onClick={() => router.push('/operacional')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium text-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="font-mono text-sm text-gray-400">{projeto.codigo}</span>
            <h1 className="text-xl font-bold text-gray-900">
              {projeto.imovelNome || projeto.cliente?.nome}
            </h1>
            <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[projeto.statusOperacional]}`}>
              {STATUS_OPERACIONAL_LABELS[projeto.statusOperacional]}
            </span>
          </div>
          <p className="text-gray-500 text-sm">{projeto.tipoServico} • {projeto.municipio}</p>
        </div>
        <select
          value={projeto.statusOperacional}
          onChange={(e) => atualizarStatus(e.target.value)}
          className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {Object.entries(STATUS_OPERACIONAL_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <User className="w-4 h-4" />
            <span className="text-xs">Cliente</span>
          </div>
          <p className="font-semibold text-sm text-gray-900">{projeto.cliente?.nome}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <User className="w-4 h-4" />
            <span className="text-xs">Responsável</span>
          </div>
          <p className="font-semibold text-sm text-gray-900">{projeto.responsavel?.nome || 'Não atribuído'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <Calendar className="w-4 h-4" />
            <span className="text-xs">Prazo</span>
          </div>
          <p className="font-semibold text-sm text-gray-900">{formatDate(projeto.dataPrazo)}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-1">
            <DollarSign className="w-4 h-4" />
            <span className="text-xs">Valor</span>
          </div>
          <p className="font-semibold text-sm text-gray-900">{formatCurrency(projeto.valorProposto)}</p>
        </div>
      </div>

      {/* Abas */}
      <div className="border-b border-gray-100">
        <div className="flex gap-0">
          {[
            { id: 'timeline', label: 'Linha do Tempo' },
            { id: 'tarefas', label: `Tarefas (${projeto.tarefas?.length || 0})` },
            { id: 'documentos', label: `Documentos (${projeto.documentos?.length || 0})` },
            { id: 'historico', label: 'Histórico' },
          ].map(aba => (
            <button
              key={aba.id}
              onClick={() => setAbaNativa(aba.id as any)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                abaNativa === aba.id
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {aba.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conteúdo das abas */}
      {abaNativa === 'timeline' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Linha do Tempo do Projeto</h3>
            <button
              onClick={() => setNovaT(true)}
              className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Adicionar Etapa
            </button>
          </div>

          {/* Progresso visual */}
          {etapas.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-1 overflow-x-auto pb-2">
                {etapas.map((etapa, idx) => {
                  const tEtapa = tarefasPorEtapa[etapa] || []
                  const concluidas = tEtapa.filter((t: any) => t.status === 'CONCLUIDA').length
                  const todas = tEtapa.length
                  const pct = todas > 0 ? Math.round((concluidas / todas) * 100) : 0
                  const isDone = pct === 100
                  return (
                    <div key={etapa} className="flex items-center gap-1 flex-shrink-0">
                      <div className={`flex flex-col items-center p-2 rounded-lg min-w-[80px] text-center ${
                        isDone ? 'bg-green-50' : 'bg-gray-50'
                      }`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                          isDone ? 'bg-green-600 text-white' : pct > 0 ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span className={`text-xs font-medium ${isDone ? 'text-green-700' : 'text-gray-600'}`}>
                          {etapa}
                        </span>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                      {idx < etapas.length - 1 && (
                        <div className={`h-0.5 w-6 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Lista de tarefas por etapa */}
          <div className="space-y-4">
            {etapas.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <p>Nenhuma tarefa cadastrada ainda.</p>
                <button
                  onClick={() => setNovaT(true)}
                  className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium"
                >
                  Adicionar primeira tarefa
                </button>
              </div>
            ) : (
              etapas.map((etapa) => (
                <div key={etapa}>
                  <h4 className="text-sm font-semibold text-gray-500 mb-2 uppercase tracking-wide">{etapa}</h4>
                  <div className="space-y-2">
                    {tarefasPorEtapa[etapa].map((tarefa: any) => (
                      <div
                        key={tarefa.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          tarefa.status === 'CONCLUIDA'
                            ? 'bg-green-50 border-green-100'
                            : tarefa.status === 'ATRASADA'
                            ? 'bg-red-50 border-red-100'
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <button
                          onClick={() => atualizarTarefa(
                            tarefa.id,
                            tarefa.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA'
                          )}
                          className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                            tarefa.status === 'CONCLUIDA'
                              ? 'bg-green-600 border-green-600'
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {tarefa.status === 'CONCLUIDA' && <Check className="w-3 h-3 text-white" />}
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium ${tarefa.status === 'CONCLUIDA' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                            {tarefa.titulo}
                          </p>
                          {(tarefa.responsavel || tarefa.prazo) && (
                            <div className="flex items-center gap-3 mt-0.5">
                              {tarefa.responsavel && (
                                <span className="text-xs text-gray-400">{tarefa.responsavel.nome}</span>
                              )}
                              {tarefa.prazo && (
                                <span className="text-xs text-gray-400">{formatDate(tarefa.prazo)}</span>
                              )}
                            </div>
                          )}
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[tarefa.status] || 'bg-gray-100 text-gray-600'}`}>
                          {STATUS_TAREFA_LABELS[tarefa.status]}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Form nova tarefa */}
          {novaT && (
            <div className="mt-4 p-4 border-2 border-dashed border-green-200 rounded-xl bg-green-50/50">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Nova Tarefa</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={formTarefa.titulo}
                  onChange={(e) => setFormTarefa(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Título da tarefa *"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <select
                    value={formTarefa.etapa}
                    onChange={(e) => setFormTarefa(p => ({ ...p, etapa: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="">Etapa</option>
                    {ETAPAS_PADRAO.map(e => <option key={e} value={e}>{e}</option>)}
                  </select>
                  <input
                    type="date"
                    value={formTarefa.prazo}
                    onChange={(e) => setFormTarefa(p => ({ ...p, prazo: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={formTarefa.responsavelId}
                    onChange={(e) => setFormTarefa(p => ({ ...p, responsavelId: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="">Responsável</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={criarTarefa}
                    disabled={salvando}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {salvando && <Loader2 className="w-3 h-3 animate-spin" />}
                    Salvar
                  </button>
                  <button
                    onClick={() => setNovaT(false)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {abaNativa === 'tarefas' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Todas as Tarefas</h3>
            <button
              onClick={() => setNovaT(true)}
              className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              <Plus className="w-4 h-4" />
              Nova Tarefa
            </button>
          </div>
          <div className="space-y-2">
            {projeto.tarefas?.length === 0 ? (
              <p className="text-center py-8 text-gray-400">Nenhuma tarefa cadastrada</p>
            ) : (
              projeto.tarefas?.map((tarefa: any) => (
                <div key={tarefa.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
                  tarefa.status === 'CONCLUIDA' ? 'border-green-100 bg-green-50' : 'border-gray-100'
                }`}>
                  <button
                    onClick={() => atualizarTarefa(tarefa.id, tarefa.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA')}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      tarefa.status === 'CONCLUIDA' ? 'bg-green-600 border-green-600' : 'border-gray-300'
                    }`}
                  >
                    {tarefa.status === 'CONCLUIDA' && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm ${tarefa.status === 'CONCLUIDA' ? 'line-through text-gray-400' : 'text-gray-900 font-medium'}`}>
                      {tarefa.titulo}
                    </p>
                    <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                      {tarefa.etapa && <span>{tarefa.etapa}</span>}
                      {tarefa.responsavel && <span>{tarefa.responsavel.nome}</span>}
                      {tarefa.prazo && <span>{formatDate(tarefa.prazo)}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[tarefa.status] || ''}`}>
                    {STATUS_TAREFA_LABELS[tarefa.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {abaNativa === 'documentos' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Documentos</h3>
          </div>
          {projeto.documentos?.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhum documento enviado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {projeto.documentos?.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 py-3">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{doc.nome}</p>
                    <p className="text-xs text-gray-400">{doc.categoria} • {doc.usuario?.nome} • {formatDate(doc.criadoEm)}</p>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:text-green-700 font-medium">
                    Abrir
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {abaNativa === 'historico' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Histórico de Alterações</h3>
          {projeto.historico?.length === 0 ? (
            <p className="text-center py-8 text-gray-400">Nenhum histórico</p>
          ) : (
            <div className="relative space-y-4 pl-6">
              <div className="absolute left-2 top-0 bottom-0 w-0.5 bg-gray-100" />
              {projeto.historico?.map((h: any) => (
                <div key={h.id} className="relative">
                  <div className="absolute -left-4 w-2.5 h-2.5 rounded-full bg-green-500 mt-1" />
                  <div>
                    <p className="text-sm text-gray-900">
                      Status alterado para <strong>{h.statusNovo}</strong>
                      {h.statusAnterior && <> (era {h.statusAnterior})</>}
                    </p>
                    <p className="text-xs text-gray-400">{formatDate(h.criadoEm)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
