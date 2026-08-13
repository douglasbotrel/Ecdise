import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Quem pode ver/planejar a semana de OUTRO usuário (além da própria)
const PODE_VER_OUTROS = ['ADMIN', 'GESTOR_GERAL', 'GESTOR_OPERACIONAL', 'GESTOR_ADMINISTRATIVO', 'SUPERVISOR']

function segundaFeiraDaSemana(data: Date): Date {
  const d = new Date(data)
  const dia = d.getDay() // 0=domingo..6=sábado
  const diff = dia === 0 ? -6 : 1 - dia
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const semanaParam = searchParams.get('semanaInicio')
    let usuarioId = searchParams.get('usuarioId') || user.id

    // Só ADMIN/gestores podem ver a semana de outra pessoa
    if (usuarioId !== user.id && !PODE_VER_OUTROS.includes(user.role)) {
      usuarioId = user.id
    }

    const semanaInicio = segundaFeiraDaSemana(semanaParam ? new Date(semanaParam) : new Date())
    const semanaFim = new Date(semanaInicio)
    semanaFim.setDate(semanaFim.getDate() + 7)

    const [planejadas, backlogBruto] = await Promise.all([
      prisma.tarefaSemana.findMany({
        where: { usuarioId, semanaInicio },
        include: {
          tarefa: {
            include: {
              projeto: { select: { id: true, codigo: true, imovelNome: true, municipio: true, estado: true } },
            },
          },
        },
        orderBy: { criadoEm: 'asc' },
      }),
      prisma.tarefa.findMany({
        where: { responsavelId: usuarioId, status: { notIn: ['CONCLUIDA', 'CANCELADA'] } },
        include: {
          projeto: { select: { id: true, codigo: true, imovelNome: true, municipio: true, estado: true } },
        },
        orderBy: [{ prazo: 'asc' }, { criadoEm: 'asc' }],
      }),
    ])

    const idsNaSemana = new Set(planejadas.map(p => p.tarefaId))
    const backlog = backlogBruto.filter(t => !idsNaSemana.has(t.id))

    return NextResponse.json({
      semanaInicio,
      usuarioId,
      backlog,
      planejadas: planejadas.map(p => ({
        id: p.id,
        tarefaId: p.tarefaId,
        criadoEm: p.criadoEm,
        diaSemana: p.diaSemana,
        tarefa: p.tarefa,
        concluida: p.tarefa.status === 'CONCLUIDA',
      })),
    })
  } catch (err) {
    console.error('[tarefas-semana GET]', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

// Adiciona uma tarefa ao planejamento da semana
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { tarefaId, semanaInicio: semanaParam, diaSemana } = body
    if (!tarefaId) return NextResponse.json({ error: 'tarefaId é obrigatório' }, { status: 400 })

    let usuarioId = body.usuarioId || user.id
    if (usuarioId !== user.id && !PODE_VER_OUTROS.includes(user.role)) {
      usuarioId = user.id
    }

    const semanaInicio = segundaFeiraDaSemana(semanaParam ? new Date(semanaParam) : new Date())

    const item = await prisma.tarefaSemana.upsert({
      where: { tarefaId_usuarioId_semanaInicio: { tarefaId, usuarioId, semanaInicio } },
      create: { tarefaId, usuarioId, semanaInicio, diaSemana: diaSemana ?? null },
      update: {},
    })

    return NextResponse.json({ item })
  } catch (err) {
    console.error('[tarefas-semana POST]', err)
    return NextResponse.json({ error: 'Erro ao adicionar à semana' }, { status: 500 })
  }
}

// Atualiza o dia da semana escolhido para uma tarefa já planejada
export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { id, diaSemana } = body
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

    const item = await prisma.tarefaSemana.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    if (item.usuarioId !== user.id && !PODE_VER_OUTROS.includes(user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const atualizado = await prisma.tarefaSemana.update({
      where: { id },
      data: { diaSemana: diaSemana === null ? null : Number(diaSemana) },
    })

    return NextResponse.json({ item: atualizado })
  } catch (err) {
    console.error('[tarefas-semana PATCH]', err)
    return NextResponse.json({ error: 'Erro ao atualizar' }, { status: 500 })
  }
}

// Remove uma tarefa do planejamento da semana (volta pro backlog)
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'id é obrigatório' }, { status: 400 })

    const item = await prisma.tarefaSemana.findUnique({ where: { id } })
    if (!item) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    if (item.usuarioId !== user.id && !PODE_VER_OUTROS.includes(user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    await prisma.tarefaSemana.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[tarefas-semana DELETE]', err)
    return NextResponse.json({ error: 'Erro ao remover' }, { status: 500 })
  }
}
