import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

// ── Organização padrão de pastas ─────────────────────────────
// tipo=pagamento  → /uploads/pagamentos/{projetoId}/
// tipo=documento  → /uploads/projetos/{projetoId}/documentos/
// tipo=vistoria   → /uploads/vistorias/{entidadeId}/
// tipo=tarefa     → /uploads/tarefas/{entidadeId}/
// (default)       → /uploads/geral/
function resolverPasta(
  tipo: string,
  projetoId: string | null,
  entidadeId: string | null,
): string {
  switch (tipo) {
    case 'pagamento':
      return projetoId ? `pagamentos/${projetoId}` : 'pagamentos/geral'
    case 'vistoria':
      return entidadeId ? `vistorias/${entidadeId}` : 'vistorias/geral'
    case 'tarefa':
      return entidadeId ? `tarefas/${entidadeId}` : 'tarefas/geral'
    case 'documento':
    case 'projeto':
    default:
      return projetoId ? `projetos/${projetoId}/documentos` : 'geral'
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const formData   = await request.formData()
    const arquivo    = formData.get('arquivo')   as File   | null
    const projetoId  = formData.get('projetoId') as string | null
    const entidadeId = formData.get('entidadeId') as string | null  // tarefaId ou vistoriaId
    const tipo       = (formData.get('tipo')      as string) || 'documento'
    const categoria  = (formData.get('categoria') as string) || 'GERAL'

    if (!arquivo) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    // Valida extensão
    const extensoesPermitidas = ['.pdf', '.kml', '.kmz', '.jpg', '.jpeg', '.png', '.tif', '.tiff', '.zip', '.xlsx', '.xls', '.xml']
    const nomeArquivo         = arquivo.name.toLowerCase()
    if (!extensoesPermitidas.some(ext => nomeArquivo.endsWith(ext))) {
      return NextResponse.json({
        error: 'Tipo de arquivo não permitido. Use: PDF, KML, KMZ, imagens, ZIP ou Excel',
      }, { status: 400 })
    }

    // Limita a 50 MB
    if (arquivo.size > 50 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 50MB.' }, { status: 400 })
    }

    // Resolve pasta e cria diretório
    const subpasta        = resolverPasta(tipo, projetoId, entidadeId)
    const dir             = join(process.cwd(), 'public', 'uploads', subpasta)
    await mkdir(dir, { recursive: true })

    // Nome único
    const timestamp       = Date.now()
    const nomeSeguro      = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const nomeArquivoFinal = `${timestamp}_${nomeSeguro}`
    const caminho         = join(dir, nomeArquivoFinal)

    // Salva arquivo
    const bytes = await arquivo.arrayBuffer()
    await writeFile(caminho, Buffer.from(bytes))

    const url = `/uploads/${subpasta}/${nomeArquivoFinal}`

    // Registra documento no banco (quando vinculado a projeto)
    let documento = null
    if (projetoId || entidadeId) {
      const tarefaId   = tipo === 'tarefa'   ? (entidadeId ?? undefined) : undefined
      const vistoriaId = tipo === 'vistoria' ? (entidadeId ?? undefined) : undefined

      documento = await prisma.documento.create({
        data: {
          nome: arquivo.name,
          tipo: arquivo.type || 'application/octet-stream',
          categoria,
          url,
          tamanho: arquivo.size,
          ...(projetoId  && { projetoId }),
          ...(tarefaId   && { tarefaId }),
          ...(vistoriaId && { vistoriaId }),
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
