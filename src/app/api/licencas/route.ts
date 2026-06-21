import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

// POST /api/licencas — concede/atualiza a licença de um projeto (1:1, upsert por projetoId)
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { projetoId, numero, dataEmissao, dataValidade, condicionantes, documentoUrl } = body

    if (!projetoId || !numero || !dataEmissao) {
      return NextResponse.json(
        { error: 'Projeto, número da licença e data de emissão são obrigatórios' },
        { status: 400 }
      )
    }

    const projeto = await prisma.projeto.findUnique({ where: { id: projetoId } })
    if (!projeto) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    const licenca = await prisma.licenca.upsert({
      where: { projetoId },
      update: {
        numero,
        dataEmissao: new Date(dataEmissao),
        dataValidade: dataValidade ? new Date(dataValidade) : null,
        condicionantes: condicionantes || null,
        documentoUrl: documentoUrl || null,
      },
      create: {
        projetoId,
        numero,
        dataEmissao: new Date(dataEmissao),
        dataValidade: dataValidade ? new Date(dataValidade) : null,
        condicionantes: condicionantes || null,
        documentoUrl: documentoUrl || null,
      },
    })

    const destinatarios = [projeto.gestorResponsavelId, projeto.responsavelId].filter(Boolean) as string[]
    if (destinatarios.length > 0) {
      await prisma.notificacao.createMany({
        data: Array.from(new Set(destinatarios)).map(uid => ({
          usuarioId: uid,
          titulo: '🎉 Licença concedida',
          mensagem: `Projeto ${projeto.codigo} — licença nº ${numero} foi emitida.`,
          tipo: 'success',
          link: `/acompanhamento/${projetoId}`,
        })),
      }).catch(() => {})
    }

    await prisma.log.create({
      data: {
        usuarioId: user.id,
        acao: 'CONCEDER_LICENCA',
        entidade: 'Licenca',
        entidadeId: licenca.id,
        detalhes: `Licença nº ${numero} registrada para o projeto ${projeto.codigo}`,
      },
    }).catch(() => {})

    return NextResponse.json({ licenca }, { status: 201 })
  } catch (error) {
    console.error('Erro ao registrar licença:', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
