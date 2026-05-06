'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, MapPin, Calendar, Clock, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { formatDate } from '@/lib/utils'
import { ModalVistoria } from '@/components/modals/ModalVistoria'

const STATUS_VISTORIA_LABELS: Record<string, string> = {
  AGENDADA: 'Agendada', EM_ANDAMENTO: 'Em Andamento', REALIZADA: 'Realizada',
  CANCELADA: 'Cancelada', ADIADA: 'Adiada'
}
const STATUS_VISTORIA_COLORS: Record<string, string> = {
  AGENDADA: 'bg-blue-100 text-blue-800', EM_ANDAMENTO: 'bg-yellow-100 text-yellow-800',
  REALIZADA: 'bg-green-100 text-green-800', CANCELADA: 'bg-red-100 text-red-800',
  ADIADA: 'bg-orange-100 text-orange-800'
}

export default function CampoPage() {
  const [vistorias, setVistorias]       = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [modalOpen, setModalOpen]       = useState(false)
  const [filtro, setFiltro]             = useState('')
  const [visualizacao, setVisualizacao] = useState<'lista' | 'calendario'>('lista')

  // Solicitações de vistoria vindas do operacional
  const [solicitacoes, setSolicitacoes]   = useState<any[]>([])
  const [datasSol, setDatasSol]           = useState<Record<string, string>>({})  // tarefaId → data
  const [salvandoSol, setSalvandoSol]     = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtro) params.set('status', filtro)
      const [resV, resS] = await Promise.all([
        fetch(`/api/vistorias?${params}`),
        fetch('/api/tarefas?solicitadasCampo=true'),
      ])
      if (resV.ok) setVistorias((await resV.json()).vistorias)
      if (resS.ok) {
        const d = await resS.json()
        setSolicitacoes(d.tarefas || [])
      }
    } catch { toast.error('Erro ao carregar dados') }
    finally { setLoading(false) }
  }, [filtro])

  useEffect(() => { load() }, [load])

  async function definirDataCampo(tarefaId: string) {
    const data = datasSol[tarefaId]
    if (!data) { toast.error('Informe a data antes de confirmar'); return }
    setSalvandoSol(tarefaId)
    try {
      const res = await fetch('/api/tarefas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tarefaId, dataCampo: data }),
      })
      if (!res.ok) { const d = await res.json(); toast.error(d.error); return }
      toast.success('Data confirmada! Operacional foi notificado.')
      load()
    } catch { toast.error('Erro ao confirmar data') }
    finally { setSalvandoSol(null) }
  }

  async function atualizarStatus(id: string, status: string) {
    try {
      const res = await fetch(`/api/vistorias/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error()
      toast.success('Status atualizado')
      load()
    } catch { toast.error('Erro') }
  }

  // Próximas 30 dias
  const hoje = new Date()
  const proximas30 = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)
  const proximasVistorias = vistorias.filter(v =>
    new Date(v.dataAgendada) >= hoje && new Date(v.dataAgendada) <= proximas30 && v.status === 'AGENDADA'
  )

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Campo</h1>
          <p className="text-gray-500 text-sm mt-1">{vistorias.length} vistoria(s) registrada(s)</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Agendar Vistoria
        </button>
      </div>

      {/* ── Solicitações de vistoria do Operacional ──────────────── */}
      {solicitacoes.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 bg-blue-100/60 border-b border-blue-200">
            <AlertCircle className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <h3 className="font-semibold text-blue-900 text-sm">
              Solicitações de Vistoria do Operacional
            </h3>
            <span className="ml-auto bg-blue-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              {solicitacoes.length}
            </span>
          </div>
          <div className="divide-y divide-blue-100">
            {solicitacoes.map(tarefa => (
              <div key={tarefa.id} className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-mono text-xs text-gray-400">{tarefa.projeto?.codigo}</span>
                    <span className="text-xs text-gray-400">•</span>
                    <span className="text-xs text-gray-500">{tarefa.projeto?.imovelNome}</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{tarefa.titulo}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tarefa.etapa && <span className="mr-2">{tarefa.etapa}</span>}
                    {tarefa.projeto?.municipio && `📍 ${tarefa.projeto.municipio}${tarefa.projeto.estado ? `/${tarefa.projeto.estado}` : ''}`}
                  </p>
                </div>
                {/* Campo define a data */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  <input
                    type="date"
                    value={datasSol[tarefa.id] || ''}
                    onChange={e => setDatasSol(prev => ({ ...prev, [tarefa.id]: e.target.value }))}
                    min={new Date().toISOString().split('T')[0]}
                    className="border border-blue-300 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  />
                  <button
                    onClick={() => definirDataCampo(tarefa.id)}
                    disabled={salvandoSol === tarefa.id || !datasSol[tarefa.id]}
                    className="flex items-center gap-1.5 px-4 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-sm font-semibold rounded-lg transition-colors"
                  >
                    {salvandoSol === tarefa.id
                      ? <Loader2 className="w-4 h-4 animate-spin" />
                      : <CheckCircle2 className="w-4 h-4" />
                    }
                    Confirmar data
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cards resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Object.entries(STATUS_VISTORIA_LABELS).map(([status, label]) => (
          <div key={status} className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">
              {vistorias.filter(v => v.status === status).length}
            </p>
            <p className="text-xs text-gray-400 mt-1">{label}</p>
          </div>
        ))}
      </div>

      {/* Próximas vistorias destaque */}
      {proximasVistorias.length > 0 && (
        <div className="bg-blue-50 rounded-2xl border border-blue-100 p-4">
          <h3 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Próximas vistorias (30 dias)
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {proximasVistorias.slice(0, 6).map(v => (
              <div key={v.id} className="bg-white rounded-xl p-3 border border-blue-100">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs text-gray-400">{v.projeto?.codigo}</span>
                  <span className="text-xs text-blue-600 font-medium">{formatDate(v.dataAgendada)}</span>
                </div>
                <p className="text-sm font-medium text-gray-900">{v.titulo}</p>
                <p className="text-xs text-gray-400">{v.municipio || v.projeto?.municipio}</p>
                {v.responsavel && (
                  <p className="text-xs text-gray-400 mt-1">👤 {v.responsavel.nome}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFiltro('')} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!filtro ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
          Todas
        </button>
        {Object.entries(STATUS_VISTORIA_LABELS).map(([k, v]) => (
          <button key={k} onClick={() => setFiltro(k)} className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filtro === k ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}>
            {v}
          </button>
        ))}
      </div>

      {/* Lista de vistorias */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : vistorias.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <MapPin className="w-12 h-12 mx-auto mb-3 opacity-40" />
          <p>Nenhuma vistoria encontrada</p>
        </div>
      ) : (
        <div className="space-y-3">
          {vistorias.map((v) => (
            <div key={v.id} className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-sm transition-shadow">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-gray-400">{v.projeto?.codigo}</span>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_VISTORIA_COLORS[v.status]}`}>
                      {STATUS_VISTORIA_LABELS[v.status]}
                    </span>
                  </div>
                  <p className="font-semibold text-gray-900">{v.titulo}</p>
                  <p className="text-sm text-gray-500">{v.projeto?.imovelNome}</p>
                  <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      {formatDate(v.dataAgendada)}
                    </span>
                    {v.municipio && (
                      <span className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {v.municipio}
                      </span>
                    )}
                    {v.responsavel && (
                      <span>👤 {v.responsavel.nome}</span>
                    )}
                    {v.gastos?.length > 0 && (
                      <span>💰 {v.gastos.length} gasto(s)</span>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <select
                    value={v.status}
                    onChange={(e) => atualizarStatus(v.id, e.target.value)}
                    className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-1 focus:ring-green-500"
                  >
                    {Object.entries(STATUS_VISTORIA_LABELS).map(([k, label]) => (
                      <option key={k} value={k}>{label}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <ModalVistoria
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSalvo={() => { setModalOpen(false); load() }}
      />
    </div>
  )
}
