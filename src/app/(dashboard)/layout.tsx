import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { verifyToken } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { DashboardShell } from '@/components/layout/DashboardShell'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Lê e verifica o token diretamente no servidor
  const cookieStore = cookies()
  const token = cookieStore.get('ecdise_token')?.value

  if (!token) {
    redirect('/login')
  }

  const payload = verifyToken(token)
  if (!payload) {
    redirect('/login')
  }

  // Busca dados atualizados do usuário
  const usuario = await prisma.usuario.findUnique({
    where: { id: payload.id },
    select: {
      id: true,
      nome: true,
      email: true,
      cargo: true,
      role: true,
      departamento: true,
      modulosAcesso: true,
      ativo: true,
    },
  })

  if (!usuario || !usuario.ativo) {
    redirect('/login')
  }

  return (
    <DashboardShell usuario={usuario}>
      {children}
    </DashboardShell>
  )
}
