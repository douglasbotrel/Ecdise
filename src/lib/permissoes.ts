// Permissões por módulo, aplicadas no SERVIDOR (o menu apenas reflete isto).
//
// Um usuário acessa um módulo quando:
//   1. é ADMIN ou GESTOR_GERAL (sem restrição); ou
//   2. o módulo está em usuario.modulosAcesso (configurado em Configurações); ou,
//      se não houver configuração individual, em MODULOS_POR_ROLE do seu perfil; ou
//   3. o departamento dele dá acesso ao módulo (MODULE_ACCESS em lib/auth).

import { NextResponse } from 'next/server'
import { getCurrentUser, canAccessModule, JWTPayload } from './auth'
import { MODULOS_POR_ROLE } from './utils'

export const TODOS_MODULOS = [
  'dashboard', 'tarefas-semana', 'comercial', 'clientes', 'contratos', 'operacional',
  'campo', 'tecnico', 'acompanhamento', 'licencas', 'financeiro', 'encerramento',
  'bi', 'configuracoes', 'cadastros-teste',
]

// Lista final de módulos liberados (perfil/config individual + departamento). null = tudo.
export function modulosLiberados(u: JWTPayload): string[] | null {
  if (modulosDoUsuario(u) === null) return null
  return TODOS_MODULOS.filter(m => podeAcessarModulo(u, m))
}

export function modulosDoUsuario(u: { role: string; modulosAcesso?: string | null }): string[] | null {
  if (['ADMIN', 'GESTOR_GERAL'].includes(u.role)) return null
  if (u.modulosAcesso) {
    try {
      const lista = JSON.parse(u.modulosAcesso)
      if (Array.isArray(lista)) return lista
    } catch {}
  }
  return MODULOS_POR_ROLE[u.role] ?? ['dashboard']
}

export function podeAcessarModulo(u: JWTPayload, modulo: string): boolean {
  const lista = modulosDoUsuario(u)
  if (lista === null) return true
  if (lista.includes(modulo)) return true
  return canAccessModule(u.departamento, modulo)
}

// Uso numa rota:
//   const auth = await exigirModulo('bi')
//   if (auth instanceof NextResponse) return auth
//   const user = auth
export async function exigirModulo(...modulos: string[]): Promise<JWTPayload | NextResponse> {
  const user = await getCurrentUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (!modulos.some(m => podeAcessarModulo(user, m))) {
    return NextResponse.json({ error: 'Sem permissão para este módulo' }, { status: 403 })
  }
  return user
}
