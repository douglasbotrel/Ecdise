'use client'

<<<<<<< HEAD
import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Check, Clock, AlertCircle,
  FileText, MapPin, DollarSign, User, Calendar, Edit2, Loader2
} from 'lucide-react'
import { formatDate, formatCurrency, STATUS_OPERACIONAL_LABELS, STATUS_COLORS, STATUS_TAREFA_LABELS } from '@/lib/utils'

const ETAPAS_PADRAO = ['CAR', 'USO', 'PA', 'VISTORIA', 'DOCS', 'PROTOCOLO', 'FINALIZAÇÃO']
=======
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
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce

export default function ProjetoDetalhe() {
  const params = useParams()
  const router = useRouter()
<<<<<<< HEAD
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
=======
  const id     = params.id as string

  const [projeto, setProjeto]       = useState<any>(null)
  const [loading, setLoading]       = useState(true)
  const [aba, setAba]               = useState<'timeline' | 'tarefas' | 'documentos' | 'historico'>('timeline')
  const [usuarios, setUsuarios]     = useState<any[]>([])

  // Edição inline de prazo/responsável (modo atribuição)
  const [editando, setEditando]     = useState<Record<string, TarefaEdit>>({})
  const [salvandoId, setSalvandoId] = useState<string | null>(null)
  // Nova tarefa avulsa
  const [novaT, setNovaT]           = useState(false)
  const [formTarefa, setFormTarefa] = useState({ titulo: '', etapa: '', prazo: '', responsavelId: '' })
  const [salvandoT, setSalvandoT]   = useState(false)

  // Usuário logado (para controle de permissões)
  const [currentUser, setCurrentUser]       = useState<any>(null)
  // Responsável em lote
  const [bulkResponsavelId, setBulkResponsavelId] = useState('')
  const [salvandoBulk, setSalvandoBulk]           = useState(false)

  // Etapas que têm acesso ao módulo Operacional (após primeiro pagamento)
  const ETAPAS_VALIDAS    = ['OPERACIONAL', 'EM_EXECUCAO', 'CONCLUIDO']
  const ROLES_GESTOR      = ['ADMIN', 'GESTOR_GERAL', 'GESTOR_OPERACIONAL', 'SUPERVISOR']
  const HOJE_STR          = new Date().toISOString().split('T')[0]
  const MAX_DATE_STR      = `${new Date().getFullYear() + 5}-12-31`

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
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
      setProjeto(data.projeto)
    } catch {
      toast.error('Erro ao carregar projeto')
    } finally {
      setLoading(false)
    }
<<<<<<< HEAD
  }

  async function atualizarStatus(novoStatus: string) {
    try {
      await fetch(`/api/projetos/${params.id}`, {
=======
  }, [id, router])

  useEffect(() => {
    loadProjeto()
    fetch('/api/usuarios?ativo=true')
      .then(r => r.json())
      .then(d => setUsuarios(d.usuarios || []))
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => setCurrentUser(d.usuario || null))
  }, [loadProjeto])

  // Inicializa estado de edição quando projeto carrega (qualquer etapa)
  useEffect(() => {
    if (!projeto) return
    setEditando(prev => {
      const next = { ...prev }
      ;(projeto.tarefas || []).forEach((t: any) => {
        // só inicializa se ainda não tem estado local (evita sobrescrever edições em curso)
        if (!next[t.id]) {
          next[t.id] = {
            prazo: t.prazo ? t.prazo.split('T')[0] : '',
            responsavelId: t.responsavelId || '',
          }
        }
      })
      return next
    })
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

  // ── Aplicar responsável a todas as tarefas sem responsável ───
  async function aplicarBulkResponsavel() {
    if (!bulkResponsavelId) { toast.error('Selecione um responsável'); return }
    const semResponsavel = (projeto?.tarefas || []).filter((t: any) => !t.responsavelId)
    if (semResponsavel.length === 0) { toast.info('Todas as tarefas já têm responsável'); return }
    setSalvandoBulk(true)
    try {
      await Promise.all(semResponsavel.map((t: any) =>
        fetch('/api/tarefas', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: t.id, responsavelId: bulkResponsavelId }),
        })
      ))
      setEditando(prev => {
        const next = { ...prev }
        semResponsavel.forEach((t: any) => {
          next[t.id] = { ...next[t.id], responsavelId: bulkResponsavelId }
        })
        return next
      })
      toast.success(`Responsável definido para ${semResponsavel.length} tarefa(s)!`)
      loadProjeto()
    } catch { toast.error('Erro ao aplicar em massa') }
    finally { setSalvandoBulk(false) }
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
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ statusOperacional: novoStatus }),
      })
      toast.success('Status atualizado')
      loadProjeto()
    } catch { toast.error('Erro') }
  }

<<<<<<< HEAD
  async function criarTarefa() {
    if (!formTarefa.titulo) { toast.error('Título obrigatório'); return }
    setSalvando(true)
    try {
      const res = await fetch('/api/tarefas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projetoId: params.id,
=======
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
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
          titulo: formTarefa.titulo,
          etapa: formTarefa.etapa,
          prazo: formTarefa.prazo || null,
          responsavelId: formTarefa.responsavelId || null,
          ordem: (projeto?.tarefas?.length || 0) + 1,
        }),
      })
<<<<<<< HEAD
      if (!res.ok) throw new Error()
=======
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
      toast.success('Tarefa criada')
      setNovaT(false)
      setFormTarefa({ titulo: '', etapa: '', prazo: '', responsavelId: '' })
      loadProjeto()
    } catch { toast.error('Erro ao criar tarefa') }
<<<<<<< HEAD
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
=======
    finally { setSalvandoT(false) }
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
<<<<<<< HEAD

  if (!projeto) return null

  // Agrupa tarefas por etapa para a timeline
  const tarefasPorEtapa = projeto.tarefas?.reduce((acc: any, t: any) => {
=======
  if (!projeto) return null

  const emOperacional = projeto.etapaPipeline === 'OPERACIONAL'
  const modoGestor   = ROLES_GESTOR.includes(currentUser?.role)
  // Gestores podem editar em qualquer etapa válida
  const modoEdicao   = emOperacional || (modoGestor && ETAPAS_VALIDAS.includes(projeto.etapaPipeline))
  const tarefas       = projeto.tarefas || []

  // Helper para exibir nome completo no select de usuário
  function labelUsuario(u: any) {
    const partes = [u.nome]
    if (u.cargo) partes.push(u.cargo)
    return partes.join(' — ')
  }

  const tarefasPorEtapa = tarefas.reduce((acc: any, t: any) => {
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
    const etapa = t.etapa || 'GERAL'
    if (!acc[etapa]) acc[etapa] = []
    acc[etapa].push(t)
    return acc
  }, {})
<<<<<<< HEAD

  const etapas = Object.keys(tarefasPorEtapa || {})

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        <button
          onClick={() => router.push('/operacional')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 font-medium text-sm"
=======
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
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </button>
<<<<<<< HEAD
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
=======

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
      {modoEdicao && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl overflow-hidden">
          {/* Header do banner */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 sm:px-6 py-4 border-b border-amber-200">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-0.5">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <h2 className="font-bold text-amber-900 text-sm sm:text-base">
                  {emOperacional ? 'Defina prazos e responsáveis' : 'Gerenciar Atividades'}
                </h2>
              </div>
              <p className="text-xs text-amber-700">
                {emOperacional
                  ? 'Atribua prazos e responsáveis. Execução inicia ao 1º check.'
                  : 'Gestores podem editar responsáveis e prazos a qualquer momento.'}
              </p>
            </div>
            <div className="text-center flex-shrink-0">
              <div className="text-lg font-bold text-amber-700">{pctAtribuido}%</div>
              <div className="text-xs text-amber-600">atribuído</div>
              <div className="text-xs text-amber-500 mt-0.5">execução inicia ao 1º check</div>
            </div>
          </div>

          {/* Linha de responsável em lote */}
          <div className="px-4 sm:px-6 py-3 bg-amber-100/40 border-b border-amber-200 flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <span className="text-xs font-semibold text-amber-800 whitespace-nowrap">Definir para todas:</span>
            <select
              value={bulkResponsavelId}
              onChange={e => setBulkResponsavelId(e.target.value)}
              className="flex-1 border border-amber-300 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white min-w-0"
            >
              <option value="">Selecione um responsável...</option>
              {usuarios.map(u => (
                <option key={u.id} value={u.id}>{labelUsuario(u)}</option>
              ))}
            </select>
            <button
              onClick={aplicarBulkResponsavel}
              disabled={salvandoBulk || !bulkResponsavelId}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex-shrink-0"
            >
              {salvandoBulk ? <Loader2 className="w-3 h-3 animate-spin" /> : <User className="w-3 h-3" />}
              Aplicar às sem responsável
            </button>
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
                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white min-w-36 sm:w-52"
                              >
                                <option value="">Responsável...</option>
                                {usuarios.map(u => (
                                  <option key={u.id} value={u.id}>{labelUsuario(u)}</option>
                                ))}
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
                            <div className="ml-4 flex flex-col xs:flex-row gap-2 sm:flex-row sm:items-center flex-wrap">
                              <input
                                type="date"
                                value={edit.prazo}
                                min={HOJE_STR}
                                max={MAX_DATE_STR}
                                onChange={e => {
                                  const val = e.target.value
                                  const ano = parseInt(val.split('-')[0] || '0', 10)
                                  if (val && (ano < new Date().getFullYear() || ano > new Date().getFullYear() + 5)) return
                                  setEditando(prev => ({
                                    ...prev, [tarefa.id]: { ...prev[tarefa.id], prazo: val },
                                  }))
                                }}
                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400"
                              />
                              <select
                                value={edit.responsavelId}
                                onChange={e => setEditando(prev => ({
                                  ...prev, [tarefa.id]: { ...prev[tarefa.id], responsavelId: e.target.value },
                                }))}
                                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-amber-400 bg-white min-w-36 sm:w-52"
                              >
                                <option value="">Responsável...</option>
                                {usuarios.map(u => (
                                  <option key={u.id} value={u.id}>{labelUsuario(u)}</option>
                                ))}
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
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
                  ? 'border-green-600 text-green-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
<<<<<<< HEAD
              {aba.label}
=======
              {a.label}
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
            </button>
          ))}
        </div>
      </div>

<<<<<<< HEAD
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
=======
      {/* ── Linha do Tempo ─────────────────────────────────── */}
      {aba === 'timeline' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Linha do Tempo</h3>
            {modoGestor && (
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
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}

<<<<<<< HEAD
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
=======
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
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
                  <div className="space-y-2">
                    {tarefasPorEtapa[etapa].map((tarefa: any) => (
                      <div
                        key={tarefa.id}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-colors ${
<<<<<<< HEAD
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
=======
                          tarefa.status === 'CONCLUIDA' ? 'bg-green-50 border-green-100'
                          : tarefa.status === 'ATRASADA' ? 'bg-red-50 border-red-100'
                          : 'bg-white border-gray-100'
                        }`}
                      >
                        <button
                          onClick={() => toggleTarefa(tarefa.id, tarefa.status)}
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
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
<<<<<<< HEAD
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
=======
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
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
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

<<<<<<< HEAD
          {/* Form nova tarefa */}
          {novaT && (
=======
          {/* Form nova tarefa (gestores podem adicionar a qualquer momento) */}
          {novaT && modoGestor && (
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
            <div className="mt-4 p-4 border-2 border-dashed border-green-200 rounded-xl bg-green-50/50">
              <h4 className="text-sm font-semibold text-gray-700 mb-3">Nova Tarefa</h4>
              <div className="space-y-3">
                <input
                  type="text"
                  value={formTarefa.titulo}
<<<<<<< HEAD
                  onChange={(e) => setFormTarefa(p => ({ ...p, titulo: e.target.value }))}
=======
                  onChange={e => setFormTarefa(p => ({ ...p, titulo: e.target.value }))}
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
                  placeholder="Título da tarefa *"
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
<<<<<<< HEAD
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
=======
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
                    min={HOJE_STR}
                    max={MAX_DATE_STR}
                    onChange={e => setFormTarefa(p => ({ ...p, prazo: e.target.value }))}
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                  <select
                    value={formTarefa.responsavelId}
<<<<<<< HEAD
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
=======
                    onChange={e => setFormTarefa(p => ({ ...p, responsavelId: e.target.value }))}
                    className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-green-500 bg-white"
                  >
                    <option value="">Responsável</option>
                    {usuarios.map(u => (
                      <option key={u.id} value={u.id}>{labelUsuario(u)}</option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <button onClick={criarTarefa} disabled={salvandoT}
                    className="flex items-center gap-1.5 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors">
                    {salvandoT && <Loader2 className="w-3 h-3 animate-spin" />} Salvar
                  </button>
                  <button onClick={() => setNovaT(false)}
                    className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors">
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

<<<<<<< HEAD
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
=======
      {/* ── Tarefas flat ─────────────────────────────────────  */}
      {aba === 'tarefas' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Todas as Tarefas</h3>
            {modoGestor && (
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
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
                    {STATUS_TAREFA_LABELS[tarefa.status]}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}

<<<<<<< HEAD
      {abaNativa === 'documentos' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Documentos</h3>
          </div>
          {projeto.documentos?.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>Nenhum documento enviado</p>
=======
      {/* ── Documentos ────────────────────────────────────── */}
      {aba === 'documentos' && (
        <div className="bg-white rounded-2xl border border-gray-100 p-4 sm:p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Documentos</h3>
          {projeto.documentos?.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Nenhum documento enviado</p>
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {projeto.documentos?.map((doc: any) => (
                <div key={doc.id} className="flex items-center gap-3 py-3">
                  <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
<<<<<<< HEAD
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{doc.nome}</p>
                    <p className="text-xs text-gray-400">{doc.categoria} • {doc.usuario?.nome} • {formatDate(doc.criadoEm)}</p>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:text-green-700 font-medium">
=======
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.nome}</p>
                    <p className="text-xs text-gray-400">{doc.categoria} • {doc.usuario?.nome}</p>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer"
                    className="text-xs text-green-600 hover:text-green-700 font-medium flex-shrink-0">
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
                    Abrir
                  </a>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

<<<<<<< HEAD
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
=======
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
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
