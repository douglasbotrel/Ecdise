import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const PODE_VER_KPI = ['ADMIN', 'GESTOR_GERAL', 'GESTOR_OPERACIONAL', 'GESTOR_ADMINISTRATIVO', 'SUPERVISOR']

function segundaFeiraDaSemana(data: Date): Date {
  const d = new Date(data)
  const dia = d.getDay()
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

// KPI de gestão: taxa de cumprimento do planejamento semanal, por usuário.
// GET /api/tarefas-semana/kpi?semanas=4
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!PODE_VER_KPI.includes(user.role)) {
      return NextResponse.json({ error: 'Sem permissão para ver este painel' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const semanas = Math.max(1, Math.min(26, parseInt(searchParams.get('semanas') || '4')))

    const inicio = segundaFeiraDaSemana(new Date())
    inicio.setDate(inicio.getDate() - (semanas - 1) * 7)

    const registros = await prisma.tarefaSemana.findMany({
      where: { semanaInicio: { gte: inicio } },
      include: {
        usuario: { select: { id: true, nome: true } },
        tarefa: { select: { status: true, dataConclusao: true } },
        acaoPendencia: { select: { concluida: true, dataConclusao: true } },
        condicionanteLicenca: { select: { concluida: true, dataConclusao: true } },
      },
    })

    // Cumprida = concluída ATÉ o fim da semana planejada (domingo 23:59, com
    // 1 dia de tolerância para fuso/lançamento). Concluir semanas depois não conta.
    const TOLERANCIA_MS = 24 * 60 * 60 * 1000
    function noPrazoDaSemana(semanaInicio: Date, dataConclusao: Date | null | undefined) {
      if (!dataConclusao) return false
      const fimSemana = new Date(semanaInicio).getTime() + 7 * 24 * 60 * 60 * 1000 + TOLERANCIA_MS
      return new Date(dataConclusao).getTime() < fimSemana
    }

    const porUsuario: Record<string, { nome: string; planejadas: number; concluidas: number }> = {}
    for (const r of registros) {
      // Tarefa cancelada não conta como planejada nem como cumprida
      if (r.tipo === 'TAREFA' && r.tarefa?.status === 'CANCELADA') continue
      if (!porUsuario[r.usuarioId]) {
        porUsuario[r.usuarioId] = { nome: r.usuario.nome, planejadas: 0, concluidas: 0 }
      }
      porUsuario[r.usuarioId].planejadas++
      const concluida = r.tipo === 'PENDENCIA'
        ? !!r.acaoPendencia?.concluida && noPrazoDaSemana(r.semanaInicio, r.acaoPendencia.dataConclusao)
        : r.tipo === 'CONDICIONANTE_LICENCA'
          ? !!r.condicionanteLicenca?.concluida && noPrazoDaSemana(r.semanaInicio, r.condicionanteLicenca.dataConclusao)
          : r.tarefa?.status === 'CONCLUIDA' && noPrazoDaSemana(r.semanaInicio, r.tarefa.dataConclusao)
      if (concluida) porUsuario[r.usuarioId].concluidas++
    }

    const usuarios = Object.entries(porUsuario)
      .map(([usuarioId, v]) => ({
        usuarioId,
        nome: v.nome,
        planejadas: v.planejadas,
        concluidas: v.concluidas,
        taxa: v.planejadas > 0 ? Math.round((v.concluidas / v.planejadas) * 1000) / 10 : 0,
      }))
      .sort((a, b) => b.taxa - a.taxa)

    return NextResponse.json({ semanas, desde: inicio, usuarios })
  } catch (err) {
    console.error('[tarefas-semana/kpi GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
