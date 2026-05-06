'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { Plus, FileText, Clock, AlertCircle } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'
import { ModalContrato } from '@/components/modals/ModalContrato'
import { ModalProjeto } from '@/components/modals/ModalProjeto'

const STATUS_CONTRATO_LABELS: Record<string, string> = {
  ATIVO: 'Ativo', ASSINADO: 'Assinado', AGUARDANDO_ASSINATURA: 'Aguard. Assinatura',
  FINALIZADO: 'Finalizado', CANCELADO: 'Cancelado', SUSPENSO: 'Suspenso',
}
const STATUS_CONTRATO_COLORS: Record<string, string> = {
  ATIVO: 'bg-blue-100 text-blue-800', ASSINADO: 'bg-green-100 text-green-800',
  AGUARDANDO_ASSINATURA: 'bg-yellow-100 text-yellow-800',
  FINALIZADO: 'bg-gray-100 text-gray-800', CANCELADO: 'bg-red-100 text-red-800',
  SUSPENSO: 'bg-orange-100 text-orange-800',
}

export default function ContratosPage() {
  const [contratos, setContratos]                 = useState<any[]>([])
  const [projetosAguardando, setProjetosAguardando] = useState<any[]>([])
  const [loading, setLoading]                     = useState(true)
  const [modalOpen, setModalOpen]                 = useState(false)
  const [filtroStatus, setFiltroStatus]           = useState('')
  // Modal de elaboração de contrato
  const [projetoSelecionado, setProjetoSelecionado] = useState<any | null>(null)
  const [modalProjetoOpen, setModalProjetoOpen]     = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [resContratos, resProjetos] = await Promise.all([
        fetch(`/api/contratos${filtroStatus ? `?statusContrato=${filtroStatus}` : ''}`),
        fetch('/api/projetos?etapaPipeline=AGUARDANDO_CONTRATO&limit=50'),
      ])
      if (resContratos.ok) setContratos((await resContratos.json()).contratos)
      if (resProjetos.ok)  setProjetosAguardando((await resProjetos.json()).projetos)
    } catch { toast.error('Erro ao carregar dados') }
    finally { setLoading(false) }
  }, [filtroStatus])

  useEffect(() => { load() }, [load])

  function abrirElaboracao(projeto: any) {
    setProjetoSelecionado(projeto)
    setModalProjetoOpen(true)
  }

  // Totais
  const valorTotal = contratos.reduce((s, c) => s + (c.valorTotal || 0), 0)
  const ativos = contratos.filter(c => ['ATIVO', 'ASSINADO'].includes(c.statusContrato)).length

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestão de Contratos</h1>
          <p className="text-gray-500 text-sm mt-1">{contratos.length} contrato(s)</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2.5 rounded-xl transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Contrato
        </button>
      </div>

      {/* ── FILA: Projetos aguardando elaboração de contrato ──────── */}
      {projetosAguardando.length > 0 && (
        <div className="bg-pink-50 border border-pink-200 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-3 px-5 py-3 border-b border-pink-200">
            <AlertCircle className="w-4 h-4 text-pink-600" />
            <p className="text-sm font-semibold text-pink-800">
              {projetosAguardando.length} projeto(s) aguardando elaboração de contrato
            </p>
          </div>
          <div className="divide-y divide-pink-100">
            {projetosAguardando.map(p => {
              const servicos = p.servicosContratados ? (() => { try { return JSON.parse(p.servicosContratados) } catch { return [] } })() : []
              return (
                <div key={p.id} className="flex items-center justify-between px-5 py-3 hover:bg-pink-100/50 transition-colors">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-8 h-8 bg-pink-200 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-pink-700" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono text-pink-600 font-medium">{p.codigo}</span>
                        <span className="text-sm font-semibold text-gray-900 truncate">{p.imovelNome || p.tipoServico}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs text-gray-500">{p.cliente?.nome}</span>
                        {servicos.length > 0 && (
                          <div className="flex gap-1">
                            {servicos.slice(0, 2).map((s: string) => (
                              <span key={s} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">{s}</span>
                            ))}
                            {servicos.length > 2 && <span className="text-xs text-gray-400">+{servicos.length - 2}</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {p.valorSinal > 0 && (
                      <div className="text-right hidden sm:block">
                        <p className="text-xs text-gray-400">Sinal</p>
                        <p className="text-sm font-semibold text-gray-900">{formatCurrency(p.valorSinal)}</p>
                      </div>
                    )}
                    <button
                      onClick={() => abrirElaboracao(p)}
                      className="flex items-center gap-1.5 bg-pink-600 hover:bg-pink-700 text-white text-xs font-semibold px-3 py-2 rounded-xl transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" /> Elaborar Contrato
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Total de Contratos</p>
          <p className="text-2xl font-bold text-gray-900">{contratos.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Contratos Ativos</p>
          <p className="text-2xl font-bold text-green-600">{ativos}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <p className="text-xs text-gray-400 mb-1">Valor Total</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(valorTotal)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => setFiltroStatus('')}
          className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${!filtroStatus ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
        >
          Todos
        </button>
        {Object.entries(STATUS_CONTRATO_LABELS).map(([k, v]) => (
          <button
            key={k}
            onClick={() => setFiltroStatus(k)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${filtroStatus === k ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'}`}
          >
            {v}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : contratos.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-40 text-gray-400">
            <FileText className="w-10 h-10 mb-2 opacity-40" />
            <p>Nenhum contrato encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Código</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Projeto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Tipo</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Valor Total</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Assinatura</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Parcelas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contratos.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className="font-mono text-sm text-gray-900">{c.codigo}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{c.cliente?.nome}</p>
                      <p className="text-xs text-gray-400">{c.cliente?.cpfCnpj}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-mono text-xs text-gray-500">{c.projeto?.codigo}</span>
                      <p className="text-xs text-gray-400">{c.projeto?.tipoServico}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-700">{c.tipoContrato}</td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(c.valorTotal)}</p>
                      <p className="text-xs text-gray-400">Sinal: {formatCurrency(c.valorSinal)}</p>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{formatDate(c.dataAssinatura)}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${STATUS_CONTRATO_COLORS[c.statusContrato]}`}>
                        {STATUS_CONTRATO_LABELS[c.statusContrato]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {c.pagamentos?.filter((p: any) => p.status === 'PAGO').length || 0}/{c.numeroParcelas}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <ModalContrato
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSalvo={() => { setModalOpen(false); load() }}
      />

      {/* Modal de elaboração de contrato para projetos aguardando */}
      <ModalProjeto
        open={modalProjetoOpen}
        onClose={() => { setModalProjetoOpen(false); setProjetoSelecionado(null) }}
        projeto={projetoSelecionado}
        modoAcao="contrato_info"
        onSalvo={() => { setModalProjetoOpen(false); setProjetoSelecionado(null); load() }}
      />
    </div>
  )
}
