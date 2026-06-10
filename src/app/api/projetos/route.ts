import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const statusComercial = searchParams.get('statusComercial')
    const statusOperacional = searchParams.get('statusOperacional')
    const clienteId = searchParams.get('clienteId')
    const responsavelId = searchParams.get('responsavelId')
    const search = searchParams.get('search')
    const limit = parseInt(searchParams.get('limit') || '50')
    const page = parseInt(searchParams.get('page') || '1')

    const where: any = {}
    if (statusComercial) where.statusComercial = statusComercial
    if (statusOperacional) where.statusOperacional = statusOperacional
    if (clienteId) where.clienteId = clienteId
    if (responsavelId) where.responsavelId = responsavelId
    if (search) {
      where.OR = [
        { codigo: { contains: search } },
        { imovelNome: { contains: search } },
        { municipio: { contains: search } },
        { cliente: { nome: { contains: search } } },
      ]
    }

    // Restrição por departamento
    if (user.role === 'ANALISTA' || user.role === 'TECNICO_CAMPO') {
      where.responsavelId = user.id
    }

    const [projetos, total] = await Promise.all([
      prisma.projeto.findMany({
        where,
        include: {
          cliente: { select: { id: true, nome: true, cpfCnpj: true } },
          responsavel: { select: { id: true, nome: true } },
          supervisor: { select: { id: true, nome: true } },
          contrato: { select: { id: true, statusContrato: true, valorTotal: true } },
          _count: { select: { tarefas: true, vistorias: true, documentos: true } },
        },
        orderBy: { criadoEm: 'desc' },
        take: limit,
        skip: (page - 1) * limit,
      }),
      prisma.projeto.count({ where }),
    ])

    return NextResponse.json({ projetos, total, page, limit })
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
      municipio, estado, car, areaHectares, valorProposto, tipoContrato,
      observacoes, responsavelId, supervisorId
    } = body

    if (!clienteId || !tipoServico) {
      return NextResponse.json({ error: 'Cliente e tipo de serviço são obrigatórios' }, { status: 400 })
    }

    // Gera código sequencial
    const count = await prisma.projeto.count()
    const codigo = `PRJ-${String(count + 1).padStart(4, '0')}`

    const projeto = await prisma.projeto.create({
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
        tipoContrato,
        observacoes,
        responsavelId: responsavelId || null,
        supervisorId: supervisorId || null,
        statusComercial: 'RECEBIDO',
        statusOperacional: 'NAO_INICIADO',
      },
      include: {
        cliente: true,
        responsavel: { select: { id: true, nome: true } },
      },
    })

    // Log
    await prisma.log.create({
      data: {
        usuarioId: user.id,
        acao: 'CRIAR_PROJETO',
        entidade: 'Projeto',
        entidadeId: projeto.id,
        detalhes: `Projeto ${codigo} criado`,
      },
    })

    return NextResponse.json({ projeto }, { status: 201 })
  } catch (error) {
    console.error('Erro ao criar projeto:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
