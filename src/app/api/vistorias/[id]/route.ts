import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const vistoria = await prisma.vistoria.update({
      where: { id: params.id },
      data: {
        ...(body.status && { status: body.status }),
        ...(body.dataRealizada && { dataRealizada: new Date(body.dataRealizada) }),
        ...(body.kmSaida !== undefined && { kmSaida: body.kmSaida }),
        ...(body.kmChegada !== undefined && { kmChegada: body.kmChegada }),
        ...(body.horaSaida !== undefined && { horaSaida: body.horaSaida }),
        ...(body.horaChegada !== undefined && { horaChegada: body.horaChegada }),
        ...(body.resultado !== undefined && { resultado: body.resultado }),
        ...(body.observacoes !== undefined && { observacoes: body.observacoes }),
      }
    })

    return NextResponse.json({ vistoria })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
