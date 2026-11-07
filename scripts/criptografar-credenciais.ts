// Cifra as credenciais de órgãos (Projeto.credenciais) gravadas em texto puro.
//
// Uso (na sua máquina, com a DATABASE_URL e a CREDENCIAIS_KEY do cliente):
//   node scripts/criptografar-credenciais.ts            → só mostra quantos seriam cifrados
//   node scripts/criptografar-credenciais.ts --aplicar  → cifra de fato
//
// Faça backup do banco antes. A mesma CREDENCIAIS_KEY precisa estar nas
// variáveis de ambiente da Vercel desse cliente, senão o sistema não lê as senhas.

import { PrismaClient } from '@prisma/client'
import { cifrar, estaCifrado, lerCredenciais } from '../src/lib/credenciais.ts'

const aplicar = process.argv.includes('--aplicar')

if (!process.env.CREDENCIAIS_KEY) {
  console.error('Defina CREDENCIAIS_KEY antes de rodar.')
  process.exit(1)
}

const prisma = new PrismaClient()

const projetos = await prisma.projeto.findMany({
  where: { credenciais: { not: null } },
  select: { id: true, codigo: true, credenciais: true },
})

const pendentes = projetos.filter(p => p.credenciais && !estaCifrado(p.credenciais))
console.log(`${projetos.length} projeto(s) com credenciais; ${pendentes.length} em texto puro.`)

if (aplicar) {
  for (const p of pendentes) {
    const mapa = lerCredenciais(p.credenciais)
    const novo = cifrar(JSON.stringify(mapa))
    await prisma.projeto.update({ where: { id: p.id }, data: { credenciais: novo } })
    console.log(`  cifrado: ${p.codigo}`)
  }
  console.log('Concluído.')
} else if (pendentes.length) {
  console.log('Nada foi alterado. Rode de novo com --aplicar para cifrar.')
}

await prisma.$disconnect()
