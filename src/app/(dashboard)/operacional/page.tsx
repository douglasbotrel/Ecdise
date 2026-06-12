'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Search, ClipboardList, ChevronRight, MapPin, User, Calendar,
  CheckSquare, AlertCircle, Info, X, Phone, Mail, FileText,
  Layers, BarChart2, Loader2, ExternalLink, Lock,
} from 'lucide-react'
import { formatDate, formatCurrency, STATUS_OPERACIONAL_LABELS, STATUS_COLORS } from '@/lib/utils'
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
  const router = useRouter()
  const [projetos, setProjetos]         = useState<any[]>([])
  const [loading, setLoading]           = useState(true)
  const [search, setSearch]             = useState('')
  const [filtro, setFiltro]             = useState('')
  // Quick view drawer
  const [quickView, setQuickView]       = useState<any | null>(null)
  const [loadingDetail, setLoadingDetail] = useState(false)
  const drawerRef = useRef<HTMLDivElement>(null)

  // Abre o drawer lateral com dados completos do projeto
  async function abrirQuickView(e: React.MouseEvent, projetoId: string) {
    e.preventDefault()
    e.stopPropagation()
    setQuickView({ _loading: true, id: projetoId })
    setLoadingDetail(true)
    try {
      const res = await fetch(`/api/projetos/${projetoId}`)
      const data = await res.json()
      setQuickView(data.projeto || null)
    } catch {
      toast.error('Erro ao carregar detalhes')
      setQuickView(null)
    } finally {
      setLoadingDetail(false)
    }
  }

  // Fecha ao clicar fora do drawer
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setQuickView(null)
      }
    }
    if (quickView) {
      document.addEventListener('mousedown', handleClick)
      return () => document.removeEventListener('mousedown', handleClick)
    }
  }, [quickView])

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
                {aguardandoPlanejamento && <div className="bg-amber-400 h-1 w-full" />}

                <div className="p-5 flex-1 flex flex-col">
                  {/* Topo: código + status + botão info */}
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

                  {/* Rodapé: contadores + botão info + seta */}
                  <div className="mt-4 pt-3 border-t border-gray-50 flex items-center gap-3">
                    <div className="flex items-center gap-3 text-xs text-gray-400 flex-1">
                      <span className="flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5" />
                        {projeto._count?.tarefas || 0} tarefas
                      </span>
                      <span>📷 {projeto._count?.vistorias || 0}</span>
                      <span>📎 {projeto._count?.documentos || 0}</span>
                    </div>
                    {/* Botão de visualização rápida */}
                    <button
                      onClick={e => abrirQuickView(e, projeto.id)}
                      className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-600 hover:bg-blue-50 px-2 py-1 rounded-lg transition-colors"
                      title="Ver dados rápidos"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </button>
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

      {/* ══════════════════════════════════════════════════════════
          DRAWER DE VISUALIZAÇÃO RÁPIDA
          ══════════════════════════════════════════════════════════ */}
      {quickView && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 bg-black/20 z-40" />

          {/* Painel lateral */}
          <div
            ref={drawerRef}
            className="fixed top-0 right-0 h-full w-full sm:w-[420px] bg-white shadow-2xl z-50 flex flex-col overflow-hidden"
            style={{ animation: 'slideIn 0.2s ease-out' }}
          >
            <style>{`
              @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to   { transform: translateX(0);    opacity: 1; }
              }
            `}</style>

            {/* Header do drawer */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50 flex-shrink-0">
              <div className="min-w-0 flex-1">
                <span className="font-mono text-xs text-gray-400">{quickView.codigo}</span>
                <p className="font-bold text-gray-900 leading-snug truncate">
                  {quickView.imovelNome || quickView.cliente?.nome || '…'}
                </p>
                {quickView.statusOperacional && (
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[quickView.statusOperacional]}`}>
                    {STATUS_OPERACIONAL_LABELS[quickView.statusOperacional]}
                  </span>
                )}
              </div>
              <button
                onClick={() => setQuickView(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0 ml-3"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Corpo — rolável */}
            <div className="flex-1 overflow-y-auto">
              {loadingDetail ? (
                <div className="flex items-center justify-center h-40">
                  <Loader2 className="w-6 h-6 text-green-600 animate-spin" />
                </div>
              ) : (
                <div className="px-5 py-4 space-y-5">

                  {/* CLIENTE */}
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5" /> Cliente
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      <p className="font-semibold text-gray-900 text-sm">{quickView.cliente?.nome}</p>
                      {quickView.cliente?.cpfCnpj && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <FileText className="w-3.5 h-3.5 text-gray-400" />
                          <span className="font-mono">{quickView.cliente.cpfCnpj}</span>
                        </div>
                      )}
                      {quickView.cliente?.telefone && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Phone className="w-3.5 h-3.5 text-gray-400" />
                          <span>{quickView.cliente.telefone}</span>
                        </div>
                      )}
                      {quickView.cliente?.email && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Mail className="w-3.5 h-3.5 text-gray-400" />
                          <span className="truncate">{quickView.cliente.email}</span>
                        </div>
                      )}
                      {quickView.cliente?.endereco && (
                        <div className="flex items-start gap-2 text-xs text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span>{quickView.cliente.endereco}{quickView.cliente.municipio ? `, ${quickView.cliente.municipio}/${quickView.cliente.estado}` : ''}</span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* IMÓVEL / PROPRIEDADE */}
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Imóvel / Propriedade
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      {quickView.imovelNome && (
                        <p className="font-semibold text-gray-900 text-sm">{quickView.imovelNome}</p>
                      )}
                      {quickView.imovelEndereco && (
                        <div className="flex items-start gap-2 text-xs text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <span>{quickView.imovelEndereco}</span>
                        </div>
                      )}
                      {(quickView.municipio || quickView.estado) && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          <span>{[quickView.municipio, quickView.estado].filter(Boolean).join(' / ')}</span>
                        </div>
                      )}
                      {quickView.areaHectares && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <BarChart2 className="w-3.5 h-3.5 text-gray-400" />
                          <span><strong>{Number(quickView.areaHectares).toLocaleString('pt-BR')}</strong> hectares</span>
                        </div>
                      )}
                      {quickView.car && (
                        <div className="flex items-start gap-2 text-xs text-gray-600">
                          <FileText className="w-3.5 h-3.5 text-gray-400 flex-shrink-0 mt-0.5" />
                          <div>
                            <span className="text-gray-400 font-medium">CAR: </span>
                            <span className="font-mono break-all">{quickView.car}</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* SERVIÇOS */}
                  {quickView.servicosContratados && (
                    <section>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Serviços Contratados
                      </h3>
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          try {
                            const lista: string[] = JSON.parse(quickView.servicosContratados)
                            return lista.map((s, i) => (
                              <span key={i} className="text-xs bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full font-medium">
                                {s}
                              </span>
                            ))
                          } catch { return null }
                        })()}
                      </div>
                    </section>
                  )}

                  {/* EQUIPE & DATAS */}
                  <section>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Equipe & Prazos
                    </h3>
                    <div className="bg-gray-50 rounded-xl p-3 space-y-2">
                      {quickView.responsavel && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span><strong>Responsável:</strong> {quickView.responsavel.nome}</span>
                        </div>
                      )}
                      {quickView.supervisor && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <User className="w-3.5 h-3.5 text-gray-400" />
                          <span><strong>Supervisor:</strong> {quickView.supervisor.nome}</span>
                        </div>
                      )}
                      {quickView.dataInicio && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span><strong>Início:</strong> {formatDate(quickView.dataInicio)}</span>
                        </div>
                      )}
                      {quickView.dataPrazo && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <Calendar className="w-3.5 h-3.5 text-gray-400" />
                          <span><strong>Prazo:</strong> {formatDate(quickView.dataPrazo)}</span>
                        </div>
                      )}
                      {quickView.contrato?.valorTotal && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <span>💰 <strong>Valor:</strong> {formatCurrency(quickView.contrato.valorTotal)}</span>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* TAREFAS resumo */}
                  {quickView.tarefas && quickView.tarefas.length > 0 && (
                    <section>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5" /> Tarefas ({quickView.tarefas.length})
                      </h3>
                      <div className="space-y-1.5">
                        {quickView.tarefas.slice(0, 5).map((t: any) => (
                          <div key={t.id} className="flex items-center gap-2 text-xs text-gray-600">
                            <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              t.status === 'CONCLUIDA' ? 'bg-green-500' : 'bg-gray-300'
                            }`} />
                            <span className={`flex-1 truncate ${t.status === 'CONCLUIDA' ? 'line-through text-gray-400' : ''}`}>
                              {t.titulo}
                            </span>
                            {t.responsavel && (
                              <span className="text-gray-400 flex-shrink-0">{t.responsavel.nome.split(' ')[0]}</span>
                            )}
                          </div>
                        ))}
                        {quickView.tarefas.length > 5 && (
                          <p className="text-xs text-gray-400 pl-4">+ {quickView.tarefas.length - 5} mais...</p>
                        )}
                      </div>
                    </section>
                  )}

                  {/* Credenciais de sistemas */}
                  {quickView.credenciais && (() => {
                    try {
                      const creds = JSON.parse(quickView.credenciais)
                      const sistemas = Object.keys(creds)
                      if (sistemas.length === 0) return null
                      return (
                        <section>
                          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
                            🔑 Credenciais de Sistemas
                          </h3>
                          <div className="space-y-2">
                            {sistemas.map(s => (
                              <div key={s} className="bg-gray-50 rounded-xl p-3 border border-gray-100">
                                <p className="text-xs font-bold text-gray-500 uppercase mb-1.5">{s}</p>
                                <div className="space-y-0.5 text-xs font-mono">
                                  <div><span className="text-gray-400">Login: </span><span className="text-gray-800">{creds[s].login || '—'}</span></div>
                                  <div><span className="text-gray-400">Senha: </span><span className="text-gray-800">{creds[s].senha || '—'}</span></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </section>
                      )
                    } catch { return null }
                  })()}

                  {/* Observações */}
                  {quickView.observacoes && (
                    <section>
                      <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Observações</h3>
                      <p className="text-xs text-gray-600 bg-gray-50 rounded-xl p-3 leading-relaxed">
                        {quickView.observacoes}
                      </p>
                    </section>
                  )}
                </div>
              )}
            </div>

            {/* Rodapé: botão para abrir completo */}
            <div className="px-5 py-4 border-t border-gray-100 bg-gray-50 flex-shrink-0">
              <Link
                href={`/operacional/${quickView.id}`}
                onClick={() => setQuickView(null)}
                className="flex items-center justify-center gap-2 w-full py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                <ExternalLink className="w-4 h-4" />
                Abrir projeto completo
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
