'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  ArrowLeft, Plus, Check, FileText, BarChart2, MapPin,
  Calendar, Loader2, Award, Clock, Trash2,
  X, Home, Hash, ChevronDown, ChevronUp, AlertTriangle,
} from 'lucide-react'
import { formatDate } from '@/lib/utils'

// ── Categorização visual das pendências (calculada a partir de status + prazo) ──
type CategoriaPendencia = 'ativa' | 'a_vencer' | 'atrasada' | 'respondida'

const CATEGORIA_INFO: Record<CategoriaPendencia, {
  label: string; barColor: string; badgeColor: string; headerBg: string
}> = {
  ativa:      { label: 'Ativa',      barColor: 'bg-blue-500',  badgeColor: 'bg-blue-100 text-blue-700',   headerBg: 'bg-blue-50/50' },
  a_vencer:   { label: 'A Vencer',   barColor: 'bg-amber-500', badgeColor: 'bg-amber-100 text-amber-800', headerBg: 'bg-amber-50/50' },
  atrasada:   { label: 'Atrasada',   barColor: 'bg-red-500',   badgeColor: 'bg-red-100 text-red-700',     headerBg: 'bg-red-50/50' },
  respondida: { label: 'Respondida', barColor: 'bg-green-500', badgeColor: 'bg-green-100 text-green-800', headerBg: 'bg-green-50/50' },
}

function categoriaPendencia(pendencia: any): CategoriaPendencia {
  if (pendencia.status === 'CONCLUIDA') return 'respondida'
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)
  const prazo = new Date(pendencia.prazoResposta)
  prazo.setHours(0, 0, 0, 0)
  const diffDias = Math.ceil((prazo.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
  if (diffDias < 0) return 'atrasada'
  if (diffDias <= 7) return 'a_vencer'
  return 'ativa'
}

export default function AcompanhamentoDetalhe() {
  const params = useParams()
  const router = useRouter()
  const id     = params.id as string

  const [projeto, setProjeto] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [usuarios, setUsuarios] = useState<any[]>([])

  // Toggle de ação individual (mostra spinner na linha)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  // Override manual de expandir/retrair cada card de pendência (chave = pendencia.id)
  const [expandedOverride, setExpandedOverride] = useState<Record<string, boolean>>({})

  // Modal Nova Pendência
  const [modalPendencia, setModalPendencia]   = useState(false)
  const [pendenciaForm, setPendenciaForm]     = useState({
    numeroPedido: '', data: '', prazoResposta: '',
    acoes: [{ descricao: '', responsavelId: '' }] as { descricao: string; responsavelId: string }[],
  })
  const [salvandoPendencia, setSalvandoPendencia] = useState(false)

  // Modal Licença Concedida
  const [modalLicenca, setModalLicenca]   = useState(false)
  const [licencaForm, setLicencaForm]     = useState({
    numero: '', dataEmissao: '', dataValidade: '', condicionantes: '', documentoUrl: '',
  })
  const [salvandoLicenca, setSalvandoLicenca] = useState(false)

  const HOJE_STR = new Date().toISOString().split('T')[0]

  const loadProjeto = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/projetos/${id}`)
      if (!res.ok) { router.push('/acompanhamento'); return }
      const data = await res.json()
      if (!data.projeto?.emAcompanhamento) {
        toast.error('Este projeto ainda não está em acompanhamento de processos')
        router.push('/acompanhamento')
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
    fetch('/api/usuarios?ativo=true').then(r => r.json()).then(d => setUsuarios(d.usuarios || []))
  }, [loadProjeto])

  function labelUsuario(u: any) {
    const partes = [u.nome]
    if (u.cargo) partes.push(u.cargo)
    return partes.join(' — ')
  }

  function servicoPrestado(p: any) {
    if (p?.servicosContratados) {
      try {
        const lista = JSON.parse(p.servicosContratados)
        if (Array.isArray(lista) && lista.length > 0) return lista.join(', ')
      } catch {}
    }
    return p?.tipoServico
  }

  // ── Expandir/retrair card de pendência (Concluídas iniciam retraídas) ──
  function isExpanded(pendencia: any) {
    if (pendencia.id in expandedOverride) return expandedOverride[pendencia.id]
    return pendencia.status !== 'CONCLUIDA'
  }
  function toggleExpand(pendenciaId: string, atual: boolean) {
    setExpandedOverride(prev => ({ ...prev, [pendenciaId]: !atual }))
  }

  // ── Marcar/desmarcar ação dentro de uma pendência ──────────────
  async function toggleAcao(acaoId: string, atual: boolean, pendenciaStatus: string) {
    if (pendenciaStatus === 'CONCLUIDA') {
      toast.info('Esta pendência já foi concluída e está disponível apenas para leitura')
      return
    }
    setTogglingId(acaoId)
    // Otimista
    setProjeto((prev: any) => ({
      ...prev,
      pendencias: prev.pendencias.map((pd: any) => ({
        ...pd,
        acoes: pd.acoes.map((a: any) => a.id === acaoId ? { ...a, concluida: !atual } : a),
      })),
    }))
    try {
      const res = await fetch('/api/acoes', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: acaoId, concluida: !atual }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || 'Erro ao atualizar ação')
        loadProjeto()
        return
      }
      const data = await res.json()
      if (data.pendencia) {
        toast.success('✅ Todas as ações concluídas — pendência encerrada!')
      }
      loadProjeto()
    } catch {
      toast.error('Erro ao atualizar ação')
      loadProjeto()
    } finally {
      setTogglingId(null)
    }
  }

  // ── Form Nova Pendência: ações dinâmicas ───────────────────────
  function adicionarAcaoForm() {
    setPendenciaForm(p => ({ ...p, acoes: [...p.acoes, { descricao: '', responsavelId: '' }] }))
  }
  function removerAcaoForm(idx: number) {
    setPendenciaForm(p => ({ ...p, acoes: p.acoes.filter((_, i) => i !== idx) }))
  }
  function atualizarAcaoForm(idx: number, campo: 'descricao' | 'responsavelId', valor: string) {
    setPendenciaForm(p => ({
      ...p,
      acoes: p.acoes.map((a, i) => i === idx ? { ...a, [campo]: valor } : a),
    }))
  }

  async function criarPendencia() {
    if (!pendenciaForm.numeroPedido.trim() || !pendenciaForm.data || !pendenciaForm.prazoResposta) {
      toast.error('Preencha número do pedido, data e prazo de resposta')
      return
    }
    const acoesValidas = pendenciaForm.acoes.filter(a => a.descricao.trim())
    if (acoesValidas.length === 0) {
      toast.error('Adicione pelo menos uma ação')
      return
    }
    setSalvandoPendencia(true)
    try {
      const res = await fetch('/api/pendencias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projetoId: id,
          numeroPedido: pendenciaForm.numeroPedido.trim(),
          data: pendenciaForm.data,
          prazoResposta: pendenciaForm.prazoResposta,
          acoes: acoesValidas,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || 'Erro ao criar pendência')
        return
      }
      toast.success('Pendência criada!')
      setModalPendencia(false)
      setPendenciaForm({ numeroPedido: '', data: '', prazoResposta: '', acoes: [{ descricao: '', responsavelId: '' }] })
      loadProjeto()
    } catch {
      toast.error('Erro ao criar pendência')
    } finally {
      setSalvandoPendencia(false)
    }
  }

  // ── Licença concedida ───────────────────────────────────────────
  function abrirModalLicenca() {
    setLicencaForm({
      numero: projeto?.licenca?.numero || '',
      dataEmissao: projeto?.licenca?.dataEmissao ? projeto.licenca.dataEmissao.split('T')[0] : HOJE_STR,
      dataValidade: projeto?.licenca?.dataValidade ? projeto.licenca.dataValidade.split('T')[0] : '',
      condicionantes: projeto?.licenca?.condicionantes || '',
      documentoUrl: projeto?.licenca?.documentoUrl || '',
    })
    setModalLicenca(true)
  }

  async function salvarLicenca() {
    if (!licencaForm.numero.trim() || !licencaForm.dataEmissao) {
      toast.error('Informe o número da licença e a data de emissão')
      return
    }
    setSalvandoLicenca(true)
    try {
      const res = await fetch('/api/licencas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projetoId: id,
          numero: licencaForm.numero.trim(),
          dataEmissao: licencaForm.dataEmissao,
          dataValidade: licencaForm.dataValidade || null,
          condicionantes: licencaForm.condicionantes || null,
          documentoUrl: licencaForm.documentoUrl || null,
        }),
      })
      if (!res.ok) {
        const d = await res.json()
        toast.error(d.error || 'Erro ao registrar licença')
        return
      }
      toast.success('🎉 Licença registrada com sucesso!')
      setModalLicenca(false)
      loadProjeto()
    } catch {
      toast.error('Erro ao registrar licença')
    } finally {
      setSalvandoLicenca(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }
  if (!projeto) return null

  const pendencias = projeto.pendencias || []
  const licenciado  = !!projeto.licenca

  return (
    <div className="flex flex-col gap-5">

      {/* ── Header ──────────────────────────────────────────── */}
      <div className="flex flex-col gap-3">
        <button
          onClick={() => router.push('/acompanhamento')}
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
              {licenciado ? (
                <span className="flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                  <Award className="w-3.5 h-3.5" /> Licenciado
                </span>
              ) : (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                  ⏳ Em processo
                </span>
              )}
              <span className="text-xs text-gray-500">{servicoPrestado(projeto)} • {projeto.municipio}</span>
            </div>
          </div>

          {!licenciado && (
            <button
              onClick={abrirModalLicenca}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors w-full sm:w-auto"
            >
              <Award className="w-4 h-4" /> Licença Concedida
            </button>
          )}
        </div>
      </div>

      {/* ── Info Cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1">
            <Home className="w-3.5 h-3.5" />
            <span className="text-xs">Fazenda</span>
          </div>
          <p className="font-semibold text-sm text-gray-900 truncate">{projeto.imovelNome || '—'}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1">
            <MapPin className="w-3.5 h-3.5" />
            <span className="text-xs">Localização</span>
          </div>
          <p className="font-semibold text-sm text-gray-900 truncate">
            {[projeto.municipio, projeto.estado].filter(Boolean).join(' / ') || '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1">
            <BarChart2 className="w-3.5 h-3.5" />
            <span className="text-xs">Área</span>
          </div>
          <p className="font-semibold text-sm text-gray-900 truncate">
            {projeto.areaHectares ? `${Number(projeto.areaHectares).toLocaleString('pt-BR')} ha` : '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1">
            <Hash className="w-3.5 h-3.5" />
            <span className="text-xs">Protocolo</span>
          </div>
          <p className="font-semibold text-sm text-gray-900 truncate">{projeto.protocoloCodigoOrgao || '—'}</p>
          {projeto.protocoloData && <p className="text-xs text-gray-400 mt-0.5">{formatDate(projeto.protocoloData)}</p>}
        </div>
      </div>

      {/* CAR — linha própria */}
      {projeto.car && (
        <div className="bg-white rounded-xl border border-gray-100 p-3 sm:p-4">
          <div className="flex items-center gap-1.5 text-gray-400 mb-1">
            <FileText className="w-3.5 h-3.5" />
            <span className="text-xs">CAR</span>
          </div>
          <p className="font-semibold text-sm text-gray-900 font-mono" style={{ wordBreak: 'break-all' }}>
            {projeto.car}
          </p>
        </div>
      )}

      {/* ── Status SIGLA (consulta automática) ─────────────────── */}
      <div className={`bg-white rounded-xl border p-3 sm:p-4 ${
        projeto.statusSIGLA ? 'border-blue-100' : 'border-gray-100'
      }`}>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="text-xs font-medium text-gray-500">🤖 Status SIGLA (automático)</span>
          </div>
          {projeto.ultimaConsultaSIGLA && (
            <span className="text-xs text-gray-400">
              Última consulta: {formatDate(projeto.ultimaConsultaSIGLA)}
            </span>
          )}
        </div>
        {projeto.statusSIGLA ? (
          <p className="mt-1 font-semibold text-sm text-blue-700 bg-blue-50 rounded-lg px-3 py-1.5 inline-block">
            {projeto.statusSIGLA}
          </p>
        ) : (
          <p className="mt-1 text-sm text-gray-400 italic">
            {projeto.emAcompanhamento
              ? 'Aguardando primeira consulta automática do script SIGLA'
              : 'Ative "Em acompanhamento" para iniciar as consultas automáticas'}
          </p>
        )}
      </div>

      {/* ── Licença concedida (se existir) ─────────────────────── */}
      {licenciado && (
        <div className="bg-white rounded-2xl border border-green-100 p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Award className="w-4 h-4 text-green-600" /> Licença
            </h3>
            <button
              onClick={abrirModalLicenca}
              className="text-xs text-green-600 hover:text-green-700 font-medium"
            >
              Editar
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <span className="text-xs text-gray-400">Número</span>
              <p className="font-semibold text-sm text-gray-900">{projeto.licenca.numero}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Data de Emissão</span>
              <p className="font-semibold text-sm text-gray-900">{formatDate(projeto.licenca.dataEmissao)}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Validade</span>
              <p className="font-semibold text-sm text-gray-900">{projeto.licenca.dataValidade ? formatDate(projeto.licenca.dataValidade) : '—'}</p>
            </div>
            <div>
              <span className="text-xs text-gray-400">Documento</span>
              {projeto.licenca.documentoUrl ? (
                <a href={projeto.licenca.documentoUrl} target="_blank" rel="noopener noreferrer" className="block font-semibold text-sm text-green-600 hover:underline truncate">
                  Abrir arquivo
                </a>
              ) : (
                <p className="font-semibold text-sm text-gray-400">—</p>
              )}
            </div>
          </div>
          {projeto.licenca.condicionantes && (
            <div className="mt-3 pt-3 border-t border-gray-50">
              <span className="text-xs text-gray-400">Condicionantes</span>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{projeto.licenca.condicionantes}</p>
            </div>
          )}
        </div>
      )}

      {/* ── Pendências ──────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">Pendências do Processo</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {pendencias.filter((p: any) => p.status === 'ABERTA').length} aberta(s) · {pendencias.length} no total
            </p>
          </div>
          {!licenciado && (
            <button
              onClick={() => setModalPendencia(true)}
              className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              <Plus className="w-4 h-4" /> Nova Pendência
            </button>
          )}
        </div>

        {pendencias.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 p-8 text-center">
            <Clock className="w-9 h-9 mx-auto mb-3 text-amber-300" />
            <p className="text-sm font-semibold text-gray-700 mb-1">Nenhuma pendência registrada</p>
            <p className="text-xs text-gray-400">
              Quando o órgão solicitar informações complementares, registre aqui.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {pendencias.map((pendencia: any) => {
              const totalAcoes = pendencia.acoes?.length || 0
              const concluidasAcoes = pendencia.acoes?.filter((a: any) => a.concluida).length || 0
              const isConcluida = pendencia.status === 'CONCLUIDA'
              const categoria = categoriaPendencia(pendencia)
              const catInfo = CATEGORIA_INFO[categoria]
              const expanded = isExpanded(pendencia)

              return (
                <div key={pendencia.id} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm flex">
                  {/* Barra lateral — categoria da pendência */}
                  <div className={`w-1.5 flex-shrink-0 ${catInfo.barColor}`} />

                  <div className="flex-1 min-w-0">
                    {/* Cabeçalho clicável (expandir/retrair) */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(pendencia.id, expanded)}
                      className={`w-full px-4 sm:px-6 py-3 flex items-center gap-3 flex-wrap text-left transition-colors hover:brightness-[0.98] ${expanded ? 'border-b border-gray-50' : ''} ${catInfo.headerBg}`}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-gray-900 text-sm">Pedido {pendencia.numeroPedido}</span>
                        <span className={`flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full ${catInfo.badgeColor}`}>
                          {categoria === 'atrasada' && <AlertTriangle className="w-3 h-3" />}
                          {catInfo.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap ml-auto">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" /> {formatDate(pendencia.data)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5" /> Prazo: {formatDate(pendencia.prazoResposta)}
                        </span>
                        {pendencia.dataEntrega && (
                          <span className="flex items-center gap-1 text-green-700 font-medium">
                            <Check className="w-3.5 h-3.5" /> Entregue: {formatDate(pendencia.dataEntrega)}
                          </span>
                        )}
                      </div>

                      {expanded
                        ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
                    </button>

                    {expanded ? (
                      <>
                        {/* Progresso */}
                        <div className="px-4 sm:px-6 pt-3">
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs text-gray-400">{concluidasAcoes} de {totalAcoes} ações concluídas</span>
                          </div>
                          <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-500 ${isConcluida ? 'bg-green-500' : 'bg-amber-400'}`}
                              style={{ width: totalAcoes > 0 ? `${(concluidasAcoes / totalAcoes) * 100}%` : '0%' }}
                            />
                          </div>
                        </div>

                        {/* Lista de ações */}
                        <div className="px-4 sm:px-6 py-3 space-y-2">
                          {(pendencia.acoes || []).map((acao: any) => (
                            <div key={acao.id} className="flex items-start gap-3 py-1.5">
                              <button
                                onClick={() => toggleAcao(acao.id, acao.concluida, pendencia.status)}
                                disabled={isConcluida || togglingId === acao.id}
                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
                                  acao.concluida
                                    ? 'bg-green-600 border-green-600'
                                    : 'border-gray-300 hover:border-green-500'
                                } ${isConcluida ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
                              >
                                {togglingId === acao.id
                                  ? <Loader2 className="w-3 h-3 text-gray-400 animate-spin" />
                                  : acao.concluida && <Check className="w-3 h-3 text-white" />}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm leading-snug ${acao.concluida ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                                  {acao.descricao}
                                </p>
                                {acao.responsavel && (
                                  <span className="text-xs text-gray-400">{acao.responsavel.nome}</span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleExpand(pendencia.id, expanded)}
                        className="w-full px-4 sm:px-6 py-2.5 flex items-center justify-between text-left hover:bg-gray-50/60 transition-colors"
                      >
                        <span className="text-xs text-gray-400">{concluidasAcoes} de {totalAcoes} ações concluídas</span>
                        <span className="text-xs text-green-600 font-medium">Ver detalhes</span>
                      </button>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════════════════════
          MODAL NOVA PENDÊNCIA
          ══════════════════════════════════════════════════════ */}
      {modalPendencia && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-900">📌 Nova Pendência</h2>
                <p className="text-xs text-gray-500 mt-0.5">Solicitação de informações complementares do órgão</p>
              </div>
              <button
                onClick={() => setModalPendencia(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Número do Pedido</label>
                  <input
                    type="text"
                    value={pendenciaForm.numeroPedido}
                    onChange={e => setPendenciaForm(p => ({ ...p, numeroPedido: e.target.value }))}
                    placeholder="Ex: 001/2026"
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Data</label>
                  <input
                    type="date"
                    value={pendenciaForm.data}
                    onChange={e => setPendenciaForm(p => ({ ...p, data: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Prazo de Resposta</label>
                  <input
                    type="date"
                    value={pendenciaForm.prazoResposta}
                    onChange={e => setPendenciaForm(p => ({ ...p, prazoResposta: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2">
                ⚠️ O prazo de resposta é a data final para a entrega de todas as ações listadas abaixo.
              </p>

              {/* Ações */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-700">Ações a serem feitas</label>
                  <button
                    onClick={adicionarAcaoForm}
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700 font-medium"
                  >
                    <Plus className="w-3.5 h-3.5" /> Adicionar ação
                  </button>
                </div>
                <div className="space-y-2">
                  {pendenciaForm.acoes.map((acao, idx) => (
                    <div key={idx} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                      <div className="flex items-start gap-2">
                        <div className="flex-1 space-y-2">
                          <input
                            type="text"
                            value={acao.descricao}
                            onChange={e => atualizarAcaoForm(idx, 'descricao', e.target.value)}
                            placeholder="Breve descrição da ação"
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                          />
                          <select
                            value={acao.responsavelId}
                            onChange={e => atualizarAcaoForm(idx, 'responsavelId', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                          >
                            <option value="">Responsável...</option>
                            {usuarios.map(u => <option key={u.id} value={u.id}>{labelUsuario(u)}</option>)}
                          </select>
                        </div>
                        {pendenciaForm.acoes.length > 1 && (
                          <button
                            onClick={() => removerAcaoForm(idx)}
                            className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Ações do modal */}
            <div className="px-6 pb-5 pt-3 flex gap-2 flex-shrink-0 border-t border-gray-50">
              <button
                onClick={criarPendencia}
                disabled={salvandoPendencia}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {salvandoPendencia ? <Loader2 className="w-4 h-4 animate-spin" /> : '💾'}
                Salvar Pendência
              </button>
              <button
                onClick={() => setModalPendencia(false)}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════
          MODAL LICENÇA CONCEDIDA
          ══════════════════════════════════════════════════════ */}
      {modalLicenca && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 flex-shrink-0">
              <div>
                <h2 className="font-bold text-gray-900">🏅 Licença Concedida</h2>
                <p className="text-xs text-gray-500 mt-0.5">Registre os dados da licença emitida pelo órgão</p>
              </div>
              <button
                onClick={() => setModalLicenca(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário */}
            <div className="px-6 py-5 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Número da Licença</label>
                <input
                  type="text"
                  value={licencaForm.numero}
                  onChange={e => setLicencaForm(p => ({ ...p, numero: e.target.value }))}
                  placeholder="Ex: LO 1234/2026"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de Emissão</label>
                  <input
                    type="date"
                    value={licencaForm.dataEmissao}
                    onChange={e => setLicencaForm(p => ({ ...p, dataEmissao: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de Validade</label>
                  <input
                    type="date"
                    value={licencaForm.dataValidade}
                    onChange={e => setLicencaForm(p => ({ ...p, dataValidade: e.target.value }))}
                    className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Condicionantes</label>
                <textarea
                  value={licencaForm.condicionantes}
                  onChange={e => setLicencaForm(p => ({ ...p, condicionantes: e.target.value }))}
                  placeholder="Condições impostas pelo órgão para a manutenção da licença"
                  rows={3}
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Documento da Licença</label>
                <input
                  type="text"
                  value={licencaForm.documentoUrl}
                  onChange={e => setLicencaForm(p => ({ ...p, documentoUrl: e.target.value }))}
                  placeholder="Link/caminho do arquivo (upload em breve)"
                  className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  O upload direto de arquivo ainda será implementado — por ora, informe um link/caminho.
                </p>
              </div>
            </div>

            {/* Ações do modal */}
            <div className="px-6 pb-5 pt-3 flex gap-2 flex-shrink-0 border-t border-gray-50">
              <button
                onClick={salvarLicenca}
                disabled={salvandoLicenca}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                {salvandoLicenca ? <Loader2 className="w-4 h-4 animate-spin" /> : '💾'}
                Salvar Licença
              </button>
              <button
                onClick={() => setModalLicenca(false)}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
