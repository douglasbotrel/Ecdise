'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Search, FileSearch, ChevronRight, MapPin, FileText,
  Award, AlertCircle, Upload, RefreshCw, Clock,
} from 'lucide-react'

// ── Interpreta o statusSIGLA e retorna a categorização visual ──
type SiglaCategoria = 'exigencia' | 'ok' | 'sem_consulta'

function categorizarSIGLA(statusSIGLA: string | null): SiglaCategoria {
  if (!statusSIGLA) return 'sem_consulta'
  if (statusSIGLA.includes('Em exigência')) return 'exigencia'
  return 'ok'
}

const SIGLA_ESTILO: Record<SiglaCategoria, { badge: string; borda: string; label: string }> = {
  exigencia:    { badge: 'bg-red-100 text-red-700 border border-red-200',    borda: 'border-l-4 border-l-red-400',   label: '🔴 Em exigência' },
  ok:           { badge: 'bg-green-100 text-green-700 border border-green-200', borda: 'border-l-4 border-l-green-400', label: '✅ Sem pendências' },
  sem_consulta: { badge: 'bg-gray-100 text-gray-500 border border-gray-200',  borda: '',                               label: '⏳ Aguardando consulta' },
}

type Filtro = 'todos' | SiglaCategoria

export default function AcompanhamentoPage() {
  const [projetos, setProjetos] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filtro, setFiltro]     = useState<Filtro>('todos')

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

  // ── Contadores para o painel de resumo ──
  const total       = projetos.length
  const emExigencia = projetos.filter(p => categorizarSIGLA(p.statusSIGLA) === 'exigencia').length
  const semPend     = projetos.filter(p => categorizarSIGLA(p.statusSIGLA) === 'ok').length
  const semConsulta = projetos.filter(p => categorizarSIGLA(p.statusSIGLA) === 'sem_consulta').length

  // ── Filtragem ──
  const projetosFiltrados = projetos.filter(p => {
    if (filtro === 'todos') return true
    return categorizarSIGLA(p.statusSIGLA) === filtro
  })

  const FILTROS: { key: Filtro; label: string; count: number; cor: string }[] = [
    { key: 'todos',       label: 'Todos',          count: total,       cor: 'bg-gray-100 text-gray-700 hover:bg-gray-200' },
    { key: 'exigencia',   label: '🔴 Em exigência', count: emExigencia, cor: 'bg-red-100 text-red-700 hover:bg-red-200' },
    { key: 'ok',          label: '✅ Sem pendências',count: semPend,     cor: 'bg-green-100 text-green-700 hover:bg-green-200' },
    { key: 'sem_consulta',label: '⏳ Sem consulta', count: semConsulta, cor: 'bg-gray-100 text-gray-500 hover:bg-gray-200' },
  ]

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
        <Link
          href="/acompanhamento/importar"
          className="flex items-center gap-2 px-4 py-2.5 bg-green-600 hover:bg-green-700 text-white text-sm font-semibold rounded-xl transition-colors w-full sm:w-auto justify-center"
        >
          <Upload className="w-4 h-4" />
          Importar Processo
        </Link>
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
          <div className="bg-gray-50 rounded-xl border border-gray-100 p-4 text-center">
            <p className="text-2xl font-bold text-gray-400">{semConsulta}</p>
            <p className="text-xs text-gray-400 mt-0.5">Aguardando consulta</p>
          </div>
        </div>
      )}

      {/* ── Busca + Filtros ───────────────────────────── */}
      <div className="flex flex-col sm:flex-row gap-3">
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
          title="Atualizar lista"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* Filtros de status */}
      {!loading && total > 0 && (
        <div className="flex flex-wrap gap-2">
          {FILTROS.map(f => (
            <button
              key={f.key}
              onClick={() => setFiltro(f.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${f.cor} ${
                filtro === f.key ? 'ring-2 ring-offset-1 ring-gray-400' : ''
              }`}
            >
              {f.label} <span className="opacity-70 ml-1">({f.count})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Lista ─────────────────────────────────────── */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projetosFiltrados.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">
            {filtro === 'todos' ? 'Nenhum processo em acompanhamento' : 'Nenhum processo nesta categoria'}
          </p>
          {filtro === 'todos' && (
            <p className="text-sm mt-1">
              Use o botão <strong>Importar Processo</strong> para adicionar processos existentes
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projetosFiltrados.map((projeto: any) => {
            const categoria   = categorizarSIGLA(projeto.statusSIGLA)
            const estilo      = SIGLA_ESTILO[categoria]
            const licenciado  = !!projeto.licenca
            const pendencias  = (projeto.pendencias || []).filter((p: any) => p.status === 'ABERTA').length

            // Extrai só o texto de status (sem o ícone)
            const statusTexto = projeto.statusSIGLA
              ? projeto.statusSIGLA.split('|')[0].trim()
              : null

            return (
              <Link
                key={projeto.id}
                href={`/acompanhamento/${projeto.id}`}
                className={`group bg-white rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col ${estilo.borda}`}
              >
                {licenciado && <div className="bg-green-500 h-1 w-full" />}

                <div className="p-5 flex-1 flex flex-col gap-3">

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
                        <span className="flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-green-100 text-green-800">
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

                  {/* Status SIGLA — destaque central */}
                  <div className={`rounded-lg px-3 py-2 flex items-center justify-between gap-2 ${estilo.badge}`}>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold">{estilo.label}</p>
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
          })}
        </div>
      )}
    </div>
  )
}
