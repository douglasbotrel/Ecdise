import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const hoje = new Date()
    const inicioHoje = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate())
    const fimSeteDias = new Date(inicioHoje)
    fimSeteDias.setDate(fimSeteDias.getDate() + 7)
    fimSeteDias.setHours(23, 59, 59, 999)

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

    // ── Distribuição de serviços contratados ────────────────────────────────
    // Parseia o JSON de cada projeto para contar serviços individualmente
    const projetosComServicos = await prisma.projeto.findMany({
      where: {
        servicosContratados: { not: null },
        etapaPipeline: { not: 'CANCELADO' },
      },
      select: {
        servicosContratados: true,
        etapaPipeline: true,
        contrato: { select: { valorTotal: true } },
      },
    })

    // Agrupa por nome do serviço: quantidade de projetos e valor total de contratos
    const servicoMap: Record<string, { qtd: number; valor: number }> = {}
    for (const p of projetosComServicos) {
      if (!p.servicosContratados) continue
      let lista: string[] = []
      try { lista = JSON.parse(p.servicosContratados) } catch { continue }
      for (const nome of lista) {
        if (!nome) continue
        if (!servicoMap[nome]) servicoMap[nome] = { qtd: 0, valor: 0 }
        servicoMap[nome].qtd += 1
        servicoMap[nome].valor += p.contrato?.valorTotal ?? 0
      }
    }
    const servicosContratados = Object.entries(servicoMap)
      .map(([nome, { qtd, valor }]) => ({ nome, qtd, valor }))
      .sort((a, b) => b.qtd - a.qtd)

    // ── Panorama de Pendências (Acompanhamento de Processos) ────────────────
    // Considera apenas pendências de projetos atualmente em acompanhamento
    const filtroProjetoAcompanhamento = { projeto: { emAcompanhamento: true } }

    const [
      pendenciasAbertas,
      pendenciasAVencer,
      pendenciasAtrasadas,
      pendenciasRespondidas,
    ] = await Promise.all([
      prisma.pendencia.count({
        where: { status: 'ABERTA', ...filtroProjetoAcompanhamento },
      }),
      prisma.pendencia.count({
        where: {
          status: 'ABERTA',
          prazoResposta: { gte: inicioHoje, lte: fimSeteDias },
          ...filtroProjetoAcompanhamento,
        },
      }),
      prisma.pendencia.count({
        where: {
          status: 'ABERTA',
          prazoResposta: { lt: inicioHoje },
          ...filtroProjetoAcompanhamento,
        },
      }),
      prisma.pendencia.count({
        where: { status: 'CONCLUIDA', ...filtroProjetoAcompanhamento },
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
      servicosContratados,
      pendencias: {
        abertas:     pendenciasAbertas,
        aVencer:     pendenciasAVencer,
        atrasadas:   pendenciasAtrasadas,
        respondidas: pendenciasRespondidas,
      },
    })
  } catch (error) {
    console.error('Erro na API BI:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
