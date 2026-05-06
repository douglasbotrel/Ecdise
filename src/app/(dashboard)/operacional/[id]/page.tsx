'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Check, FileText,
  DollarSign, User, Calendar, Loader2,
  Edit2, Save, Clock, AlertCircle,
} from 'lucide-react'
import {
  formatDate, formatCurrency,
  STATUS_OPERACIONAL_LABELS, STATUS_COLORS, STATUS_TAREFA_LABELS,
} from '@/lib/utils'

// Estado inline de edição por tarefa
interface TarefaEdit {
  prazo: string
  responsavelId: string
}

export default function ProjetoDetalhe() {
  const params = useParams()
  const router = useRouter()
  const id     = params.id as string

  const [projeto, setProjeto]       = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [aba, setAba]               = useState<'timeline' | 'tarefas' | 'documentos' | 'historico'>('timeline')
  const [usuarios, setUsuarios]     = useState<any[]>([])

  // Edição inline de prazo/responsável (modo atribuição)
  const [editando, setEditando]     = useState<Record<string, TarefaEdit>>({})
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  // Nova tarefa avulsa (pós-OPERACIONAL)
  const [novaT, setNovaT]           = useState(false)
  const [formTarefa, setFormTarefa] = useState({ titulo: '', etapa: '', prazo: '', responsavelId: '' })
  const [salvandoT, setSalvandoT]   = useState(false)

  // Etapas que têm acesso ao módulo Operacional (após primeiro pagamento)
  const ETAPAS_VALIDAS = ['OPERACIONAL', 'EM_EXECUCAO', 'CONCLUIDO']

  const loadProjeto = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projetos/${id}`)
      if (!res.ok) { router.push('/operacional'); return }
      const data = await res.json()
      // Guard: bloqueia acesso a projetos que ainda não chegaram ao Operacional
      if (!ETAPAS_VALIDAS.includes(data.projeto?.etapaPipeline)) {
        toast.error('Este projeto ainda não passou pelo financeiro')
        router.push('/operacional')
        return
      }
      setProjeto(data.projeto)
    } catch {
      toast.error('Erro ao carregar projeto')
    } finally {
      setLoading(false)
    }
  }, [id, router])

  useEffect(() => {
    loadProjeto()
    fetch('/api/usuarios?ativo=true')
      .then(r => r.json())
      .then(d => setUsuarios(d.usuarios || []))
  }, [loadProjeto])

  // Inicializa estado de edição quando projeto carrega e está em OPERACIONAL
  useEffect(() => {
    if (!projeto || projeto.etapaPipeline !== 'OPERACIONAL') return
    const init: Record<string, TarefaEdit> = {}
    ;(projeto.tarefas || []).forEach((t: any) => {
      init[t.id] = {
        prazo: t.prazo ? t.prazo.split('T')[0] : '',
        responsavelId: t.responsavelId || '',
      }
    })
    setEditando(init)
  }, [projeto])

  // ── Salvar atribuição de uma tarefa ───────────────────────
  async function salvarAtribuicao(tarefaId: string) {
    setSalvandoId(tarefaId)
    try {
      const e = editando[tarefaId]
      const tarefa = (projeto?.tarefas || []).find((t: any) => t.id === tarefaId)
      // Não envia prazo se tarefa aguarda campo definir
      const podeEnviarPrazo = !tarefa?.requerVistoriaCampo || tarefa?.statusVistoria === null
      await fetch('/api/tarefas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: tarefaId,
          ...(podeEnviarPrazo && { prazo: e.prazo || null }),
          responsavelId: e.responsavelId || null,
        }),
      })
      toast.success('Salvo')
      loadProjeto()
    } catch { toast.error('Erro ao salvar') }
    finally { setSalvandoId(null) }
  }

  // ── Solicitar vistoria de campo para uma tarefa ────────────
  async function toggleVistoriaCampo(tarefaId: string, atual: boolean) {
    try {
      const res = await fetch('/api/tarefas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tarefaId, requerVistoriaCampo: !atual }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return }
      if (!atual) toast.success('Solicitação enviada ao setor de campo!')
      else toast.success('Solicitação de campo removida')
      loadProjeto()
    } catch { toast.error('Erro') }
  }

  // ── Atualizar status operacional ──────────────────────────
  async function atualizarStatus(novoStatus: string) {
    try {
      await fetch(`/api/projetos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusOperacional: novoStatus }),
      })
      toast.success('Status atualizado')
      loadProjeto()
    } catch { toast.error('Erro') }
  }

  // ── Marcar tarefa como concluída/pendente (optimistic, sem scroll) ──
  async function toggleTarefa(tarefaId: string, atual: string) {
    const novoStatus = atual === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA'
    // Atualiza localmente sem re-renderizar a página toda
    setProjeto((prev: any) => ({
      ...prev,
      tarefas: prev.tarefas.map((t: any) =>
        t.id === tarefaId ? { ...t, status: novoStatus } : t
      ),
    }))
    try {
      await fetch('/api/tarefas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tarefaId, status: novoStatus }),
      })
      // Reload silencioso para sincronizar statusOperacional e etapaPipeline
      loadProjeto()
    } catch {
      toast.error('Erro ao atualizar tarefa')
      loadProjeto() // reverte
    }
  }

  // ── Nova tarefa avulsa ─────────────────────────────────────
  async function criarTarefa() {
    if (!formTarefa.titulo) { toast.error('Título obrigatório'); return }
    setSalvandoT(true)
    try {
      await fetch('/api/tarefas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projetoId: id,
          titulo: formTarefa.titulo,
          etapa: formTarefa.etapa,
          prazo: formTarefa.prazo || null,
          responsavelId: formTarefa.responsavelId || null,
          ordem: (projeto?.tarefas?.length || 0) + 1,
        }),
      })
      toast.success('Tarefa criada')
      setNovaT(false)
      setFormTarefa({ titulo: '', etapa: '', prazo: '', responsavelId: '' })
      loadProjeto()
    } catch { toast.error('Erro ao criar tarefa') }
    finally { setSalvandoT(false) }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!projeto) return null

  const emOperacional = projeto.etapaPipeline === 'OPERACIONAL'
  const tarefas       = projeto.tarefas || []

  const tarefasPorEtapa = tarefas.reduce((acc: any, t: any) => {
    const etapa = t.etapa || 'GERAL'
    if (!acc[etapa]) acc[etapa] = []
    acc[etapa].push(t)
    return acc
  }, {})
  const etapas = Object.keys(tarefasPorEtapa)

  // Porcentagem de tarefas com prazo/responsável definidos (para o banner)
  const comAtribuicao = tarefas.filter((t: any) => t.prazo && t.responsavelId).length
  const pctAtribuido  = tarefas.length > 0 ? Math.round((comAtribuicao / tarefas.length) * 100) : 0

  return (
    <div className="space-y-5">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => router.push('/operacional')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium text-sm w-fit"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>

        <div className="flex flex-col sm:flex-row sm:items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-xs text-gray-400">{projeto.codigo}</span>
              <h1 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {projeto.imovelNome || projeto.cliente?.nome}
              </h1>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[projeto.statusOperacional]}`}>
                {STATUS_OPERACIONAL_LABELS[projeto.statusOperacional]}
              </span>
              {emOperacional && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
                  ⏳ Aguardando planejamento
                </span>
              )}
              <span className="text-xs text-gray-500">{projeto.tipoServico} • {projeto.municipio}</span>
            </div>
          </div>
          {!emOperacional && (
            <select
              value={projeto.statusOperacional}
              onChange={e => atualizarStatus(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500 w-full sm:w-auto"
            >
              {Object.entries(STATUS_OPERACIONAL_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* ── Info Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { Icon: User,     label: 'Cliente',     value: projeto.cliente?.nome },
          { Icon: User,     label: 'Responsável',  value: projeto.responsavel?.nome || 'Não atribuído' },
          { Icon: Calendar, label: 'Prazo',        value: formatDate(projeto.dataPrazo) || '—' },
          { Icon: DollarSign, label: 'Valor',      value: formatCurrency(projeto.contrato?.valorTotal || projeto.valorProposto) },
        ].map(({ Icon, label, value }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
            <div className="flex items-center gap-1.5 text-gray-400 mb-1">
              <Icon className="w-3.5 h-3.5" />
              <span className="text-xs">{label}</span>
            </div>
            <p className="font-semibold text-sm text-gray-900 truncate">{value}</p>
          </div>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════
          BANNER OPERACIONAL — só aparece quando etapa=OPERACIONAL
          ══════════════════════════════════════════════════════ */}
      {emOperacional && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          {/* Header do banner */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-6 py-4 border-b border-amber-200">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h2 className="font-bold text-amber-900 text-sm sm:text-base">
                  Defina prazos e responsáveis
                </h2>
              </div>
              <p className="text-xs text-amber-700">
                As tarefas foram criadas automaticamente com base nos serviços contratados.
                Atribua prazos e responsáveis antes de iniciar a execução.
              </p>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-lg font-bold text-amber-700">{pctAtribuido}%</div>
              <div className="text-xs text-amber-600">atribuído</div>
              <div className="text-xs text-amber-500 mt-0.5">execução inicia ao 1º check</div>
            </div>
          </div>

          {/* Tarefas para atribuição — agrupadas por serviço */}
          {tarefas.length === 0 ? (
            <div className="px-6 py-8 text-center text-amber-600">
              <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p className="text-sm">Nenhuma tarefa gerada. Verifique os serviços do contrato.</p>
            </div>
          ) : (
            <div className="divide-y divide-amber-100">
              {etapas.map(etapa => (
                <div key={etapa}>
                  {/* Header do serviço */}
                  <div className="px-4 sm:px-6 py-2 bg-amber-100/50">
                    <span className="text-xs font-bold text-amber-700 uppercase tracking-wider">{etapa}</span>
                    <span className="ml-2 text-xs text-amber-500">
                      {tarefasPorEtapa[etapa].filter((t: any) => t.prazo && t.responsavelId).length}/{tarefasPorEtapa[etapa].length} atribuídas
                    </span>
                  </div>

                  {/* Linhas de tarefas */}
                  {tarefasPorEtapa[etapa].map((tarefa: any) => {
                    const edit      = editando[tarefa.id] || { prazo: '', responsavelId: '' }
                    const isSaving  = salvandoId === tarefa.id
                    const atribuida = tarefa.prazo && tarefa.responsavelId
                    const aguardaCampo  = tarefa.requerVistoriaCampo && tarefa.statusVistoria === 'SOLICITADA'
                    const campoAgendado = tarefa.requerVistoriaCampo && tarefa.statusVistoria === 'AGENDADA'

                    return (
                      <div
                        key={tarefa.id}
                        className={`px-4 sm:px-6 py-3 border-b border-amber-50 last:border-0 ${
                          campoAgendado ? 'bg-green-50/40'
                          : aguardaCampo ? 'bg-blue-50/30'
                          : atribuida   ? 'bg-green-50/20'
                          : 'bg-white/60'
                        }`}
                      >
                        <div className="flex flex-col gap-2">
                          {/* Linha 1: indicador + título + checkbox campo */}
                          <div className="flex items-center gap-2">
                            <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                              campoAgendado ? 'bg-green-500'
                              : aguardaCampo ? 'bg-blue-400'
                              : atribuida   ? 'bg-green-400'
                              : 'bg-amber-400'
                            }`} />
                            <span className="text-sm text-gray-800 flex-1 min-w-0 truncate">{tarefa.titulo}</span>

                            {/* Checkbox: Requer vistoria de campo */}
                            <label className={`flex items-center gap-1.5 text-xs cursor-pointer select-none flex-shrink-0 px-2 py-1 rounded-lg transition-colors ${
                              tarefa.requerVistoriaCampo
                                ? aguardaCampo  ? 'bg-blue-100 text-blue-700'
                                  : campoAgendado ? 'bg-green-100 text-green-700'
                                  : 'bg-blue-100 text-blue-700'
                                : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'
                            }`}>
                              <input
                                type="checkbox"
                                checked={tarefa.requerVistoriaCampo}
                                onChange={() => toggleVistoriaCampo(tarefa.id, tarefa.requerVistoriaCampo)}
                                className="accent-blue-600 w-3.5 h-3.5"
                              />
                              <span>Vistoria de campo</span>
                            </label>
                          </div>

                          {/* Linha 2: status campo OU inputs de prazo/responsável */}
                          {aguardaCampo ? (
                            <div className="ml-4 flex items-center gap-2">
                              <span className="inline-flex items-center gap-1.5 text-xs text-blue-600 bg-blue-50 border border-blue-200 px-2.5 py-1.5 rounded-lg font-medium">
                                🔵 Aguardando Gestão de Campo definir data
                              </span>
                            </div>
                          ) : campoAgendado ? (
                            <div className="ml-4 flex items-center gap-2 flex-wrap">
                              <span className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 border border-green-200 px-2.5 py-1.5 rounded-lg font-medium">
                                ✅ Data definida pelo Campo: {tarefa.dataCampo
                                  ? new Date(tarefa.dataCampo).toLocaleDateString('pt-BR')
                                  : '—'}
                              </span>
                              <span className="text-xs text-gray-400 italic">Data gerenciada pelo setor de campo</span>
                              {/* Responsável ainda pode ser definido */}
                              <select
                                value={edit.responsavelId}
                                onChange={e => setEditando(prev => ({
                                  ...prev, [tarefa.id]: { ...prev[tarefa.id], responsavelId: e.target.value },
                                }))}
                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white w-36"
                              >
                                <option value="">Responsável...</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                              </select>
                              <button
                                onClick={() => salvarAtribuicao(tarefa.id)}
                                disabled={isSaving}
                                className="flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                              >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Salvar
                              </button>
                            </div>
                          ) : (
                            <div className="ml-4 flex flex-col xs:flex-row gap-2 sm:flex-row sm:items-center">
                              <input
                                type="date"
                                value={edit.prazo}
                                onChange={e => setEditando(prev => ({
                                  ...prev, [tarefa.id]: { ...prev[tarefa.id], prazo: e.target.value },
                                }))}
                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                              <select
                                value={edit.responsavelId}
                                onChange={e => setEditando(prev => ({
                                  ...prev, [tarefa.id]: { ...prev[tarefa.id], responsavelId: e.target.value },
                                }))}
                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white w-36 sm:w-40"
                              >
                                <option value="">Responsável...</option>
                                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                              </select>
                              <button
                                onClick={() => salvarAtribuicao(tarefa.id)}
                                disabled={isSaving}
                                className="flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-medium"
                              >
                                {isSaving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                Salvar
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Abas ────────────────────────────────────────────── */}
      <div className="border-b border-gray-100 overflow-x-auto">
        <div className="flex gap-0 min-w-max">
          {[
            { id: 'timeline',   label: 'Linha do Tempo' },
            { id: 'tarefas',    label: `Tarefas (${tarefas.length})` },
            { id: 'documentos', label: `Docs (${projeto.documentos?.length || 0})` },
            { id: 'historico',  label: 'Histórico' },
          ].map(a => (
            <button
              key={a.id}
              onClick={() => setAba(a.id as any)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                aba === a.id
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* ── Linha do Tempo ─────────────────────────────────── */}
      {aba === 'timeline' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Linha do Tempo</h3>
            {!emOperacional && (
              <button
                onClick={() => setNovaT(true)}
                className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                <Plus className="w-4 h-4" /> Adicionar
              </button>
            )}
          </div>

          {/* Progresso por etapa — scroll horizontal no mobile */}
          {etapas.length > 0 && (
            <div className="overflow-x-auto mb-5">
              <div className="flex items-center gap-1 pb-1 min-w-max">
                {etapas.map((etapa, idx) => {
                  const ts     = tarefasPorEtapa[etapa] || []
                  const concl  = ts.filter((t: any) => t.status === 'CONCLUIDA').length
                  const pct    = ts.length > 0 ? Math.round((concl / ts.length) * 100) : 0
                  const isDone = pct === 100
                  return (
                    <div key={etapa} className="flex items-center gap-1 flex-shrink-0">
                      <div className={`flex flex-col items-center p-2 rounded-lg w-20 text-center ${isDone ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold mb-1 ${
                          isDone ? 'bg-green-600 text-white' : pct > 0 ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {isDone ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                        </div>
                        <span className={`text-xs font-medium truncate w-full ${isDone ? 'text-green-700' : 'text-gray-600'}`}>{etapa}</span>
                        <span className="text-xs text-gray-400">{pct}%</span>
                      </div>
                      {idx < etapas.length - 1 && (
                        <div className={`h-0.5 w-4 ${isDone ? 'bg-green-400' : 'bg-gray-200'}`} />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Tarefas por etapa */}
          <div className="space-y-5">
            {etapas.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                <p className="text-sm">
                  {emOperacional
                    ? 'Tarefas serão exibidas aqui após serem geradas pelo financeiro.'
                    : 'Nenhuma tarefa cadastrada.'
                  }
                </p>
              </div>
            ) : (
              etapas.map(etapa => (
                <div key={etapa}>
                  <h4 className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wider">{etapa}</h4>
                  <div className="space-y-2">
                    {tarefasPorEtapa[etapa].map((tarefa: any) => (
                      <div
                        key={tarefa.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
                          tarefa.status === 'CONCLUIDA' ? 'bg-green-50 border-green-100'
                          : tarefa.status === 'ATRASADA' ? 'bg-red-50 border-red-100'
                          : 'bg-white border-gray-100'
                        }`}
                      >
                        <button
                          onClick={() => toggleTarefa(tarefa.id, tarefa.status)}
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
                          <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                            {tarefa.responsavel && (
                              <span className="text-xs text-gray-400">{tarefa.responsavel.nome}</span>
                            )}
                            {tarefa.prazo && (
                              <span className="text-xs text-gray-400">{formatDate(tarefa.prazo)}</span>
                            )}
                            {!tarefa.responsavel && emOperacional && (
                              <span className="text-xs text-amber-500">Sem responsável</span>
                            )}
                          </div>
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

          {/* Form nova tarefa (só após iniciar execução) */}
          {novaT && !emOperacional && (
            <div className="mt-4 p-4 border-2 border-dashed border-green-200 rounded-xl bg-green-50/50">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Nova Tarefa</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={formTarefa.titulo}
                  onChange={e => setFormTarefa(p => ({ ...p, titulo: e.target.value }))}
                  placeholder="Título da tarefa *"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={formTarefa.etapa}
                    onChange={e => setFormTarefa(p => ({ ...p, etapa: e.target.value }))}
                    placeholder="Etapa / serviço"
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <input
                    type="date"
                    value={formTarefa.prazo}
                    onChange={e => setFormTarefa(p => ({ ...p, prazo: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={formTarefa.responsavelId}
                    onChange={e => setFormTarefa(p => ({ ...p, responsavelId: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="">Responsável</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={criarTarefa} disabled={salvandoT}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                    {salvandoT && <Loader2 className="w-3 h-3 animate-spin" />} Salvar
                  </button>
                  <button onClick={() => setNovaT(false)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tarefas flat ─────────────────────────────────────  */}
      {aba === 'tarefas' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Todas as Tarefas</h3>
            {!emOperacional && (
              <button onClick={() => setNovaT(true)} className="flex items-center gap-1.5 text-sm text-green-600 font-medium">
                <Plus className="w-4 h-4" /> Nova
              </button>
            )}
          </div>
          <div className="space-y-2">
            {tarefas.length === 0 ? (
              <p className="text-center py-8 text-gray-400 text-sm">Nenhuma tarefa cadastrada</p>
            ) : (
              tarefas.map((tarefa: any) => (
                <div key={tarefa.id} className={`flex items-center gap-3 p-3 rounded-xl border ${tarefa.status === 'CONCLUIDA' ? 'border-green-100 bg-green-50' : 'border-gray-100'}`}>
                  <button
                    onClick={() => toggleTarefa(tarefa.id, tarefa.status)}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${tarefa.status === 'CONCLUIDA' ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}
                  >
                    {tarefa.status === 'CONCLUIDA' && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${tarefa.status === 'CONCLUIDA' ? 'line-through text-gray-400' : 'text-gray-900 font-medium'}`}>
                      {tarefa.titulo}
                    </p>
                    <div className="flex gap-2 text-xs text-gray-400 mt-0.5 flex-wrap">
                      {tarefa.etapa      && <span>{tarefa.etapa}</span>}
                      {tarefa.responsavel && <span>{tarefa.responsavel.nome}</span>}
                      {tarefa.prazo      && <span>{formatDate(tarefa.prazo)}</span>}
                    </div>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[tarefa.status] || ''}`}>
                    {STATUS_TAREFA_LABELS[tarefa.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* ── Documentos ────────────────────────────────────── */}
      {aba === 'documentos' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Documentos</h3>
          {projeto.documentos?.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum documento enviado</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {projeto.documentos?.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 py-3">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.nome}</p>
                    <p className="text-xs text-gray-400">{doc.categoria} • {doc.usuario?.nome}</p>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:text-green-700 font-medium flex-shrink-0">
                    Abrir
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Histórico ─────────────────────────────────────── */}
      {aba === 'historico' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Histórico</h3>
          {projeto.historico?.length === 0 ? (
            <p className="text-center py-8 text-gray-400 text-sm">Nenhum histórico</p>
          ) : (
            <div className="relative space-y-4 pl-5">
              <div className="absolute left-1.5 top-0 bottom-0 w-0.5 bg-gray-100" />
              {projeto.historico?.map((h: any) => (
                <div key={h.id} className="relative">
                  <div className="absolute -left-3.5 w-2.5 h-2.5 rounded-full bg-green-500 mt-1" />
                  <p className="text-sm text-gray-900">
                    Alterado para <strong>{h.statusNovo}</strong>
                    {h.statusAnterior && <span className="text-gray-500"> (era {h.statusAnterior})</span>}
                  </p>
                  <p className="text-xs text-gray-400">{formatDate(h.criadoEm)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
