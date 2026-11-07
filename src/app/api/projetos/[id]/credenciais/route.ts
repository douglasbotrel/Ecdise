import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { lerCredenciais } from '@/lib/credenciais'

const ROLES_LIVRES = ['ADMIN', 'GESTOR_GERAL', 'GESTOR_OPERACIONAL', 'SUPERVISOR']

// GET /api/projetos/:id/credenciais?sistema=SIGLA
// Revela a senha de um sistema do projeto. Restrito à gestão e às pessoas que
// trabalham no projeto; cada revelação fica registrada no Log.
export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const sistema = new URL(request.url).searchParams.get('sistema')
    if (!sistema) return NextResponse.json({ error: 'Informe o sistema' }, { status: 400 })

    const projeto = await prisma.projeto.findUnique({
      where: { id: params.id },
      select: {
        id: true, codigo: true, credenciais: true, excluido: true,
        responsavelId: true, supervisorId: true, gestorResponsavelId: true,
      },
    })
    if (!projeto || projeto.excluido) return NextResponse.json({ error: 'Projeto não encontrado' }, { status: 404 })

    let autorizado = ROLES_LIVRES.includes(user.role) ||
      [projeto.responsavelId, projeto.supervisorId, projeto.gestorResponsavelId].includes(user.id)
    if (!autorizado) {
      autorizado = (await prisma.tarefa.count({ where: { projetoId: projeto.id, responsavelId: user.id } })) > 0
    }
    if (!autorizado) return NextResponse.json({ error: 'Sem permissão para ver esta credencial' }, { status: 403 })

    const cred = lerCredenciais(projeto.credenciais)[sistema]
    if (!cred) return NextResponse.json({ error: 'Credencial não cadastrada' }, { status: 404 })

    await prisma.log.create({
      data: {
        usuarioId: user.id,
        acao: 'REVELAR_CREDENCIAL',
        entidade: 'Projeto',
        entidadeId: projeto.id,
        detalhes: `Senha ${sistema} do projeto ${projeto.codigo} revelada`,
      },
    })

    return NextResponse.json({ sistema, login: cred.login || '', senha: cred.senha || '' })
  } catch (error) {
    console.error('[projetos/credenciais GET]', error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
