import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hasPermission } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const tipo = searchParams.get('tipo') || 'servicos'

    if (tipo === 'servicos') {
      const servicos = await prisma.tipoServico.findMany({
        where: { ativo: true },
        orderBy: { ordem: 'asc' }
      })
      return NextResponse.json({ servicos })
    }

    // Para a tela de configurações — retorna todos, inclusive inativos
    if (tipo === 'servicos_todos') {
      const servicos = await prisma.tipoServico.findMany({
        orderBy: { ordem: 'asc' }
      })
      return NextResponse.json({ servicos })
    }

    if (tipo === 'custos') {
      const custos = await prisma.tipoCusto.findMany({
        where: { ativo: true },
        orderBy: { nome: 'asc' }
      })
      return NextResponse.json({ custos })
    }

    if (tipo === 'departamentos') {
      const departamentos = await prisma.configuracaoDepartamento.findMany({
        orderBy: { nome: 'asc' }
      })
      return NextResponse.json({ departamentos })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!hasPermission(user.role, 'GESTOR_GERAL')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { tipo, ...data } = body

    if (tipo === 'servico') {
      const count = await prisma.tipoServico.count()
      const servico = await prisma.tipoServico.create({
        data: { ...data, ordem: data.ordem || count + 1 }
      })
      return NextResponse.json({ servico }, { status: 201 })
    }

    if (tipo === 'custo') {
      const custo = await prisma.tipoCusto.create({ data })
      return NextResponse.json({ custo }, { status: 201 })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!hasPermission(user.role, 'GESTOR_GERAL')) {
      return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
    }

    const body = await request.json()
    const { tipo, id, ...data } = body

    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

    if (tipo === 'servico') {
      const servico = await prisma.tipoServico.update({ where: { id }, data })
      return NextResponse.json({ servico })
    }

    if (tipo === 'custo') {
      const custo = await prisma.tipoCusto.update({ where: { id }, data })
      return NextResponse.json({ custo })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
