'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Search, ClipboardList, ChevronRight, MapPin, User, Calendar, CheckSquare, AlertCircle } from 'lucide-react'
import { formatDate, STATUS_OPERACIONAL_LABELS, STATUS_COLORS } from '@/lib/utils'
import Link from 'next/link'

const FILTROS = [
  { label: 'Todos',        value: '' },
  { label: 'Não Iniciado', value: 'NAO_INICIADO' },
  { label: 'Em Andamento', value: 'EM_ANDAMENTO' },
  { label: 'Em Campo',     value: 'EM_CAMPO' },
  { label: 'Aguardando',   value: 'AGUARDANDO_INFO' },
  { label: 'Concluído',    value: 'CONCLUIDO' },
]

// Etapas válidas: só após primeiro pagamento registrado pelo financeiro
const ETAPAS_OPERACIONAL = 'OPERACIONAL,EM_EXECUCAO,CONCLUIDO'

export default function OperacionalPage() {
  const [projetos, setProjetos] = useState<any[]>([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')
  const [filtro, setFiltro]     = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('etapas', ETAPAS_OPERACIONAL)
      if (filtro) params.set('statusOperacional', filtro)
      if (search)  params.set('search', search)
      const res = await fetch(`/api/projetos?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setProjetos(data.projetos)
    } catch {
      toast.error('Erro ao carregar projetos')
    } finally {
      setLoading(false)
    }
  }, [filtro, search])

  useEffect(() => {
    const t = setTimeout(load, 300)
    return () => clearTimeout(t)
  }, [load])

  return (
    <div className="space-y-6">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento Operacional</h1>
        <p className="text-gray-500 text-sm mt-1">
          Projetos liberados pelo financeiro — clique em um projeto para ver detalhes e atribuir tarefas
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map(f => {
          const count = projetos.filter(p => f.value ? p.statusOperacional === f.value : true).length
          return (
            <button
              key={f.value}
              onClick={() => setFiltro(f.value)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                filtro === f.value
                  ? 'bg-green-600 text-white shadow-sm'
                  : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
              }`}
            >
              {f.label}
              <span className={`ml-1.5 text-xs ${filtro === f.value ? 'opacity-80' : 'opacity-50'}`}>
                ({count})
              </span>
            </button>
          )
        })}
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

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projetos.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="font-medium">Nenhum projeto operacional encontrado</p>
          <p className="text-sm mt-1 text-gray-400">
            Projetos aparecem aqui após o financeiro registrar o primeiro pagamento
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projetos.map(projeto => {
            const aguardandoPlanejamento = projeto.etapaPipeline === 'OPERACIONAL'

            return (
              <Link
                key={projeto.id}
                href={`/operacional/${projeto.id}`}
                className="group bg-white rounded-2xl border border-gray-100 hover:border-green-200 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col"
              >
                {/* Barra de destaque se aguardando planejamento */}
                {aguardandoPlanejamento && (
                  <div className="bg-amber-400 h-1 w-full" />
                )}

                <div className="p-5 flex-1 flex flex-col">
                  {/* Topo: código + status */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="min-w-0 flex-1">
                      <span className="font-mono text-xs text-gray-400">{projeto.codigo}</span>
                      <p className="font-semibold text-gray-900 mt-0.5 group-hover:text-green-700 transition-colors leading-snug">
                        {projeto.imovelNome || projeto.cliente?.nome}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">{projeto.tipoServico}</p>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0 ml-2">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_COLORS[projeto.statusOperacional]}`}>
                        {STATUS_OPERACIONAL_LABELS[projeto.statusOperacional]}
                      </span>
                      {aguardandoPlanejamento && (
                        <span className="flex items-center gap-1 text-xs text-amber-600 font-medium">
                          <AlertCircle className="w-3 h-3" /> Planejar
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Infos */}
                  <div className="space-y-1.5 flex-1">
                    {projeto.municipio && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <MapPin className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <span>{projeto.municipio}{projeto.estado ? ` / ${projeto.estado}` : ''}</span>
                      </div>
                    )}
                    {projeto.responsavel ? (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <User className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <span>{projeto.responsavel.nome}</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-xs text-amber-500">
                        <User className="w-3.5 h-3.5 flex-shrink-0" />
                        <span>Responsável não definido</span>
                      </div>
                    )}
                    {projeto.dataPrazo && (
                      <div className="flex items-center gap-2 text-xs text-gray-500">
                        <Calendar className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" />
                        <span>Prazo: {formatDate(projeto.dataPrazo)}</span>
                      </div>
                    )}
                  </div>

                  {/* Rodapé: contadores + seta */}
                  <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-3">
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-1">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5" />
                        {projeto._count?.tarefas || 0} tarefas
                      </span>
                      <span>📷 {projeto._count?.vistorias || 0}</span>
                      <span>📎 {projeto._count?.documentos || 0}</span>
                    </div>
                    <span className="flex items-center gap-1 text-xs font-medium text-green-600 group-hover:gap-2 transition-all">
                      Abrir <ChevronRight className="w-4 h-4" />
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
