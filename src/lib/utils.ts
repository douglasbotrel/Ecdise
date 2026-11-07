import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow, isAfter, isBefore } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// ── Datas sem hora ("data pura") ─────────────────────────────────────────────
// Prazos, vencimentos e datas de campo são gravados como meia-noite UTC
// (ex.: 2026-11-10T00:00:00.000Z). Em São Paulo (UTC-3) isso viraria 09/11 às
// 21h. dataPura() reinterpreta esses valores como a data do calendário local.
export function dataPura(date: Date | string | null | undefined): Date | null {
  if (!date) return null
  if (typeof date === "string" && /^d{4}-d{2}-d{2}$/.test(date)) {
    const [y, m, d] = date.split("-").map(Number)
    return new Date(y, m - 1, d)
  }
  const dt = new Date(date)
  if (isNaN(dt.getTime())) return null
  if (dt.getUTCHours() === 0 && dt.getUTCMinutes() === 0 && dt.getUTCSeconds() === 0 && dt.getUTCMilliseconds() === 0) {
    return new Date(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate())
  }
  return dt
}

// "yyyy-mm-dd" para inputs type=date, sem deslocamento de fuso.
export function toInputDate(date: Date | string | null | undefined): string {
  const d = dataPura(date)
  if (!d) return ""
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// Hoje no fuso de São Paulo, como "yyyy-mm-dd" (vale também no servidor, que roda em UTC).
export function hojeISO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date())
}

// Início do dia de hoje (00:00 local) — use para decidir se algo está atrasado.
export function inicioDeHoje(): Date {
  const [y, m, d] = hojeISO().split("-").map(Number)
  return new Date(y, m - 1, d)
}

// Vencida = data pura anterior a hoje. Vencer hoje NÃO é atraso.
export function isAtrasada(date: Date | string | null | undefined): boolean {
  const d = dataPura(date)
  return !!d && d < inicioDeHoje()
}

// Formata data pura em pt-BR sem deslocamento de fuso.
export function formatDataPura(date: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  const d = dataPura(date)
  return d ? d.toLocaleDateString("pt-BR", opts) : "-"
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null): string {
  const d = dataPura(date)
  if (!d) return '-'
  return format(d, 'dd/MM/yyyy', { locale: ptBR })
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return '-'
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: ptBR })
}

export function formatRelativeDate(date: Date | string | null): string {
  if (!date) return '-'
  return formatDistanceToNow(new Date(date), { locale: ptBR, addSuffix: true })
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined) return 'R$ 0,00'
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value)
}

export function formatCPFCNPJ(value: string): string {
  const clean = value.replace(/\D/g, '')
  if (clean.length === 11) {
    return clean.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')
  } else if (clean.length === 14) {
    return clean.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5')
  }
  return value
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str
  return str.slice(0, maxLength) + '...'
}

export function isExpired(date: Date | string | null): boolean {
  return isAtrasada(date)
}

export function isExpiringSoon(date: Date | string | null, days = 7): boolean {
  if (!date) return false
  const target = new Date(date)
  const now = new Date()
  const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  return isAfter(target, now) && isBefore(target, future)
}

export const STATUS_COMERCIAL_LABELS: Record<string, string> = {
  RECEBIDO: 'Recebido',
  EM_ANALISE: 'Em Análise',
  PROPOSTA_ENVIADA: 'Proposta Enviada',
  ACEITO: 'Aceito',
  RECUSADO: 'Recusado',
  AGUARDANDO_DOCS: 'Aguardando Docs',
}

export const STATUS_OPERACIONAL_LABELS: Record<string, string> = {
  NAO_INICIADO: 'Não Iniciado',
  EM_ANDAMENTO: 'Em Andamento',
  EM_CAMPO: 'Em Campo',
  AGUARDANDO_INFO: 'Aguardando Info',
  EM_REVISAO: 'Em Revisão',
  CONCLUIDO: 'Concluído',
  CANCELADO: 'Cancelado',
}

export const STATUS_TAREFA_LABELS: Record<string, string> = {
  PENDENTE: 'Pendente',
  EM_ANDAMENTO: 'Em Andamento',
  CONCLUIDA: 'Concluída',
  ATRASADA: 'Atrasada',
  CANCELADA: 'Cancelada',
  AGUARDANDO: 'Aguardando',
}

export const STATUS_PENDENCIA_LABELS: Record<string, string> = {
  ABERTA: 'Aberta',
  CONCLUIDA: 'Concluída',
}

export const STATUS_COLORS: Record<string, string> = {
  // Comercial
  RECEBIDO: 'bg-blue-100 text-blue-800',
  EM_ANALISE: 'bg-yellow-100 text-yellow-800',
  PROPOSTA_ENVIADA: 'bg-purple-100 text-purple-800',
  ACEITO: 'bg-green-100 text-green-800',
  RECUSADO: 'bg-red-100 text-red-800',
  AGUARDANDO_DOCS: 'bg-orange-100 text-orange-800',
  // Operacional
  NAO_INICIADO: 'bg-gray-100 text-gray-800',
  EM_ANDAMENTO: 'bg-blue-100 text-blue-800',
  EM_CAMPO: 'bg-indigo-100 text-indigo-800',
  AGUARDANDO_INFO: 'bg-yellow-100 text-yellow-800',
  EM_REVISAO: 'bg-purple-100 text-purple-800',
  CONCLUIDO: 'bg-green-100 text-green-800',
  CANCELADO: 'bg-red-100 text-red-800',
  // Tarefas
  PENDENTE: 'bg-gray-100 text-gray-800',
  CONCLUIDA: 'bg-green-100 text-green-800',
  ATRASADA: 'bg-red-100 text-red-800',
  AGUARDANDO: 'bg-yellow-100 text-yellow-800',
  // Pagamentos
  PAGO: 'bg-green-100 text-green-800',
  VENCIDO: 'bg-red-100 text-red-800',
  PARCIAL: 'bg-orange-100 text-orange-800',
  // Pendências (Acompanhamento de Processos)
  ABERTA: 'bg-amber-100 text-amber-800',
}

export const ROLE_LABELS: Record<string, string> = {
  ADMIN: 'Administrador',
  GESTOR_GERAL: 'Gestor Geral',
  GESTOR_ADMINISTRATIVO: 'Gestor Administrativo',
  GESTOR_OPERACIONAL: 'Gestor Operacional',
  GESTOR_CAMPO: 'Gestor de Campo',
  SUPERVISOR: 'Supervisor',
  ANALISTA: 'Analista',
  ANALISTA_RAPIDO: 'Analista de Serviço Rápido',
  TECNICO_CAMPO: 'Técnico de Campo',
}

export const ETAPA_LABELS: Record<string, string> = {
  SOLICITACAO:         'Nova Solicitação',
  EM_ANALISE_RAPIDA:   'Em Análise',
  ANALISE_CONCLUIDA:   'Análise Concluída',
  EM_NEGOCIACAO:       'Em Negociação',
  PROPOSTA_ACEITA:     'Proposta Aceita',
  AGUARDANDO_CONTRATO: 'Aguard. Contrato',
  EM_CONTRATO:         'Em Contrato',
  AGUARDANDO_SINAL:    'Aguard. Sinal',
  OPERACIONAL:         'Operacional',
  EM_EXECUCAO:         'Em Execução',
  CONCLUIDO:           'Concluído',
  CANCELADO:           'Cancelado',
}

// Módulos padrão por perfil — usados quando o usuário não tem modulosAcesso definido individualmente
// null = acesso irrestrito; array = lista exata de módulos permitidos
export const MODULOS_POR_ROLE: Record<string, string[] | null> = {
  ADMIN:                  null,
  GESTOR_GERAL:           null,
  GESTOR_ADMINISTRATIVO:  ['dashboard', 'tarefas-semana', 'comercial', 'contratos', 'financeiro', 'encerramento', 'configuracoes'],
  GESTOR_OPERACIONAL:     ['dashboard', 'tarefas-semana', 'comercial', 'operacional', 'acompanhamento', 'licencas', 'campo', 'encerramento'],
  GESTOR_CAMPO:           ['dashboard', 'tarefas-semana', 'campo', 'tecnico'],
  SUPERVISOR:             ['dashboard', 'tarefas-semana', 'comercial', 'operacional', 'acompanhamento'],
  ANALISTA:               ['dashboard', 'tarefas-semana', 'operacional', 'acompanhamento'],
  ANALISTA_RAPIDO:        ['dashboard', 'tarefas-semana', 'comercial'],
  TECNICO_CAMPO:          ['dashboard', 'tarefas-semana', 'tecnico'],
}

export const DEPARTAMENTO_LABELS: Record<string, string> = {
  GESTAO_GERAL: 'Gestão Geral',
  COMERCIAL: 'Comercial',
  FINANCEIRO: 'Financeiro',
  OPERACIONAL_AMBIENTAL: 'Operacional Ambiental',
  OPERACIONAL_REGULARIZACAO: 'Operacional Regularização',
  GESTAO_CAMPO: 'Gestão de Campo',
  CONTRATOS: 'Contratos',
  BI: 'BI',
}
