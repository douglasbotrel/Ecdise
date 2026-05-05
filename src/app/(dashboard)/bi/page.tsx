'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend
} from 'recharts'
import { BarChart3, Download, RefreshCw } from 'lucide-react'
import { formatCurrency, STATUS_OPERACIONAL_LABELS } from '@/lib/utils'

const CORES = ['#22c55e', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#06b6d4', '#ec4899']

export default function BIPage() {
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [atualizando, setAtualizando] = useState(false)

  async function load() {
    setAtualizando(true)
    try {
      const res = await fetch('/api/dashboard')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setDados(data)
    } catch {
      toast.error('Erro ao carregar dados')
    } finally {
      setLoading(false)
      setAtualizando(false)
    }
  }

  useEffect(() => { load() }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!dados) return null

  const { estatisticas, projetosPorStatus, evolucaoMensal } = dados

  const pieData = projetosPorStatus.map((p: any, i: number) => ({
    name: STATUS_OPERACIONAL_LABELS[p.status] || p.status,
    value: p.count,
    color: CORES[i % CORES.length],
  }))

  // Dados financeiros simulados
  const financeiro = [
    { mes: 'Jan', recebido: 45000, pendente: 12000 },
    { mes: 'Fev', recebido: 38000, pendente: 18000 },
    { mes: 'Mar', recebido: 52000, pendente: 8000 },
    { mes: 'Abr', recebido: 61000, pendente: 15000 },
    { mes: 'Mai', recebido: 48000, pendente: 22000 },
    { mes: 'Jun', recebido: 70000, pendente: 10000 },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">BI / Relatórios</h1>
          <p className="text-gray-500 text-sm mt-1">Análise gerencial e indicadores de desempenho</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={load}
            disabled={atualizando}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${atualizando ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total de Projetos', value: estatisticas.totalProjetos, color: 'bg-blue-600' },
          { label: 'Em Andamento', value: estatisticas.projetosAtivos, color: 'bg-green-600' },
          { label: 'Concluídos', value: estatisticas.projetosConcluidos, color: 'bg-purple-600' },
          { label: 'Cancelados', value: estatisticas.projetosCancelados, color: 'bg-red-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white rounded-2xl border border-gray-100 p-5">
            <div className={`w-1.5 h-8 ${kpi.color} rounded-full mb-3`} />
            <p className="text-3xl font-bold text-gray-900">{kpi.value}</p>
            <p className="text-xs text-gray-400 mt-1">{kpi.label}</p>
          </div>
        ))}
      </div>

      {/* Financeiro KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">A Receber</p>
          <p className="text-2xl font-bold text-yellow-600">{formatCurrency(estatisticas.totalPendente)}</p>
          <p className="text-xs text-gray-400 mt-1">{estatisticas.qtdPagamentosPendentes} pagamento(s)</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Vencido</p>
          <p className="text-2xl font-bold text-red-600">{formatCurrency(estatisticas.totalVencido)}</p>
          <p className="text-xs text-gray-400 mt-1">Requer atenção imediata</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Tarefas Atrasadas</p>
          <p className="text-2xl font-bold text-orange-600">{estatisticas.tarefasAtrasadas}</p>
          <p className="text-xs text-gray-400 mt-1">Com prazo vencido</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução de projetos */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Novos Projetos por Mês</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={evolucaoMensal} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="projetos"
                stroke="#22c55e"
                strokeWidth={3}
                dot={{ r: 4, fill: '#22c55e' }}
                name="Projetos"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição por status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Status dos Projetos</h3>
          {pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                    {pieData.map((entry: any, i: number) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v: any) => [v, 'Projetos']} />
                </PieChart>
              </ResponsiveContainer>
              <div className="grid grid-cols-2 gap-2">
                {pieData.map((entry: any, i: number) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
                    <span className="text-xs text-gray-600 truncate">{entry.name}: <strong>{entry.value}</strong></span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">Sem dados</div>
          )}
        </div>

        {/* Gráfico financeiro */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Recebimentos vs Pendências</h3>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={financeiro} margin={{ top: 0, right: 0, left: -10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: any) => [formatCurrency(v)]} />
              <Bar dataKey="recebido" fill="#22c55e" radius={[4, 4, 0, 0]} name="Recebido" />
              <Bar dataKey="pendente" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Pendente" />
              <Legend iconType="circle" iconSize={8} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Indicadores adicionais */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Indicadores Operacionais</h3>
          <div className="space-y-4">
            {[
              {
                label: 'Taxa de Conclusão',
                value: estatisticas.totalProjetos > 0
                  ? `${Math.round((estatisticas.projetosConcluidos / estatisticas.totalProjetos) * 100)}%`
                  : '0%',
                pct: estatisticas.totalProjetos > 0
                  ? (estatisticas.projetosConcluidos / estatisticas.totalProjetos) * 100
                  : 0,
                color: 'bg-green-500',
              },
              {
                label: 'Projetos Ativos',
                value: `${Math.round((estatisticas.projetosAtivos / Math.max(estatisticas.totalProjetos, 1)) * 100)}%`,
                pct: (estatisticas.projetosAtivos / Math.max(estatisticas.totalProjetos, 1)) * 100,
                color: 'bg-blue-500',
              },
              {
                label: 'Taxa de Cancelamento',
                value: `${Math.round((estatisticas.projetosCancelados / Math.max(estatisticas.totalProjetos, 1)) * 100)}%`,
                pct: (estatisticas.projetosCancelados / Math.max(estatisticas.totalProjetos, 1)) * 100,
                color: 'bg-red-400',
              },
            ].map((ind) => (
              <div key={ind.label}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-gray-600">{ind.label}</span>
                  <span className="font-semibold text-gray-900">{ind.value}</span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${ind.color} rounded-full transition-all duration-700`}
                    style={{ width: `${Math.min(ind.pct, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
