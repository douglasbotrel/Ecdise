'use client'

import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { formatDate, formatCurrency } from '@/lib/utils'

const STATUS_PAG: Record<string, string> = {
  PENDENTE: 'Pendente', PAGO: 'Pago', VENCIDO: 'Vencido', CANCELADO: 'Cancelado', PARCIAL: 'Parcial'
}
const PAG_COLORS: Record<string, string> = {
  PENDENTE: 'bg-yellow-100 text-yellow-800', PAGO: 'bg-green-100 text-green-800',
  VENCIDO: 'bg-red-100 text-red-800', CANCELADO: 'bg-gray-100 text-gray-600', PARCIAL: 'bg-orange-100 text-orange-800'
}

export default function FinanceiroPage() {
  const [pagamentos, setPagamentos] = useState<any[]>([])
  const [totais, setTotais] = useState({ totalPendente: 0, totalPago: 0, totalVencido: 0 })
  const [loading, setLoading] = useState(true)
  const [filtro, setFiltro] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (filtro) params.set('status', filtro)
      const res = await fetch(`/api/pagamentos?${params}`)
      if (!res.ok) throw new Error()
      const data = await res.json()
      setPagamentos(data.pagamentos)
      setTotais(data.totais)
    } catch { toast.error('Erro ao carregar financeiro') }
    finally { setLoading(false) }
  }, [filtro])

  useEffect(() => { load() }, [load])

  async function marcarPago(id: string) {
    try {
      const res = await fetch('/api/pagamentos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: 'PAGO' }),
      })
      if (!res.ok) throw new Error()
      toast.success('Pagamento registrado!')
      load()
    } catch { toast.error('Erro') }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Financeiro</h1>
        <p className="text-gray-500 text-sm mt-1">Controle de recebimentos e pagamentos</p>
      </div>

      {/* Cards resumo */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">A Receber</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(totais.totalPendente)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <CheckCircle className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Recebido</p>
            <p className="text-xl font-bold text-green-600">{formatCurrency(totais.totalPago)}</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Vencido</p>
            <p className="text-xl font-bold text-red-600">{formatCurrency(totais.totalVencido)}</p>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        {['', ...Object.keys(STATUS_PAG)].map(s => (
          <button
            key={s}
            onClick={() => setFiltro(s)}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtro === s ? 'bg-green-600 text-white' : 'bg-white border border-gray-200 text-gray-600'
            }`}
          >
            {s ? STATUS_PAG[s] : 'Todos'}
          </button>
        ))}
      </div>

      {/* Tabela de pagamentos */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center h-40">
            <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : pagamentos.length === 0 ? (
          <div className="text-center py-12 text-gray-400">
            <DollarSign className="w-10 h-10 mx-auto mb-2 opacity-40" />
            <p>Nenhum pagamento encontrado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Cliente</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Projeto</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Descrição</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Valor</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Vencimento</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Status</th>
                  <th className="text-left text-xs font-semibold text-gray-500 px-4 py-3">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagamentos.map((p) => {
                  const vencido = p.status === 'PENDENTE' && new Date(p.dataVencimento) < new Date()
                  return (
                    <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${vencido ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-900">{p.contrato?.cliente?.nome}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-gray-500">{p.contrato?.projeto?.codigo}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">{p.descricao}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold text-gray-900">{formatCurrency(p.valor)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${vencido ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {formatDate(p.dataVencimento)}
                          {vencido && ' ⚠️'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-full ${PAG_COLORS[p.status]}`}>
                          {STATUS_PAG[p.status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {p.status === 'PENDENTE' && (
                          <button
                            onClick={() => marcarPago(p.id)}
                            className="text-xs font-medium text-green-600 hover:text-green-700 px-3 py-1 border border-green-200 rounded-lg hover:bg-green-50 transition-colors"
                          >
                            Registrar Pagamento
                          </button>
                        )}
                        {p.status === 'PAGO' && p.dataPagamento && (
                          <span className="text-xs text-gray-400">Pago em {formatDate(p.dataPagamento)}</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
