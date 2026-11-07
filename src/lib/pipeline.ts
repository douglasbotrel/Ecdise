// Regras do pipeline de projetos (sem dependências, para poder testar).

export type UsuarioPipeline = { id: string; role: string; departamento: string }
export type ProjetoPipeline = { analistaRapidoId?: string | null; gestorResponsavelId?: string | null }

export const ROLES_DIRECAO = ['ADMIN', 'GESTOR_GERAL']
export const ROLES_GESTAO_OPERACIONAL = ['ADMIN', 'GESTOR_GERAL', 'GESTOR_OPERACIONAL', 'SUPERVISOR']

// Quem pode confirmar a saída de cada etapa (avancarPipeline).
// Direção (ADMIN / GESTOR_GERAL) pode sempre.
export function podeAvancar(etapa: string, user: UsuarioPipeline, projeto: ProjetoPipeline): boolean {
  if (ROLES_DIRECAO.includes(user.role) || user.departamento === 'GESTAO_GERAL') return true
  switch (etapa) {
    case 'SOLICITACAO':
    case 'EM_ANALISE_RAPIDA':
      return projeto.analistaRapidoId === user.id ||
        (!projeto.analistaRapidoId && user.role === 'ANALISTA_RAPIDO') ||
        user.role === 'GESTOR_ADMINISTRATIVO' || user.departamento === 'COMERCIAL'
    case 'ANALISE_CONCLUIDA':
      // validação de serviços e valores é do ADM
      return user.role === 'GESTOR_ADMINISTRATIVO'
    case 'AGUARDANDO_CONTRATO':
      return user.departamento === 'CONTRATOS' || user.role === 'GESTOR_ADMINISTRATIVO'
    case 'AGUARDANDO_SINAL':
      return user.departamento === 'FINANCEIRO' || user.role === 'GESTOR_ADMINISTRATIVO'
    case 'OPERACIONAL':
    case 'EM_EXECUCAO':
      return ROLES_GESTAO_OPERACIONAL.includes(user.role) || projeto.gestorResponsavelId === user.id
    default:
      return false
  }
}

// Qual etapa vem depois de cada etapa ao "salvar/confirmar"
export const PROXIMA_ETAPA: Record<string, string> = {
  SOLICITACAO:         'EM_ANALISE_RAPIDA',
  EM_ANALISE_RAPIDA:   'ANALISE_CONCLUIDA',
  ANALISE_CONCLUIDA:   'AGUARDANDO_CONTRATO',  // ADM valida → direto para contratos
  AGUARDANDO_CONTRATO: 'AGUARDANDO_SINAL',      // Contratos elabora → financeiro aguarda sinal
  AGUARDANDO_SINAL:    'OPERACIONAL',            // Financeiro confirma pagamento → área técnica
  OPERACIONAL:         'EM_EXECUCAO',
  EM_EXECUCAO:         'CONCLUIDO',
}
