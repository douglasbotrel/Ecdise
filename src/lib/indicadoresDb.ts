// Consultas compartilhadas pelos indicadores do Dashboard e do BI.
// As regras de cálculo ficam em ./indicadores (testadas); aqui só se busca o dado.

import { prisma } from './prisma'
import {
  ETAPAS_ENCERRADAS, TAREFAS_ENCERRADAS, CONTRATOS_ENCERRADOS,
  hojeDataPura, ultimosMeses, resumoEtapas, contarPorMes,
} from './indicadores'

// Parcelas que ainda devem ser cobradas (para listas de "vencendo em breve").
export const FILTRO_PAGAMENTO_COBRAVEL = {
  status: 'PENDENTE',
  contrato: {
    statusContrato: { notIn: CONTRATOS_ENCERRADOS },
    projeto: { excluido: false, etapaPipeline: { not: 'CANCELADO' } },
  },
}

// Todos os pagamentos de projetos não excluídos, com o necessário para os KPIs.
export function buscarPagamentosKPI() {
  return prisma.pagamento.findMany({
    where: { contrato: { projeto: { excluido: false } } },
    select: {
      status: true, valor: true, valorRecebido: true, residual: true,
      dataVencimento: true, dataPagamento: true, formaPagamento: true,
      contrato: { select: { statusContrato: true, projeto: { select: { etapaPipeline: true } } } },
    },
  })
}

// Tarefa em aberto com prazo vencido, em projeto ainda em andamento.
export function filtroTarefasAtrasadas(etapas?: string[]) {
  return {
    status: { notIn: TAREFAS_ENCERRADAS },
    prazo: { lt: hojeDataPura() },
    projeto: {
      excluido: false,
      etapaPipeline: etapas ? { in: etapas } : { notIn: ETAPAS_ENCERRADAS },
    },
  }
}

export async function kpisProjetos() {
  const inicioJanela = ultimosMeses(6)[0].inicio
  const [grupos, tarefasAtrasadas, criados] = await Promise.all([
    prisma.projeto.groupBy({ by: ['etapaPipeline'], _count: true, where: { excluido: false } }),
    prisma.tarefa.count({ where: filtroTarefasAtrasadas() }),
    prisma.projeto.findMany({
      where: { excluido: false, criadoEm: { gte: inicioJanela } },
      select: { criadoEm: true },
    }),
  ])
  const porEtapa = grupos.map(g => ({ etapa: g.etapaPipeline, count: g._count }))
  const r = resumoEtapas(porEtapa)
  return {
    estatisticas: {
      totalProjetos: r.total,
      projetosAtivos: r.ativos,
      projetosConcluidos: r.concluidos,
      projetosCancelados: r.cancelados,
      tarefasAtrasadas,
    },
    porEtapa,
    evolucaoMensal: contarPorMes(criados.map(p => p.criadoEm)),
  }
}
