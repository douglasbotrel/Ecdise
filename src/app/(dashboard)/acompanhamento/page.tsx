'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import Link from 'next/link'
import {
  Search, FileSearch, ChevronRight, MapPin, BarChart2, FileText,
  Award, AlertCircle, Home, Upload,
} from 'lucide-react'

export default function AcompanhamentoPage() {
  const [projetos, setProjetos] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

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

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Acompanhamento de Processos</h1>
          <p className="text-gray-500 text-sm mt-1">
            Projetos protocolados nos órgãos ambientais — acompanhe pendências e a emissão da licença
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

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, código ou município..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
        />
      </div>

      {/* Lista de processos */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projetos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <FileSearch className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum processo em acompanhamento</p>
          <p className="text-sm mt-1 text-gray-400">
            Projetos aparecem aqui após a tarefa &quot;Protocolo&quot; ser concluída no Operacional
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projetos.map((projeto: any) => {
            const pendenciasAbertas = (projeto.pendencias || []).filter((p: any) => p.status === 'ABERTA').length
            const licenciado = !!projeto.licenca

            return (
              <Link
                key={projeto.id}
                href={`/acompanhamento/${projeto.id}`}
                className="group bg-white rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
              >
                {licenciado && <div className="bg-green-500 h-1 w-full" />}

                <div className="p-5 flex-1 flex flex-col">
                  {/* Topo: resumo do projeto + status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs text-gray-400">{projeto.codigo}</span>
                      <p className="font-semibold text-gray-900 mt-0.5 group-hover:text-green-700 transition-colors leading-snug">
                        {projeto.imovelNome || projeto.cliente?.nome}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{servicoPrestado(projeto)}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                      {licenciado ? (
                        <span className="flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full bg-green-100 text-green-800">
                          <Award className="w-3 h-3" /> Licenciado
                        </span>
                      ) : (
                        <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
                          Em processo
                        </span>
                      )}
                      {pendenciasAbertas > 0 && (
                        <span className="flex items-center gap-1 text-xs font-semibold text-red-600">
                          <AlertCircle className="w-3 h-3" /> {pendenciasAbertas} pendência(s)
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 flex-1">
                    {projeto.imovelNome && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Home className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <span>Fazenda: {projeto.imovelNome}</span>
                      </div>
                    )}
                    {(projeto.municipio || projeto.estado) && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <span>{[projeto.municipio, projeto.estado].filter(Boolean).join(' / ')}</span>
                      </div>
                    )}
                    {projeto.areaHectares && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <BarChart2 className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <span>{Number(projeto.areaHectares).toLocaleString('pt-BR')} ha</span>
                      </div>
                    )}
                    {projeto.car && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <FileText className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <span className="truncate">CAR: {projeto.car}</span>
                      </div>
                    )}
                  </div>

                  {/* Rodapé: código do protocolo + ação */}
                  <div className="mt-4 pt-3 border-t border-gray-50 flex items-center justify-between gap-2">
                    <span className="text-xs text-gray-400 truncate">
                      {projeto.protocoloCodigoOrgao ? `Protocolo: ${projeto.protocoloCodigoOrgao}` : 'Sem nº de protocolo'}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 group-hover:gap-2 transition-all flex-shrink-0">
                      Editar <ChevronRight className="w-4 h-4" />
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
