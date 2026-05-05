import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const hoje = new Date()
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    const proximos30 = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Estatísticas de projetos
    const [
      totalProjetos,
      projetosAtivos,
      projetosConcluidos,
      projetosCancelados,
      projetosNaoIniciados,
      projetosPorStatus,
      visitorias30dias,
      pagamentosPendentes,
      pagamentosVencidos,
      tarefasAtrasadas,
    ] = await Promise.all([
      prisma.projeto.count(),
      prisma.projeto.count({ where: { statusOperacional: 'EM_ANDAMENTO' } }),
      prisma.projeto.count({ where: { statusOperacional: 'CONCLUIDO' } }),
      prisma.projeto.count({ where: { statusOperacional: 'CANCELADO' } }),
      prisma.projeto.count({ where: { statusOperacional: 'NAO_INICIADO' } }),
      prisma.projeto.groupBy({
        by: ['statusOperacional'],
        _count: true,
      }),
      prisma.vistoria.count({
        where: { dataAgendada: { gte: inicioMes, lte: fimMes } }
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
      prisma.tarefa.count({
        where: { status: 'PENDENTE', prazo: { lt: hoje } }
      }),
    ])

    // Projetos recentes
    const projetosRecentes = await prisma.projeto.findMany({
      take: 5,
      orderBy: { criadoEm: 'desc' },
      include: {
        cliente: { select: { nome: true } },
        responsavel: { select: { nome: true } },
      }
    })

    // Vistorias próximas (30 dias)
    const proximasVistorias = await prisma.vistoria.findMany({
      where: {
        dataAgendada: { gte: hoje, lte: proximos30 },
        status: 'AGENDADA',
      },
      take: 5,
      orderBy: { dataAgendada: 'asc' },
      include: {
        projeto: { select: { codigo: true, imovelNome: true } },
        responsavel: { select: { nome: true } },
      }
    })

    // Pagamentos vencendo em 30 dias
    const pagamentosProximos = await prisma.pagamento.findMany({
      where: {
        status: 'PENDENTE',
        dataVencimento: { gte: hoje, lte: proximos30 }
      },
      take: 5,
      orderBy: { dataVencimento: 'asc' },
      include: {
        contrato: {
          include: { cliente: { select: { nome: true } } }
        }
      }
    })

    // Evolução de projetos por mês (últimos 6 meses)
    const evolucaoMensal = []
    for (let i = 5; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0)
      const count = await prisma.projeto.count({
        where: { criadoEm: { gte: mes, lte: fimDoMes } }
      })
      evolucaoMensal.push({
        mes: mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        projetos: count,
      })
    }

    return NextResponse.json({
      estatisticas: {
        totalProjetos,
        projetosAtivos,
        projetosConcluidos,
        projetosCancelados,
        projetosNaoIniciados,
        visitorias30dias,
        totalPendente: pagamentosPendentes._sum.valor || 0,
        totalVencido: pagamentosVencidos._sum.valor || 0,
        tarefasAtrasadas,
        qtdPagamentosPendentes: pagamentosPendentes._count,
      },
      projetosPorStatus: projetosPorStatus.map(p => ({
        status: p.statusOperacional,
        count: p._count,
      })),
      projetosRecentes,
      proximasVistorias,
      pagamentosProximos,
      evolucaoMensal,
    })
  } catch (error) {
    console.error('Erro no dashboard:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
