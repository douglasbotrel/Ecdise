'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Pencil, Save, Loader2 } from 'lucide-react'

interface Props {
  tarefaId:      string
  currentTitulo: string   // título completo, como salvo no banco (pode ter prefixo "[Serviço] ")
  podeEditar:    boolean  // apenas ADMIN — corrige nomes digitados errado (ex: "Protcolo SEMA")
  onSaved:       () => void
}

export default function TituloEditor({ tarefaId, currentTitulo, podeEditar, onSaved }: Props) {
  const [editMode, setEditMode] = useState(false)
  const [texto, setTexto]       = useState('')
  const [saving, setSaving]     = useState(false)

  if (!podeEditar) return null

  // Preserva o prefixo "[Serviço] " (usado para agrupar as tarefas por
  // serviço contratado) — a edição mexe só na parte visível do título.
  const m           = currentTitulo.match(/^\[([^\]]+)\]\s*(.+)$/)
  const prefixo     = m ? `[${m[1]}] ` : ''
  const tituloLimpo = m ? m[2] : currentTitulo

  async function salvar() {
    const novoLimpo = texto.trim()
    if (!novoLimpo) { toast.error('O título não pode ficar vazio'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/tarefas', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: tarefaId, titulo: `${prefixo}${novoLimpo}` }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        toast.error(d.error || 'Erro ao renomear a tarefa')
        return
      }
      toast.success('Título atualizado')
      setEditMode(false)
      onSaved()
    } catch {
      toast.error('Erro ao renomear a tarefa')
    } finally {
      setSaving(false)
    }
  }

  if (!editMode) {
    return (
      <button
        onClick={() => { setTexto(tituloLimpo); setEditMode(true) }}
        className="mt-1 flex items-center gap-1 text-xs text-gray-300 hover:text-gray-500 transition-colors"
        title="Editar título (apenas ADM — corrige nomes digitados errado, ex: 'Protcolo')"
      >
        <Pencil className="w-3 h-3" /> Editar título
      </button>
    )
  }

  return (
    <div className="mt-1.5 flex items-center gap-1.5">
      <input
        type="text"
        value={texto}
        onChange={e => setTexto(e.target.value)}
        className="flex-1 min-w-0 text-xs px-2 py-1 border border-blue-200 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-300"
        autoFocus
        onKeyDown={e => {
          if (e.key === 'Enter') salvar()
          if (e.key === 'Escape') setEditMode(false)
        }}
      />
      <button
        onClick={salvar}
        disabled={saving}
        className="flex items-center gap-1 px-2 py-1 bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-xs rounded-md font-medium transition-colors flex-shrink-0"
      >
        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
      </button>
      <button
        onClick={() => setEditMode(false)}
        className="px-2 py-1 text-xs text-gray-400 hover:text-gray-600 border border-gray-200 hover:bg-gray-50 rounded-md transition-colors flex-shrink-0"
      >
        Cancelar
      </button>
    </div>
  )
}
