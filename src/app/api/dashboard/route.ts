import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const hoje = new Date()
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
      const [novos, andamento, concluidos, projetos, proximasVistorias] = await Promise.all([
        prisma.projeto.count({ where: { supervisorId: user.id, etapaPipeline: 'OPERACIONAL' } }),
        prisma.projeto.count({ where: { supervisorId: user.id, etapaPipeline: 'EM_EXECUCAO' } }),
        prisma.projeto.count({ where: { supervisorId: user.id, etapaPipeline: 'CONCLUIDO' } }),
        prisma.projeto.findMany({
          where: { supervisorId: user.id, etapaPipeline: { in: ['OPERACIONAL', 'EM_EXECUCAO'] } },
          include: {
            cliente: { select: { nome: true } },
            responsavel: { select: { nome: true } },
          },
          orderBy: { criadoEm: 'desc' },
          take: 20,
        }),
        prisma.vistoria.findMany({
          where: {
            status: 'AGENDADA',
            dataAgendada: { gte: hoje, lte: proximos30 },
            projeto: { supervisorId: user.id }
          },
          include: { projeto: { select: { codigo: true, imovelNome: true } }, responsavel: { select: { nome: true } } },
          orderBy: { dataAgendada: 'asc' },
          take: 5,
        }),
      ])
      return NextResponse.json({
        tipoView: 'gestor_operacional',
        estatisticas: { novos, andamento, concluidos },
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
    const [
      totalProjetos,
      projetosAtivos,
      projetosConcluidos,
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
    const evolucaoMensal = []
    for (let i = 5; i >= 0; i--) {
      const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1)
      const fimDoMes = new Date(hoje.getFullYear(), hoje.getMonth() - i + 1, 0)
      const count = await prisma.projeto.count({ where: { criadoEm: { gte: mes, lte: fimDoMes } } })
      evolucaoMensal.push({ mes: mes.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }), projetos: count })
    }

    const pagamentosPendentes = await prisma.pagamento.aggregate({ where: { status: 'PENDENTE' }, _sum: { valor: true } })
    const pagamentosVencidos = await prisma.pagamento.aggregate({ where: { status: 'PENDENTE', dataVencimento: { lt: hoje } }, _sum: { valor: true } })

    return NextResponse.json({
      tipoView: 'admin',
      estatisticas: {
        totalProjetos,
        projetosAtivos,
        projetosConcluidos,
        tarefasAtrasadas,
        totalPendente: pagamentosPendentes._sum.valor || 0,
        totalVencido: pagamentosVencidos._sum.valor || 0,
      },
      porEtapa: porEtapa.map(e => ({ etapa: e.etapaPipeline, count: e._count })),
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
