import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const statusComercial = searchParams.get('statusComercial')
    const etapaPipeline = searchParams.get('etapaPipeline')
    const clienteId = searchParams.get('clienteId')
    const analistaRapidoId = searchParams.get('analistaRapidoId')
    const responsavelId = searchParams.get('responsavelId')
    const search = searchParams.get('search')
    const emAcompanhamento = searchParams.get('emAcompanhamento')
    const statusOperacional = searchParams.get('statusOperacional')
    const statusOperacionalNot = searchParams.get('statusOperacionalNot')
    const limit = Math.min(Math.max(parseInt(searchParams.get('limit') || '50') || 50, 1), 500)
    const page = Math.max(parseInt(searchParams.get('page') || '1') || 1, 1)
    // contagem=etapaPipeline|statusOperacional → devolve também o total por valor,
    // calculado no servidor (os cards não dependem mais da página carregada)
    const contagem = searchParams.get('contagem')

    // suporta múltiplas etapas via "etapas=A,B,C"
    const etapasParam = searchParams.get('etapas')
    const lista = (v: string) => v.split(',').map(e => e.trim()).filter(Boolean)

    const where: any = {}
    const and: any[] = []
    // Projetos excluídos (soft-delete) nunca aparecem nas listagens normais
    if (searchParams.get('incluirExcluidos') !== 'true') {
      where.excluido = false
    }
    if (statusComercial) where.statusComercial = statusComercial
    if (etapaPipeline) where.etapaPipeline = etapaPipeline
    if (etapasParam) where.etapaPipeline = { in: lista(etapasParam) }
    if (statusOperacional) where.statusOperacional = { in: lista(statusOperacional) }
    if (statusOperacionalNot) and.push({ statusOperacional: { notIn: lista(statusOperacionalNot) } })
    if (clienteId) where.clienteId = clienteId
    if (analistaRapidoId) where.analistaRapidoId = analistaRapidoId
    if (responsavelId) where.responsavelId = responsavelId
    if (emAcompanhamento === 'true')  where.emAcompanhamento = true
    if (emAcompanhamento === 'false') where.emAcompanhamento = false
    if (search) {
      const termo = { contains: search.trim(), mode: 'insensitive' as const }
      and.push({
        OR: [
          { codigo: termo },
          { imovelNome: termo },
          { municipio: termo },
          { protocoloCodigoOrgao: termo },
          { cliente: { nome: termo } },
          { cliente: { cpfCnpj: termo } },
        ],
      })
    }

    // Restrição por role: analista rápido vê só os seus
    if (user.role === 'ANALISTA_RAPIDO') {
      where.analistaRapidoId = user.id
    } else if (user.role === 'ANALISTA' || user.role === 'TECNICO_CAMPO') {
      // Responsável geral OU responsável por alguma tarefa do projeto
      delete where.responsavelId
      and.push({
        OR: [
          { responsavelId: user.id },
          { tarefas: { some: { responsavelId: user.id } } },
        ],
      })
    }
    if (and.length) where.AND = and

    const [projetosRaw, total] = await Promise.all([
      prisma.projeto.findMany({
        where,
        include: {
          cliente: { select: { id: true, nome: true, cpfCnpj: true } },
          responsavel: { select: { id: true, nome: true } },
          supervisor: { select: { id: true, nome: true } },
          analistaRapido: { select: { id: true, nome: true } },
          contrato: { select: { id: true, codigo: true, statusContrato: true, valorTotal: true, valorRestante: true } },
          licenca: { select: { id: true, numero: true, dataEmissao: true, dataValidade: true } },
          pendencias: { select: { id: true, status: true, prazoResposta: true, numeroPedido: true, data: true } },
          _count: { select: { tarefas: true, vistorias: true, documentos: true } },
        },
        orderBy: { criadoEm: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.projeto.count({ where }),
    ])

    // Credenciais de órgãos nunca saem na listagem
    const projetos = projetosRaw.map(({ credenciais, ...p }: any) => ({
      ...p,
      temCredenciais: !!credenciais,
    }))

    let contagens: Record<string, number> | undefined
    if (contagem === 'etapaPipeline' || contagem === 'statusOperacional') {
      // Conta sem o filtro do próprio campo agrupado, para que cada card/aba
      // mostre seu total independente do que está selecionado.
      const whereContagem: any = { ...where }
      delete whereContagem[contagem]
      const grupos = await prisma.projeto.groupBy({
        by: [contagem],
        where: whereContagem,
        _count: { _all: true },
      })
      contagens = {}
      for (const g of grupos as any[]) contagens[g[contagem]] = g._count._all
    }

    return NextResponse.json({ projetos, total, page, limit, contagens })
  } catch (error) {
    console.error('Erro ao buscar projetos:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const {
      clienteId, tipoServico, descricao, imovelNome, imovelEndereco,
      municipio, estado, car, areaHectares, valorProposto,
      observacoes, analistaRapidoId,
    } = body

    if (!clienteId || !tipoServico) {
      return NextResponse.json({ error: 'Cliente e tipo de serviço são obrigatórios' }, { status: 400 })
    }

    // Código sequencial: parte do maior código existente (não da contagem, que
    // repete números após exclusões) e tenta de novo se outra criação simultânea
    // pegar o mesmo número (violação de unique P2002).
    async function proximoCodigo(): Promise<string> {
      const ultimos = await prisma.projeto.findMany({
        where: { codigo: { startsWith: 'PRJ-' } },
        select: { codigo: true },
      })
      const max = ultimos.reduce((m, p) => {
        const n = parseInt(p.codigo.replace('PRJ-', ''), 10)
        return Number.isFinite(n) && n > m ? n : m
      }, 0)
      return `PRJ-${String(max + 1).padStart(4, '0')}`
    }

    async function criar(codigo: string) {
      return prisma.projeto.create({
      data: {
        codigo,
        clienteId,
        tipoServico,
        descricao,
        imovelNome,
        imovelEndereco,
        municipio,
        estado,
        car,
        areaHectares: areaHectares ? parseFloat(areaHectares) : null,
        valorProposto: valorProposto ? parseFloat(valorProposto) : null,
        observacoes,
        analistaRapidoId: analistaRapidoId || null,
        etapaPipeline: 'SOLICITACAO',
        statusComercial: 'RECEBIDO',
        statusOperacional: 'NAO_INICIADO',
      },
      include: {
        cliente: true,
        analistaRapido: { select: { id: true, nome: true, email: true } },
      },
    })
    }

    let projeto: any = null
    let codigo = ''
    for (let tentativa = 0; tentativa < 5 && !projeto; tentativa++) {
      codigo = await proximoCodigo()
      try {
        projeto = await criar(codigo)
      } catch (e: any) {
        if (e?.code !== 'P2002') throw e
      }
    }
    if (!projeto) {
      return NextResponse.json({ error: 'Não foi possível gerar o código do projeto. Tente novamente.' }, { status: 409 })
    }


    // Notifica o analista rápido designado
    if (analistaRapidoId) {
      await prisma.notificacao.create({
        data: {
          usuarioId: analistaRapidoId,
          titulo: 'Nova solicitação para análise',
          mensagem: `Projeto ${codigo} — ${imovelNome || tipoServico} (${municipio || 'sem município'}) aguarda sua análise técnica rápida.`,
          tipo: 'info',
          link: `/comercial?busca=${encodeURIComponent(codigo)}`,
        },
      })
    }

    await prisma.log.create({
      data: {
        usuarioId: user.id,
        acao: 'CRIAR_PROJETO',
        entidade: 'Projeto',
        entidadeId: projeto.id,
        detalhes: `Projeto ${codigo} criado — etapa: SOLICITACAO`,
      },
    })

    return NextResponse.json({ projeto }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar projeto:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
