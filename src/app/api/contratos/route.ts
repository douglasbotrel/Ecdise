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
      projetoId, clienteId, tipoContrato, dataAssinatura, dataVencimento,
      valorTotal, valorSinal, numeroParcelas, observacoes, servicosContratados
    } = body

    if (!projetoId || !clienteId || !valorTotal) {
      return NextResponse.json({ error: 'Dados obrigatórios faltando' }, { status: 400 })
    }

    const vTotal = parseFloat(valorTotal)
    const vSinal = parseFloat(valorSinal || '0')
    const nParcelas = parseInt(numeroParcelas || '1')
    const vRestante = vTotal - vSinal
    const vParcela = nParcelas > 0 ? vRestante / nParcelas : vRestante

    const count = await prisma.contrato.count()
    const codigo = `CTR-${String(count + 1).padStart(4, '0')}`

    const contrato = await prisma.contrato.create({
      data: {
        codigo,
        projetoId,
        clienteId,
        tipoContrato: tipoContrato || 'Serviço Ambiental',
        dataAssinatura: dataAssinatura ? new Date(dataAssinatura) : null,
        dataVencimento: dataVencimento ? new Date(dataVencimento) : null,
        valorTotal: vTotal,
        valorSinal: vSinal,
        valorRestante: vRestante,
        numeroParcelas: nParcelas,
        valorParcela: vParcela,
        observacoes,
        servicosContratados: servicosContratados ? JSON.stringify(servicosContratados) : null,
        statusContrato: 'AGUARDANDO_ASSINATURA',
      },
    })

    // Gera parcelas automaticamente
    if (vSinal > 0) {
      await prisma.pagamento.create({
        data: {
          contratoId: contrato.id,
          tipo: 'SINAL',
          descricao: 'Sinal/Entrada',
          valor: vSinal,
          dataVencimento: dataAssinatura ? new Date(dataAssinatura) : new Date(),
          numeroParcela: 0,
          status: 'PENDENTE',
        }
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
        }
      })
    }

    // Atualiza status do projeto
    await prisma.projeto.update({
      where: { id: projetoId },
      data: { statusComercial: 'ACEITO' }
    })

    await prisma.log.create({
      data: { usuarioId: user.id, acao: 'CRIAR_CONTRATO', entidade: 'Contrato', entidadeId: contrato.id }
    })

    return NextResponse.json({ contrato }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar contrato:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
