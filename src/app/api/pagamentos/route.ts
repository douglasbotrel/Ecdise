import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const contratoId = searchParams.get('contratoId')
    const status = searchParams.get('status')

    const where: any = {}
    if (contratoId) where.contratoId = contratoId
    if (status) where.status = status

    const pagamentos = await prisma.pagamento.findMany({
      where,
      include: {
        contrato: {
          include: {
            cliente: { select: { id: true, nome: true } },
            projeto: { select: { id: true, codigo: true, tipoServico: true } },
          }
        }
      },
      orderBy: { dataVencimento: 'asc' }
    })

    // Totais
    const totais = {
      totalPendente: pagamentos.filter(p => p.status === 'PENDENTE').reduce((s, p) => s + p.valor, 0),
      totalPago: pagamentos.filter(p => p.status === 'PAGO').reduce((s, p) => s + p.valor, 0),
      totalVencido: pagamentos.filter(p => p.status === 'VENCIDO').reduce((s, p) => s + p.valor, 0),
    }

    return NextResponse.json({ pagamentos, totais })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { id, status, dataPagamento, formaPagamento, comprovante, observacoes } = body

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    const pagamento = await prisma.pagamento.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(dataPagamento && { dataPagamento: new Date(dataPagamento) }),
        ...(formaPagamento !== undefined && { formaPagamento }),
        ...(comprovante !== undefined && { comprovante }),
        ...(observacoes !== undefined && { observacoes }),
        ...(status === 'PAGO' && !dataPagamento && { dataPagamento: new Date() }),
      }
    })

    await prisma.log.create({
      data: { usuarioId: user.id, acao: 'ATUALIZAR_PAGAMENTO', entidade: 'Pagamento', entidadeId: id }
    })

    return NextResponse.json({ pagamento })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
