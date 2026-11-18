// Regras de cálculo dos indicadores (Dashboard e BI), sem dependências para
// poderem ser testadas. Toda conta de KPI deve passar por aqui, para que o
// Dashboard, o BI e o Financeiro mostrem sempre o mesmo número.

const TZ = 'America/Sao_Paulo'
// São Paulo não tem horário de verão desde 2019: UTC-3 fixo.
const OFFSET_SP_MS = 3 * 60 * 60 * 1000
const DIA_MS = 86_400_000

export const ETAPAS_ENCERRADAS = ['CONCLUIDO', 'CANCELADO']
export const TAREFAS_ENCERRADAS = ['CONCLUIDA', 'CANCELADA']
export const CONTRATOS_ENCERRADOS = ['DESISTENCIA', 'CANCELADO']
const PAGAMENTO_EM_ABERTO = ['PENDENTE', 'VENCIDO']

// ── Datas ────────────────────────────────────────────────────────────────────
// Prazos e vencimentos são gravados como "data pura" (meia-noite UTC); já
// criadoEm, dataConclusao etc. são instantes reais. Para classificar por dia
// ou mês, data pura usa o calendário UTC e instante usa o fuso de São Paulo.

function ehDataPura(d: Date) {
  return d.getUTCHours() === 0 && d.getUTCMinutes() === 0 && d.getUTCSeconds() === 0 && d.getUTCMilliseconds() === 0
}

function isoSP(d: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
}

// 'YYYY-MM-DD' do calendário a que a data pertence.
export function chaveDia(data: Date | string): string {
  const d = new Date(data)
  return ehDataPura(d) ? d.toISOString().slice(0, 10) : isoSP(d)
}

// 'YYYY-MM'
export function chaveMes(data: Date | string): string {
  return chaveDia(data).slice(0, 7)
}

export function hojeChave(agora = new Date()): string {
  return isoSP(agora)
}

// Hoje (em São Paulo) no formato data pura — para filtrar prazos/vencimentos no banco.
// "prazo < hojeDataPura()" = atrasado; vencer hoje NÃO é atraso.
export function hojeDataPura(agora = new Date()): Date {
  return new Date(`${hojeChave(agora)}T00:00:00.000Z`)
}

export function somarDias(d: Date, dias: number): Date {
  return new Date(d.getTime() + dias * DIA_MS)
}

// Instante em que o mês atual começou em São Paulo (para campos timestamp).
export function inicioMesSP(agora = new Date()): Date {
  const [y, m] = hojeChave(agora).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, 1) + OFFSET_SP_MS)
}

// Últimos n meses (incluindo o atual), do mais antigo ao mais recente.
export function ultimosMeses(n: number, agora = new Date()): { chave: string; label: string; inicio: Date }[] {
  const [y, m] = hojeChave(agora).split('-').map(Number)
  const meses = []
  for (let i = n - 1; i >= 0; i--) {
    const ref = new Date(Date.UTC(y, m - 1 - i, 1))
    meses.push({
      chave: ref.toISOString().slice(0, 7),
      label: ref.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit', timeZone: 'UTC' }),
      // início do mês em SP, com 1 dia de folga para não perder datas puras
      inicio: new Date(ref.getTime() - DIA_MS),
    })
  }
  return meses
}

// ── Pagamentos ───────────────────────────────────────────────────────────────

export type PagamentoKPI = {
  status: string
  valor: number
  valorRecebido?: number | null
  residual?: number | null
  dataVencimento: Date | string
  dataPagamento?: Date | string | null
  formaPagamento?: string | null
  contrato?: { statusContrato?: string | null; projeto?: { etapaPipeline?: string | null } | null } | null
}

// Parcela que não deve mais ser cobrada: cancelada, ou de contrato com
// desistência/cancelado, ou de projeto cancelado.
export function pagamentoCancelado(p: PagamentoKPI): boolean {
  return p.status === 'CANCELADO' ||
    CONTRATOS_ENCERRADOS.includes(p.contrato?.statusContrato ?? '') ||
    p.contrato?.projeto?.etapaPipeline === 'CANCELADO'
}

export function pagamentoEmAberto(p: PagamentoKPI): boolean {
  return PAGAMENTO_EM_ABERTO.includes(p.status) && !pagamentoCancelado(p)
}

// Valor que de fato entrou no caixa (o dinheiro recebido conta mesmo que o contrato tenha sido cancelado depois).
export function valorRecebido(p: PagamentoKPI): number {
  if (p.status === 'PAGO') return p.valor
  if (p.status === 'PARCIAL') return p.valorRecebido ?? 0
  return 0
}

export function valorResidual(p: PagamentoKPI): number {
  if (p.status !== 'PARCIAL' || pagamentoCancelado(p)) return 0
  return Math.max(0, p.residual ?? (p.valor - (p.valorRecebido ?? 0)))
}

export function resumoPagamentos(pagamentos: PagamentoKPI[], agora = new Date()) {
  const hoje = hojeChave(agora)
  const r = {
    totalRecebido: 0, qtdRecebido: 0,
    totalPendente: 0, qtdPendente: 0,
    totalVencido: 0,  qtdVencido: 0,
    totalResidual: 0, qtdResidual: 0,
  }
  for (const p of pagamentos) {
    const recebido = valorRecebido(p)
    if (recebido > 0) { r.totalRecebido += recebido; r.qtdRecebido++ }
    if (pagamentoEmAberto(p)) {
      r.totalPendente += p.valor; r.qtdPendente++
      if (chaveDia(p.dataVencimento) < hoje) { r.totalVencido += p.valor; r.qtdVencido++ }
    }
    const residual = valorResidual(p)
    if (residual > 0) { r.totalResidual += residual; r.qtdResidual++ }
  }
  return r
}

// Recebido por mês de pagamento × em aberto por mês de vencimento.
export function evolucaoFinanceira(pagamentos: PagamentoKPI[], meses = 6, agora = new Date()) {
  const lista = ultimosMeses(meses, agora)
  const mapa = new Map(lista.map(m => [m.chave, { mes: m.label, recebido: 0, pendente: 0 }]))
  for (const p of pagamentos) {
    const recebido = valorRecebido(p)
    if (recebido > 0 && p.dataPagamento) {
      const item = mapa.get(chaveMes(p.dataPagamento))
      if (item) item.recebido += recebido
    }
    if (pagamentoEmAberto(p)) {
      const item = mapa.get(chaveMes(p.dataVencimento))
      if (item) item.pendente += p.valor
    }
  }
  return Array.from(mapa.values())
}

export function recebidoPorForma(pagamentos: PagamentoKPI[]) {
  const mapa: Record<string, { valor: number; qtd: number }> = {}
  for (const p of pagamentos) {
    const recebido = valorRecebido(p)
    if (recebido <= 0) continue
    const forma = p.formaPagamento?.trim() || 'Não informado'
    mapa[forma] ??= { valor: 0, qtd: 0 }
    mapa[forma].valor += recebido
    mapa[forma].qtd++
  }
  return Object.entries(mapa)
    .map(([forma, v]) => ({ forma, ...v }))
    .sort((a, b) => b.valor - a.valor)
}

// ── Projetos ─────────────────────────────────────────────────────────────────

export function resumoEtapas(porEtapa: { etapa: string; count: number }[]) {
  const total = porEtapa.reduce((s, e) => s + e.count, 0)
  const concluidos = porEtapa.find(e => e.etapa === 'CONCLUIDO')?.count ?? 0
  const cancelados = porEtapa.find(e => e.etapa === 'CANCELADO')?.count ?? 0
  // Em andamento = tudo que ainda não terminou, em qualquer etapa do pipeline
  return { total, concluidos, cancelados, ativos: total - concluidos - cancelados }
}

export function contarPorMes(datas: (Date | string)[], meses = 6, agora = new Date()) {
  const lista = ultimosMeses(meses, agora)
  const mapa = new Map(lista.map(m => [m.chave, { mes: m.label, projetos: 0 }]))
  for (const d of datas) {
    const item = mapa.get(chaveMes(d))
    if (item) item.projetos++
  }
  return Array.from(mapa.values())
}

// Rateia o valor do contrato entre os serviços dele, para a soma por serviço
// não ultrapassar o total contratado.
export function servicosContratados(projetos: { servicos: string | null; valorContrato: number | null }[]) {
  const mapa: Record<string, { qtd: number; valor: number }> = {}
  for (const p of projetos) {
    let lista: unknown
    try { lista = JSON.parse(p.servicos || '[]') } catch { continue }
    if (!Array.isArray(lista)) continue
    const nomes = Array.from(new Set(lista.map(n => (typeof n === 'string' ? n.trim() : '')).filter(Boolean)))
    if (nomes.length === 0) continue
    const fatia = (p.valorContrato ?? 0) / nomes.length
    for (const nome of nomes) {
      mapa[nome] ??= { qtd: 0, valor: 0 }
      mapa[nome].qtd++
      mapa[nome].valor += fatia
    }
  }
  return Object.entries(mapa)
    .map(([nome, v]) => ({ nome, ...v }))
    .sort((a, b) => b.qtd - a.qtd || b.valor - a.valor)
}

// Início da execução de um projeto. Usa dataInicio; para projetos antigos (antes
// de a data ser gravada em todos os caminhos) recupera pelo histórico de status:
// 1º entrada em execução → 2º entrada no Operacional (sinal recebido) → 3º dataAprovacao.
export function inicioExecucao(
  p: { dataInicio?: Date | string | null; dataAprovacao?: Date | string | null },
  historico: { campo: string; statusNovo: string; criadoEm: Date | string }[],
): { data: Date | null; estimado: boolean } {
  if (p.dataInicio) return { data: new Date(p.dataInicio), estimado: false }
  const primeiro = (filtro: (h: { campo: string; statusNovo: string }) => boolean) => {
    const datas = historico.filter(filtro).map(h => new Date(h.criadoEm).getTime())
    return datas.length ? new Date(Math.min(...datas)) : null
  }
  const data =
    primeiro(h => (h.campo === 'etapaPipeline' && h.statusNovo === 'EM_EXECUCAO') ||
                  (h.campo === 'statusOperacional' && h.statusNovo === 'EM_ANDAMENTO')) ??
    primeiro(h => h.campo === 'etapaPipeline' && h.statusNovo === 'OPERACIONAL') ??
    (p.dataAprovacao ? new Date(p.dataAprovacao) : null)
  return { data, estimado: data !== null }
}

// Média em dias entre dois marcos, ignorando pares inconsistentes (fim antes do início).
// Dias de calendário entre dois marcos (protocolo/emissão são datas puras e o
// início tem hora: comparar instantes daria negativo quando tudo ocorre no mesmo dia).
export function diasEntre(inicio: Date | string, fim: Date | string): number {
  const a = new Date(inicio), b = new Date(fim)
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return NaN
  return (Date.parse(chaveDia(b)) - Date.parse(chaveDia(a))) / DIA_MS
}

export function mediaDias(pares: { inicio: Date | string; fim: Date | string }[]) {
  const dias = pares
    .map(p => diasEntre(p.inicio, p.fim))
    .filter(d => Number.isFinite(d) && d >= 0)
  if (dias.length === 0) return { media: null as number | null, amostra: 0 }
  return {
    media: Math.round((dias.reduce((a, b) => a + b, 0) / dias.length) * 10) / 10,
    amostra: dias.length,
  }
}
