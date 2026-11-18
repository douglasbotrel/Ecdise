import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirModulo } from '@/lib/permissoes'
import {
  hojeDataPura, somarDias, resumoPagamentos, evolucaoFinanceira, recebidoPorForma,
  servicosContratados as agruparServicos, mediaDias, inicioExecucao, diasEntre,
} from '@/lib/indicadores'
import { buscarPagamentosKPI, kpisProjetos } from '@/lib/indicadoresDb'

// O BI é autossuficiente: não depende de /api/dashboard, que devolve uma visão
// diferente para cada perfil (um usuário do departamento BI via tudo zerado).
export async function GET(request: NextRequest) {
  try {
    const auth = await exigirModulo('bi')
    if (auth instanceof NextResponse) return auth

    const hoje = hojeDataPura()
    const fimSeteDias = somarDias(hoje, 8) // até o fim do 7º dia

    const [kpis, pagamentos, projetosComServicos] = await Promise.all([
      kpisProjetos(),
      buscarPagamentosKPI(),
      prisma.projeto.findMany({
        where: { etapaPipeline: { not: 'CANCELADO' }, excluido: false },
        select: {
          servicosContratados: true,
          contrato: { select: { valorTotal: true, servicosContratados: true, statusContrato: true } },
        },
      }),
    ])

    // ── Financeiro ──────────────────────────────────────────────────────────
    const fin = resumoPagamentos(pagamentos)

    // ── Serviços contratados (valor do contrato rateado entre seus serviços) ─
    const servicosContratados = agruparServicos(
      projetosComServicos
        .filter(p => !['DESISTENCIA', 'CANCELADO'].includes(p.contrato?.statusContrato ?? ''))
        .map(p => ({
          servicos: p.contrato?.servicosContratados || p.servicosContratados,
          valorContrato: p.contrato?.valorTotal ?? null,
        }))
    )

    // ── Panorama de Pendências (Acompanhamento de Processos) ────────────────
    // Apenas pendências de projetos em acompanhamento e não excluídos
    const filtroProjetoAcompanhamento = { projeto: { emAcompanhamento: true, excluido: false } }

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
        where: { status: 'ABERTA', prazoResposta: { gte: hoje, lt: fimSeteDias }, ...filtroProjetoAcompanhamento },
      }),
      prisma.pendencia.count({
        where: { status: 'ABERTA', prazoResposta: { lt: hoje }, ...filtroProjetoAcompanhamento },
      }),
      prisma.pendencia.count({
        where: { status: 'CONCLUIDA', ...filtroProjetoAcompanhamento },
      }),
    ])

    // ── Tempos médios (operacional, protocolo→licença, tratativa de pendência) ──
    const [projetosOperacional, projetosComLicenca, pendenciasResolvidas] = await Promise.all([
      // Do início da execução até o protocolo no órgão (início recuperado pelo histórico quando falta dataInicio)
      prisma.projeto.findMany({
        where: { protocoloData: { not: null }, excluido: false },
        select: {
          dataInicio: true, dataAprovacao: true, protocoloData: true,
          historico: {
            where: { campo: { in: ['etapaPipeline', 'statusOperacional'] } },
            select: { campo: true, statusNovo: true, criadoEm: true },
          },
        },
      }),
      // Do protocolo até a emissão da licença
      prisma.projeto.findMany({
        where: { protocoloData: { not: null }, licenca: { isNot: null }, excluido: false },
        select: { protocoloData: true, licenca: { select: { dataEmissao: true } } },
      }),
      // Da abertura da pendência até a entrega da resposta
      prisma.pendencia.findMany({
        where: { dataEntrega: { not: null }, projeto: { excluido: false } },
        select: { data: true, dataEntrega: true },
      }),
    ])

    const paresOperacional = projetosOperacional
      .map(p => ({ ...inicioExecucao(p, p.historico), fim: p.protocoloData! }))
      .filter(p => p.data && diasEntre(p.data, p.fim) >= 0)
    const tempoOperacional = mediaDias(paresOperacional.map(p => ({ inicio: p.data!, fim: p.fim })))
    const operacionalEstimados = paresOperacional.filter(p => p.estimado).length
    const tempoLicenca = mediaDias(
      projetosComLicenca
        .filter(p => p.licenca?.dataEmissao)
        .map(p => ({ inicio: p.protocoloData!, fim: p.licenca!.dataEmissao }))
    )
    const tempoPendencia = mediaDias(pendenciasResolvidas.map(p => ({ inicio: p.data, fim: p.dataEntrega! })))

    return NextResponse.json({
      estatisticas: kpis.estatisticas,
      porEtapa: kpis.porEtapa,
      evolucaoMensal: kpis.evolucaoMensal,
      evolucaoFinanceira: evolucaoFinanceira(pagamentos),
      totais: fin,
      pagamentosPorForma: recebidoPorForma(pagamentos),
      servicosContratados,
      pendencias: {
        abertas:     pendenciasAbertas,
        aVencer:     pendenciasAVencer,
        atrasadas:   pendenciasAtrasadas,
        respondidas: pendenciasRespondidas,
      },
      tempos: {
        operacionalDias:    tempoOperacional.media,
        operacionalAmostra: tempoOperacional.amostra,
        operacionalEstimados,
        licencaDias:        tempoLicenca.media,
        licencaAmostra:     tempoLicenca.amostra,
        pendenciaDias:      tempoPendencia.media,
        pendenciaAmostra:   tempoPendencia.amostra,
      },
    })
  } catch (error) {
    console.error('Erro na API BI:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
