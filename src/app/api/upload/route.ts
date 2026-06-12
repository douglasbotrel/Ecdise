import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { uploadParaDrive, isDriveConfigurado } from '@/lib/gdrive'

const EXTENSOES_PERMITIDAS = [
  '.pdf', '.kml', '.kmz',
  '.jpg', '.jpeg', '.png', '.tif', '.tiff',
  '.zip', '.xlsx', '.xls', '.xml', '.docx', '.doc',
]

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Verifica se o Google Drive está configurado
    if (!isDriveConfigurado()) {
      return NextResponse.json({
        error: 'Armazenamento em nuvem não configurado. Configure GOOGLE_SERVICE_ACCOUNT_JSON e GOOGLE_DRIVE_ROOT_FOLDER_ID no .env e reinicie o servidor.',
      }, { status: 503 })
    }

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
    const nomeArquivo = arquivo.name.toLowerCase()
    if (!EXTENSOES_PERMITIDAS.some(ext => nomeArquivo.endsWith(ext))) {
      return NextResponse.json({
        error: `Tipo de arquivo não permitido. Use: ${EXTENSOES_PERMITIDAS.join(', ')}`,
      }, { status: 400 })
    }

    // Limita tamanho
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800')
    if (arquivo.size > maxSize) {
      return NextResponse.json({
        error: `Arquivo muito grande. Máximo ${Math.round(maxSize / 1024 / 1024)} MB.`,
      }, { status: 400 })
    }

    // Busca código do projeto para nomear a pasta no Drive
    let projetoCodigo = 'GERAL'
    if (projetoId) {
      const projeto = await prisma.projeto.findUnique({
        where: { id: projetoId },
        select: { codigo: true },
      })
      projetoCodigo = projeto?.codigo || 'GERAL'
    }

    // Nome único do arquivo (timestamp + nome sanitizado)
    const timestamp      = Date.now()
    const nomeSanitizado = arquivo.name.replace(/[^a-zA-Z0-9._\-()]/g, '_')
    const nomeArquivoFinal = `${timestamp}_${nomeSanitizado}`

    // Converte para Buffer e faz upload no Drive
    const bytes  = await arquivo.arrayBuffer()
    const buffer = Buffer.from(bytes)

    const resultado = await uploadParaDrive({
      buffer,
      nomeArquivo:   nomeArquivoFinal,
      nomeOriginal:  arquivo.name,
      mimeType:      arquivo.type || 'application/octet-stream',
      projetoCodigo,
      tipo,
    })

    // Registra no banco (quando vinculado a projeto/entidade)
    let documento = null
    if (projetoId || entidadeId) {
      const tarefaId   = tipo === 'tarefa'   ? (entidadeId ?? undefined) : undefined
      const vistoriaId = tipo === 'vistoria' ? (entidadeId ?? undefined) : undefined

      documento = await prisma.documento.create({
        data: {
          nome:      arquivo.name,
          tipo:      arquivo.type || 'application/octet-stream',
          categoria,
          url:       resultado.webViewLink,      // URL de visualização no Drive
          tamanho:   arquivo.size,
          driveFileId: resultado.fileId,         // ID do arquivo no Drive (para exclusão futura)
          ...(projetoId  && { projetoId }),
          ...(tarefaId   && { tarefaId }),
          ...(vistoriaId && { vistoriaId }),
          uploadadoPor: user.id,
        },
      })
    }

    return NextResponse.json({
      url:             resultado.webViewLink,
      downloadUrl:     resultado.webContentLink,
      fileId:          resultado.fileId,
      nome:            arquivo.name,
      tamanho:         arquivo.size,
      documentoId:     documento?.id,
    }, { status: 201 })

  } catch (error: any) {
    console.error('Erro no upload:', error)
    // Mostra mensagem mais específica para erros de credencial
    if (error.message?.includes('GOOGLE_SERVICE_ACCOUNT_JSON') || error.message?.includes('credentials')) {
      return NextResponse.json({
        error: 'Erro de autenticação com Google Drive. Verifique as credenciais no .env.',
      }, { status: 500 })
    }
    return NextResponse.json({ error: 'Erro ao fazer upload do arquivo' }, { status: 500 })
  }
}
