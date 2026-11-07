'use client'

import { useState } from 'react'
import { toast } from 'sonner'

// Mostra uma senha de órgão mascarada. "Mostrar" busca a senha no servidor
// (rota restrita e registrada em log); ela nunca vem junto com o projeto.
export default function SenhaRevelavel({
  projetoId, sistema, temSenha, className = '',
}: {
  projetoId: string
  sistema: string
  temSenha: boolean
  className?: string
}) {
  const [senha, setSenha] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(false)

  if (!temSenha) return <span className={`text-sm font-mono text-gray-800 ${className}`}>—</span>

  async function revelar() {
    if (senha !== null) { setSenha(null); return }
    setCarregando(true)
    try {
      const res = await fetch(`/api/projetos/${projetoId}/credenciais?sistema=${encodeURIComponent(sistema)}`)
      const d = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(d.error || 'Não foi possível mostrar a senha'); return }
      setSenha(d.senha || '')
    } catch { toast.error('Não foi possível mostrar a senha') }
    finally { setCarregando(false) }
  }

  async function copiar() {
    if (senha === null) return
    try { await navigator.clipboard.writeText(senha); toast.success('Senha copiada') } catch {}
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <span className="text-sm font-mono text-gray-800">{senha ?? '••••••••'}</span>
      <button type="button" onClick={revelar} disabled={carregando}
        aria-label={senha === null ? `Mostrar senha ${sistema}` : `Ocultar senha ${sistema}`}
        className="text-xs text-green-700 hover:underline disabled:opacity-50">
        {carregando ? '...' : senha === null ? 'Mostrar' : 'Ocultar'}
      </button>
      {senha !== null && (
        <button type="button" onClick={copiar} aria-label={`Copiar senha ${sistema}`} className="text-xs text-gray-500 hover:underline">
          Copiar
        </button>
      )}
    </span>
  )
}
