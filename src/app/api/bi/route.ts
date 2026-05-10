import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const hoje = new Date()

    // ── Evolução financeira dos últimos 6 meses ─────────────────────────────
    const evolucaoFinanceira = []

    for (let i = 5; i >= 0; i--) {
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const fimMes   = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0, 23, 59, 59)

      const [recebido, pendente] = await Promise.all([
        // Recebido: pagamentos com status PAGO e dataPagamento no mês
        prisma.pagamento.aggregate({
          where: {
            status: 'PAGO',
            dataPagamento: { gte: inicioMes, lte: fimMes },
          },
          _sum: { valor: true },
        }),
        // Pendente: pagamentos ainda PENDENTE com dataVencimento no mês
        prisma.pagamento.aggregate({
          where: {
            status: { in: ['PENDENTE', 'VENCIDO'] },
            dataVencimento: { gte: inicioMes, lte: fimMes },
          },
          _sum: { valor: true },
        }),
      ])

      evolucaoFinanceira.push({
        mes: inicioMes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        recebido: recebido._sum.valor ?? 0,
        pendente: pendente._sum.valor ?? 0,
      })
    }

    // ── Totais gerais ───────────────────────────────────────────────────────
    const [
      totalRecebido,
      totalPendente,
      totalVencido,
      pagamentosPorForma,
    ] = await Promise.all([
      prisma.pagamento.aggregate({
        where: { status: 'PAGO' },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.pagamento.aggregate({
        where: { status: 'PENDENTE' },
        _sum: { valor: true },
        _count: true,
      }),
      prisma.pagamento.aggregate({
        where: { status: 'PENDENTE', dataVencimento: { lt: hoje } },
        _sum: { valor: true },
        _count: true,
      }),
      // Distribuição por forma de pagamento
      prisma.pagamento.groupBy({
        by: ['formaPagamento'],
        where: { status: 'PAGO', formaPagamento: { not: null } },
        _sum: { valor: true },
        _count: true,
        orderBy: { _sum: { valor: 'desc' } },
      }),
    ])

    return NextResponse.json({
      evolucaoFinanceira,
      totais: {
        totalRecebido:    totalRecebido._sum.valor   ?? 0,
        qtdRecebido:      totalRecebido._count,
        totalPendente:    totalPendente._sum.valor    ?? 0,
        qtdPendente:      totalPendente._count,
        totalVencido:     totalVencido._sum.valor     ?? 0,
        qtdVencido:       totalVencido._count,
      },
      pagamentosPorForma: pagamentosPorForma.map(p => ({
        forma:  p.formaPagamento ?? 'Não informado',
        valor:  p._sum.valor ?? 0,
        qtd:    p._count,
      })),
    })
  } catch (error) {
    console.error('Erro na API BI:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
