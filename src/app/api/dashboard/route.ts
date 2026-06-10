import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const hoje = new Date()
<<<<<<< HEAD
    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0)
    const proximos30 = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)

    // Estatísticas de projetos
=======
    const proximos30 = new Date(hoje.getTime() + 30 * 24 * 60 * 60 * 1000)

    // ── ANALISTA DE SERVIÇO RÁPIDO ──────────────────────────────
    if (user.role === 'ANALISTA_RAPIDO') {
      const [aguardando, emAnalise, concluidos, projetos] = await Promise.all([
        prisma.projeto.count({ where: { analistaRapidoId: user.id, etapaPipeline: 'SOLICITACAO' } }),
        prisma.projeto.count({ where: { analistaRapidoId: user.id, etapaPipeline: 'EM_ANALISE_RAPIDA' } }),
        prisma.projeto.count({ where: { analistaRapidoId: user.id, etapaPipeline: 'ANALISE_CONCLUIDA' } }),
        prisma.projeto.findMany({
          where: {
            analistaRapidoId: user.id,
            etapaPipeline: { in: ['SOLICITACAO', 'EM_ANALISE_RAPIDA', 'ANALISE_CONCLUIDA'] }
          },
          include: { cliente: { select: { nome: true } } },
          orderBy: { criadoEm: 'desc' },
          take: 20,
        }),
      ])
      return NextResponse.json({
        tipoView: 'analista_rapido',
        estatisticas: { aguardando, emAnalise, concluidos },
        projetos,
      })
    }

    // ── ANALISTA OPERACIONAL ────────────────────────────────────
    if (user.role === 'ANALISTA') {
      // Tarefas atribuídas a este usuário
      const minhasTarefas = await prisma.tarefa.findMany({
        where: { responsavelId: user.id, status: { not: 'CONCLUIDA' } },
        select: { projetoId: true, status: true },
      })
      const projetoIdsComTarefas = [...new Set(minhasTarefas.map(t => t.projetoId))]

      const [ativos, concluidos, proximasVistorias, projetos, tarefasList] = await Promise.all([
        prisma.projeto.count({ where: { etapaPipeline: 'EM_EXECUCAO', id: { in: projetoIdsComTarefas } } }),
        prisma.projeto.count({ where: { responsavelId: user.id, etapaPipeline: 'CONCLUIDO' } }),
        prisma.vistoria.findMany({
          where: { responsavelId: user.id, status: 'AGENDADA', dataAgendada: { gte: hoje, lte: proximos30 } },
          include: { projeto: { select: { codigo: true, imovelNome: true } } },
          orderBy: { dataAgendada: 'asc' },
          take: 5,
        }),
        // Projetos onde é responsável do projeto OU tem tarefas atribuídas
        prisma.projeto.findMany({
          where: {
            etapaPipeline: { in: ['OPERACIONAL', 'EM_EXECUCAO'] },
            OR: [
              { responsavelId: user.id },
              { id: { in: projetoIdsComTarefas } },
            ],
          },
          include: { cliente: { select: { nome: true } } },
          orderBy: { criadoEm: 'desc' },
          take: 20,
        }),
        // Minhas tarefas pendentes com contexto
        prisma.tarefa.findMany({
          where: { responsavelId: user.id, status: { not: 'CONCLUIDA' } },
          include: { projeto: { select: { id: true, codigo: true, imovelNome: true } } },
          orderBy: [{ prazo: 'asc' }, { criadoEm: 'asc' }],
          take: 15,
        }),
      ])
      return NextResponse.json({
        tipoView: 'analista',
        estatisticas: { ativos, concluidos, tarefasPendentes: minhasTarefas.length },
        projetos,
        minhasTarefas: tarefasList,
        proximasVistorias,
      })
    }

    // ── GESTOR OPERACIONAL / SUPERVISOR ─────────────────────────
    if (['GESTOR_OPERACIONAL', 'GESTOR_CAMPO', 'SUPERVISOR'].includes(user.role)) {
      // Gestor vê TODOS os projetos em estágio operacional (não só os que ele é supervisor)
      // Inclui projetos onde é gestorResponsavelId OU supervisorId OU todos os operacionais
      const etapasOperacionais = ['OPERACIONAL', 'EM_EXECUCAO'] as const

      const [novos, andamento, concluidos, projetos, proximasVistorias, tarefasAtrasadas, tarefasConcluidas, tarefasTotais] = await Promise.all([
        prisma.projeto.count({ where: { etapaPipeline: 'OPERACIONAL' } }),
        prisma.projeto.count({ where: { etapaPipeline: 'EM_EXECUCAO' } }),
        prisma.projeto.count({ where: { etapaPipeline: 'CONCLUIDO' } }),
        prisma.projeto.findMany({
          where: { etapaPipeline: { in: etapasOperacionais } },
          include: {
            cliente: { select: { nome: true } },
            responsavel: { select: { nome: true } },
            _count: { select: { tarefas: true } },
          },
          orderBy: { criadoEm: 'desc' },
          take: 30,
        }),
        prisma.vistoria.findMany({
          where: {
            status: 'AGENDADA',
            dataAgendada: { gte: hoje, lte: proximos30 },
          },
          include: { projeto: { select: { codigo: true, imovelNome: true } }, responsavel: { select: { nome: true } } },
          orderBy: { dataAgendada: 'asc' },
          take: 10,
        }),
        // Eficiência: tarefas atrasadas
        prisma.tarefa.count({
          where: { status: 'PENDENTE', prazo: { lt: hoje }, projeto: { etapaPipeline: { in: etapasOperacionais } } }
        }),
        // Tarefas concluídas no mês atual
        prisma.tarefa.count({
          where: {
            status: 'CONCLUIDA',
            dataConclusao: { gte: new Date(hoje.getFullYear(), hoje.getMonth(), 1) },
          }
        }),
        // Total de tarefas em aberto
        prisma.tarefa.count({ where: { status: 'PENDENTE', projeto: { etapaPipeline: { in: etapasOperacionais } } } }),
      ])

      // Taxa de eficiência: tarefas concluídas / (concluídas + pendentes)
      const totalParaEficiencia = tarefasConcluidas + tarefasTotais
      const taxaEficiencia = totalParaEficiencia > 0
        ? Math.round((tarefasConcluidas / totalParaEficiencia) * 100)
        : 0

      return NextResponse.json({
        tipoView: 'gestor_operacional',
        estatisticas: { novos, andamento, concluidos, tarefasAtrasadas, tarefasConcluidas, tarefasTotais, taxaEficiencia },
        projetos,
        proximasVistorias,
      })
    }

    // ── FINANCEIRO ──────────────────────────────────────────────
    if (user.departamento === 'FINANCEIRO') {
      const [aguardandoSinal, pagamentosPendentes, pagamentosVencidos, projetosAguardando] = await Promise.all([
        prisma.projeto.count({ where: { etapaPipeline: 'AGUARDANDO_SINAL' } }),
        prisma.pagamento.aggregate({ where: { status: 'PENDENTE' }, _sum: { valor: true }, _count: true }),
        prisma.pagamento.aggregate({ where: { status: 'PENDENTE', dataVencimento: { lt: hoje } }, _sum: { valor: true }, _count: true }),
        prisma.projeto.findMany({
          where: { etapaPipeline: { in: ['AGUARDANDO_SINAL', 'OPERACIONAL', 'EM_EXECUCAO'] } },
          include: { cliente: { select: { nome: true } }, contrato: { select: { valorTotal: true, statusContrato: true } } },
          orderBy: { criadoEm: 'desc' },
          take: 20,
        }),
      ])
      const pagamentosProximos = await prisma.pagamento.findMany({
        where: { status: 'PENDENTE', dataVencimento: { gte: hoje, lte: proximos30 } },
        include: { contrato: { include: { cliente: { select: { nome: true } } } } },
        orderBy: { dataVencimento: 'asc' },
        take: 10,
      })
      return NextResponse.json({
        tipoView: 'financeiro',
        estatisticas: {
          aguardandoSinal,
          totalPendente: pagamentosPendentes._sum.valor || 0,
          qtdPendente: pagamentosPendentes._count,
          totalVencido: pagamentosVencidos._sum.valor || 0,
          qtdVencido: pagamentosVencidos._count,
        },
        projetos: projetosAguardando,
        pagamentosProximos,
      })
    }

    // ── CONTRATOS ───────────────────────────────────────────────
    if (user.departamento === 'CONTRATOS') {
      const [aguardando, emContrato, projetos] = await Promise.all([
        prisma.projeto.count({ where: { etapaPipeline: 'AGUARDANDO_CONTRATO' } }),
        prisma.projeto.count({ where: { etapaPipeline: 'EM_CONTRATO' } }),
        prisma.projeto.findMany({
          where: { etapaPipeline: { in: ['AGUARDANDO_CONTRATO', 'EM_CONTRATO'] } },
          include: { cliente: { select: { nome: true } }, contrato: true },
          orderBy: { criadoEm: 'desc' },
          take: 20,
        }),
      ])
      return NextResponse.json({
        tipoView: 'contratos',
        estatisticas: { aguardando, emContrato },
        projetos,
      })
    }

    // ── ADM / GESTOR GERAL — visão completa do pipeline ─────────
    const inicio6Meses = new Date(hoje.getFullYear(), hoje.getMonth() - 5, 1)
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
    const [
      totalProjetos,
      projetosAtivos,
      projetosConcluidos,
<<<<<<< HEAD
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
=======
      tarefasAtrasadas,
      porEtapa,
      projetosRecentes,
      proximasVistorias,
      pagamentosProximos,
    ] = await Promise.all([
      prisma.projeto.count(),
      prisma.projeto.count({ where: { etapaPipeline: { in: ['EM_ANALISE_RAPIDA', 'EM_NEGOCIACAO', 'EM_CONTRATO', 'EM_EXECUCAO'] } } }),
      prisma.projeto.count({ where: { etapaPipeline: 'CONCLUIDO' } }),
      prisma.tarefa.count({ where: { status: 'PENDENTE', prazo: { lt: hoje } } }),
      prisma.projeto.groupBy({ by: ['etapaPipeline'], _count: true }),
      prisma.projeto.findMany({
        take: 6,
        orderBy: { criadoEm: 'desc' },
        include: { cliente: { select: { nome: true } }, analistaRapido: { select: { nome: true } } },
      }),
      prisma.vistoria.findMany({
        where: { dataAgendada: { gte: hoje, lte: proximos30 }, status: 'AGENDADA' },
        take: 5,
        orderBy: { dataAgendada: 'asc' },
        include: { projeto: { select: { codigo: true, imovelNome: true } }, responsavel: { select: { nome: true } } },
      }),
      prisma.pagamento.findMany({
        where: { status: 'PENDENTE', dataVencimento: { gte: hoje, lte: proximos30 } },
        take: 5,
        orderBy: { dataVencimento: 'asc' },
        include: { contrato: { include: { cliente: { select: { nome: true } } } } },
      }),
    ])

    // Evolução mensal (6 meses)
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
    const evolucaoMensal = []
    for (let i = 5; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0)
<<<<<<< HEAD
      const count = await prisma.projeto.count({
        where: { criadoEm: { gte: mes, lte: fimDoMes } }
      })
      evolucaoMensal.push({
        mes: mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }),
        projetos: count,
      })
    }

    return NextResponse.json({
=======
      const count = await prisma.projeto.count({ where: { criadoEm: { gte: mes, lte: fimDoMes } } })
      evolucaoMensal.push({ mes: mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), projetos: count })
    }

    const pagamentosPendentes = await prisma.pagamento.aggregate({ where: { status: 'PENDENTE' }, _sum: { valor: true } })
    const pagamentosVencidos = await prisma.pagamento.aggregate({ where: { status: 'PENDENTE', dataVencimento: { lt: hoje } }, _sum: { valor: true } })

    return NextResponse.json({
      tipoView: 'admin',
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
      estatisticas: {
        totalProjetos,
        projetosAtivos,
        projetosConcluidos,
<<<<<<< HEAD
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
=======
        tarefasAtrasadas,
        totalPendente: pagamentosPendentes._sum.valor || 0,
        totalVencido: pagamentosVencidos._sum.valor || 0,
      },
      porEtapa: porEtapa.map(e => ({ etapa: e.etapaPipeline, count: e._count })),
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
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
