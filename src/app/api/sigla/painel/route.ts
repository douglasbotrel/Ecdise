import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { exigirModulo } from '@/lib/permissoes'
import { lerCredenciais } from '@/lib/credenciais'

/**
 * GET /api/sigla/painel
 * Painel do Robô SIGLA (aba Acompanhamento → Robô SIGLA).
 *
 * É só LEITURA e é ADICIONAL: mostra o que o sigla_checker.py encontrou no
 * SIGLA, sem alterar a categorização manual de pendências do Acompanhamento.
 *
 * Usa o histórico (logs_sigla) em vez de só ultimaConsultaSIGLA, porque esse
 * campo também é atualizado quando a consulta falha — aqui separamos
 * "última leitura com sucesso" de "última tentativa".
 */

type Situacao = 'EXIGENCIA' | 'OK' | 'ERRO' | 'NAO_VERIFICADO' | 'SEM_CREDENCIAL'

function temExigencia(status: string | null | undefined) {
  return !!status && status.includes('Em exigência')
}

export async function GET() {
  const auth = await exigirModulo('acompanhamento')
  if (auth instanceof NextResponse) return auth

  try {
    const projetos = await prisma.projeto.findMany({
      where: { emAcompanhamento: true, excluido: false },
      select: {
        id: true,
        codigo: true,
        imovelNome: true,
        municipio: true,
        tipoServico: true,
        caminhoSIGLA: true,
        protocoloCodigoOrgao: true,
        credenciais: true,
        statusSIGLA: true,
        cliente: { select: { nome: true } },
        pendencias: { where: { status: 'ABERTA' }, select: { id: true } },
        logsSigla: {
          orderBy: { consultadoEm: 'desc' },
          take: 60,
          select: { statusNovo: true, erro: true, consultadoEm: true },
        },
      },
    })

    const agora = Date.now()

    const itens = projetos.map(p => {
      const cred = lerCredenciais(p.credenciais)
      const sigla = cred['SIGLA'] ?? cred['sigla']
      const temCredencial = !!(sigla?.login && (sigla?.senha || sigla?.temSenha))

      const logs = p.logsSigla
      const ultimaTentativa = logs[0] ?? null
      const sucessos = logs.filter(l => !l.erro && l.statusNovo !== 'ERRO')
      const ultimoSucesso = sucessos[0] ?? null

      // Desde quando o status atual se mantém (sequência de leituras iguais)
      let desde: Date | null = null
      if (ultimoSucesso) {
        desde = ultimoSucesso.consultadoEm
        for (const l of sucessos) {
          if (l.statusNovo !== ultimoSucesso.statusNovo) break
          desde = l.consultadoEm
        }
      }

      const statusLido = ultimoSucesso?.statusNovo ?? null
      const falhouDepois = !!ultimaTentativa && ultimaTentativa !== ultimoSucesso && !!ultimaTentativa.erro

      let situacao: Situacao
      if (!temCredencial || !p.protocoloCodigoOrgao) situacao = 'SEM_CREDENCIAL'
      else if (statusLido) situacao = temExigencia(statusLido) ? 'EXIGENCIA' : 'OK'
      else if (ultimaTentativa?.erro) situacao = 'ERRO'
      else situacao = 'NAO_VERIFICADO'

      const diasDesdeLeitura = ultimoSucesso
        ? Math.floor((agora - ultimoSucesso.consultadoEm.getTime()) / 86_400_000)
        : null

      return {
        id: p.id,
        codigo: p.codigo,
        cliente: p.cliente?.nome ?? null,
        imovelNome: p.imovelNome,
        municipio: p.municipio,
        tipoServico: p.tipoServico,
        caminhoSIGLA: p.caminhoSIGLA,
        protocolo: p.protocoloCodigoOrgao,
        situacao,
        statusLido,                       // ex: "Constituído processo | 🔴 Em exigência"
        situacaoProcesso: statusLido ? statusLido.split('|')[0].trim() : null,
        lidoEm: ultimoSucesso?.consultadoEm ?? null,
        desde,
        diasDesdeLeitura,
        desatualizado: diasDesdeLeitura !== null && diasDesdeLeitura >= 3,
        ultimaTentativaEm: ultimaTentativa?.consultadoEm ?? null,
        ultimoErro: falhouDepois || situacao === 'ERRO' ? ultimaTentativa?.erro ?? null : null,
        pendenciasAbertasRegistradas: p.pendencias.length,
        temCredencial,
      }
    })

    const ultimaRodada = itens.reduce<Date | null>((max, i) => {
      const t = i.ultimaTentativaEm
      return t && (!max || t > max) ? t : max
    }, null)

    return NextResponse.json({ itens, ultimaRodada })
  } catch (err) {
    console.error('[SIGLA] Erro ao montar painel:', err)
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
