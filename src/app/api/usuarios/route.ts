import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser, hashPassword, hasPermission } from '@/lib/auth'

<<<<<<< HEAD
=======
// Valida complexidade mínima de senha
function validarSenha(senha: string): string | null {
  if (senha.length < 8)           return 'A senha deve ter pelo menos 8 caracteres'
  if (!/[A-Z]/.test(senha))       return 'A senha deve conter pelo menos uma letra maiúscula'
  if (!/[0-9]/.test(senha))       return 'A senha deve conter pelo menos um número'
  return null
}

>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const role = searchParams.get('role')
    const departamento = searchParams.get('departamento')
    const ativo = searchParams.get('ativo')

    const where: any = {}
    if (role) where.role = role
    if (departamento) where.departamento = departamento
<<<<<<< HEAD
    if (ativo !== null) where.ativo = ativo === 'true'
=======
    if (ativo !== null && ativo !== undefined) where.ativo = ativo === 'true'
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce

    const usuarios = await prisma.usuario.findMany({
      where,
      select: {
        id: true, nome: true, email: true, cargo: true,
        role: true, departamento: true, ativo: true, criadoEm: true,
        _count: { select: { projetosResponsavel: true } }
      },
      orderBy: { nome: 'asc' }
    })

    return NextResponse.json({ usuarios })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
    if (!hasPermission(user.role, 'GESTOR_GERAL')) {
      return NextResponse.json({ error: 'Sem permissão para criar usuários' }, { status: 403 })
    }

    const body = await request.json()
<<<<<<< HEAD
    const { nome, email, senha, cargo, role, departamento, telefone } = body
=======
    const { nome, email, senha, cargo, role, departamento, telefone, modulosAcesso } = body
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce

    if (!nome || !email || !senha) {
      return NextResponse.json({ error: 'Nome, email e senha são obrigatórios' }, { status: 400 })
    }

<<<<<<< HEAD
    const existing = await prisma.usuario.findUnique({ where: { email } })
=======
    // Valida complexidade da senha
    const erroSenha = validarSenha(senha)
    if (erroSenha) {
      return NextResponse.json({ error: erroSenha }, { status: 400 })
    }

    // Valida formato de email básico
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: 'Formato de email inválido' }, { status: 400 })
    }

    const existing = await prisma.usuario.findUnique({ where: { email: email.toLowerCase().trim() } })
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
    if (existing) {
      return NextResponse.json({ error: 'Email já cadastrado' }, { status: 409 })
    }

    const senhaHash = await hashPassword(senha)
    const usuario = await prisma.usuario.create({
      data: {
<<<<<<< HEAD
        nome,
=======
        nome: nome.trim(),
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
        email: email.toLowerCase().trim(),
        senha: senhaHash,
        cargo,
        role: role || 'ANALISTA',
        departamento: departamento || 'OPERACIONAL_AMBIENTAL',
        telefone,
<<<<<<< HEAD
=======
        modulosAcesso: modulosAcesso || null,
>>>>>>> aeffdf8f4107775208bdb5b34f82c4a7a6681bce
        ativo: true,
      },
      select: {
        id: true, nome: true, email: true, cargo: true,
        role: true, departamento: true, ativo: true
      }
    })

    await prisma.log.create({
      data: { usuarioId: user.id, acao: 'CRIAR_USUARIO', entidade: 'Usuario', entidadeId: usuario.id }
    })

    return NextResponse.json({ usuario }, { status: 201 })
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
