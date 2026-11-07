import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { podeAvancar, PROXIMA_ETAPA, ROLES_DIRECAO, ROLES_GESTAO_OPERACIONAL } from '@/lib/pipeline'
import { credenciaisPublicas, mesclarCredenciais } from '@/lib/credenciais'


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
        link: `/comercial?busca=${encodeURIComponent(projeto.codigo)}`,
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
        mensagem: `${base}: serviços e valores validados pelo ADM. Elabore o contrato com os dados fornecidos.`,
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
          link: `/operacional/${projeto.id}`,
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
        },
        pendencias: {
          orderBy: { criadoEm: 'desc' },
          include: {
            acoes: {
              orderBy: { criadoEm: 'asc' },
              include: { responsavel: { select: { id: true, nome: true } } }
            }
          }
        },
        licenca: true,
      }
    })

    if (!projeto) {
      return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })
    }

    // Senhas de órgãos nunca saem aqui: a tela recebe só o login e usa
    // /api/projetos/:id/credenciais para revelar a senha (com registro em log).
    return NextResponse.json({
      projeto: { ...projeto, credenciais: credenciaisPublicas(projeto.credenciais) },
    })
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
    const encerrar = body.encerrar === true
    const motivo = String(body.motivo || '').trim()

    // Liberação sem pagamento: apenas a direção pode avançar de AGUARDANDO_SINAL → OPERACIONAL sem pagamento
    if (body.liberarSemPagamento === true) {
      if (!ROLES_DIRECAO.includes(user.role)) {
        return NextResponse.json({ error: 'Sem permissão para liberar sem pagamento' }, { status: 403 })
      }
      if (projeto.etapaPipeline !== 'AGUARDANDO_SINAL') {
        return NextResponse.json({ error: 'Projeto não está em Aguardando Sinal' }, { status: 400 })
      }
      if (!motivo) {
        return NextResponse.json({ error: 'Informe o motivo da liberação sem pagamento' }, { status: 400 })
      }
    }

    // Definir a etapa diretamente (salto) é exceção da direção
    if (body.etapaPipeline && body.etapaPipeline !== projeto.etapaPipeline && !ROLES_DIRECAO.includes(user.role)) {
      return NextResponse.json({ error: 'Apenas a direção pode alterar a etapa diretamente' }, { status: 403 })
    }

    // Regras de transição no servidor: quem pode confirmar a etapa atual
    if (avancarPipeline && PROXIMA_ETAPA[projeto.etapaPipeline]) {
      if (!podeAvancar(projeto.etapaPipeline, user, projeto)) {
        return NextResponse.json({ error: 'Você não tem permissão para avançar esta etapa' }, { status: 403 })
      }
      // Concluir o projeto é feito pelo Encerramento (encerrar: true)
      if (projeto.etapaPipeline === 'EM_EXECUCAO') {
        return NextResponse.json({ error: 'Use o Encerramento para concluir o projeto' }, { status: 400 })
      }
    }

    // Saída de AGUARDANDO_SINAL exige pagamento confirmado, ou motivo quando o contrato não tem valor
    let observacaoSemValor: string | null = null
    if (avancarPipeline && !body.liberarSemPagamento && projeto.etapaPipeline === 'AGUARDANDO_SINAL') {
      const contrato = await prisma.contrato.findUnique({
        where: { projetoId: projeto.id },
        select: { id: true, valorTotal: true },
      }).catch(() => null)
      const semValor = !contrato || !contrato.valorTotal || Number(contrato.valorTotal) <= 0
      const pagos = contrato ? await prisma.pagamento.count({ where: { contratoId: contrato.id, status: 'PAGO' } }) : 0
      if (semValor) {
        if (!motivo) {
          return NextResponse.json({ error: 'Contrato sem valor: informe o motivo para liberar ao Operacional' }, { status: 400 })
        }
        observacaoSemValor = `Contrato sem valor liberado para Operacional por ${user.nome || user.email}. Motivo: ${motivo}`
      } else if (!body.dataAprovacao && pagos === 0) {
        return NextResponse.json({ error: 'Confirme o pagamento do sinal (data do pagamento) antes de liberar' }, { status: 400 })
      }
    }

    // Status operacional: só gestão operacional ou o responsável pelo projeto
    if (body.statusOperacional && body.statusOperacional !== projeto.statusOperacional) {
      const podeStatus = ROLES_GESTAO_OPERACIONAL.includes(user.role) ||
        [projeto.responsavelId, projeto.gestorResponsavelId].includes(user.id)
      if (!podeStatus) {
        return NextResponse.json({ error: 'Sem permissão para alterar o status operacional' }, { status: 403 })
      }
    }

    // Concluir (status CONCLUIDO ou encerramento) exige todas as tarefas fechadas
    if (encerrar || (body.statusOperacional === 'CONCLUIDO' && projeto.statusOperacional !== 'CONCLUIDO')) {
      if (encerrar && !ROLES_GESTAO_OPERACIONAL.includes(user.role) && projeto.gestorResponsavelId !== user.id) {
        return NextResponse.json({ error: 'Sem permissão para encerrar o projeto' }, { status: 403 })
      }
      const abertas = await prisma.tarefa.count({
        where: { projetoId: projeto.id, status: { notIn: ['CONCLUIDA', 'CANCELADA'] } },
      })
      if (abertas > 0 && !(user.role === 'ADMIN' && body.forcarConclusao === true)) {
        return NextResponse.json(
          { error: `Ainda há ${abertas} atividade(s) aberta(s). Conclua ou cancele antes de finalizar.` },
          { status: 400 }
        )
      }
    }

    let novaEtapa = projeto.etapaPipeline
    if (encerrar) {
      novaEtapa = 'CONCLUIDO'
    } else if ((avancarPipeline || body.liberarSemPagamento) && PROXIMA_ETAPA[projeto.etapaPipeline]) {
      novaEtapa = PROXIMA_ETAPA[projeto.etapaPipeline]
    } else if (body.etapaPipeline && body.etapaPipeline !== projeto.etapaPipeline) {
      novaEtapa = body.etapaPipeline
    }

    const novoStatusOperacional: string | null = encerrar ? 'CONCLUIDO' : (body.statusOperacional || null)

    // Históricos gravados na MESMA transação da atualização
    const historicos: any[] = []
    if (novaEtapa !== projeto.etapaPipeline) {
      historicos.push({
        projetoId: params.id,
        statusAnterior: projeto.etapaPipeline,
        statusNovo: novaEtapa,
        campo: 'etapaPipeline',
        observacao: body.liberarSemPagamento
          ? `Liberado para Operacional sem confirmação de pagamento pelo ADM (${user.nome || user.email}). Motivo: ${motivo}`
          : encerrar
            ? `Projeto encerrado por ${user.nome || user.email}`
            : (observacaoSemValor || body.observacaoTransicao || null),
        usuarioId: user.id,
      })
    }
    if (novoStatusOperacional && novoStatusOperacional !== projeto.statusOperacional) {
      historicos.push({
        projetoId: params.id,
        statusAnterior: projeto.statusOperacional,
        statusNovo: novoStatusOperacional,
        campo: 'statusOperacional',
        observacao: motivo || null,
        usuarioId: user.id,
      })
    }

    // ── Validações de datas ──────────────────────────────────────────────────
    const dataInicio     = body.dataInicio     ? new Date(body.dataInicio)     : projeto.dataInicio
    const dataPrazo      = body.dataPrazo      ? new Date(body.dataPrazo)      : projeto.dataPrazo
    const dataConclusao  = body.dataConclusao  ? new Date(body.dataConclusao)  : null

    if (body.dataPrazo && dataInicio && dataPrazo) {
      if (dataPrazo < dataInicio) {
        return NextResponse.json(
          { error: 'O prazo do projeto não pode ser anterior à data de início.' },
          { status: 400 }
        )
      }
    }
    if (body.dataConclusao && dataInicio && dataConclusao) {
      if (dataConclusao < dataInicio) {
        return NextResponse.json(
          { error: 'A data de conclusão não pode ser anterior à data de início.' },
          { status: 400 }
        )
      }
    }
    if (body.dataInicio && dataPrazo && dataInicio) {
      if (dataPrazo < dataInicio) {
        return NextResponse.json(
          { error: 'A data de início não pode ser posterior ao prazo já definido.' },
          { status: 400 }
        )
      }
    }

    // Ao avançar de OPERACIONAL → EM_EXECUCAO, marca automaticamente como EM_ANDAMENTO
    const autoStatusOperacional =
      avancarPipeline &&
      projeto.etapaPipeline === 'OPERACIONAL' &&
      novaEtapa === 'EM_EXECUCAO' &&
      !novoStatusOperacional
        ? 'EM_ANDAMENTO'
        : null
    if (autoStatusOperacional && projeto.statusOperacional !== autoStatusOperacional) {
      historicos.push({
        projetoId: params.id,
        statusAnterior: projeto.statusOperacional,
        statusNovo: autoStatusOperacional,
        campo: 'statusOperacional',
        observacao: 'Execução iniciada',
        usuarioId: user.id,
      })
    }

    const credenciaisNovas = body.credenciais !== undefined
      ? mesclarCredenciais(projeto.credenciais, body.credenciais)
      : undefined

    const [projetoAtualizado] = await prisma.$transaction([
      prisma.projeto.update({
      where: { id: params.id },
      data: {
        etapaPipeline: novaEtapa,
        ...(body.statusComercial && { statusComercial: body.statusComercial }),
        ...((novoStatusOperacional || autoStatusOperacional) && {
          statusOperacional: novoStatusOperacional || autoStatusOperacional,
        }),
        ...(encerrar && { dataConclusao: projeto.dataConclusao || new Date() }),
        ...(body.tipoServico !== undefined && { tipoServico: body.tipoServico }),
        ...(body.caminhoSIGLA !== undefined && { caminhoSIGLA: body.caminhoSIGLA || null }),
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
        ...(credenciaisNovas        !== undefined && { credenciais: credenciaisNovas }),
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
        ...(body.dataAprovacao !== undefined && { dataAprovacao: body.dataAprovacao ? new Date(body.dataAprovacao) : null }),
        ...(body.protocoloData !== undefined && { protocoloData: body.protocoloData ? new Date(body.protocoloData) : null }),
        ...(body.protocoloCodigoOrgao !== undefined && { protocoloCodigoOrgao: body.protocoloCodigoOrgao || null }),
        ...(body.checklistEncerramento !== undefined && { checklistEncerramento: body.checklistEncerramento }),
        ...(body.emAcompanhamento !== undefined && { emAcompanhamento: body.emAcompanhamento === true }),
      },
      include: {
        cliente: true,
        responsavel: { select: { id: true, nome: true } },
        analistaRapido: { select: { id: true, nome: true } },
        supervisor: { select: { id: true, nome: true } },
      }
    }),
      ...historicos.map(h => prisma.historicoStatus.create({ data: h })),
    ])

    // Notificações para a nova etapa
    if (novaEtapa !== projeto.etapaPipeline) {
      await criarNotificacaoEtapa(novaEtapa, projetoAtualizado)
    }

    // ── AUTO-CRIAR TAREFAS ao entrar em OPERACIONAL (ou forçado por gerarTarefas) ──
    // Geração acontece ao chegar em OPERACIONAL (não em EM_EXECUCAO) porque:
    //  - o gestor operacional precisa ver as tarefas para atribuir prazos/responsáveis
    //  - EM_EXECUCAO é acionado via tarefas/route.ts (bypass do PATCH) ao 1º check
    // body.gerarTarefas=true permite regenerar para projetos em OPERACIONAL ou EM_EXECUCAO sem tarefas
    const ETAPAS_PODE_GERAR = ['OPERACIONAL', 'EM_EXECUCAO']
    const forcarGeracao = body.gerarTarefas === true && ETAPAS_PODE_GERAR.includes(projeto.etapaPipeline)
    if ((novaEtapa === 'OPERACIONAL' && projeto.etapaPipeline !== 'OPERACIONAL') || forcarGeracao) {
      try {
        // Só cria se o projeto ainda não tem tarefas (evita duplicatas em re-entradas)
        const tarefasExistentes = await prisma.tarefa.count({ where: { projetoId: params.id } })
        if (tarefasExistentes === 0) {
          const servicosRaw = projetoAtualizado.servicosContratados
          if (servicosRaw) {
            const nomesServicos: string[] = JSON.parse(servicosRaw)
            const tiposServico = await prisma.tipoServico.findMany({
              where: { nome: { in: nomesServicos }, ativo: true },
              orderBy: { ordem: 'asc' },
            })
            const tarefasParaCriar: {
              projetoId: string; titulo: string; etapa: string | null
              ordem: number; responsavelId: string | null; status: string; obrigatorio: boolean
            }[] = []
            let ordemBase = 0
            for (const tipo of tiposServico) {
              if (tipo.tarefasPadrao) {
                const tasks: { titulo: string; etapa: string; ordem: number }[] = JSON.parse(tipo.tarefasPadrao)
                for (const t of tasks) {
                  tarefasParaCriar.push({
                    projetoId: params.id,
                    titulo: `[${tipo.nome}] ${t.titulo}`,
                    etapa: t.etapa || null,
                    ordem: ordemBase + t.ordem,
                    responsavelId: projetoAtualizado.responsavelId || null,
                    status: 'PENDENTE',
                    obrigatorio: true,
                  })
                }
                ordemBase += tasks.length
              }
            }
            if (tarefasParaCriar.length > 0) {
              await prisma.tarefa.createMany({ data: tarefasParaCriar })
            }
          }
        }
      } catch (e) {
        console.error('Erro ao criar tarefas automáticas:', e)
      }
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

    return NextResponse.json({
      projeto: { ...projetoAtualizado, credenciais: credenciaisPublicas(projetoAtualizado.credenciais) },
    })
  } catch (error) {
    console.error('Erro ao atualizar projeto:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Apenas o Administrador pode excluir projetos' }, { status: 403 })
    }

    const body = await request.json().catch(() => ({}))
    const motivo = (body.motivo || '').trim()
    if (!motivo) {
      return NextResponse.json({ error: 'É obrigatório informar o motivo da exclusão' }, { status: 400 })
    }

    const projeto = await prisma.projeto.findUnique({ where: { id: params.id } })
    if (!projeto) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    // Exclusão lógica — o projeto some de todas as listagens, mas o registro
    // (com motivo, quem excluiu e quando) fica preservado para auditoria.
    // Contratos, pagamentos, tarefas e histórico ligados a ele continuam
    // intactos no banco, só deixam de aparecer nas telas normais.
    await prisma.projeto.update({
      where: { id: params.id },
      data: {
        excluido: true,
        motivoExclusao: motivo,
        excluidoEm: new Date(),
        excluidoPor: user.id,
      },
    })

    await prisma.log.create({
      data: {
        usuarioId: user.id,
        acao: 'EXCLUSAO_PROJETO',
        entidade: 'Projeto',
        entidadeId: params.id,
        detalhes: `Projeto ${projeto.codigo} excluído. Motivo: ${motivo}`,
      },
    }).catch(() => {}) // log é best-effort — não deve travar a exclusão em si

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[projetos DELETE]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
