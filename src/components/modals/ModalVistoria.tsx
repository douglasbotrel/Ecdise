'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X, Loader2 } from 'lucide-react'

interface ModalVistoriaProps {
  open: boolean
  onClose: () => void
  onSalvo: () => void
  projetoId?: string
}

const TIPOS_VISTORIA = [
  { value: 'VISTORIA_CAMPO', label: 'Vistoria de Campo' },
  { value: 'LICENCA_BOVINO', label: 'Licença Bovino' },
  { value: 'OUTORGA', label: 'Outorga' },
  { value: 'INVENTARIO', label: 'Inventário' },
  { value: 'REUNIAO', label: 'Reunião' },
  { value: 'OUTRO', label: 'Outro' },
]

export function ModalVistoria({ open, onClose, onSalvo, projetoId }: ModalVistoriaProps) {
  const [projetos, setProjetos] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    projetoId: projetoId || '', titulo: '', tipo: 'VISTORIA_CAMPO',
    dataAgendada: '', local: '', municipio: '', responsavelId: '',
    frota: '', observacoes: '',
  })

  useEffect(() => {
    if (open) {
      loadDados()
      setForm(prev => ({ ...prev, projetoId: projetoId || '' }))
    }
  }, [open, projetoId])

  async function loadDados() {
    const [resProjetos, resUsuarios] = await Promise.all([
      fetch('/api/projetos?limit=100'),
      fetch('/api/usuarios?ativo=true'),
    ])
    if (resProjetos.ok) setProjetos((await resProjetos.json()).projetos)
    if (resUsuarios.ok) setUsuarios((await resUsuarios.json()).usuarios)
  }

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.projetoId || !form.dataAgendada) {
      toast.error('Projeto e data são obrigatórios')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/vistorias', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          titulo: form.titulo || TIPOS_VISTORIA.find(t => t.value === form.tipo)?.label,
          responsavelId: form.responsavelId || null,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Vistoria agendada com sucesso!')
      onSalvo()
    } catch {
      toast.error('Erro ao agendar vistoria')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 z-10">
          <h2 className="text-lg font-semibold text-gray-900">Agendar Vistoria</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Projeto *</label>
            <select
              value={form.projetoId}
              onChange={(e) => handleChange('projetoId', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
              required
              disabled={!!projetoId}
            >
              <option value="">Selecione um projeto...</option>
              {projetos.map(p => (
                <option key={p.id} value={p.id}>{p.codigo} — {p.imovelNome || p.cliente?.nome}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Vistoria</label>
              <select
                value={form.tipo}
                onChange={(e) => handleChange('tipo', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
              >
                {TIPOS_VISTORIA.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Data Agendada *</label>
              <input
                type="datetime-local"
                value={form.dataAgendada}
                onChange={(e) => handleChange('dataAgendada', e.target.value)}
                min={new Date().toISOString().slice(0, 16)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Título (opcional)</label>
            <input
              type="text"
              value={form.titulo}
              onChange={(e) => handleChange('titulo', e.target.value)}
              placeholder="Deixe em branco para usar o tipo"
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Município</label>
              <input
                type="text"
                value={form.municipio}
                onChange={(e) => handleChange('municipio', e.target.value)}
                placeholder="Cidade"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Local / Endereço</label>
              <input
                type="text"
                value={form.local}
                onChange={(e) => handleChange('local', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Responsável</label>
              <select
                value={form.responsavelId}
                onChange={(e) => handleChange('responsavelId', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
              >
                <option value="">Selecione...</option>
                {usuarios.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Frota / Veículo</label>
              <input
                type="text"
                value={form.frota}
                onChange={(e) => handleChange('frota', e.target.value)}
                placeholder="Placa ou nome"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              rows={2}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} disabled={loading}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-xl text-sm flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Agendar
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
