import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { TAREFAS_ENCERRADAS, hojeDataPura, somarDias, inicioMesSP, resumoPagamentos } from '@/lib/indicadores'
import { FILTRO_PAGAMENTO_COBRAVEL, buscarPagamentosKPI, filtroTarefasAtrasadas, kpisProjetos } from '@/lib/indicadoresDb'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Datas puras (meia-noite UTC), no mesmo formato de prazos e vencimentos:
    // "hoje" inclui o que vence hoje; a janela vai até o fim do 30º dia.
    const hoje = hojeDataPura()
    const proximos30 = somarDias(hoje, 31)

    // ── ANALISTA DE SERVIÇO RÁPIDO ──────────────────────────────
    if (user.role === 'ANALISTA_RAPIDO') {
      const [aguardando, emAnalise, concluidos, projetos] = await Promise.all([
        prisma.projeto.count({ where: { analistaRapidoId: user.id, etapaPipeline: 'SOLICITACAO', excluido: false } }),
        prisma.projeto.count({ where: { analistaRapidoId: user.id, etapaPipeline: 'EM_ANALISE_RAPIDA', excluido: false } }),
        prisma.projeto.count({ where: { analistaRapidoId: user.id, etapaPipeline: 'ANALISE_CONCLUIDA', excluido: false } }),
        prisma.projeto.findMany({
          where: {
            analistaRapidoId: user.id,
            etapaPipeline: { in: ['SOLICITACAO', 'EM_ANALISE_RAPIDA', 'ANALISE_CONCLUIDA'] },
            excluido: false,
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
      // Tarefas em aberto (pendentes ou em andamento) atribuídas a este usuário
      const filtroMinhasTarefas = { responsavelId: user.id, status: { notIn: TAREFAS_ENCERRADAS }, projeto: { excluido: false } }
      const minhasTarefas = await prisma.tarefa.findMany({
        where: filtroMinhasTarefas,
        select: { projetoId: true, status: true },
      })
      const projetoIdsComTarefas = Array.from(new Set(minhasTarefas.map(t => t.projetoId)))

      // Projetos onde é responsável do projeto OU tem tarefas atribuídas
      const filtroMeusProjetos = {
        etapaPipeline: { in: ['OPERACIONAL', 'EM_EXECUCAO'] },
        excluido: false,
        OR: [
          { responsavelId: user.id },
          { id: { in: projetoIdsComTarefas } },
        ],
      }

      const [ativos, concluidos, proximasVistorias, projetos, tarefasList] = await Promise.all([
        prisma.projeto.count({ where: filtroMeusProjetos }),
        prisma.projeto.count({ where: { responsavelId: user.id, etapaPipeline: 'CONCLUIDO', excluido: false } }),
        prisma.vistoria.findMany({
          where: { responsavelId: user.id, status: 'AGENDADA', dataAgendada: { gte: hoje, lt: proximos30 }, projeto: { excluido: false } },
          include: { projeto: { select: { codigo: true, imovelNome: true } } },
          orderBy: { dataAgendada: 'asc' },
          take: 5,
        }),
        prisma.projeto.findMany({
          where: filtroMeusProjetos,
          include: { cliente: { select: { nome: true } } },
          orderBy: { criadoEm: 'desc' },
          take: 20,
        }),
        // Minhas tarefas em aberto com contexto
        prisma.tarefa.findMany({
          where: filtroMinhasTarefas,
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
      const etapasOperacionais: string[] = ['OPERACIONAL', 'EM_EXECUCAO']

      const [novos, andamento, concluidos, projetos, proximasVistorias, tarefasAtrasadas, tarefasConcluidas, tarefasTotais] = await Promise.all([
        prisma.projeto.count({ where: { etapaPipeline: 'OPERACIONAL', excluido: false } }),
        prisma.projeto.count({ where: { etapaPipeline: 'EM_EXECUCAO', excluido: false } }),
        prisma.projeto.count({ where: { etapaPipeline: 'CONCLUIDO', excluido: false } }),
        prisma.projeto.findMany({
          where: { etapaPipeline: { in: etapasOperacionais }, excluido: false },
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
            dataAgendada: { gte: hoje, lt: proximos30 },
            projeto: { excluido: false },
          },
          include: { projeto: { select: { codigo: true, imovelNome: true } }, responsavel: { select: { nome: true } } },
          orderBy: { dataAgendada: 'asc' },
          take: 10,
        }),
        // Tarefas em aberto (pendentes ou em andamento) com prazo vencido
        prisma.tarefa.count({ where: filtroTarefasAtrasadas(etapasOperacionais) }),
        // Tarefas concluídas no mês atual (mês de São Paulo)
        prisma.tarefa.count({
          where: {
            status: 'CONCLUIDA',
            dataConclusao: { gte: inicioMesSP() },
            projeto: { excluido: false },
          }
        }),
        // Tarefas em aberto (pendentes ou em andamento) nos projetos em operação
        prisma.tarefa.count({
          where: { status: { notIn: TAREFAS_ENCERRADAS }, projeto: { etapaPipeline: { in: etapasOperacionais }, excluido: false } },
        }),
      ])

      // Taxa de eficiência: concluídas no mês / (concluídas no mês + ainda em aberto)
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
      const [aguardandoSinal, pagamentosKPI, projetosAguardando, pagamentosProximos] = await Promise.all([
        prisma.projeto.count({ where: { etapaPipeline: 'AGUARDANDO_SINAL', excluido: false } }),
        buscarPagamentosKPI(),
        prisma.projeto.findMany({
          where: { etapaPipeline: { in: ['AGUARDANDO_SINAL', 'OPERACIONAL', 'EM_EXECUCAO'] }, excluido: false },
          include: { cliente: { select: { nome: true } }, contrato: { select: { valorTotal: true, statusContrato: true } } },
          orderBy: { criadoEm: 'desc' },
          take: 20,
        }),
        prisma.pagamento.findMany({
          where: { ...FILTRO_PAGAMENTO_COBRAVEL, dataVencimento: { gte: hoje, lt: proximos30 } },
          include: { contrato: { include: { cliente: { select: { nome: true } } } } },
          orderBy: { dataVencimento: 'asc' },
          take: 10,
        }),
      ])
      const fin = resumoPagamentos(pagamentosKPI)
      return NextResponse.json({
        tipoView: 'financeiro',
        estatisticas: {
          aguardandoSinal,
          totalPendente: fin.totalPendente,
          qtdPendente: fin.qtdPendente,
          totalVencido: fin.totalVencido,
          qtdVencido: fin.qtdVencido,
          totalResidual: fin.totalResidual,
        },
        projetos: projetosAguardando,
        pagamentosProximos,
      })
    }

    // ── CONTRATOS ───────────────────────────────────────────────
    if (user.departamento === 'CONTRATOS') {
      const [aguardando, emContrato, projetos] = await Promise.all([
        prisma.projeto.count({ where: { etapaPipeline: 'AGUARDANDO_CONTRATO', excluido: false } }),
        prisma.projeto.count({ where: { etapaPipeline: 'EM_CONTRATO', excluido: false } }),
        prisma.projeto.findMany({
          where: { etapaPipeline: { in: ['AGUARDANDO_CONTRATO', 'EM_CONTRATO'] }, excluido: false },
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
    const [kpis, projetosRecentes, proximasVistorias, pagamentosProximos, pagamentosKPI] = await Promise.all([
      kpisProjetos(),
      prisma.projeto.findMany({
        where: { excluido: false },
        take: 6,
        orderBy: { criadoEm: 'desc' },
        include: { cliente: { select: { nome: true } }, analistaRapido: { select: { nome: true } } },
      }),
      prisma.vistoria.findMany({
        where: { dataAgendada: { gte: hoje, lt: proximos30 }, status: 'AGENDADA', projeto: { excluido: false } },
        take: 5,
        orderBy: { dataAgendada: 'asc' },
        include: { projeto: { select: { codigo: true, imovelNome: true } }, responsavel: { select: { nome: true } } },
      }),
      prisma.pagamento.findMany({
        where: { ...FILTRO_PAGAMENTO_COBRAVEL, dataVencimento: { gte: hoje, lt: proximos30 } },
        take: 5,
        orderBy: { dataVencimento: 'asc' },
        include: { contrato: { include: { cliente: { select: { nome: true } } } } },
      }),
      buscarPagamentosKPI(),
    ])
    const fin = resumoPagamentos(pagamentosKPI)

    return NextResponse.json({
      tipoView: 'admin',
      estatisticas: {
        ...kpis.estatisticas,
        totalPendente: fin.totalPendente,
        totalVencido: fin.totalVencido,
      },
      porEtapa: kpis.porEtapa,
      projetosRecentes,
      proximasVistorias,
      pagamentosProximos,
      evolucaoMensal: kpis.evolucaoMensal,
    })
  } catch (error) {
    console.error('Erro no dashboard:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
