'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Check, Clock, AlertCircle,
  FileText, DollarSign, User, Calendar, Loader2,
  PlayCircle, ChevronDown, ChevronRight, Settings2,
} from 'lucide-react'
import {
  formatDate, formatCurrency,
  STATUS_OPERACIONAL_LABELS, STATUS_COLORS, STATUS_TAREFA_LABELS,
} from '@/lib/utils'

// ── tipos ─────────────────────────────────────────────────────
interface TarefaConfig {
  titulo:        string
  etapa:         string        // nome do serviço
  prazo:         string
  responsavelId: string
}

export default function ProjetoDetalhe() {
  const params = useParams()
  const router = useRouter()
  const id     = params.id as string

  const [projeto, setProjeto]   = useState<any>(null)
  const [loading, setLoading]   = useState(true)
  const [aba, setAba]           = useState<'timeline' | 'tarefas' | 'documentos' | 'historico'>('timeline')
  const [usuarios, setUsuarios] = useState<any[]>([])

  // ── Planejamento operacional ───────────────────────────────
  const [tiposServico, setTiposServico]       = useState<any[]>([])
  const [servicosContratados, setServContratados] = useState<string[]>([])
  const [tarefasConfig, setTarefasConfig]     = useState<TarefaConfig[]>([])
  const [servicosExpandidos, setServExpandidos] = useState<Set<string>>(new Set())
  const [salvandoPlano, setSalvandoPlano]     = useState(false)

  // ── Nova tarefa avulsa ─────────────────────────────────────
  const [novaT, setNovaT]       = useState(false)
  const [formTarefa, setFormTarefa] = useState({ titulo: '', etapa: '', prazo: '', responsavelId: '' })
  const [salvandoT, setSalvandoT]  = useState(false)

  // ── Carga inicial ──────────────────────────────────────────
  const loadProjeto = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projetos/${id}`)
      if (!res.ok) { router.push('/operacional'); return }
      const data = await res.json()
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

  // ── Ao carregar projeto, montar plano de execução ──────────
  useEffect(() => {
    if (!projeto) return
    if (projeto.etapaPipeline !== 'OPERACIONAL') return

    // Serviços contratados: tenta campo do projeto, depois do contrato
    const raw = projeto.servicosContratados || projeto.contrato?.servicosContratados || '[]'
    let nomes: string[] = []
    try { nomes = JSON.parse(raw) } catch { nomes = [] }
    setServContratados(nomes)

    // Expande todos por padrão
    setServExpandidos(new Set(nomes))

    // Busca tipos de serviço para obter tarefasPadrao
    fetch('/api/pre-cadastros?tipo=servicos_todos')
      .then(r => r.json())
      .then(d => setTiposServico(d.servicos || []))
  }, [projeto])

  // ── Ao receber tiposServico, inicializa config de tarefas ──
  useEffect(() => {
    if (tiposServico.length === 0 || servicosContratados.length === 0) return

    // Só inicializa se ainda não há tarefas configuradas
    if (tarefasConfig.length > 0) return

    const configs: TarefaConfig[] = []
    servicosContratados.forEach(nomeServico => {
      const ts = tiposServico.find(s => s.nome === nomeServico)
      if (!ts) return
      let padrao: string[] = []
      try { padrao = JSON.parse(ts.tarefasPadrao || '[]') } catch {}
      padrao.forEach(titulo => {
        configs.push({ titulo, etapa: nomeServico, prazo: '', responsavelId: '' })
      })
    })
    setTarefasConfig(configs)
  }, [tiposServico, servicosContratados, tarefasConfig.length])

  // ── Helpers ────────────────────────────────────────────────
  function toggleServico(nome: string) {
    setServExpandidos(prev => {
      const next = new Set(prev)
      next.has(nome) ? next.delete(nome) : next.add(nome)
      return next
    })
  }

  function updateConfig(idx: number, field: keyof TarefaConfig, value: string) {
    setTarefasConfig(prev => prev.map((c, i) => i === idx ? { ...c, [field]: value } : c))
  }

  // ── Iniciar execução: cria tarefas + avança pipeline ───────
  async function iniciarExecucao() {
    if (tarefasConfig.length === 0) {
      toast.error('Nenhuma tarefa configurada')
      return
    }
    setSalvandoPlano(true)
    try {
      // Cria tarefas em sequência por ordem
      for (let i = 0; i < tarefasConfig.length; i++) {
        const c = tarefasConfig[i]
        const res = await fetch('/api/tarefas', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            projetoId: id,
            titulo: c.titulo,
            etapa: c.etapa,
            prazo: c.prazo || null,
            responsavelId: c.responsavelId || null,
            ordem: i + 1,
          }),
        })
        if (!res.ok) throw new Error(`Erro ao criar tarefa: ${c.titulo}`)
      }

      // Avança pipeline OPERACIONAL → EM_EXECUCAO
      const pRes = await fetch(`/api/projetos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ avancarPipeline: true }),
      })
      if (!pRes.ok) throw new Error('Erro ao avançar pipeline')

      toast.success('Execução iniciada! Tarefas criadas e equipe notificada.')
      loadProjeto()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao iniciar execução')
    } finally {
      setSalvandoPlano(false)
    }
  }

  // ── Ações sobre tarefas existentes ────────────────────────
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

  async function criarTarefa() {
    if (!formTarefa.titulo) { toast.error('Título obrigatório'); return }
    setSalvandoT(true)
    try {
      const res = await fetch('/api/tarefas', {
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
      if (!res.ok) throw new Error()
      toast.success('Tarefa criada')
      setNovaT(false)
      setFormTarefa({ titulo: '', etapa: '', prazo: '', responsavelId: '' })
      loadProjeto()
    } catch { toast.error('Erro ao criar tarefa') }
    finally { setSalvandoT(false) }
  }

  async function atualizarTarefa(tarefaId: string, status: string) {
    try {
      await fetch('/api/tarefas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tarefaId, status }),
      })
      loadProjeto()
    } catch { toast.error('Erro') }
  }

  // ── Loading ────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!projeto) return null

  const tarefasPorEtapa = (projeto.tarefas || []).reduce((acc: any, t: any) => {
    const etapa = t.etapa || 'GERAL'
    if (!acc[etapa]) acc[etapa] = []
    acc[etapa].push(t)
    return acc
  }, {})
  const etapas = Object.keys(tarefasPorEtapa)

  const emOperacional = projeto.etapaPipeline === 'OPERACIONAL'
  const semTarefas    = (projeto.tarefas?.length || 0) === 0

  // ── Render ─────────────────────────────────────────────────
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
            {emOperacional && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-700">
                Aguardando planejamento
              </span>
            )}
          </div>
          <p className="text-gray-500 text-sm">{projeto.tipoServico} • {projeto.municipio}</p>
        </div>
        {!emOperacional && (
          <select
            value={projeto.statusOperacional}
            onChange={e => atualizarStatus(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            {Object.entries(STATUS_OPERACIONAL_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        )}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-1"><User className="w-4 h-4" /><span className="text-xs">Cliente</span></div>
          <p className="font-semibold text-sm text-gray-900">{projeto.cliente?.nome}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-1"><User className="w-4 h-4" /><span className="text-xs">Responsável</span></div>
          <p className="font-semibold text-sm text-gray-900">{projeto.responsavel?.nome || 'Não atribuído'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-1"><Calendar className="w-4 h-4" /><span className="text-xs">Prazo</span></div>
          <p className="font-semibold text-sm text-gray-900">{formatDate(projeto.dataPrazo) || '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <div className="flex items-center gap-2 text-gray-400 mb-1"><DollarSign className="w-4 h-4" /><span className="text-xs">Valor</span></div>
          <p className="font-semibold text-sm text-gray-900">{formatCurrency(projeto.contrato?.valorTotal || projeto.valorProposto)}</p>
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════
          PAINEL DE PLANEJAMENTO — visível somente em OPERACIONAL
          ══════════════════════════════════════════════════════ */}
      {emOperacional && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-2xl overflow-hidden">
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 px-6 py-4 border-b border-indigo-200">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <Settings2 className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-indigo-900">Planejar Execução</h2>
              <p className="text-xs text-indigo-600 mt-0.5">
                Defina prazo e responsável para cada subtarefa dos serviços contratados
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs text-indigo-600 font-medium">
              <Clock className="w-4 h-4" />
              {servicosContratados.length} serviço(s) contratado(s)
            </div>
          </div>

          {/* Serviços e tarefas */}
          <div className="p-5 space-y-4">
            {servicosContratados.length === 0 ? (
              <div className="text-center py-6 text-indigo-400">
                <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-60" />
                <p className="text-sm">Nenhum serviço contratado encontrado.</p>
                <p className="text-xs mt-1">Verifique o contrato do projeto.</p>
              </div>
            ) : (
              servicosContratados.map(nomeServico => {
                const ts = tiposServico.find(s => s.nome === nomeServico)
                let padrao: string[] = []
                try { padrao = JSON.parse(ts?.tarefasPadrao || '[]') } catch {}
                const idxsNaConfig = tarefasConfig
                  .map((c, i) => ({ c, i }))
                  .filter(({ c }) => c.etapa === nomeServico)
                const expanded = servicosExpandidos.has(nomeServico)

                return (
                  <div key={nomeServico} className="bg-white rounded-xl border border-indigo-100 overflow-hidden">
                    {/* Header do serviço */}
                    <button
                      onClick={() => toggleServico(nomeServico)}
                      className="w-full flex items-center justify-between px-4 py-3 hover:bg-indigo-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        {expanded
                          ? <ChevronDown  className="w-4 h-4 text-indigo-500" />
                          : <ChevronRight className="w-4 h-4 text-indigo-400" />
                        }
                        <span className="font-semibold text-gray-800 text-sm">{nomeServico}</span>
                        <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full">
                          {padrao.length} subtarefa(s)
                        </span>
                      </div>
                      {idxsNaConfig.filter(({ c }) => c.prazo).length > 0 && (
                        <span className="text-xs text-green-600 font-medium">
                          {idxsNaConfig.filter(({ c }) => c.prazo).length} com prazo definido
                        </span>
                      )}
                    </button>

                    {/* Subtarefas */}
                    {expanded && (
                      <div className="border-t border-indigo-100">
                        {/* Cabeçalho da tabela */}
                        <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-indigo-50/60 text-xs font-semibold text-indigo-500 uppercase tracking-wide">
                          <div className="col-span-5">Subtarefa</div>
                          <div className="col-span-3">Prazo</div>
                          <div className="col-span-4">Responsável</div>
                        </div>

                        {idxsNaConfig.length === 0 ? (
                          <div className="px-4 py-4 text-center text-sm text-gray-400">
                            Este serviço não possui subtarefas cadastradas.
                          </div>
                        ) : (
                          idxsNaConfig.map(({ c, i }) => (
                            <div
                              key={i}
                              className="grid grid-cols-12 gap-2 px-4 py-2.5 items-center border-t border-gray-50 hover:bg-gray-50/50 transition-colors"
                            >
                              <div className="col-span-5 flex items-center gap-2">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{c.titulo}</span>
                              </div>
                              <div className="col-span-3">
                                <input
                                  type="date"
                                  value={c.prazo}
                                  onChange={e => updateConfig(i, 'prazo', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400"
                                />
                              </div>
                              <div className="col-span-4">
                                <select
                                  value={c.responsavelId}
                                  onChange={e => updateConfig(i, 'responsavelId', e.target.value)}
                                  className="w-full px-2 py-1.5 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                                >
                                  <option value="">Selecionar...</option>
                                  {usuarios.map(u => (
                                    <option key={u.id} value={u.id}>{u.nome}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                )
              })
            )}

            {/* Ação */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-xs text-indigo-600">
                Ao confirmar, as tarefas serão criadas e o projeto avança para <strong>Em Execução</strong>.
              </p>
              <button
                onClick={iniciarExecucao}
                disabled={salvandoPlano || tarefasConfig.length === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl transition-colors"
              >
                {salvandoPlano
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <PlayCircle className="w-4 h-4" />
                }
                Iniciar Execução
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          ABAS — visíveis após o projeto entrar em EM_EXECUCAO
          ou sempre para consulta histórica
          ══════════════════════════════════════════════════════ */}
      <div className="border-b border-gray-100">
        <div className="flex gap-0">
          {[
            { id: 'timeline',   label: 'Linha do Tempo' },
            { id: 'tarefas',    label: `Tarefas (${projeto.tarefas?.length || 0})` },
            { id: 'documentos', label: `Documentos (${projeto.documentos?.length || 0})` },
            { id: 'historico',  label: 'Histórico' },
          ].map(a => (
            <button
              key={a.id}
              onClick={() => setAba(a.id as any)}
              className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
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
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-semibold text-gray-900">Linha do Tempo do Projeto</h3>
            {!emOperacional && (
              <button
                onClick={() => setNovaT(true)}
                className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
              >
                <Plus className="w-4 h-4" /> Adicionar Tarefa
              </button>
            )}
          </div>

          {/* Progresso visual */}
          {etapas.length > 0 && (
            <div className="mb-6 overflow-x-auto">
              <div className="flex items-center gap-1 pb-2 min-w-max">
                {etapas.map((etapa, idx) => {
                  const ts       = tarefasPorEtapa[etapa] || []
                  const concl    = ts.filter((t: any) => t.status === 'CONCLUIDA').length
                  const pct      = ts.length > 0 ? Math.round((concl / ts.length) * 100) : 0
                  const isDone   = pct === 100
                  return (
                    <div key={etapa} className="flex items-center gap-1 flex-shrink-0">
                      <div className={`flex flex-col items-center p-2 rounded-lg w-24 text-center ${isDone ? 'bg-green-50' : 'bg-gray-50'}`}>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mb-1 ${
                          isDone ? 'bg-green-600 text-white' : pct > 0 ? 'bg-yellow-400 text-white' : 'bg-gray-200 text-gray-600'
                        }`}>
                          {isDone ? <Check className="w-4 h-4" /> : idx + 1}
                        </div>
                        <span className={`text-xs font-medium truncate w-full ${isDone ? 'text-green-700' : 'text-gray-600'}`}>{etapa}</span>
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

          {/* Lista por etapa */}
          <div className="space-y-5">
            {etapas.length === 0 ? (
              <div className="text-center py-10 text-gray-400">
                {emOperacional ? (
                  <>
                    <Settings2 className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Use o painel acima para planejar as tarefas de execução.</p>
                  </>
                ) : (
                  <>
                    <Clock className="w-10 h-10 mx-auto mb-2 opacity-30" />
                    <p>Nenhuma tarefa cadastrada ainda.</p>
                    <button onClick={() => setNovaT(true)} className="mt-2 text-green-600 hover:text-green-700 text-sm font-medium">
                      Adicionar primeira tarefa
                    </button>
                  </>
                )}
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
                          tarefa.status === 'CONCLUIDA'
                            ? 'bg-green-50 border-green-100'
                            : tarefa.status === 'ATRASADA'
                            ? 'bg-red-50 border-red-100'
                            : 'bg-white border-gray-100 hover:border-gray-200'
                        }`}
                      >
                        <button
                          onClick={() => atualizarTarefa(tarefa.id, tarefa.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA')}
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
                              {tarefa.responsavel && <span className="text-xs text-gray-400">{tarefa.responsavel.nome}</span>}
                              {tarefa.prazo && <span className="text-xs text-gray-400">{formatDate(tarefa.prazo)}</span>}
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

          {/* Formulário nova tarefa avulsa */}
          {novaT && (
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
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
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
                  <button
                    onClick={criarTarefa}
                    disabled={salvandoT}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    {salvandoT && <Loader2 className="w-3 h-3 animate-spin" />}
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

      {/* ── Tarefas (lista flat) ───────────────────────────── */}
      {aba === 'tarefas' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Todas as Tarefas</h3>
            {!emOperacional && (
              <button onClick={() => setNovaT(true)} className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium">
                <Plus className="w-4 h-4" /> Nova Tarefa
              </button>
            )}
          </div>
          <div className="space-y-2">
            {projeto.tarefas?.length === 0 ? (
              <p className="text-center py-8 text-gray-400">Nenhuma tarefa cadastrada</p>
            ) : (
              projeto.tarefas?.map((tarefa: any) => (
                <div key={tarefa.id} className={`flex items-center gap-3 p-3 rounded-xl border ${tarefa.status === 'CONCLUIDA' ? 'border-green-100 bg-green-50' : 'border-gray-100'}`}>
                  <button
                    onClick={() => atualizarTarefa(tarefa.id, tarefa.status === 'CONCLUIDA' ? 'PENDENTE' : 'CONCLUIDA')}
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${tarefa.status === 'CONCLUIDA' ? 'bg-green-600 border-green-600' : 'border-gray-300'}`}
                  >
                    {tarefa.status === 'CONCLUIDA' && <Check className="w-3 h-3 text-white" />}
                  </button>
                  <div className="flex-1">
                    <p className={`text-sm ${tarefa.status === 'CONCLUIDA' ? 'line-through text-gray-400' : 'text-gray-900 font-medium'}`}>
                      {tarefa.titulo}
                    </p>
                    <div className="flex gap-3 text-xs text-gray-400 mt-0.5">
                      {tarefa.etapa      && <span>{tarefa.etapa}</span>}
                      {tarefa.responsavel && <span>{tarefa.responsavel.nome}</span>}
                      {tarefa.prazo      && <span>{formatDate(tarefa.prazo)}</span>}
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

      {/* ── Documentos ────────────────────────────────────── */}
      {aba === 'documentos' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Documentos</h3>
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
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:text-green-700 font-medium">
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
