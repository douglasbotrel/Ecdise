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

    // Busca pagamento atual com contrato + projeto + servicosContratados
    const pagamentoAtual = await prisma.pagamento.findUnique({
      where: { id },
      include: {
        contrato: {
          include: {
            projeto: {
              select: {
                id: true,
                codigo: true,
                etapaPipeline: true,
                servicosContratados: true,
              },
            },
          },
        },
      },
    })
    if (!pagamentoAtual) return NextResponse.json({ error: 'Pagamento não encontrado' }, { status: 404 })

    // Atualiza pagamento
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
    // Primeiro pagamento PAGO de um contrato cujo projeto está em AGUARDANDO_SINAL
    // → avança para OPERACIONAL e cria tarefas automaticamente
    if (
      status === 'PAGO' &&
      pagamentoAtual.contrato?.projeto?.etapaPipeline === 'AGUARDANDO_SINAL'
    ) {
      const contrato  = pagamentoAtual.contrato
      const projeto   = contrato.projeto
      const projetoId = contrato.projetoId

      // Conta quantos PAGO este contrato já tinha antes desta atualização
      const pagosAntesCount = await prisma.pagamento.count({
        where: { contratoId: contrato.id, status: 'PAGO' },
      })

      // pagosAntesCount === 1 significa que só este (que acabou de virar PAGO) existe
      if (pagosAntesCount === 1) {

        // 1. Avança pipeline
        await prisma.projeto.update({
          where: { id: projetoId },
          data: { etapaPipeline: 'OPERACIONAL', dataAprovacao: new Date() },
        })

        // 2. Identifica serviços contratados
        let nomesServicos: string[] = []
        try {
          const raw = contrato.servicosContratados || projeto.servicosContratados || '[]'
          nomesServicos = JSON.parse(raw as string)
        } catch {}

        // 3. Busca TipoServico e cria tarefas
        if (nomesServicos.length > 0) {
          const tiposServico = await prisma.tipoServico.findMany({
            where: { nome: { in: nomesServicos } },
            orderBy: { ordem: 'asc' },
          })

          let ordem = 1
          for (const ts of tiposServico) {
            let tarefasPadrao: string[] = []
            try { tarefasPadrao = JSON.parse(ts.tarefasPadrao || '[]') } catch {}

            for (const item of tarefasPadrao) {
              // suporta tanto string simples quanto objeto { titulo, etapa, ordem }
              const titulo = typeof item === 'string' ? item : (item as any).titulo
              if (!titulo) continue
              await prisma.tarefa.create({
                data: {
                  projetoId,
                  titulo,
                  etapa: ts.nome,
                  ordem: ordem++,
                  // prazo e responsavelId ficam em branco para o gestor preencher
                },
              })
            }
          }
        }

        // 4. Notifica gestores operacionais e de campo
        const gestores = await prisma.usuario.findMany({
          where: {
            ativo: true,
            role: { in: ['GESTOR_OPERACIONAL', 'GESTOR_CAMPO', 'GESTOR_GERAL', 'ADMIN'] },
          },
          select: { id: true },
        })

        if (gestores.length > 0) {
          await prisma.notificacao.createMany({
            data: gestores.map(g => ({
              usuarioId: g.id,
              titulo: '🚀 Projeto liberado para execução',
              mensagem: `Projeto ${projeto.codigo} teve sinal confirmado. Acesse Operacional para definir prazos e responsáveis.`,
              tipo: 'sucesso',
              link: `/operacional/${projetoId}`,
            })),
          })
        }

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
