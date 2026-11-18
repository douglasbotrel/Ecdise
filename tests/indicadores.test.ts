import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  chaveDia, chaveMes, hojeDataPura, inicioMesSP, ultimosMeses,
  resumoPagamentos, evolucaoFinanceira, recebidoPorForma,
  resumoEtapas, contarPorMes, servicosContratados, mediaDias,
  type PagamentoKPI,
} from '../src/lib/indicadores.ts'

// 18/11/2026 às 10h em São Paulo (13h UTC)
const AGORA = new Date('2026-11-18T13:00:00.000Z')

const pag = (p: Partial<PagamentoKPI>): PagamentoKPI => ({
  status: 'PENDENTE', valor: 100, dataVencimento: '2026-12-10T00:00:00.000Z', ...p,
})

test('data pura usa o calendário UTC; instante usa o fuso de São Paulo', () => {
  assert.equal(chaveDia('2026-12-01T00:00:00.000Z'), '2026-12-01')
  // 30/11 às 22h em SP = 01h UTC de 01/12 → pertence a novembro
  assert.equal(chaveMes('2026-12-01T01:00:00.000Z'), '2026-11')
})

test('hoje e início do mês seguem São Paulo', () => {
  // 23h de 18/11 em SP já é 19/11 em UTC
  assert.equal(hojeDataPura(new Date('2026-11-19T02:00:00.000Z')).toISOString(), '2026-11-18T00:00:00.000Z')
  assert.equal(inicioMesSP(AGORA).toISOString(), '2026-11-01T03:00:00.000Z')
})

test('últimos 6 meses terminam no mês atual', () => {
  const m = ultimosMeses(6, AGORA)
  assert.deepEqual(m.map(x => x.chave), ['2026-06', '2026-07', '2026-08', '2026-09', '2026-10', '2026-11'])
})

test('vencer hoje não é vencido; ontem é', () => {
  const r = resumoPagamentos([
    pag({ dataVencimento: '2026-11-18T00:00:00.000Z' }),
    pag({ dataVencimento: '2026-11-17T00:00:00.000Z', valor: 50 }),
  ], AGORA)
  assert.equal(r.totalPendente, 150)
  assert.equal(r.totalVencido, 50)
  assert.equal(r.qtdVencido, 1)
})

test('parcela de contrato com desistência ou projeto cancelado não é cobrada', () => {
  const r = resumoPagamentos([
    pag({ contrato: { statusContrato: 'DESISTENCIA' } }),
    pag({ contrato: { projeto: { etapaPipeline: 'CANCELADO' } } }),
    pag({ status: 'CANCELADO' }),
    pag({}),
  ], AGORA)
  assert.equal(r.totalPendente, 100)
  assert.equal(r.qtdPendente, 1)
})

test('pagamento parcial conta o valor recebido e o residual separado', () => {
  const r = resumoPagamentos([
    pag({ status: 'PAGO', valor: 200, valorRecebido: 999 }), // valorRecebido antigo é ignorado
    pag({ status: 'PARCIAL', valor: 100, valorRecebido: 70, residual: 30 }),
  ], AGORA)
  assert.equal(r.totalRecebido, 270)
  assert.equal(r.qtdRecebido, 2)
  assert.equal(r.totalResidual, 30)
  assert.equal(r.totalPendente, 0)
})

test('evolução financeira: recebido no mês do pagamento, pendente no mês do vencimento', () => {
  const ev = evolucaoFinanceira([
    pag({ status: 'PAGO', valor: 300, dataPagamento: '2026-11-30T00:00:00.000Z' }), // último dia do mês
    pag({ status: 'PARCIAL', valor: 100, valorRecebido: 40, dataPagamento: '2026-10-05T00:00:00.000Z' }),
    pag({ valor: 80, dataVencimento: '2026-11-02T00:00:00.000Z' }),
  ], 6, AGORA)
  const nov = ev[5], out = ev[4]
  assert.equal(nov.recebido, 300)
  assert.equal(nov.pendente, 80)
  assert.equal(out.recebido, 40)
})

test('formas de pagamento incluem "Não informado" e somam o total recebido', () => {
  const formas = recebidoPorForma([
    pag({ status: 'PAGO', valor: 100, formaPagamento: 'PIX' }),
    pag({ status: 'PAGO', valor: 50 }),
  ])
  assert.equal(formas.reduce((s, f) => s + f.valor, 0), 150)
  assert.ok(formas.some(f => f.forma === 'Não informado'))
})

test('em andamento = tudo que não está concluído nem cancelado', () => {
  const r = resumoEtapas([
    { etapa: 'SOLICITACAO', count: 2 },
    { etapa: 'AGUARDANDO_SINAL', count: 3 },
    { etapa: 'EM_EXECUCAO', count: 4 },
    { etapa: 'CONCLUIDO', count: 5 },
    { etapa: 'CANCELADO', count: 1 },
  ])
  assert.deepEqual(r, { total: 15, concluidos: 5, cancelados: 1, ativos: 9 })
})

test('projeto criado no último dia do mês entra naquele mês', () => {
  const ev = contarPorMes(['2026-10-31T20:00:00.000Z', '2026-11-01T02:00:00.000Z'], 6, AGORA)
  // 01/11 02h UTC = 31/10 23h em SP
  assert.equal(ev[4].projetos, 2)
  assert.equal(ev[5].projetos, 0)
})

test('valor do contrato é rateado entre os serviços (sem dupla contagem)', () => {
  const s = servicosContratados([
    { servicos: '["Licenciamento","Outorga"]', valorContrato: 1000 },
    { servicos: '["Outorga"]', valorContrato: 400 },
    { servicos: 'inválido', valorContrato: 999 },
  ])
  assert.equal(s.reduce((t, x) => t + x.valor, 0), 1400)
  assert.deepEqual(s[0], { nome: 'Outorga', qtd: 2, valor: 900 })
})

test('média de dias ignora pares inconsistentes e informa a amostra válida', () => {
  const r = mediaDias([
    { inicio: '2026-01-01', fim: '2026-01-11' },
    { inicio: '2026-01-01', fim: '2026-01-21' },
    { inicio: '2026-02-01', fim: '2026-01-01' },
  ])
  assert.deepEqual(r, { media: 15, amostra: 2 })
  assert.deepEqual(mediaDias([]), { media: null, amostra: 0 })
})
