import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hasPermission } from '@/lib/auth'
import { hojeISO } from '@/lib/utils'

// POST /api/tarefas/lote
// Aplica responsável e/ou prazo a várias tarefas de um projeto numa única
// transação: ou todas são atualizadas, ou nenhuma (antes eram N chamadas
// soltas e a tela anunciava sucesso mesmo se alguma falhasse).
// body: { projetoId, responsavelId?, prazo?, definirResponsavelProjeto? }
// Só preenche tarefas que ainda não têm o campo; ignora concluídas/canceladas.
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!hasPermission(user.role, 'SUPERVISOR')) {
      return NextResponse.json({ error: 'Sem permissão para atribuir em lote' }, { status: 403 })
    }

    const { projetoId, responsavelId, prazo, definirResponsavelProjeto } = await request.json()
    if (!projetoId) return NextResponse.json({ error: 'Projeto é obrigatório' }, { status: 400 })
    if (!responsavelId && !prazo) {
      return NextResponse.json({ error: 'Informe responsável ou prazo' }, { status: 400 })
    }
    if (prazo && String(prazo).slice(0, 10) < hojeISO()) {
      return NextResponse.json({ error: 'O prazo não pode ser uma data passada.' }, { status: 400 })
    }
    if (responsavelId) {
      const resp = await prisma.usuario.findUnique({ where: { id: responsavelId }, select: { ativo: true } })
      if (!resp?.ativo) return NextResponse.json({ error: 'Responsável inválido ou inativo' }, { status: 400 })
    }

    const tarefas = await prisma.tarefa.findMany({
      where: { projetoId, status: { notIn: ['CONCLUIDA', 'CANCELADA'] } },
      select: { id: true, responsavelId: true, prazo: true, requerVistoriaCampo: true },
    })

    const ops: any[] = []
    let atualizadas = 0
    for (const t of tarefas) {
      const data: any = {}
      if (responsavelId && !t.responsavelId) data.responsavelId = responsavelId
      if (prazo && !t.prazo && !t.requerVistoriaCampo) data.prazo = new Date(prazo)
      if (Object.keys(data).length) {
        ops.push(prisma.tarefa.update({ where: { id: t.id }, data }))
        atualizadas++
      }
    }

    if (responsavelId && definirResponsavelProjeto) {
      ops.push(prisma.projeto.updateMany({
        where: { id: projetoId, responsavelId: null },
        data: { responsavelId },
      }))
    }

    if (ops.length) await prisma.$transaction(ops)

    if (responsavelId && atualizadas > 0 && responsavelId !== user.id) {
      const projeto = await prisma.projeto.findUnique({ where: { id: projetoId }, select: { codigo: true } })
      await prisma.notificacao.create({
        data: {
          usuarioId: responsavelId,
          titulo: '📋 Atividades atribuídas a você',
          mensagem: `Você foi indicado como responsável por ${atualizadas} atividade(s) do projeto ${projeto?.codigo || ''}.`,
          tipo: 'info',
          link: `/operacional/${projetoId}`,
        },
      }).catch(err => console.error('[tarefas/lote] notificação', err))
    }

    return NextResponse.json({ atualizadas })
  } catch (error) {
    console.error('[tarefas/lote POST]', error)
    return NextResponse.json({ error: 'Nenhuma atividade foi alterada: erro ao salvar o lote.' }, { status: 500 })
  }
}
