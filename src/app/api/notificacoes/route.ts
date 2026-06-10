import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const lida = searchParams.get('lida')
    const limit = parseInt(searchParams.get('limit') || '20')

    const where: any = { usuarioId: user.id }
    if (lida !== null) where.lida = lida === 'true'

    const notificacoes = await prisma.notificacao.findMany({
      where,
      orderBy: { criadoEm: 'desc' },
      take: limit
    })

    return NextResponse.json({ notificacoes })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { id, marcarTodasLidas } = body

    if (marcarTodasLidas) {
      await prisma.notificacao.updateMany({
        where: { usuarioId: user.id, lida: false },
        data: { lida: true }
      })
    } else if (id) {
      await prisma.notificacao.update({
        where: { id, usuarioId: user.id },
        data: { lida: true }
      })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
