import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const formData = await request.formData()
    const arquivo = formData.get('arquivo') as File | null
    const projetoId = formData.get('projetoId') as string | null
    const categoria = (formData.get('categoria') as string) || 'GERAL'

    if (!arquivo) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Valida tipo de arquivo
    const tiposPermitidos = [
      'application/pdf', 'application/vnd.google-earth.kml+xml',
      'application/octet-stream', 'image/jpeg', 'image/png',
      'image/tiff', 'application/zip', 'text/xml',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ]
    // KML e outros formatos geoespaciais têm MIME variável — aceita por extensão também
    const extensoesPermitidas = ['.pdf', '.kml', '.kmz', '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.zip', '.xlsx', '.xls', '.xml']
    const nomeArquivo = arquivo.name.toLowerCase()
    const extensaoValida = extensoesPermitidas.some(ext => nomeArquivo.endsWith(ext))

    if (!extensaoValida) {
      return NextResponse.json({
        error: 'Tipo de arquivo não permitido. Use: PDF, KML, KMZ, imagens, ZIP ou Excel'
      }, { status: 400 })
    }

    // Limita tamanho: 50MB
    if (arquivo.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 50MB.' }, { status: 400 })
    }

    // Cria diretório
    const pasta = projetoId ? `projeto-${projetoId}` : 'geral'
    const dir = join(process.cwd(), 'public', 'uploads', pasta)
    await mkdir(dir, { recursive: true })

    // Nome único para evitar colisão
    const timestamp = Date.now()
    const nomeSeguro = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const nomeArquivoFinal = `${timestamp}_${nomeSeguro}`
    const caminho = join(dir, nomeArquivoFinal)

    // Salva arquivo
    const bytes = await arquivo.arrayBuffer()
    await writeFile(caminho, Buffer.from(bytes))

    const url = `/uploads/${pasta}/${nomeArquivoFinal}`

    // Registra documento no banco (se houver projetoId)
    let documento = null
    if (projetoId) {
      documento = await prisma.documento.create({
        data: {
          nome: arquivo.name,
          tipo: arquivo.type || 'application/octet-stream',
          categoria,
          url,
          tamanho: arquivo.size,
          projetoId,
          uploadadoPor: user.id,
        },
      })
    }

    return NextResponse.json({
      url,
      nome: arquivo.name,
      tamanho: arquivo.size,
      documentoId: documento?.id,
    }, { status: 201 })
  } catch (error) {
    console.error('Erro no upload:', error)
    return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 })
  }
}
