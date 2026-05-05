import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const projetoId = searchParams.get('projetoId')
    const responsavelId = searchParams.get('responsavelId')
    const status = searchParams.get('status')

    const where: any = {}
    if (projetoId) where.projetoId = projetoId
    if (responsavelId) where.responsavelId = responsavelId
    if (status) where.status = status

    const tarefas = await prisma.tarefa.findMany({
      where,
      include: {
        responsavel: { select: { id: true, nome: true } },
        projeto: { select: { id: true, codigo: true, imovelNome: true } },
        documentos: true,
      },
      orderBy: [{ ordem: 'asc' }, { criadoEm: 'asc' }]
    })

    return NextResponse.json({ tarefas })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { projetoId, titulo, descricao, tipo, responsavelId, prazo, ordem, etapa, obrigatorio } = body

    if (!projetoId || !titulo) {
      return NextResponse.json({ error: 'Projeto e título são obrigatórios' }, { status: 400 })
    }

    const tarefa = await prisma.tarefa.create({
      data: {
        projetoId,
        titulo,
        descricao,
        tipo: tipo || 'TAREFA',
        responsavelId: responsavelId || null,
        prazo: prazo ? new Date(prazo) : null,
        ordem: ordem || 0,
        etapa,
        obrigatorio: obrigatorio || false,
        status: 'PENDENTE',
      },
      include: {
        responsavel: { select: { id: true, nome: true } },
      }
    })

    return NextResponse.json({ tarefa }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { id, status, responsavelId, prazo, descricao } = body

    if (!id) return NextResponse.json({ error: 'ID da tarefa é obrigatório' }, { status: 400 })

    const tarefa = await prisma.tarefa.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(responsavelId !== undefined && { responsavelId }),
        ...(prazo !== undefined && { prazo: prazo ? new Date(prazo) : null }),
        ...(descricao !== undefined && { descricao }),
        ...(status === 'CONCLUIDA' && { dataConclusao: new Date() }),
      },
      include: {
        responsavel: { select: { id: true, nome: true } },
      }
    })

    return NextResponse.json({ tarefa })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
