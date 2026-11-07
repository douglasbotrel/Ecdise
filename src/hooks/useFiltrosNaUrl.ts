'use client'

import { useEffect, useRef } from 'react'

// lembrarEm: chave do sessionStorage onde a URL da lista fica salva (ver urlLembrada).
// Mantém filtros da lista na URL (?busca=...&etapa=...): ao abrir um registro e
// voltar, ou ao compartilhar o link, a lista reabre no mesmo contexto.
//   useFiltrosNaUrl({ busca: [search, setSearch], etapa: [filtro, setFiltro] })
export function useFiltrosNaUrl(campos: Record<string, [string, (v: string) => void]>, lembrarEm?: string) {
  const carregou = useRef(false)

  // 1) Ao montar, lê a URL
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    for (const [chave, [, set]] of Object.entries(campos)) {
      const v = params.get(chave)
      if (v !== null) set(v)
    }
    carregou.current = true
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 2) A cada mudança, atualiza a URL sem recarregar nem criar entrada no histórico
  const valores = Object.values(campos).map(([v]) => v)
  useEffect(() => {
    if (!carregou.current) return
    const params = new URLSearchParams(window.location.search)
    for (const [chave, [v]] of Object.entries(campos)) {
      if (v) params.set(chave, v)
      else params.delete(chave)
    }
    const qs = params.toString()
    const url = window.location.pathname + (qs ? `?${qs}` : '')
    if (url !== window.location.pathname + window.location.search) {
      window.history.replaceState(window.history.state, '', url)
    }
    // Guarda a URL da lista para o botão Voltar da tela de detalhe
    if (lembrarEm) { try { sessionStorage.setItem(lembrarEm, url) } catch {} }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, valores)
}

// URL da lista guardada por useFiltrosNaUrl(..., chave), ou o padrão.
export function urlLembrada(chave: string, padrao: string): string {
  try {
    const v = sessionStorage.getItem(chave)
    if (v && v.startsWith(padrao)) return v
  } catch {}
  return padrao
}
