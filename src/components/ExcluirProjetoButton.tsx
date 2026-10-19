'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { toast } from 'sonner'
import { Trash2, Loader2, X, AlertTriangle } from 'lucide-react'
import { useLockBodyScroll } from '@/hooks/useLockBodyScroll'

interface Props {
  projetoId: string
  codigo: string
  nome?: string
  /** Chamado depois que o projeto foi excluído (ex: voltar para a lista / recarregar). */
  onDeleted: () => void
  /** compact = só o ícone (usado dentro de cards); padrão = ícone + texto. */
  compact?: boolean
}

// Botão "Excluir projeto" — só aparece para ADMIN. Abre um popup pedindo o
// motivo (obrigatório) e faz a exclusão lógica: o projeto some das telas, mas
// o registro (motivo, quem e quando) fica guardado para auditoria.
// O servidor também confere (DELETE /api/projetos/[id] só aceita ADMIN).
export default function ExcluirProjetoButton({ projetoId, codigo, nome, onDeleted, compact }: Props) {
  const [isAdmin, setIsAdmin] = useState(false)
  const [open, setOpen] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [excluindo, setExcluindo] = useState(false)
  useLockBodyScroll(open)

  useEffect(() => {
    let vivo = true
    fetch('/api/auth/me')
      .then(r => r.json())
      .then(d => { if (vivo) setIsAdmin((d.usuario || d)?.role === 'ADMIN') })
      .catch(() => {})
    return () => { vivo = false }
  }, [])

  if (!isAdmin) return null

  async function excluir() {
    if (!motivo.trim()) { toast.error('Informe o motivo da exclusão'); return }
    setExcluindo(true)
    try {
      const res = await fetch(`/api/projetos/${projetoId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ motivo: motivo.trim() }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erro ao excluir o projeto')
        return
      }
      toast.success(`Projeto ${codigo} excluído`)
      setOpen(false)
      setMotivo('')
      onDeleted()
    } catch {
      toast.error('Erro ao excluir o projeto')
    } finally {
      setExcluindo(false)
    }
  }

  const abrir = (e: React.MouseEvent) => {
    e.preventDefault()   // não deixa o clique "vazar" pro card/link por baixo
    e.stopPropagation()
    setOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={abrir}
        title="Excluir projeto (somente Administrador)"
        className={compact
          ? 'p-1.5 text-gray-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors'
          : 'flex items-center gap-1.5 px-3 py-2 text-red-600 hover:bg-red-50 border border-red-200 rounded-xl text-sm font-medium transition-colors flex-shrink-0'}
      >
        <Trash2 className="w-4 h-4" />
        {!compact && 'Excluir projeto'}
      </button>

      {open && typeof document !== 'undefined' && createPortal(
        <div
          className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4"
          onClick={e => { e.stopPropagation(); if (!excluindo) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-panel" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4 border-b border-red-100 bg-red-50 sticky top-0">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600" />
                <div>
                  <p className="font-bold text-gray-900">Excluir projeto</p>
                  <p className="text-xs text-red-700 font-medium">Ação exclusiva do Administrador</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} disabled={excluindo} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="bg-gray-50 rounded-xl p-3 text-sm">
                <span className="font-mono text-gray-500 mr-2">{codigo}</span>
                <span className="font-semibold text-gray-900">{nome}</span>
              </div>
              <p className="text-xs text-gray-500 leading-relaxed">
                O projeto some de todas as listas, mas fica guardado no sistema com o motivo, a data e quem excluiu.
              </p>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                  Motivo da exclusão <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  rows={3}
                  autoFocus
                  placeholder="Ex: cliente desistiu, cadastro duplicado..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            </div>

            <div className="px-5 py-4 border-t border-gray-100 flex gap-3 justify-end sticky bottom-0 bg-white">
              <button
                onClick={() => setOpen(false)}
                disabled={excluindo}
                className="px-4 py-2.5 text-sm font-medium text-gray-600 border border-gray-200 rounded-xl hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                onClick={excluir}
                disabled={excluindo || !motivo.trim()}
                className="flex items-center gap-2 px-5 py-2.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl"
              >
                {excluindo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                Excluir
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
