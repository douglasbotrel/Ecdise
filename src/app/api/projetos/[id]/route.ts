import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const projeto = await prisma.projeto.findUnique({
      where: { id: params.id },
      include: {
        cliente: true,
        responsavel: { select: { id: true, nome: true, email: true, cargo: true } },
        supervisor: { select: { id: true, nome: true, email: true } },
        contrato: {
          include: { pagamentos: { orderBy: { numeroParcela: 'asc' } } }
        },
        tarefas: {
          orderBy: { ordem: 'asc' },
          include: {
            responsavel: { select: { id: true, nome: true } },
            documentos: true,
          }
        },
        vistorias: {
          orderBy: { dataAgendada: 'desc' },
          include: {
            responsavel: { select: { id: true, nome: true } },
            gastos: true,
          }
        },
        documentos: {
          orderBy: { criadoEm: 'desc' },
          include: { usuario: { select: { id: true, nome: true } } }
        },
        comentarios: {
          orderBy: { criadoEm: 'desc' },
          include: { autor: { select: { id: true, nome: true } } }
        },
        historico: {
          orderBy: { criadoEm: 'desc' },
          take: 20,
        }
      }
    })

    if (!projeto) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    return NextResponse.json({ projeto })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const projeto = await prisma.projeto.findUnique({ where: { id: params.id } })
    if (!projeto) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    // Salva histórico de status
    if (body.statusOperacional && body.statusOperacional !== projeto.statusOperacional) {
      await prisma.historicoStatus.create({
        data: {
          projetoId: params.id,
          statusAnterior: projeto.statusOperacional,
          statusNovo: body.statusOperacional,
          campo: 'statusOperacional',
          usuarioId: user.id,
        }
      }).catch(() => {})
    }

    const projetoAtualizado = await prisma.projeto.update({
      where: { id: params.id },
      data: {
        ...(body.statusComercial && { statusComercial: body.statusComercial }),
        ...(body.statusOperacional && { statusOperacional: body.statusOperacional }),
        ...(body.descricao !== undefined && { descricao: body.descricao }),
        ...(body.imovelNome !== undefined && { imovelNome: body.imovelNome }),
        ...(body.municipio !== undefined && { municipio: body.municipio }),
        ...(body.estado !== undefined && { estado: body.estado }),
        ...(body.car !== undefined && { car: body.car }),
        ...(body.areaHectares !== undefined && { areaHectares: parseFloat(body.areaHectares) }),
        ...(body.valorProposto !== undefined && { valorProposto: parseFloat(body.valorProposto) }),
        ...(body.observacoes !== undefined && { observacoes: body.observacoes }),
        ...(body.responsavelId !== undefined && { responsavelId: body.responsavelId }),
        ...(body.supervisorId !== undefined && { supervisorId: body.supervisorId }),
        ...(body.dataPrazo !== undefined && { dataPrazo: body.dataPrazo ? new Date(body.dataPrazo) : null }),
        ...(body.dataInicio !== undefined && { dataInicio: body.dataInicio ? new Date(body.dataInicio) : null }),
        ...(body.dataConclusao !== undefined && { dataConclusao: body.dataConclusao ? new Date(body.dataConclusao) : null }),
      },
      include: {
        cliente: true,
        responsavel: { select: { id: true, nome: true } },
      }
    })

    await prisma.log.create({
      data: {
        usuarioId: user.id,
        acao: 'ATUALIZAR_PROJETO',
        entidade: 'Projeto',
        entidadeId: params.id,
        detalhes: JSON.stringify(body),
      }
    })

    return NextResponse.json({ projeto: projetoAtualizado })
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!['ADMIN', 'GESTOR_GERAL'].includes(user.role)) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    await prisma.projeto.delete({ where: { id: params.id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
