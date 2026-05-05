'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend
} from 'recharts'
import {
  Briefcase, FileText, MapPin, DollarSign,
  TrendingUp, AlertTriangle, Clock, CheckCircle
} from 'lucide-react'
import { formatDate, formatCurrency, STATUS_OPERACIONAL_LABELS } from '@/lib/utils'
import Link from 'next/link'

const CORES_STATUS = {
  NAO_INICIADO: '#94a3b8',
  EM_ANDAMENTO: '#3b82f6',
  EM_CAMPO: '#8b5cf6',
  AGUARDANDO_INFO: '#f59e0b',
  EM_REVISAO: '#ec4899',
  CONCLUIDO: '#22c55e',
  CANCELADO: '#ef4444',
}

export default function DashboardPage() {
  const [dados, setDados] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/dashboard')
        if (!res.ok) throw new Error()
        const data = await res.json()
        setDados(data)
      } catch {
        toast.error('Erro ao carregar dashboard')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!dados) return null

  const { estatisticas, projetosPorStatus, projetosRecentes, proximasVistorias, pagamentosProximos, evolucaoMensal } = dados

  const pieData = projetosPorStatus.map((p: any) => ({
    name: STATUS_OPERACIONAL_LABELS[p.status] || p.status,
    value: p.count,
    color: CORES_STATUS[p.status as keyof typeof CORES_STATUS] || '#94a3b8',
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Gerencial</h1>
        <p className="text-gray-500 text-sm mt-1">Visão geral do sistema Ecdise</p>
      </div>

      {/* Cards de indicadores */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Briefcase className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Total de Projetos</p>
            <p className="text-2xl font-bold text-gray-900">{estatisticas.totalProjetos}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Em Andamento</p>
            <p className="text-2xl font-bold text-green-600">{estatisticas.projetosAtivos}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <Clock className="w-6 h-6 text-yellow-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">A Receber</p>
            <p className="text-xl font-bold text-gray-900">{formatCurrency(estatisticas.totalPendente)}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 flex items-center gap-4">
          <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <div>
            <p className="text-xs text-gray-400">Tarefas Atrasadas</p>
            <p className="text-2xl font-bold text-red-600">{estatisticas.tarefasAtrasadas}</p>
          </div>
        </div>
      </div>

      {/* Segunda linha de cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{estatisticas.projetosConcluidos}</p>
          <p className="text-xs text-gray-400 mt-1">Projetos Concluídos</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{estatisticas.projetosNaoIniciados}</p>
          <p className="text-xs text-gray-400 mt-1">Não Iniciados</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-3xl font-bold text-gray-900">{estatisticas.visitorias30dias}</p>
          <p className="text-xs text-gray-400 mt-1">Vistorias no Mês</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
          <p className="text-xl font-bold text-red-600">{formatCurrency(estatisticas.totalVencido)}</p>
          <p className="text-xs text-gray-400 mt-1">Pagamentos Vencidos</p>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Evolução mensal */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Projetos por Mês</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={evolucaoMensal} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="projetos" fill="#22c55e" radius={[4, 4, 0, 0]} name="Projetos" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Distribuição por status */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Distribuição por Status</h3>
          {pieData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {pieData.map((entry: any, index: number) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any) => [v, 'Projetos']} />
                <Legend
                  iconType="circle"
                  iconSize={8}
                  formatter={(value: string) => <span className="text-xs">{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-40 text-gray-400 text-sm">
              Nenhum dado disponível
            </div>
          )}
        </div>
      </div>

      {/* Tabelas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Projetos recentes */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Projetos Recentes</h3>
            <Link href="/comercial" className="text-xs text-green-600 hover:text-green-700 font-medium">
              Ver todos →
            </Link>
          </div>
          <div className="space-y-3">
            {projetosRecentes.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhum projeto</p>
            ) : (
              projetosRecentes.map((p: any) => (
                <Link
                  key={p.id}
                  href={`/operacional/${p.id}`}
                  className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <Briefcase className="w-4 h-4 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {p.imovelNome || p.cliente?.nome}
                    </p>
                    <p className="text-xs text-gray-400">{p.tipoServico}</p>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0">{formatDate(p.criadoEm)}</span>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Próximas vistorias */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Próximas Vistorias</h3>
            <Link href="/campo" className="text-xs text-green-600 hover:text-green-700 font-medium">
              Ver todas →
            </Link>
          </div>
          <div className="space-y-3">
            {proximasVistorias.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">Nenhuma vistoria agendada</p>
            ) : (
              proximasVistorias.map((v: any) => (
                <div key={v.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{v.titulo}</p>
                    <p className="text-xs text-gray-400">{v.projeto?.codigo} • {v.responsavel?.nome}</p>
                  </div>
                  <span className="text-xs text-blue-600 font-medium flex-shrink-0">{formatDate(v.dataAgendada)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Pagamentos próximos do vencimento */}
      {pagamentosProximos.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              Pagamentos Vencendo em 30 dias
            </h3>
            <Link href="/financeiro" className="text-xs text-green-600 hover:text-green-700 font-medium">
              Ver financeiro →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="text-xs font-semibold text-gray-400 pb-2">Cliente</th>
                  <th className="text-xs font-semibold text-gray-400 pb-2">Descrição</th>
                  <th className="text-xs font-semibold text-gray-400 pb-2">Valor</th>
                  <th className="text-xs font-semibold text-gray-400 pb-2">Vencimento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {pagamentosProximos.map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-2 text-sm font-medium text-gray-900">{p.contrato?.cliente?.nome}</td>
                    <td className="py-2 text-sm text-gray-600">{p.descricao}</td>
                    <td className="py-2 text-sm font-medium text-gray-900">{formatCurrency(p.valor)}</td>
                    <td className="py-2 text-sm text-yellow-600 font-medium">{formatDate(p.dataVencimento)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
