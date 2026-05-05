import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const statusContrato = searchParams.get('statusContrato')
    const clienteId = searchParams.get('clienteId')

    const where: any = {}
    if (statusContrato) where.statusContrato = statusContrato
    if (clienteId) where.clienteId = clienteId

    const contratos = await prisma.contrato.findMany({
      where,
      include: {
        projeto: { select: { id: true, codigo: true, tipoServico: true, municipio: true } },
        cliente: { select: { id: true, nome: true, cpfCnpj: true } },
        pagamentos: { orderBy: { numeroParcela: 'asc' } },
        _count: { select: { pagamentos: true } }
      },
      orderBy: { criadoEm: 'desc' }
    })

    return NextResponse.json({ contratos })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const {
      projetoId, tipoContrato, dataAssinatura, dataVencimento, observacoes,
      // optional overrides; if not provided, values come from the project
      clienteId: clienteIdBody, valorTotal: valorTotalBody,
      valorSinal: valorSinalBody, numeroParcelas: numParcelasBody,
    } = body

    if (!projetoId) {
      return NextResponse.json({ error: 'projetoId obrigatório' }, { status: 400 })
    }

    // Load project to get financial values and clienteId
    const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } })
    if (!projeto) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    const clienteId = clienteIdBody || projeto.clienteId
    const vSinal = parseFloat(valorSinalBody ?? projeto.valorSinal ?? 0)
    const vParcela = projeto.valorPrestacao || 0
    const nParcelas = parseInt(numParcelasBody ?? projeto.numeroPrestacoes ?? 1)
    const vTotal = parseFloat(valorTotalBody ?? '') || (vSinal + vParcela * Math.max(nParcelas - 1, 0))
    const vRestante = vTotal - vSinal

    // Check if contrato already exists for this project
    const existente = await prisma.contrato.findUnique({ where: { projetoId } })

    let contrato
    if (existente) {
      // Update existing
      contrato = await prisma.contrato.update({
        where: { projetoId },
        data: {
          tipoContrato: tipoContrato || existente.tipoContrato,
          dataAssinatura: dataAssinatura ? new Date(dataAssinatura) : existente.dataAssinatura,
          dataVencimento: dataVencimento ? new Date(dataVencimento) : existente.dataVencimento,
          valorTotal: vTotal,
          valorSinal: vSinal,
          valorRestante: vRestante,
          numeroParcelas: nParcelas,
          valorParcela: vParcela,
          observacoes: observacoes ?? existente.observacoes,
          servicosContratados: projeto.servicosContratados,
        },
      })
    } else {
      // Create new
      const count = await prisma.contrato.count()
      const codigo = `CTR-${String(count + 1).padStart(4, '0')}`

      contrato = await prisma.contrato.create({
        data: {
          codigo,
          projetoId,
          clienteId,
          tipoContrato: tipoContrato || 'Prestação de Serviços',
          dataAssinatura: dataAssinatura ? new Date(dataAssinatura) : null,
          dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
          valorTotal: vTotal,
          valorSinal: vSinal,
          valorRestante: vRestante,
          numeroParcelas: nParcelas,
          valorParcela: vParcela,
          observacoes: observacoes || null,
          servicosContratados: projeto.servicosContratados,
          statusContrato: 'AGUARDANDO_ASSINATURA',
        },
      })

      // Gera registros de pagamento automaticamente
      if (vSinal > 0) {
        await prisma.pagamento.create({
          data: {
            contratoId: contrato.id,
            tipo: 'SINAL',
            descricao: 'Sinal / Entrada',
            valor: vSinal,
            dataVencimento: dataAssinatura ? new Date(dataAssinatura) : new Date(),
            numeroParcela: 0,
            status: 'PENDENTE',
          },
        })
      }
      for (let i = 1; i <= nParcelas; i++) {
        const venc = new Date(dataAssinatura || new Date())
        venc.setMonth(venc.getMonth() + i)
        await prisma.pagamento.create({
          data: {
            contratoId: contrato.id,
            tipo: i === nParcelas ? 'PAGAMENTO_FINAL' : 'PARCELA',
            descricao: i === nParcelas ? 'Pagamento Final' : `Parcela ${i}/${nParcelas}`,
            valor: vParcela,
            dataVencimento: venc,
            numeroParcela: i,
            status: 'PENDENTE',
          },
        })
      }
    }

    await prisma.log.create({
      data: {
        usuarioId: user.id,
        acao: existente ? 'ATUALIZAR_CONTRATO' : 'CRIAR_CONTRATO',
        entidade: 'Contrato',
        entidadeId: contrato.id,
        detalhes: JSON.stringify({ projetoId, tipoContrato }),
      },
    })

    return NextResponse.json({ contrato }, { status: existente ? 200 : 201 })
  } catch (error) {
    console.error('Erro ao salvar contrato:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
