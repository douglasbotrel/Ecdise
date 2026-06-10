'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X, Loader2 } from 'lucide-react'

interface ModalProjetoProps {
  open: boolean
  onClose: () => void
  projeto?: any
  onSalvo: () => void
}

export function ModalProjeto({ open, onClose, projeto, onSalvo }: ModalProjetoProps) {
  const [clientes, setClientes] = useState<any[]>([])
  const [servicos, setServicos] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [novoCliente, setNovoCliente] = useState(false)

  const [form, setForm] = useState({
    clienteId: '', clienteNome: '', clienteCpfCnpj: '',
    tipoServico: '', descricao: '', imovelNome: '', imovelEndereco: '',
    municipio: '', estado: '', car: '', areaHectares: '',
    valorProposto: '', tipoContrato: '', observacoes: '',
    responsavelId: '', supervisorId: '',
  })

  useEffect(() => {
    if (open) {
      loadDados()
      if (projeto) {
        setForm({
          clienteId: projeto.clienteId || '',
          clienteNome: '', clienteCpfCnpj: '',
          tipoServico: projeto.tipoServico || '',
          descricao: projeto.descricao || '',
          imovelNome: projeto.imovelNome || '',
          imovelEndereco: projeto.imovelEndereco || '',
          municipio: projeto.municipio || '',
          estado: projeto.estado || '',
          car: projeto.car || '',
          areaHectares: projeto.areaHectares?.toString() || '',
          valorProposto: projeto.valorProposto?.toString() || '',
          tipoContrato: projeto.tipoContrato || '',
          observacoes: projeto.observacoes || '',
          responsavelId: projeto.responsavelId || '',
          supervisorId: projeto.supervisorId || '',
        })
      } else {
        setForm({
          clienteId: '', clienteNome: '', clienteCpfCnpj: '',
          tipoServico: '', descricao: '', imovelNome: '', imovelEndereco: '',
          municipio: '', estado: '', car: '', areaHectares: '',
          valorProposto: '', tipoContrato: '', observacoes: '',
          responsavelId: '', supervisorId: '',
        })
        setNovoCliente(false)
      }
    }
  }, [open, projeto])

  async function loadDados() {
    const [resClientes, resServicos, resUsuarios] = await Promise.all([
      fetch('/api/clientes'),
      fetch('/api/pre-cadastros?tipo=servicos'),
      fetch('/api/usuarios?ativo=true'),
    ])
    if (resClientes.ok) setClientes((await resClientes.json()).clientes)
    if (resServicos.ok) setServicos((await resServicos.json()).servicos)
    if (resUsuarios.ok) setUsuarios((await resUsuarios.json()).usuarios)
  }

  function handleChange(field: string, value: string) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (!form.tipoServico) {
      toast.error('Selecione o tipo de serviço')
      return
    }

    if (!novoCliente && !form.clienteId) {
      toast.error('Selecione ou cadastre um cliente')
      return
    }

    if (novoCliente && (!form.clienteNome || !form.clienteCpfCnpj)) {
      toast.error('Preencha o nome e CPF/CNPJ do cliente')
      return
    }

    setLoading(true)
    try {
      let clienteId = form.clienteId

      // Cria cliente novo se necessário
      if (novoCliente) {
        const resCliente = await fetch('/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: form.clienteNome,
            cpfCnpj: form.clienteCpfCnpj,
            municipio: form.municipio,
          }),
        })
        if (!resCliente.ok) {
          const err = await resCliente.json()
          toast.error(err.error || 'Erro ao criar cliente')
          return
        }
        clienteId = (await resCliente.json()).cliente.id
      }

      const payload = {
        clienteId,
        tipoServico: form.tipoServico,
        descricao: form.descricao,
        imovelNome: form.imovelNome,
        imovelEndereco: form.imovelEndereco,
        municipio: form.municipio,
        estado: form.estado,
        car: form.car,
        areaHectares: form.areaHectares,
        valorProposto: form.valorProposto,
        tipoContrato: form.tipoContrato,
        observacoes: form.observacoes,
        responsavelId: form.responsavelId || undefined,
        supervisorId: form.supervisorId || undefined,
      }

      const url = projeto ? `/api/projetos/${projeto.id}` : '/api/projetos'
      const method = projeto ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error || 'Erro ao salvar projeto')
        return
      }

      toast.success(projeto ? 'Projeto atualizado!' : 'Projeto criado com sucesso!')
      onSalvo()
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 z-10">
          <h2 className="text-lg font-semibold text-gray-900">
            {projeto ? 'Editar Projeto' : 'Novo Lead / Projeto'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Cliente */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-sm font-medium text-gray-700">Cliente</label>
              <button
                type="button"
                onClick={() => setNovoCliente(!novoCliente)}
                className="text-xs text-green-600 hover:text-green-700 font-medium"
              >
                {novoCliente ? 'Selecionar existente' : '+ Novo cliente'}
              </button>
            </div>
            {novoCliente ? (
              <div className="space-y-3">
                <input
                  type="text"
                  value={form.clienteNome}
                  onChange={(e) => handleChange('clienteNome', e.target.value)}
                  placeholder="Nome do cliente / empresa"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
                <input
                  type="text"
                  value={form.clienteCpfCnpj}
                  onChange={(e) => handleChange('clienteCpfCnpj', e.target.value)}
                  placeholder="CPF ou CNPJ"
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
              </div>
            ) : (
              <select
                value={form.clienteId}
                onChange={(e) => handleChange('clienteId', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
              >
                <option value="">Selecione um cliente...</option>
                {clientes.map(c => (
                  <option key={c.id} value={c.id}>{c.nome} — {c.cpfCnpj}</option>
                ))}
              </select>
            )}
          </div>

          {/* Tipo de Serviço */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Serviço *</label>
            <select
              value={form.tipoServico}
              onChange={(e) => handleChange('tipoServico', e.target.value)}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
              required
            >
              <option value="">Selecione o tipo...</option>
              {servicos.map(s => (
                <option key={s.id} value={s.nome}>{s.nome}</option>
              ))}
            </select>
          </div>

          {/* Dados do Imóvel */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Imóvel</label>
              <input
                type="text"
                value={form.imovelNome}
                onChange={(e) => handleChange('imovelNome', e.target.value)}
                placeholder="Ex: Fazenda São João"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">CAR</label>
              <input
                type="text"
                value={form.car}
                onChange={(e) => handleChange('car', e.target.value)}
                placeholder="Número do CAR"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
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
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Estado</label>
              <select
                value={form.estado}
                onChange={(e) => handleChange('estado', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
              >
                <option value="">UF</option>
                {['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].map(uf => (
                  <option key={uf} value={uf}>{uf}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Área (ha)</label>
              <input
                type="number"
                step="0.01"
                value={form.areaHectares}
                onChange={(e) => handleChange('areaHectares', e.target.value)}
                placeholder="0,00"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor Proposto (R$)</label>
              <input
                type="number"
                step="0.01"
                value={form.valorProposto}
                onChange={(e) => handleChange('valorProposto', e.target.value)}
                placeholder="0,00"
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
              />
            </div>
          </div>

          {/* Responsável */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Responsável</label>
              <select
                value={form.responsavelId}
                onChange={(e) => handleChange('responsavelId', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
              >
                <option value="">Não atribuído</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Supervisor</label>
              <select
                value={form.supervisorId}
                onChange={(e) => handleChange('supervisorId', e.target.value)}
                className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm bg-white"
              >
                <option value="">Não atribuído</option>
                {usuarios.map(u => (
                  <option key={u.id} value={u.id}>{u.nome}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Observações */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
            <textarea
              value={form.observacoes}
              onChange={(e) => handleChange('observacoes', e.target.value)}
              placeholder="Informações adicionais sobre o projeto..."
              rows={3}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 text-sm resize-none"
            />
          </div>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-xl text-sm transition-colors flex items-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {projeto ? 'Salvar Alterações' : 'Criar Projeto'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
