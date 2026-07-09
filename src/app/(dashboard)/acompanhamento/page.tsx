'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Search, FileSearch, ChevronRight, MapPin, FileText,
  Award, AlertCircle, Upload, RefreshCw, Clock,
  Play, Terminal, X, AlertTriangle, CheckCircle2, HelpCircle,
} from 'lucide-react'

// ── Interpreta o statusSIGLA ──
type SiglaCategoria = 'exigencia' | 'ok' | 'sem_consulta'

function categorizarSIGLA(statusSIGLA: string | null): SiglaCategoria {
  if (!statusSIGLA) return 'sem_consulta'
  if (statusSIGLA.includes('Em exigência')) return 'exigencia'
  return 'ok'
}

export default function AcompanhamentoPage() {
  const [projetos, setProjetos]       = useState<any[]>([])
  const [loading, setLoading]         = useState(true)
  const [search, setSearch]           = useState('')
  const [modalRodar, setModalRodar]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('emAcompanhamento', 'true')
      if (search) params.set('search', search)
      const res = await fetch(`/api/projetos?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProjetos(data.projetos || [])
    } catch {
      toast.error('Erro ao carregar processos')
    } finally {
      setLoading(false)
    }
  }, [search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  function servicoPrestado(projeto: any) {
    if (projeto.servicosContratados) {
      try {
        const lista = JSON.parse(projeto.servicosContratados)
        if (Array.isArray(lista) && lista.length > 0) return lista.join(', ')
      } catch {}
    }
    return projeto.tipoServico
  }

  function formatDataConsulta(dt: string | null) {
    if (!dt) return null
    const d = new Date(dt)
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  // ── Separação em colunas ──
  const filtrar = (p: any) => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      p.codigo?.toLowerCase().includes(q) ||
      p.cliente?.nome?.toLowerCase().includes(q) ||
      p.imovelNome?.toLowerCase().includes(q) ||
      p.municipio?.toLowerCase().includes(q)
    )
  }

  const visiveis      = projetos.filter(filtrar)
  const pendentes     = visiveis.filter(p => categorizarSIGLA(p.statusSIGLA) === 'exigencia')
  const licenciados   = visiveis.filter(p => !!p.licenca)
  const okSemLicenca  = visiveis.filter(p => categorizarSIGLA(p.statusSIGLA) === 'ok' && !p.licenca)
  const semConsulta   = visiveis.filter(p => categorizarSIGLA(p.statusSIGLA) === 'sem_consulta')
  // Coluna direita: licenciados primeiro, depois ok, depois sem consulta
  const regulares     = [...licenciados, ...okSemLicenca, ...semConsulta]

  const total         = projetos.length
  const emExigencia   = projetos.filter(p => categorizarSIGLA(p.statusSIGLA) === 'exigencia').length
  const semPend       = projetos.filter(p => categorizarSIGLA(p.statusSIGLA) === 'ok').length
  const totalLicenc   = projetos.filter(p => !!p.licenca).length

  return (
    <div className="space-y-5">

      {/* ── Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Acompanhamento de Processos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitoramento automático via SIGLA — status atualizado diariamente
          </p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={() => setModalRodar(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 hover:bg-gray-900 text-white text-sm font-semibold rounded-xl transition-colors flex-1 sm:flex-none justify-center"
          >
            <Play className="w-4 h-4" />
            Verificar agora
          </button>
          <Link
            href="/acompanhamento/importar"
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors flex-1 sm:flex-none justify-center"
          >
            <Upload className="w-4 h-4" />
            Importar
          </Link>
        </div>
      </div>

      {/* ── Painel de resumo ──────────────────────────── */}
      {!loading && total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{total}</p>
            <p className="text-xs text-gray-500 mt-0.5">Total de processos</p>
          </div>
          <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{emExigencia}</p>
            <p className="text-xs text-red-500 mt-0.5">Em exigência</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{semPend}</p>
            <p className="text-xs text-green-500 mt-0.5">Sem pendências</p>
          </div>
          <div className="bg-emerald-50 rounded-xl border border-emerald-100 p-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{totalLicenc}</p>
            <p className="text-xs text-emerald-500 mt-0.5">Licença emitida</p>
          </div>
        </div>
      )}

      {/* ── Busca + Atualizar ─────────────────────────── */}
      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome, código ou município..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
          />
        </div>
        <button
          onClick={load}
          className="flex items-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors bg-white"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* ── Duas Colunas ──────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : total === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum processo em acompanhamento</p>
          <p className="text-sm mt-1">Use o botão <strong>Importar Processo</strong> para adicionar processos existentes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 items-start">

          {/* ── Coluna Esquerda: Pendências ──── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              <h2 className="font-bold text-gray-800 text-sm">
                Requer Atenção
              </h2>
              <span className="ml-auto text-xs font-semibold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">
                {pendentes.length}
              </span>
            </div>

            {pendentes.length === 0 ? (
              <div className="bg-red-50 border border-red-100 rounded-2xl p-8 text-center">
                <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-red-200" />
                <p className="text-sm text-red-400 font-medium">Nenhuma pendência no momento</p>
              </div>
            ) : (
              pendentes.map(projeto => (
                <ProjetoCard key={projeto.id} projeto={projeto} servicoPrestado={servicoPrestado} formatDataConsulta={formatDataConsulta} />
              ))
            )}
          </div>

          {/* ── Coluna Direita: OK + Licenciados ── */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 px-1">
              <CheckCircle2 className="w-4 h-4 text-green-500" />
              <h2 className="font-bold text-gray-800 text-sm">
                Status OK / Licença Emitida
              </h2>
              <span className="ml-auto text-xs font-semibold bg-green-100 text-green-600 px-2 py-0.5 rounded-full">
                {regulares.length}
              </span>
            </div>

            {regulares.length === 0 ? (
              <div className="bg-gray-50 border border-gray-100 rounded-2xl p-8 text-center">
                <HelpCircle className="w-10 h-10 mx-auto mb-2 text-gray-200" />
                <p className="text-sm text-gray-400 font-medium">Nenhum processo aqui ainda</p>
              </div>
            ) : (
              regulares.map(projeto => (
                <ProjetoCard key={projeto.id} projeto={projeto} servicoPrestado={servicoPrestado} formatDataConsulta={formatDataConsulta} />
              ))
            )}
          </div>

        </div>
      )}

      {/* ══ MODAL VERIFICAR AGORA ══════════════════════════ */}
      {modalRodar && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-xl">
                  <Terminal className="w-4 h-4 text-gray-600" />
                </div>
                <div>
                  <h2 className="font-bold text-gray-900">Verificar todos agora</h2>
                  <p className="text-xs text-gray-500 mt-0.5">O robô SIGLA roda no seu computador</p>
                </div>
              </div>
              <button onClick={() => setModalRodar(false)}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              <p className="text-sm text-gray-600">
                Não precisa abrir o VS Code nem digitar nada. Basta clicar duas vezes no arquivo abaixo:
              </p>
              <div className="bg-gray-900 rounded-xl px-4 py-4 flex items-start gap-3">
                <div className="text-2xl">📁</div>
                <div>
                  <p className="text-white text-sm font-semibold font-mono">verificar_agora.bat</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Pasta: <span className="font-mono">Ecdise\sigla_checker\</span>
                  </p>
                </div>
              </div>
              <div className="bg-amber-50 border border-amber-100 rounded-xl px-4 py-3 text-xs text-amber-800 space-y-1">
                <p className="font-semibold">📌 Como encontrar o arquivo</p>
                <p>Abra o explorador de arquivos → vá até a pasta do projeto Ecdise → entre em <span className="font-mono">sigla_checker</span> → clique duas vezes em <span className="font-mono">verificar_agora.bat</span></p>
              </div>
              <p className="text-xs text-gray-400">
                Uma janela vai abrir e mostrar o progresso. Ao terminar, clique em <strong>Atualizar</strong> nesta página.
              </p>
            </div>

            <div className="px-6 pb-5 flex gap-2">
              <button
                onClick={() => setModalRodar(false)}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-gray-900 hover:bg-gray-800 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Entendido
              </button>
              <button onClick={() => setModalRodar(false)}
                className="px-5 py-2.5 border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl text-sm font-medium">
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Card de projeto ───────────────────────────────────────────
function ProjetoCard({ projeto, servicoPrestado, formatDataConsulta }: {
  projeto: any
  servicoPrestado: (p: any) => string
  formatDataConsulta: (dt: string | null) => string | null
}) {
  const licenciado   = !!projeto.licenca
  const pendencias   = (projeto.pendencias || []).filter((p: any) => p.status === 'ABERTA').length
  const categoria    = (() => {
    if (!projeto.statusSIGLA) return 'sem_consulta'
    if (projeto.statusSIGLA.includes('Em exigência')) return 'exigencia'
    return 'ok'
  })()

  const statusTexto  = projeto.statusSIGLA ? projeto.statusSIGLA.split('|')[0].trim() : null

  const bordas: Record<string, string> = {
    exigencia:    'border-l-4 border-l-red-400',
    ok:           'border-l-4 border-l-green-400',
    sem_consulta: 'border-l-4 border-l-gray-200',
  }
  const badges: Record<string, string> = {
    exigencia:    'bg-red-50 text-red-700 border border-red-100',
    ok:           'bg-green-50 text-green-700 border border-green-100',
    sem_consulta: 'bg-gray-50 text-gray-500 border border-gray-100',
  }
  const labels: Record<string, string> = {
    exigencia:    '🔴 Em exigência',
    ok:           '✅ Sem pendências',
    sem_consulta: '⏳ Aguardando consulta',
  }

  return (
    <Link
      href={`/acompanhamento/${projeto.id}`}
      className={`group bg-white rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${bordas[categoria]}`}
    >
      {licenciado && <div className="bg-emerald-500 h-1 w-full" />}

      <div className="p-4 flex-1 flex flex-col gap-3">

        {/* Topo: nome + badges */}
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <span className="font-mono text-xs text-gray-400">{projeto.codigo}</span>
            <p className="font-semibold text-gray-900 mt-0.5 group-hover:text-green-700 transition-colors leading-snug">
              {projeto.imovelNome || projeto.cliente?.nome}
            </p>
            <p className="text-xs text-gray-500 mt-0.5 truncate">{servicoPrestado(projeto)}</p>
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {licenciado ? (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
                <Award className="w-3 h-3" /> Licenciado
              </span>
            ) : (
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-100 text-amber-800">
                Em processo
              </span>
            )}
            {pendencias > 0 && (
              <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                <AlertCircle className="w-3 h-3" /> {pendencias} pendência(s)
              </span>
            )}
          </div>
        </div>

        {/* Status SIGLA */}
        <div className={`rounded-lg px-3 py-2 flex items-center justify-between gap-2 ${badges[categoria]}`}>
          <div className="min-w-0">
            <p className="text-xs font-semibold">{labels[categoria]}</p>
            {statusTexto && (
              <p className="text-xs opacity-75 truncate mt-0.5">{statusTexto}</p>
            )}
          </div>
          {projeto.ultimaConsultaSIGLA && (
            <span className="flex items-center gap-1 text-xs opacity-60 flex-shrink-0">
              <Clock className="w-3 h-3" />
              {formatDataConsulta(projeto.ultimaConsultaSIGLA)}
            </span>
          )}
        </div>

        {/* Info secundária */}
        <div className="space-y-1">
          {(projeto.municipio || projeto.estado) && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <MapPin className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
              <span>{[projeto.municipio, projeto.estado].filter(Boolean).join(' / ')}</span>
            </div>
          )}
          {projeto.protocoloCodigoOrgao && (
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <FileText className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
              <span className="font-mono">Nº {projeto.protocoloCodigoOrgao}</span>
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="mt-auto pt-3 border-t border-gray-50 flex items-center justify-between">
          <span className="text-xs text-gray-400">{projeto.cliente?.nome}</span>
          <span className="flex items-center gap-1 text-xs font-medium text-green-600 group-hover:gap-2 transition-all">
            Ver detalhes <ChevronRight className="w-4 h-4" />
          </span>
        </div>
      </div>
    </Link>
  )
}
