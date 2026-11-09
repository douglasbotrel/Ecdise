'use client'

// Aba "Robô SIGLA" — painel ADICIONAL do Acompanhamento.
// Mostra o que o sigla_checker.py leu no SIGLA (SEMA-MA). Não altera nada nas
// pendências registradas manualmente: serve para saber em quais processos vale
// entrar no SIGLA para baixar documentos e listar os pedidos.

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { toast } from 'sonner'
import {
  ArrowLeft, Bot, RefreshCw, Search, AlertTriangle, CheckCircle2,
  XCircle, KeyRound, ChevronRight, Copy, Clock, ChevronDown,
} from 'lucide-react'

type Situacao = 'EXIGENCIA' | 'OK' | 'ERRO' | 'NAO_VERIFICADO' | 'SEM_CREDENCIAL'

interface Item {
  id: string
  codigo: string
  cliente: string | null
  imovelNome: string | null
  municipio: string | null
  tipoServico: string | null
  caminhoSIGLA: string | null
  protocolo: string | null
  situacao: Situacao
  statusLido: string | null
  situacaoProcesso: string | null
  lidoEm: string | null
  desde: string | null
  diasDesdeLeitura: number | null
  desatualizado: boolean
  ultimaTentativaEm: string | null
  ultimoErro: string | null
  pendenciasAbertasRegistradas: number
  temCredencial: boolean
}

const SECAO_LABEL: Record<string, string> = {
  licenciamento_ambiental: 'Licenciamento ambiental',
  recursos_florestais: 'Recursos florestais',
  recursos_hidricos: 'Recursos hídricos',
}

function dataHora(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  })
}

function dataCurta(dt: string | null) {
  if (!dt) return '—'
  return new Date(dt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

function diasDesde(dt: string | null) {
  if (!dt) return null
  return Math.max(0, Math.floor((Date.now() - new Date(dt).getTime()) / 86_400_000))
}

function copiar(texto: string) {
  navigator.clipboard?.writeText(texto)
    .then(() => toast.success(`Copiado: ${texto}`))
    .catch(() => toast.error('Não foi possível copiar'))
}

export default function RoboSiglaPage() {
  const [itens, setItens] = useState<Item[]>([])
  const [ultimaRodada, setUltimaRodada] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [mostrarOk, setMostrarOk] = useState(false)
  const [mostrarFora, setMostrarFora] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/sigla/painel')
      if (!res.ok) throw new Error()
      const data = await res.json()
      setItens(data.itens || [])
      setUltimaRodada(data.ultimaRodada || null)
    } catch {
      toast.error('Erro ao carregar o painel do robô')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const q = search.trim().toLowerCase()
  const visiveis = itens.filter(i => !q || [i.codigo, i.cliente, i.imovelNome, i.municipio, i.protocolo]
    .some(v => v?.toLowerCase().includes(q)))

  const exigencias = visiveis
    .filter(i => i.situacao === 'EXIGENCIA')
    // Primeiro as que ainda não foram registradas no Ecdise; depois as mais recentes
    .sort((a, b) => (a.pendenciasAbertasRegistradas > 0 ? 1 : 0) - (b.pendenciasAbertasRegistradas > 0 ? 1 : 0)
      || new Date(b.desde || 0).getTime() - new Date(a.desde || 0).getTime())
  const comErro = visiveis.filter(i => i.situacao === 'ERRO' || i.situacao === 'NAO_VERIFICADO' ||
    (i.ultimoErro && i.situacao !== 'SEM_CREDENCIAL'))
  const ok = visiveis.filter(i => i.situacao === 'OK')
  const fora = visiveis.filter(i => i.situacao === 'SEM_CREDENCIAL')

  const naoRegistradas = itens.filter(i => i.situacao === 'EXIGENCIA' && i.pendenciasAbertasRegistradas === 0).length
  const totalExig = itens.filter(i => i.situacao === 'EXIGENCIA').length
  const totalOk = itens.filter(i => i.situacao === 'OK').length
  const totalErro = itens.filter(i => i.situacao === 'ERRO' || i.situacao === 'NAO_VERIFICADO' ||
    (i.ultimoErro && i.situacao !== 'SEM_CREDENCIAL')).length
  const diasRodada = diasDesde(ultimaRodada)

  return (
    <div className="space-y-5">

      {/* ── Header ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start gap-3">
        <div className="flex-1">
          <Link href="/acompanhamento" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-green-700">
            <ArrowLeft className="w-4 h-4" /> Acompanhamento
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 mt-1 flex items-center gap-2">
            <Bot className="w-6 h-6 text-green-600" /> Robô SIGLA
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            O que o robô leu no SIGLA (SEMA-MA). É só uma consulta de apoio: não muda as pendências registradas no Acompanhamento.
          </p>
        </div>
        <button
          onClick={load}
          className="flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 transition-colors bg-white"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Atualizar
        </button>
      </div>

      {/* ── Última rodada ─────────────────────────────── */}
      {!loading && (
        <div className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-2 ${
          diasRodada === null || diasRodada >= 3
            ? 'bg-amber-50 border-amber-200 text-amber-800'
            : 'bg-white border-gray-100 text-gray-600'
        }`}>
          <Clock className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>
            {ultimaRodada
              ? <>Última rodada do robô: <strong>{dataHora(ultimaRodada)}</strong>
                  {diasRodada !== null && diasRodada >= 3 && <> — há {diasRodada} dias. Os dados abaixo podem estar desatualizados.</>}
                </>
              : <>O robô ainda não rodou para estes processos.</>}
            {' '}O robô roda no computador do escritório (<code className="text-xs">sigla_checker\verificar_agora.bat</code>).
          </span>
        </div>
      )}

      {/* ── Resumo ───────────────────────────────────── */}
      {!loading && itens.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="bg-red-50 rounded-xl border border-red-100 p-4 text-center">
            <p className="text-2xl font-bold text-red-600">{totalExig}</p>
            <p className="text-xs text-red-500 mt-0.5">Em exigência no SIGLA</p>
          </div>
          <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">{naoRegistradas}</p>
            <p className="text-xs text-orange-600 mt-0.5">Exigência ainda não registrada</p>
          </div>
          <div className="bg-green-50 rounded-xl border border-green-100 p-4 text-center">
            <p className="text-2xl font-bold text-green-600">{totalOk}</p>
            <p className="text-xs text-green-600 mt-0.5">Sem pendências</p>
          </div>
          <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-700">{totalErro}</p>
            <p className="text-xs text-gray-500 mt-0.5">Robô não conseguiu ler</p>
          </div>
        </div>
      )}

      {/* ── Busca ────────────────────────────────────── */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por cliente, imóvel, código ou nº do processo..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
        />
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-8 h-8 border-4 border-green-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* ── Em exigência ──────────────────────────── */}
          <Secao
            icone={<AlertTriangle className="w-4 h-4 text-red-500" />}
            titulo="Em exigência no SIGLA"
            qtd={exigencias.length}
            cor="red"
          >
            {exigencias.length === 0 ? (
              <Vazio texto="Nenhum processo em exigência na última leitura." />
            ) : exigencias.map(i => (
              <Linha key={i.id} item={i}>
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="text-red-700 font-semibold">🔴 Em exigência</span>
                  {i.desde && <span className="text-gray-500">desde {dataCurta(i.desde)} ({diasDesde(i.desde)}d)</span>}
                  {i.pendenciasAbertasRegistradas > 0 ? (
                    <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">
                      Já registrada no Ecdise ({i.pendenciasAbertasRegistradas} aberta{i.pendenciasAbertasRegistradas > 1 ? 's' : ''})
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-semibold">
                      Ainda não registrada: baixar documentos e listar os pedidos
                    </span>
                  )}
                </div>
              </Linha>
            ))}
          </Secao>

          {/* ── Erros de leitura ──────────────────────── */}
          {comErro.length > 0 && (
            <Secao
              icone={<XCircle className="w-4 h-4 text-gray-500" />}
              titulo="Robô não conseguiu ler"
              qtd={comErro.length}
              cor="gray"
            >
              {comErro.map(i => (
                <Linha key={i.id} item={i}>
                  <p className="text-xs text-gray-600">
                    <span className="font-semibold">Erro em {dataHora(i.ultimaTentativaEm)}:</span> {i.ultimoErro || 'Ainda não verificado.'}
                  </p>
                  {i.statusLido && (
                    <p className="text-xs text-gray-400 mt-0.5">Última leitura boa: {i.statusLido} ({dataHora(i.lidoEm)})</p>
                  )}
                </Linha>
              ))}
            </Secao>
          )}

          {/* ── Sem pendências ───────────────────────── */}
          <Secao
            icone={<CheckCircle2 className="w-4 h-4 text-green-500" />}
            titulo="Sem pendências no SIGLA"
            qtd={ok.length}
            cor="green"
            aberto={mostrarOk}
            onToggle={() => setMostrarOk(v => !v)}
          >
            {ok.length === 0 ? <Vazio texto="Nenhum processo aqui." /> : ok.map(i => (
              <Linha key={i.id} item={i}>
                <p className="text-xs text-green-700">✅ Sem pendências</p>
              </Linha>
            ))}
          </Secao>

          {/* ── Fora do robô ─────────────────────────── */}
          {fora.length > 0 && (
            <Secao
              icone={<KeyRound className="w-4 h-4 text-gray-400" />}
              titulo="Fora do robô (sem CPF/senha do SIGLA ou sem nº do processo)"
              qtd={fora.length}
              cor="gray"
              aberto={mostrarFora}
              onToggle={() => setMostrarFora(v => !v)}
            >
              {fora.map(i => (
                <Linha key={i.id} item={i}>
                  <p className="text-xs text-gray-500">
                    {!i.temCredencial ? 'Falta cadastrar o acesso ao SIGLA (CPF + senha) no projeto.' : 'Falta o nº do processo no órgão.'}
                  </p>
                </Linha>
              ))}
            </Secao>
          )}
        </>
      )}
    </div>
  )
}

// ── Componentes ──────────────────────────────────────────────

function Secao({ icone, titulo, qtd, cor, aberto = true, onToggle, children }: {
  icone: React.ReactNode
  titulo: string
  qtd: number
  cor: 'red' | 'green' | 'gray'
  aberto?: boolean
  onToggle?: () => void
  children: React.ReactNode
}) {
  const badge = { red: 'bg-red-500', green: 'bg-green-500', gray: 'bg-gray-400' }[cor]
  const Cab = onToggle ? 'button' : 'div'
  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <Cab
        {...(onToggle ? { onClick: onToggle, type: 'button' as const } : {})}
        className="w-full px-4 py-3 border-b border-gray-100 flex items-center gap-2 text-left"
      >
        {icone}
        <h2 className="text-sm font-semibold text-gray-900">{titulo}</h2>
        <span className={`ml-auto text-xs font-bold text-white px-2 py-0.5 rounded-full ${badge}`}>{qtd}</span>
        {onToggle && <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />}
      </Cab>
      {aberto && <div className="divide-y divide-gray-50">{children}</div>}
    </div>
  )
}

function Vazio({ texto }: { texto: string }) {
  return <p className="px-4 py-6 text-center text-sm text-gray-400">{texto}</p>
}

function Linha({ item: i, children }: { item: Item; children: React.ReactNode }) {
  return (
    <div className="px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-2 hover:bg-gray-50 transition-colors">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline gap-x-2">
          <span className="font-mono text-xs text-gray-400">{i.codigo}</span>
          <span className="font-semibold text-gray-900 text-sm">{i.cliente || '—'}</span>
          {i.imovelNome && <span className="text-xs text-gray-500">· {i.imovelNome}</span>}
        </div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-xs text-gray-500">
          {i.protocolo && (
            <button
              type="button"
              onClick={() => copiar(i.protocolo!)}
              className="inline-flex items-center gap-1 font-mono hover:text-green-700"
              title="Copiar nº do processo"
            >
              Nº {i.protocolo} <Copy className="w-3 h-3" />
            </button>
          )}
          {i.caminhoSIGLA && SECAO_LABEL[i.caminhoSIGLA] && <span>{SECAO_LABEL[i.caminhoSIGLA]}</span>}
          {i.situacaoProcesso && <span>{i.situacaoProcesso}</span>}
          {i.lidoEm && (
            <span className={i.desatualizado ? 'text-amber-600 font-medium' : ''}>
              lido em {dataHora(i.lidoEm)}{i.desatualizado ? ' (desatualizado)' : ''}
            </span>
          )}
        </div>
        <div className="mt-1.5">{children}</div>
      </div>
      <Link
        href={`/acompanhamento/${i.id}`}
        className="flex items-center gap-1 text-xs font-medium text-green-600 hover:text-green-700 self-start sm:self-center flex-shrink-0"
      >
        Abrir processo <ChevronRight className="w-4 h-4" />
      </Link>
    </div>
  )
}
