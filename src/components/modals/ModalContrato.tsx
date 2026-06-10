'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X, Loader2 } from 'lucide-react'

interface ModalContratoProps {
  open: boolean
  onClose: () => void
  onSalvo: () => void
}

export function ModalContrato({ open, onClose, onSalvo }: ModalContratoProps) {
  const [projetos, setProjetos] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState({
    projetoId: '', clienteId: '', tipoContrato: 'Serviço Ambiental',
    dataAssinatura: '', dataVencimento: '',
    valorTotal: '', valorSinal: '', numeroParcelas: '1',
    observacoes: '',
  })

  useEffect(() => {
    if (open) {
      loadProjetos()
      setForm({
        projetoId: '', clienteId: '', tipoContrato: 'Serviço Ambiental',
        dataAssinatura: '', dataVencimento: '',
        valorTotal: '', valorSinal: '', numeroParcelas: '1',
        observacoes: '',
      })
    }
  }, [open])

  async function loadProjetos() {
    const res = await fetch('/api/projetos?statusComercial=ACEITO&limit=100')
    if (res.ok) {
      const data = await res.json()
      setProjetos(data.projetos.filter((p: any) => !p.contrato))
    }
  }

  function handleChange(field: string, value: string) {
    setForm(prev => {
      const next = { ...prev, [field]: value }
      if (field === 'projetoId') {
        const proj = projetos.find(p => p.id === value)
        if (proj) {
          next.clienteId = proj.clienteId
          next.valorTotal = proj.valorProposto?.toString() || ''
        }
      }
      return next
    })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.projetoId || !form.valorTotal) {
      toast.error('Projeto e valor são obrigatórios')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/contratos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Erro ao criar contrato')
        return
      }
      toast.success('Contrato criado com parcelas geradas!')
      onSalvo()
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const proj = projetos.find(p => p.id === form.projetoId)
  const vTotal = parseFloat(form.valorTotal || '0')
  const vSinal = parseFloat(form.valorSinal || '0')
  const nParcelas = parseInt(form.numeroParcelas || '1')
  const vRestante = vTotal - vSinal
  const vParcela = nParcelas > 0 ? vRestante / nParcelas : 0

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 z-10">
          <h2 className="text-lg font-semibold text-gray-900">Novo Contrato</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Projeto */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Projeto (aceito) *</label>
            <select
              value={form.projetoId}
              onChange={(e) => handleChange('projetoId', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
              required
            >
              <option value="">Selecione um projeto...</option>
              {projetos.map(p => (
                <option key={p.id} value={p.id}>
                  {p.codigo} — {p.cliente?.nome} — {p.tipoServico}
                </option>
              ))}
            </select>
            {proj && (
              <p className="text-xs text-gray-400 mt-1">
                Cliente: {proj.cliente?.nome} | Município: {proj.municipio}
              </p>
            )}
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Contrato</label>
            <input
              type="text"
              value={form.tipoContrato}
              onChange={(e) => handleChange('tipoContrato', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
            />
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de Assinatura</label>
              <input
                type="date"
                value={form.dataAssinatura}
                onChange={(e) => handleChange('dataAssinatura', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Data de Vencimento</label>
              <input
                type="date"
                value={form.dataVencimento}
                onChange={(e) => handleChange('dataVencimento', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>

          {/* Valores */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor Total R$ *</label>
              <input
                type="number"
                step="0.01"
                value={form.valorTotal}
                onChange={(e) => handleChange('valorTotal', e.target.value)}
                placeholder="0,00"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Sinal R$</label>
              <input
                type="number"
                step="0.01"
                value={form.valorSinal}
                onChange={(e) => handleChange('valorSinal', e.target.value)}
                placeholder="0,00"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nº Parcelas</label>
              <input
                type="number"
                min="1"
                value={form.numeroParcelas}
                onChange={(e) => handleChange('numeroParcelas', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>

          {/* Preview financeiro */}
          {vTotal > 0 && (
            <div className="bg-green-50 rounded-xl p-4 space-y-1">
              <p className="text-xs font-semibold text-green-700 mb-2">Resumo do parcelamento:</p>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Sinal:</span>
                <span className="font-medium">R$ {vSinal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>Restante:</span>
                <span className="font-medium">R$ {vRestante.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs text-gray-600">
                <span>{nParcelas}x de:</span>
                <span className="font-medium">R$ {vParcela.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Observações */}
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
              Criar Contrato
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
