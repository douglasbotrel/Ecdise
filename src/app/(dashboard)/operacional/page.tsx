'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Search, Eye, ClipboardList } from 'lucide-react'
import { formatDate, STATUS_OPERACIONAL_LABELS, STATUS_COLORS } from '@/lib/utils'
import Link from 'next/link'

const FILTROS = [
  { label: 'Todos', value: '' },
  { label: 'Não Iniciado', value: 'NAO_INICIADO' },
  { label: 'Em Andamento', value: 'EM_ANDAMENTO' },
  { label: 'Em Campo', value: 'EM_CAMPO' },
  { label: 'Aguardando', value: 'AGUARDANDO_INFO' },
  { label: 'Concluído', value: 'CONCLUIDO' },
]

export default function OperacionalPage() {
  const [projetos, setProjetos] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filtro, setFiltro] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtro) params.set('statusOperacional', filtro)
      if (search) params.set('search', search)
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gerenciamento Operacional</h1>
        <p className="text-gray-500 text-sm mt-1">Acompanhe o andamento dos projetos em execução</p>
      </div>

      {/* Filtros de status */}
      <div className="flex flex-wrap gap-2">
        {FILTROS.map(f => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filtro === f.value
                ? 'bg-green-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:border-green-300'
            }`}
          >
            {f.label}
            <span className="ml-1.5 text-xs opacity-75">
              ({projetos.filter(p => f.value ? p.statusOperacional === f.value : true).length})
            </span>
          </button>
        ))}
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar projeto..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
        />
      </div>

      {/* Cards de projetos */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : projetos.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Nenhum projeto encontrado</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {projetos.map((projeto) => (
            <Link
              key={projeto.id}
              href={`/operacional/${projeto.id}`}
              className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md hover:border-green-100 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <span className="font-mono text-xs text-gray-400">{projeto.codigo}</span>
                  <p className="font-semibold text-gray-900 mt-0.5 group-hover:text-green-700 transition-colors">
                    {projeto.imovelNome || projeto.cliente?.nome}
                  </p>
                  <p className="text-sm text-gray-500">{projeto.tipoServico}</p>
                </div>
                <span className={`text-xs font-medium px-2.5 py-1 rounded-full flex-shrink-0 ${STATUS_COLORS[projeto.statusOperacional]}`}>
                  {STATUS_OPERACIONAL_LABELS[projeto.statusOperacional]}
                </span>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <span>📍</span>
                  <span>{projeto.municipio || 'Município não informado'}</span>
                </div>
                {projeto.responsavel && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>👤</span>
                    <span>{projeto.responsavel.nome}</span>
                  </div>
                )}
                {projeto.dataPrazo && (
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <span>📅</span>
                    <span>Prazo: {formatDate(projeto.dataPrazo)}</span>
                  </div>
                )}
              </div>

              {/* Mini progress */}
              <div className="mt-3 pt-3 border-t border-gray-50 flex items-center gap-3 text-xs text-gray-400">
                <span>📋 {projeto._count?.tarefas || 0} tarefas</span>
                <span>📷 {projeto._count?.vistorias || 0} vistorias</span>
                <span>📎 {projeto._count?.documentos || 0} docs</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
