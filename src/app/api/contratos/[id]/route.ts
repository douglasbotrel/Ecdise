import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { statusContrato, arquivoUrl, dataAssinatura, observacoes } = body

    const contrato = await prisma.contrato.findUnique({ where: { id: params.id } })
    if (!contrato) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

    const updateData: any = {}
    if (statusContrato !== undefined) updateData.statusContrato = statusContrato
    if (arquivoUrl !== undefined) updateData.arquivoUrl = arquivoUrl
    if (dataAssinatura !== undefined) updateData.dataAssinatura = dataAssinatura ? new Date(dataAssinatura) : null
    if (observacoes !== undefined) updateData.observacoes = observacoes

    // Se validando assinatura, avança para ASSINADO
    if (statusContrato === 'ASSINADO' && arquivoUrl) {
      updateData.statusContrato = 'ASSINADO'
      updateData.dataAssinatura = updateData.dataAssinatura || new Date()
    }

    // Se desistência, atualiza pipeline do projeto para base de dados
    if (statusContrato === 'DESISTENCIA') {
      await prisma.projeto.update({
        where: { id: contrato.projetoId },
        data: { etapaPipeline: 'CANCELADO', statusComercial: 'RECUSADO' },
      })
    }

    const contratoAtualizado = await prisma.contrato.update({
      where: { id: params.id },
      data: updateData,
    })

    await prisma.log.create({
      data: {
        usuarioId: user.id,
        acao: 'ATUALIZAR_CONTRATO',
        entidade: 'Contrato',
        entidadeId: params.id,
        detalhes: JSON.stringify({ statusContrato, campos: Object.keys(updateData) }),
      },
    })

    return NextResponse.json({ contrato: contratoAtualizado })
  } catch (error) {
    console.error('Erro ao atualizar contrato:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const contrato = await prisma.contrato.findUnique({
      where: { id: params.id },
      include: {
        projeto: { select: { id: true, codigo: true, imovelNome: true, tipoServico: true, municipio: true } },
        cliente: { select: { id: true, nome: true, cpfCnpj: true } },
        pagamentos: { orderBy: { numeroParcela: 'asc' } },
      },
    })

    if (!contrato) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 })
    return NextResponse.json({ contrato })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
