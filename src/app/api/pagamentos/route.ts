import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const contratoId = searchParams.get('contratoId')
    const status     = searchParams.get('status')

    const where: any = {}
    if (contratoId) where.contratoId = contratoId
    if (status)     where.status = status

    const pagamentos = await prisma.pagamento.findMany({
      where,
      include: {
        contrato: {
          include: {
            cliente: { select: { id: true, nome: true } },
            projeto: { select: { id: true, codigo: true, tipoServico: true, etapaPipeline: true } },
          },
        },
      },
      orderBy: { dataVencimento: 'asc' },
    })

    const totais = {
      totalPendente: pagamentos.filter(p => p.status === 'PENDENTE').reduce((s, p) => s + p.valor, 0),
      totalPago:     pagamentos.filter(p => p.status === 'PAGO').reduce((s, p) => s + p.valor, 0),
      totalVencido:  pagamentos.filter(p => p.status === 'VENCIDO').reduce((s, p) => s + p.valor, 0),
    }

    return NextResponse.json({ pagamentos, totais })
  } catch {
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
        ...(dataPagamento  && { dataPagamento: new Date(dataPagamento) }),
        ...(formaPagamento !== undefined && { formaPagamento }),
        ...(comprovante    !== undefined && { comprovante }),
        ...(observacoes    !== undefined && { observacoes }),
        ...(status === 'PAGO' && !dataPagamento && { dataPagamento: new Date() }),
      },
      include: {
        contrato: {
          include: {
            projeto: true,
          },
        },
      },
    })

    await prisma.log.create({
      data: {
        usuarioId: user.id,
        acao: 'ATUALIZAR_PAGAMENTO',
        entidade: 'Pagamento',
        entidadeId: id,
      },
    })

    // ── Avanço automático de pipeline ─────────────────────────
    // Se este pagamento foi marcado como PAGO e o projeto ainda
    // está em AGUARDANDO_SINAL, verificamos se é o 1º pagamento pago.
    // Se sim, avançamos para OPERACIONAL e notificamos a equipe técnica.
    if (status === 'PAGO' && pagamento.contrato?.projeto?.etapaPipeline === 'AGUARDANDO_SINAL') {
      const contratoId   = pagamento.contratoId
      const projetoId    = pagamento.contrato.projetoId

      // Conta pagamentos PAGO deste contrato (já inclui o que acabou de mudar)
      const pagosCount = await prisma.pagamento.count({
        where: { contratoId, status: 'PAGO' },
      })

      if (pagosCount === 1) {
        // Primeiro pagamento — avança pipeline
        await prisma.projeto.update({
          where: { id: projetoId },
          data: {
            etapaPipeline: 'OPERACIONAL',
            dataAprovacao: new Date(),
          },
        })

        // Notifica gestores operacionais e de campo
        const gestores = await prisma.usuario.findMany({
          where: {
            ativo: true,
            role: { in: ['GESTOR_OPERACIONAL', 'GESTOR_CAMPO', 'GESTOR_GERAL', 'ADMIN'] },
          },
          select: { id: true },
        })

        await prisma.notificacao.createMany({
          data: gestores.map(g => ({
            usuarioId: g.id,
            titulo: '🚀 Projeto liberado para execução',
            mensagem: `O projeto ${pagamento.contrato.projeto?.codigo} teve o sinal confirmado e está aguardando planejamento operacional.`,
            tipo: 'sucesso',
            link: `/operacional/${projetoId}`,
          })),
        })

        return NextResponse.json({
          pagamento,
          avancouPipeline: true,
          novaEtapa: 'OPERACIONAL',
        })
      }
    }

    return NextResponse.json({ pagamento, avancouPipeline: false })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
