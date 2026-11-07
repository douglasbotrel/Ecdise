import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { modulosLiberados } from '@/lib/permissoes'

export async function GET() {
  try {
    const userPayload = await getCurrentUser()
    if (!userPayload) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: userPayload.id },
      select: {
        id: true,
        nome: true,
        email: true,
        cargo: true,
        role: true,
        departamento: true,
        avatar: true,
        ativo: true,
        criadoEm: true,
        modulosAcesso: true,
      },
    })

    if (!usuario || !usuario.ativo) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })
    }

    const { modulosAcesso, ...dados } = usuario
    // null = sem restrição. O servidor também aplica estas regras nas APIs.
    return NextResponse.json({ usuario: { ...dados, modulos: modulosLiberados(userPayload) } })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
