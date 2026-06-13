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

    if (!isDriveConfigurado()) {
      return NextResponse.json({
        error: 'Armazenamento em nuvem não configurado. Configure GOOGLE_SERVICE_ACCOUNT_JSON e GOOGLE_DRIVE_ROOT_FOLDER_ID no .env e reinicie o servidor.',
      }, { status: 503 })
    }

    const formData   = await request.formData()
    const arquivo    = formData.get('arquivo')   as File   | null
    const projetoId  = formData.get('projetoId') as string | null
    const entidadeId = formData.get('entidadeId') as string | null
    const tipo       = (formData.get('tipo')      as string) || 'documento'
    const categoria  = (formData.get('categoria') as string) || 'GERAL'

    if (!arquivo) {
      return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 })
    }

    const nomeArquivo = arquivo.name.toLowerCase()
    if (!EXTENSOES_PERMITIDAS.some(ext => nomeArquivo.endsWith(ext))) {
      return NextResponse.json({
        error: `Tipo de arquivo não permitido. Use: ${EXTENSOES_PERMITIDAS.join(', ')}`,
      }, { status: 400 })
    }

    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '52428800')
    if (arquivo.size > maxSize) {
      return NextResponse.json({
        error: `Arquivo muito grande. Máximo ${Math.round(maxSize / 1024 / 1024)} MB.`,
      }, { status: 400 })
    }

    // Busca código do projeto
    let projetoCodigo = 'GERAL'
    if (projetoId) {
      const projeto = await prisma.projeto.findUnique({
        where: { id: projetoId },
        select: { codigo: true },
      })
      projetoCodigo = projeto?.codigo || 'GERAL'
    }

    const timestamp        = Date.now()
    const nomeSanitizado   = arquivo.name.replace(/[^a-zA-Z0-9._\-()]/g, '_')
    const nomeArquivoFinal = `${timestamp}_${nomeSanitizado}`

    const bytes  = await arquivo.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Upload para o Drive
    let resultado
    try {
      resultado = await uploadParaDrive({
        buffer,
        nomeArquivo:  nomeArquivoFinal,
        nomeOriginal: arquivo.name,
        mimeType:     arquivo.type || 'application/octet-stream',
        projetoCodigo,
        tipo,
      })
    } catch (driveErr: any) {
      console.error('Erro Drive:', driveErr?.message, driveErr?.code, driveErr?.errors)
      return NextResponse.json({
        error: `Erro ao enviar para o Google Drive: ${driveErr?.message || 'verifique as credenciais e o acesso à pasta'}`,
      }, { status: 500 })
    }

    // Salva no banco
    let documento = null
    if (projetoId || entidadeId) {
      const tarefaId   = tipo === 'tarefa'   ? (entidadeId ?? undefined) : undefined
      const vistoriaId = tipo === 'vistoria' ? (entidadeId ?? undefined) : undefined

      try {
        documento = await prisma.documento.create({
          data: {
            nome:        arquivo.name,
            tipo:        arquivo.type || 'application/octet-stream',
            categoria,
            url:         resultado.webViewLink,
            tamanho:     arquivo.size,
            driveFileId: resultado.fileId,
            ...(projetoId  && { projetoId }),
            ...(tarefaId   && { tarefaId }),
            ...(vistoriaId && { vistoriaId }),
            uploadadoPor: user.id,
          },
        })
      } catch (dbErr: any) {
        // Se falhar por causa da coluna driveFileId ainda não existir no banco,
        // tenta sem ela para não perder o upload já feito no Drive
        console.error('Erro DB (tentando sem driveFileId):', dbErr?.message)
        try {
          documento = await prisma.documento.create({
            data: {
              nome:        arquivo.name,
              tipo:        arquivo.type || 'application/octet-stream',
              categoria,
              url:         resultado.webViewLink,
              tamanho:     arquivo.size,
              ...(projetoId  && { projetoId }),
              ...(tarefaId   && { tarefaId }),
              ...(vistoriaId && { vistoriaId }),
              uploadadoPor: user.id,
            },
          })
        } catch (dbErr2: any) {
          console.error('Erro DB final:', dbErr2?.message)
          // Retorna sucesso do Drive mesmo que o banco falhe
          return NextResponse.json({
            url:         resultado.webViewLink,
            downloadUrl: resultado.webContentLink,
            fileId:      resultado.fileId,
            nome:        arquivo.name,
            tamanho:     arquivo.size,
            aviso:       'Arquivo enviado ao Drive mas não registrado no banco. Execute prisma db push.',
          }, { status: 201 })
        }
      }
    }

    return NextResponse.json({
      url:         resultado.webViewLink,
      downloadUrl: resultado.webContentLink,
      fileId:      resultado.fileId,
      nome:        arquivo.name,
      tamanho:     arquivo.size,
      documentoId: documento?.id,
    }, { status: 201 })

  } catch (error: any) {
    console.error('Erro geral no upload:', error?.message, error?.code)
    return NextResponse.json({
      error: `Erro ao fazer upload: ${error?.message || 'erro desconhecido'}`,
    }, { status: 500 })
  }
}
