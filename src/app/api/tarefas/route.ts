import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

const PODE_DEFINIR_DATA_CAMPO = ['ADMIN', 'GESTOR_CAMPO', 'GESTOR_GERAL', 'GESTOR_OPERACIONAL']

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const projetoId         = searchParams.get('projetoId')
    const responsavelId     = searchParams.get('responsavelId')
    const status            = searchParams.get('status')
    const solicitadasCampo  = searchParams.get('solicitadasCampo') // campo page

    const where: any = {}
    if (projetoId)    where.projetoId     = projetoId
    if (responsavelId) where.responsavelId = responsavelId
    if (status)       where.status        = status
    if (solicitadasCampo === 'true') {
      where.requerVistoriaCampo = true
      where.statusVistoria = 'SOLICITADA'
    }

    const tarefas = await prisma.tarefa.findMany({
      where,
      include: {
        responsavel: { select: { id: true, nome: true } },
        projeto: { select: { id: true, codigo: true, imovelNome: true, municipio: true, estado: true } },
        documentos: true,
      },
      orderBy: [{ ordem: 'asc' }, { criadoEm: 'asc' }]
    })

    return NextResponse.json({ tarefas })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { projetoId, titulo, descricao, tipo, responsavelId, prazo, ordem, etapa, obrigatorio } = body

    if (!projetoId || !titulo) {
      return NextResponse.json({ error: 'Projeto e título são obrigatórios' }, { status: 400 })
    }

    // ── Validação: prazo não pode ser no passado ───────────────────────────
    if (prazo) {
      const dataPrazo = new Date(prazo)
      const hoje = new Date()
      hoje.setHours(0, 0, 0, 0)
      dataPrazo.setHours(0, 0, 0, 0)
      if (dataPrazo < hoje) {
        return NextResponse.json(
          { error: 'O prazo da tarefa não pode ser uma data passada.' },
          { status: 400 }
        )
      }
    }

    const tarefa = await prisma.tarefa.create({
      data: {
        projetoId, titulo, descricao,
        tipo: tipo || 'TAREFA',
        responsavelId: responsavelId || null,
        prazo: prazo ? new Date(prazo) : null,
        ordem: ordem || 0,
        etapa,
        obrigatorio: obrigatorio || false,
        status: 'PENDENTE',
      },
      include: { responsavel: { select: { id: true, nome: true } } }
    })

    return NextResponse.json({ tarefa }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const body = await request.json()
    const { id, status, responsavelId, prazo, descricao, requerVistoriaCampo, dataCampo } = body

    if (!id) return NextResponse.json({ error: 'ID da tarefa é obrigatório' }, { status: 400 })

    // Busca tarefa atual para checks
    const tarefaAtual = await prisma.tarefa.findUnique({
      where: { id },
      include: { projeto: { select: { id: true, codigo: true, imovelNome: true } } }
    })
    if (!tarefaAtual) return NextResponse.json({ error: 'Tarefa não encontrada' }, { status: 404 })

    // ── Proteção: dataCampo só pode ser editada por campo/admin ──────────
    if (dataCampo !== undefined && !PODE_DEFINIR_DATA_CAMPO.includes(user.role)) {
      return NextResponse.json(
        { error: 'Apenas o Gestor de Campo ou Admin pode definir a data de vistoria' },
        { status: 403 }
      )
    }

    // ── Monta payload de update ──────────────────────────────────────────
    const updateData: any = {
      ...(status           !== undefined && { status }),
      ...(responsavelId    !== undefined && { responsavelId }),
      ...(descricao        !== undefined && { descricao }),
      ...(status === 'CONCLUIDA'         && { dataConclusao: new Date() }),
    }

    // prazo: operacional pode setar prazo apenas se NÃO for tarefa de campo aguardando definição
    if (prazo !== undefined) {
      if (tarefaAtual.requerVistoriaCampo && tarefaAtual.statusVistoria === 'AGENDADA') {
        // data já definida pelo campo — operacional não pode alterar
        return NextResponse.json(
          { error: 'A data desta tarefa foi definida pela Gestão de Campo e não pode ser alterada aqui.' },
          { status: 403 }
        )
      }
      updateData.prazo = prazo ? new Date(prazo) : null
    }

    // ── Marcar como "requer vistoria de campo" ────────────────────────────
    if (requerVistoriaCampo === true && !tarefaAtual.requerVistoriaCampo) {
      updateData.requerVistoriaCampo = true
      updateData.statusVistoria = 'SOLICITADA'
      // Remove prazo editado pelo operacional — campo que vai definir
      updateData.prazo = null

      // Notifica gestores de campo
      const gestoresCampo = await prisma.usuario.findMany({
        where: { ativo: true, role: { in: ['GESTOR_CAMPO', 'ADMIN', 'GESTOR_GERAL'] } },
        select: { id: true },
      })
      if (gestoresCampo.length > 0) {
        await prisma.notificacao.createMany({
          data: gestoresCampo.map(g => ({
            usuarioId: g.id,
            titulo: '📅 Solicitação de vistoria de campo',
            mensagem: `Tarefa "${tarefaAtual.titulo}" do projeto ${tarefaAtual.projeto?.codigo} (${tarefaAtual.projeto?.imovelNome || ''}) aguarda agendamento pelo setor de campo.`,
            tipo: 'info',
            link: `/campo`,
          })),
        })
      }
    }

    // ── Desmarcar "requer vistoria de campo" ──────────────────────────────
    if (requerVistoriaCampo === false && tarefaAtual.requerVistoriaCampo) {
      updateData.requerVistoriaCampo = false
      updateData.statusVistoria = null
      updateData.dataCampo = null
    }

    // ── Campo define data (dataCampo) ─────────────────────────────────────
    if (dataCampo !== undefined && PODE_DEFINIR_DATA_CAMPO.includes(user.role)) {
      updateData.dataCampo = dataCampo ? new Date(dataCampo) : null
      if (dataCampo) {
        updateData.statusVistoria = 'AGENDADA'
        updateData.prazo = new Date(dataCampo) // sincroniza prazo com data de campo

        // Notifica equipe operacional do projeto
        const projeto = tarefaAtual.projeto
        if (projeto) {
          const projetoCompleto = await prisma.projeto.findUnique({
            where: { id: projeto.id },
            select: { responsavelId: true, supervisorId: true, gestorResponsavelId: true }
          })
          const notificar = [
            projetoCompleto?.responsavelId,
            projetoCompleto?.supervisorId,
            projetoCompleto?.gestorResponsavelId,
          ].filter(Boolean) as string[]

          // Notifica também gestores operacionais
          const gestoresOp = await prisma.usuario.findMany({
            where: { ativo: true, role: { in: ['GESTOR_OPERACIONAL', 'ADMIN', 'GESTOR_GERAL'] } },
            select: { id: true },
          })
          const todos = [...new Set([...notificar, ...gestoresOp.map(g => g.id)])]

          if (todos.length > 0) {
            await prisma.notificacao.createMany({
              data: todos.map(uid => ({
                usuarioId: uid,
                titulo: '✅ Vistoria agendada pelo setor de campo',
                mensagem: `A tarefa "${tarefaAtual.titulo}" do projeto ${projeto.codigo} foi agendada para ${new Date(dataCampo).toLocaleDateString('pt-BR')}.`,
                tipo: 'sucesso',
                link: `/operacional/${projeto.id}`,
              })),
            })
          }
        }
      } else {
        // Campo removeu a data → volta para SOLICITADA
        updateData.statusVistoria = 'SOLICITADA'
        updateData.prazo = null
      }
    }

    const tarefa = await prisma.tarefa.update({
      where: { id },
      data: updateData,
      include: { responsavel: { select: { id: true, nome: true } } }
    })

    return NextResponse.json({ tarefa })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
