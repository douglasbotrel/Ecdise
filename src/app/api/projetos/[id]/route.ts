import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// Qual etapa vem depois de cada etapa ao "salvar/confirmar"
const PROXIMA_ETAPA: Record<string, string> = {
  SOLICITACAO:         'EM_ANALISE_RAPIDA',
  EM_ANALISE_RAPIDA:   'ANALISE_CONCLUIDA',
  ANALISE_CONCLUIDA:   'EM_NEGOCIACAO',
  EM_NEGOCIACAO:       'PROPOSTA_ACEITA',
  PROPOSTA_ACEITA:     'AGUARDANDO_CONTRATO',
  AGUARDANDO_CONTRATO: 'EM_CONTRATO',
  EM_CONTRATO:         'AGUARDANDO_SINAL',
  AGUARDANDO_SINAL:    'OPERACIONAL',
  OPERACIONAL:         'EM_EXECUCAO',
  EM_EXECUCAO:         'CONCLUIDO',
}

async function criarNotificacaoEtapa(etapa: string, projeto: any) {
  const notifs: { usuarioId: string; titulo: string; mensagem: string; tipo: string; link: string }[] = []
  const base = `Projeto ${projeto.codigo} — ${projeto.imovelNome || projeto.tipoServico}`

  switch (etapa) {
    case 'ANALISE_CONCLUIDA': {
      const admins = await prisma.usuario.findMany({
        where: { role: { in: ['ADMIN', 'GESTOR_GERAL'] }, ativo: true },
        select: { id: true },
      })
      admins.forEach(a => notifs.push({
        usuarioId: a.id,
        titulo: '✅ Análise concluída — aguardando sua validação',
        mensagem: `${base}: análise técnica rápida finalizada. Revise os serviços recomendados e valide para negociação.`,
        tipo: 'success',
        link: '/comercial',
      }))
      break
    }
    case 'AGUARDANDO_CONTRATO': {
      const contratos = await prisma.usuario.findMany({
        where: { departamento: 'CONTRATOS', ativo: true },
        select: { id: true },
      })
      contratos.forEach(c => notifs.push({
        usuarioId: c.id,
        titulo: '📄 Novo contrato para elaborar',
        mensagem: `${base}: proposta aceita. Elabore o contrato com os dados fornecidos.`,
        tipo: 'info',
        link: '/contratos',
      }))
      break
    }
    case 'AGUARDANDO_SINAL': {
      const financeiro = await prisma.usuario.findMany({
        where: { departamento: 'FINANCEIRO', ativo: true },
        select: { id: true },
      })
      financeiro.forEach(f => notifs.push({
        usuarioId: f.id,
        titulo: '💰 Aguardando sinal — novo contrato',
        mensagem: `${base}: contrato elaborado. Aguardando recebimento do sinal para liberar operações.`,
        tipo: 'info',
        link: '/financeiro',
      }))
      break
    }
    case 'OPERACIONAL': {
      const gestorId = projeto.gestorResponsavelId || projeto.supervisorId
      if (gestorId) {
        notifs.push({
          usuarioId: gestorId,
          titulo: '🚀 Novo projeto operacional',
          mensagem: `${base}: sinal recebido. Atribua um analista e defina o prazo para iniciar.`,
          tipo: 'info',
          link: '/operacional',
        })
      }
      break
    }
    case 'EM_EXECUCAO': {
      if (projeto.responsavelId) {
        notifs.push({
          usuarioId: projeto.responsavelId,
          titulo: '📋 Novo projeto atribuído a você',
          mensagem: `${base}: você foi designado responsável. Acesse o módulo operacional para executar as tarefas.`,
          tipo: 'info',
          link: `/operacional/${projeto.id}`,
        })
      }
      break
    }
  }

  if (notifs.length > 0) {
    await prisma.notificacao.createMany({ data: notifs })
  }
}

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
        analistaRapido: { select: { id: true, nome: true, email: true } },
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

    // Avança pipeline quando o responsável da etapa atual confirma
    const avancarPipeline = body.avancarPipeline === true
    let novaEtapa = projeto.etapaPipeline
    if (avancarPipeline && PROXIMA_ETAPA[projeto.etapaPipeline]) {
      novaEtapa = PROXIMA_ETAPA[projeto.etapaPipeline]
    } else if (body.etapaPipeline && body.etapaPipeline !== projeto.etapaPipeline) {
      novaEtapa = body.etapaPipeline
    }

    // Histórico de etapa
    if (novaEtapa !== projeto.etapaPipeline) {
      await prisma.historicoStatus.create({
        data: {
          projetoId: params.id,
          statusAnterior: projeto.etapaPipeline,
          statusNovo: novaEtapa,
          campo: 'etapaPipeline',
          observacao: body.observacaoTransicao || null,
          usuarioId: user.id,
        }
      }).catch(() => {})
    }

    // Histórico de statusOperacional
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
        etapaPipeline: novaEtapa,
        ...(body.statusComercial && { statusComercial: body.statusComercial }),
        ...(body.statusOperacional && { statusOperacional: body.statusOperacional }),
        ...(body.descricao !== undefined && { descricao: body.descricao }),
        ...(body.imovelNome !== undefined && { imovelNome: body.imovelNome }),
        ...(body.municipio !== undefined && { municipio: body.municipio }),
        ...(body.estado !== undefined && { estado: body.estado }),
        ...(body.car !== undefined && { car: body.car }),
        ...(body.areaHectares !== undefined && { areaHectares: body.areaHectares ? parseFloat(body.areaHectares) : null }),
        ...(body.valorProposto !== undefined && { valorProposto: body.valorProposto ? parseFloat(body.valorProposto) : null }),
        ...(body.observacoes !== undefined && { observacoes: body.observacoes }),
        ...(body.observacoesAnalise !== undefined && { observacoesAnalise: body.observacoesAnalise }),
        ...(body.servicosRecomendados !== undefined && { servicosRecomendados: body.servicosRecomendados }),
        ...(body.servicosContratados !== undefined && { servicosContratados: body.servicosContratados }),
        ...(body.valorSinal !== undefined && { valorSinal: body.valorSinal ? parseFloat(body.valorSinal) : null }),
        ...(body.valorPrestacao !== undefined && { valorPrestacao: body.valorPrestacao ? parseFloat(body.valorPrestacao) : null }),
        ...(body.numeroPrestacoes !== undefined && { numeroPrestacoes: body.numeroPrestacoes ? parseInt(body.numeroPrestacoes) : null }),
        ...(body.responsavelId !== undefined && { responsavelId: body.responsavelId || null }),
        ...(body.supervisorId !== undefined && { supervisorId: body.supervisorId || null }),
        ...(body.analistaRapidoId !== undefined && { analistaRapidoId: body.analistaRapidoId || null }),
        ...(body.gestorResponsavelId !== undefined && { gestorResponsavelId: body.gestorResponsavelId || null }),
        ...(body.dataPrazo !== undefined && { dataPrazo: body.dataPrazo ? new Date(body.dataPrazo) : null }),
        ...(body.dataInicio !== undefined && { dataInicio: body.dataInicio ? new Date(body.dataInicio) : null }),
        ...(body.dataConclusao !== undefined && { dataConclusao: body.dataConclusao ? new Date(body.dataConclusao) : null }),
      },
      include: {
        cliente: true,
        responsavel: { select: { id: true, nome: true } },
        analistaRapido: { select: { id: true, nome: true } },
        supervisor: { select: { id: true, nome: true } },
      }
    })

    // Notificações para a nova etapa
    if (novaEtapa !== projeto.etapaPipeline) {
      await criarNotificacaoEtapa(novaEtapa, projetoAtualizado)
    }

    await prisma.log.create({
      data: {
        usuarioId: user.id,
        acao: 'ATUALIZAR_PROJETO',
        entidade: 'Projeto',
        entidadeId: params.id,
        detalhes: JSON.stringify({ etapa: novaEtapa, campos: Object.keys(body) }),
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
