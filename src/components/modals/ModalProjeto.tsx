'use client'

import { useState, useEffect, useRef } from 'react'
import { toast } from 'sonner'
import { X, Loader2, Upload, FileText, Trash2, CheckCircle, ArrowRight } from 'lucide-react'

const UFS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

const ETAPA_LABELS: Record<string, string> = {
  SOLICITACAO:         'Nova Solicitação',
  EM_ANALISE_RAPIDA:   'Em Análise Rápida',
  ANALISE_CONCLUIDA:   'Análise Concluída — aguard. validação ADM',
  EM_NEGOCIACAO:       'Em Negociação com Cliente',
  PROPOSTA_ACEITA:     'Proposta Aceita — aguard. contrato',
  AGUARDANDO_CONTRATO: 'Aguardando Elaboração de Contrato',
  EM_CONTRATO:         'Contrato em elaboração',
  AGUARDANDO_SINAL:    'Aguardando Pagamento do Sinal',
  OPERACIONAL:         'Aguardando atribuição operacional',
  EM_EXECUCAO:         'Em Execução',
  CONCLUIDO:           'Concluído',
  CANCELADO:           'Cancelado',
}

interface ModalProjetoProps {
  open: boolean
  onClose: () => void
  projeto?: any
  onSalvo: () => void
  // Modo de ação específico por etapa
  modoAcao?: 'criar' | 'analise' | 'validacao' | 'contrato_info' | 'operacional' | 'execucao' | 'editar'
}

export function ModalProjeto({ open, onClose, projeto, onSalvo, modoAcao = 'editar' }: ModalProjetoProps) {
  const [clientes, setClientes] = useState<any[]>([])
  const [servicos, setServicos] = useState<any[]>([])
  const [usuarios, setUsuarios] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [novoCliente, setNovoCliente] = useState(false)
  const [arquivos, setArquivos] = useState<{ nome: string; url: string; uploading?: boolean }[]>([])
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Determina o modo real baseado na etapa do projeto se não especificado
  const modoReal = !projeto ? 'criar' : (modoAcao !== 'editar' ? modoAcao :
    projeto.etapaPipeline === 'EM_ANALISE_RAPIDA' ? 'analise' :
    projeto.etapaPipeline === 'ANALISE_CONCLUIDA' ? 'validacao' :
    projeto.etapaPipeline === 'PROPOSTA_ACEITA' ? 'contrato_info' :
    projeto.etapaPipeline === 'OPERACIONAL' ? 'operacional' :
    'editar'
  )

  const [form, setForm] = useState({
    // Dados base
    clienteId: '', clienteNome: '', clienteCpfCnpj: '', clienteEmail: '', clienteTelefone: '',
    tipoServico: '', descricao: '', imovelNome: '', municipio: '', estado: '', car: '', areaHectares: '',
    valorProposto: '', observacoes: '',
    // Analista rápido
    analistaRapidoId: '',
    // Análise técnica rápida
    observacoesAnalise: '', servicosRecomendados: [] as string[],
    // Validação / negociação ADM
    servicosContratados: [] as string[], valorSinal: '', valorPrestacao: '', numeroPrestacoes: '',
    // Operacional
    responsavelId: '', supervisorId: '', gestorResponsavelId: '', dataPrazo: '',
  })

  useEffect(() => {
    if (open) {
      loadDados()
      if (projeto) {
        const srec = projeto.servicosRecomendados ? JSON.parse(projeto.servicosRecomendados) : []
        const scon = projeto.servicosContratados ? JSON.parse(projeto.servicosContratados) : []
        setForm({
          clienteId: projeto.clienteId || '',
          clienteNome: '', clienteCpfCnpj: '', clienteEmail: '', clienteTelefone: '',
          tipoServico: projeto.tipoServico || '',
          descricao: projeto.descricao || '',
          imovelNome: projeto.imovelNome || '',
          municipio: projeto.municipio || '',
          estado: projeto.estado || '',
          car: projeto.car || '',
          areaHectares: projeto.areaHectares?.toString() || '',
          valorProposto: projeto.valorProposto?.toString() || '',
          observacoes: projeto.observacoes || '',
          analistaRapidoId: projeto.analistaRapidoId || '',
          observacoesAnalise: projeto.observacoesAnalise || '',
          servicosRecomendados: srec,
          servicosContratados: scon,
          valorSinal: projeto.valorSinal?.toString() || '',
          valorPrestacao: projeto.valorPrestacao?.toString() || '',
          numeroPrestacoes: projeto.numeroPrestacoes?.toString() || '',
          responsavelId: projeto.responsavelId || '',
          supervisorId: projeto.supervisorId || '',
          gestorResponsavelId: projeto.gestorResponsavelId || '',
          dataPrazo: projeto.dataPrazo ? new Date(projeto.dataPrazo).toISOString().split('T')[0] : '',
        })
        // Documentos existentes
        if (projeto.documentos) {
          setArquivos(projeto.documentos.map((d: any) => ({ nome: d.nome, url: d.url })))
        }
      } else {
        resetForm()
      }
    }
  }, [open, projeto])

  function resetForm() {
    setForm({
      clienteId: '', clienteNome: '', clienteCpfCnpj: '', clienteEmail: '', clienteTelefone: '',
      tipoServico: '', descricao: '', imovelNome: '', municipio: '', estado: '', car: '', areaHectares: '',
      valorProposto: '', observacoes: '', analistaRapidoId: '', observacoesAnalise: '',
      servicosRecomendados: [], servicosContratados: [], valorSinal: '', valorPrestacao: '',
      numeroPrestacoes: '', responsavelId: '', supervisorId: '', gestorResponsavelId: '', dataPrazo: '',
    })
    setArquivos([])
    setNovoCliente(false)
  }

  async function loadDados() {
    const [resC, resS, resU] = await Promise.all([
      fetch('/api/clientes'),
      fetch('/api/pre-cadastros?tipo=servicos'),
      fetch('/api/usuarios?ativo=true'),
    ])
    if (resC.ok) setClientes((await resC.json()).clientes)
    if (resS.ok) setServicos((await resS.json()).servicos)
    if (resU.ok) setUsuarios((await resU.json()).usuarios)
  }

  function set(field: string, value: any) {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  function toggleServico(lista: 'servicosRecomendados' | 'servicosContratados', servico: string) {
    setForm(prev => {
      const atual = prev[lista]
      return {
        ...prev,
        [lista]: atual.includes(servico) ? atual.filter(s => s !== servico) : [...atual, servico],
      }
    })
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const novoArquivo = { nome: file.name, url: '', uploading: true }
    setArquivos(prev => [...prev, novoArquivo])

    try {
      const fd = new FormData()
      fd.append('arquivo', file)
      fd.append('categoria', 'SOLICITACAO')
      if (projeto?.id) fd.append('projetoId', projeto.id)

      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      if (!res.ok) throw new Error()
      const { url } = await res.json()

      setArquivos(prev => prev.map(a => a.nome === file.name && a.uploading ? { nome: file.name, url } : a))
      toast.success('Arquivo enviado com sucesso')
    } catch {
      setArquivos(prev => prev.filter(a => !(a.nome === file.name && a.uploading)))
      toast.error('Erro ao enviar arquivo')
    }

    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (modoReal === 'criar') {
      if (!form.tipoServico) { toast.error('Selecione o tipo de serviço'); return }
      if (!novoCliente && !form.clienteId) { toast.error('Selecione ou cadastre um cliente'); return }
      if (novoCliente && (!form.clienteNome || !form.clienteCpfCnpj)) { toast.error('Preencha nome e CPF/CNPJ do cliente'); return }
    }

    setLoading(true)
    try {
      let clienteId = form.clienteId

      if (novoCliente && modoReal === 'criar') {
        const res = await fetch('/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            nome: form.clienteNome, cpfCnpj: form.clienteCpfCnpj,
            email: form.clienteEmail, telefone: form.clienteTelefone,
            municipio: form.municipio,
          }),
        })
        if (!res.ok) { toast.error((await res.json()).error || 'Erro ao criar cliente'); return }
        clienteId = (await res.json()).cliente.id
      }

      // Monta payload dependendo do modo
      let payload: any = {}
      let avancarPipeline = false

      if (modoReal === 'criar') {
        payload = {
          clienteId, tipoServico: form.tipoServico, descricao: form.descricao,
          imovelNome: form.imovelNome, municipio: form.municipio, estado: form.estado,
          car: form.car, areaHectares: form.areaHectares, valorProposto: form.valorProposto,
          observacoes: form.observacoes, analistaRapidoId: form.analistaRapidoId || null,
        }
      } else if (modoReal === 'analise') {
        // Analista rápido: marca em análise ou conclui
        payload = {
          observacoesAnalise: form.observacoesAnalise,
          servicosRecomendados: JSON.stringify(form.servicosRecomendados),
          avancarPipeline: true,
          observacaoTransicao: 'Análise técnica concluída pelo analista de serviço rápido',
        }
        avancarPipeline = true
      } else if (modoReal === 'validacao') {
        // ADM valida e inclui dados de negociação
        payload = {
          servicosContratados: JSON.stringify(form.servicosContratados),
          valorSinal: form.valorSinal, valorPrestacao: form.valorPrestacao,
          numeroPrestacoes: form.numeroPrestacoes,
          gestorResponsavelId: form.gestorResponsavelId || null,
          supervisorId: form.supervisorId || null,
          avancarPipeline: true,
          observacaoTransicao: 'Proposta validada pelo ADM — serviços e valores definidos',
        }
      } else if (modoReal === 'operacional') {
        // Gestor designa analista e prazo
        payload = {
          responsavelId: form.responsavelId || null,
          dataPrazo: form.dataPrazo || null,
          statusOperacional: 'EM_ANDAMENTO',
          avancarPipeline: true,
          observacaoTransicao: 'Analista e prazo definidos — projeto em execução',
        }
      } else {
        // Modo editar livre
        payload = {
          tipoServico: form.tipoServico, descricao: form.descricao,
          imovelNome: form.imovelNome, municipio: form.municipio, estado: form.estado,
          car: form.car, areaHectares: form.areaHectares, valorProposto: form.valorProposto,
          observacoes: form.observacoes, analistaRapidoId: form.analistaRapidoId || null,
          responsavelId: form.responsavelId || null, supervisorId: form.supervisorId || null,
          dataPrazo: form.dataPrazo || null,
        }
      }

      const url = projeto ? `/api/projetos/${projeto.id}` : '/api/projetos'
      const method = projeto ? 'PATCH' : 'POST'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) { toast.error((await res.json()).error || 'Erro ao salvar'); return }

      const { projeto: projetoSalvo } = await res.json()

      // Se há arquivos pendentes sem projetoId, refaz upload com o id
      const semId = arquivos.filter(a => a.url && !a.url.includes(projetoSalvo?.id))
      // (arquivos já foram enviados com URL — nada a fazer nesse caso)

      const msgs: Record<string, string> = {
        criar: '✅ Projeto criado! Analista notificado.',
        analise: '✅ Análise concluída! ADM notificado para validação.',
        validacao: '✅ Proposta validada! Setor de contratos notificado.',
        operacional: '✅ Projeto atribuído! Analista notificado para execução.',
        editar: 'Projeto atualizado.',
      }
      toast.success(msgs[modoReal] || 'Salvo com sucesso!')
      onSalvo()
    } catch {
      toast.error('Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  if (!open) return null

  const titulo = {
    criar: 'Nova Solicitação de Projeto',
    analise: `Análise Técnica — ${projeto?.codigo}`,
    validacao: `Validar Proposta — ${projeto?.codigo}`,
    contrato_info: `Informações para Contrato — ${projeto?.codigo}`,
    operacional: `Atribuir Analista — ${projeto?.codigo}`,
    execucao: `Execução — ${projeto?.codigo}`,
    editar: `Editar Projeto — ${projeto?.codigo}`,
  }[modoReal]

  const analistasRapidos = usuarios.filter(u => u.role === 'ANALISTA_RAPIDO' || u.role === 'ANALISTA')
  const gestores = usuarios.filter(u => ['ADMIN','GESTOR_GERAL','GESTOR_OPERACIONAL','GESTOR_CAMPO','SUPERVISOR'].includes(u.role))
  const analistasOp = usuarios.filter(u => ['ANALISTA','TECNICO_CAMPO'].includes(u.role))

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white flex items-center justify-between px-6 py-4 border-b border-gray-100 z-10">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">{titulo}</h2>
            {projeto && (
              <p className="text-xs text-gray-400 mt-0.5">
                Etapa atual: <span className="font-medium text-gray-600">{ETAPA_LABELS[projeto.etapaPipeline] || projeto.etapaPipeline}</span>
              </p>
            )}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* ── MODO CRIAR ──────────────────────────────────────── */}
          {modoReal === 'criar' && (<>
            {/* Cliente */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-sm font-medium text-gray-700">Cliente *</label>
                <button type="button" onClick={() => setNovoCliente(!novoCliente)} className="text-xs text-green-600 font-medium">
                  {novoCliente ? 'Selecionar existente' : '+ Novo cliente'}
                </button>
              </div>
              {novoCliente ? (
                <div className="space-y-2">
                  <input type="text" value={form.clienteNome} onChange={e => set('clienteNome', e.target.value)}
                    placeholder="Nome do cliente / empresa *" className="input-field" />
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" value={form.clienteCpfCnpj} onChange={e => set('clienteCpfCnpj', e.target.value)}
                      placeholder="CPF ou CNPJ *" className="input-field" />
                    <input type="text" value={form.clienteTelefone} onChange={e => set('clienteTelefone', e.target.value)}
                      placeholder="Telefone/WhatsApp" className="input-field" />
                  </div>
                  <input type="email" value={form.clienteEmail} onChange={e => set('clienteEmail', e.target.value)}
                    placeholder="E-mail (opcional)" className="input-field" />
                </div>
              ) : (
                <select value={form.clienteId} onChange={e => set('clienteId', e.target.value)} className="input-field">
                  <option value="">Selecione um cliente...</option>
                  {clientes.map(c => <option key={c.id} value={c.id}>{c.nome} — {c.cpfCnpj}</option>)}
                </select>
              )}
            </div>

            {/* Tipo de serviço */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tipo de Serviço *</label>
              <select value={form.tipoServico} onChange={e => set('tipoServico', e.target.value)} className="input-field" required>
                <option value="">Selecione o tipo...</option>
                {servicos.map(s => <option key={s.id} value={s.nome}>{s.nome}</option>)}
              </select>
            </div>

            {/* Dados do imóvel */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome da Fazenda / Imóvel</label>
                <input type="text" value={form.imovelNome} onChange={e => set('imovelNome', e.target.value)}
                  placeholder="Ex: Fazenda São João" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Município</label>
                <input type="text" value={form.municipio} onChange={e => set('municipio', e.target.value)}
                  placeholder="Cidade" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">UF</label>
                <select value={form.estado} onChange={e => set('estado', e.target.value)} className="input-field">
                  <option value="">UF</option>
                  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Área (ha)</label>
                <input type="number" step="0.01" value={form.areaHectares} onChange={e => set('areaHectares', e.target.value)}
                  placeholder="0,00" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">CAR</label>
                <input type="text" value={form.car} onChange={e => set('car', e.target.value)}
                  placeholder="Número do CAR" className="input-field" />
              </div>
            </div>

            {/* Descrição / contexto */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Descrição / contexto do pedido</label>
              <textarea value={form.descricao} onChange={e => set('descricao', e.target.value)}
                placeholder="Informações recebidas pelo cliente (WhatsApp, reunião, etc.)..." rows={3} className="input-field resize-none" />
            </div>

            {/* Analista de serviço rápido */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Analista de Serviço Rápido <span className="text-gray-400 font-normal">(quem fará a análise técnica inicial)</span>
              </label>
              <select value={form.analistaRapidoId} onChange={e => set('analistaRapidoId', e.target.value)} className="input-field">
                <option value="">Não atribuído</option>
                {analistasRapidos.map(u => <option key={u.id} value={u.id}>{u.nome} — {u.role}</option>)}
              </select>
            </div>

            {/* Upload de documentos */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Documentos de referência <span className="text-gray-400 font-normal">(KML, PDF, mapa, etc.)</span>
              </label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors"
              >
                <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                <p className="text-sm text-gray-500">Clique para enviar arquivo</p>
                <p className="text-xs text-gray-400 mt-0.5">PDF, KML, KMZ, imagens, ZIP — máx. 50MB</p>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload}
                accept=".pdf,.kml,.kmz,.jpg,.jpeg,.png,.tif,.tiff,.zip,.xlsx,.xls,.xml" />
              {arquivos.length > 0 && (
                <div className="mt-2 space-y-1">
                  {arquivos.map((a, i) => (
                    <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                      {a.uploading ? <Loader2 className="w-4 h-4 animate-spin text-gray-400" /> : <FileText className="w-4 h-4 text-green-600" />}
                      <span className="text-sm text-gray-700 flex-1 truncate">{a.nome}</span>
                      {!a.uploading && (
                        <button type="button" onClick={() => setArquivos(prev => prev.filter((_, j) => j !== i))}>
                          <Trash2 className="w-3.5 h-3.5 text-gray-400 hover:text-red-500" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>)}

          {/* ── MODO ANÁLISE (Analista Rápido) ──────────────────── */}
          {modoReal === 'analise' && (<>
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
              <p className="text-sm font-medium text-yellow-800">📋 Preencha a análise técnica e selecione os serviços viáveis</p>
              <p className="text-xs text-yellow-600 mt-1">Ao salvar, o ADM será notificado para validar sua análise.</p>
            </div>

            {/* Info do projeto */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-1">
              <p className="text-sm"><span className="font-medium">Imóvel:</span> {projeto?.imovelNome || '—'}</p>
              <p className="text-sm"><span className="font-medium">Município/UF:</span> {projeto?.municipio} / {projeto?.estado}</p>
              <p className="text-sm"><span className="font-medium">Área:</span> {projeto?.areaHectares ? `${projeto.areaHectares} ha` : '—'}</p>
              <p className="text-sm"><span className="font-medium">Tipo solicitado:</span> {projeto?.tipoServico}</p>
              {projeto?.descricao && <p className="text-sm"><span className="font-medium">Contexto:</span> {projeto.descricao}</p>}
            </div>

            {/* Documentos enviados */}
            {arquivos.length > 0 && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Documentos disponíveis</label>
                <div className="space-y-1">
                  {arquivos.map((a, i) => (
                    <a key={i} href={a.url} target="_blank" rel="noreferrer"
                      className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 hover:bg-gray-100">
                      <FileText className="w-4 h-4 text-green-600" />
                      <span className="text-sm text-blue-600 hover:underline truncate">{a.nome}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Serviços recomendados */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Serviços que podem ser prestados *</label>
              <div className="grid grid-cols-1 gap-2">
                {servicos.map(s => (
                  <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    form.servicosRecomendados.includes(s.nome) ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="checkbox" checked={form.servicosRecomendados.includes(s.nome)}
                      onChange={() => toggleServico('servicosRecomendados', s.nome)} className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">{s.nome}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Observações técnicas */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações técnicas da análise</label>
              <textarea value={form.observacoesAnalise} onChange={e => set('observacoesAnalise', e.target.value)}
                placeholder="Descreva sua análise: situação do CAR, restrições legais, viabilidade, pendências de documentos, etc."
                rows={4} className="input-field resize-none" />
            </div>

            {/* Upload complementar */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Enviar documentos complementares</label>
              <div onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center cursor-pointer hover:border-green-400 hover:bg-green-50 transition-colors">
                <Upload className="w-5 h-5 text-gray-400 mx-auto mb-1" />
                <p className="text-sm text-gray-500">Clique para enviar</p>
              </div>
              <input ref={fileInputRef} type="file" className="hidden" onChange={handleUpload}
                accept=".pdf,.kml,.kmz,.jpg,.jpeg,.png,.tif,.tiff,.zip,.xlsx,.xls,.xml" />
            </div>
          </>)}

          {/* ── MODO VALIDAÇÃO (ADM) ─────────────────────────────── */}
          {modoReal === 'validacao' && (<>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-800">✅ Análise técnica concluída — valide e defina a proposta comercial</p>
              <p className="text-xs text-blue-600 mt-1">Ao salvar, o setor de contratos será notificado para elaborar o contrato.</p>
            </div>

            {/* Análise do analista */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-2">
              <p className="text-sm font-semibold text-gray-700">Análise do {projeto?.analistaRapido?.nome || 'Analista'}:</p>
              <p className="text-sm text-gray-600">{projeto?.observacoesAnalise || 'Sem observações registradas.'}</p>
              {projeto?.servicosRecomendados && (() => {
                try {
                  const s = JSON.parse(projeto.servicosRecomendados)
                  return s.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-gray-500 mt-1">Serviços recomendados:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {s.map((sv: string) => <span key={sv} className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">{sv}</span>)}
                      </div>
                    </div>
                  ) : null
                } catch { return null }
              })()}
            </div>

            {/* Serviços contratados */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Serviços contratados com o cliente *</label>
              <div className="grid grid-cols-1 gap-2">
                {servicos.map(s => (
                  <label key={s.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${
                    form.servicosContratados.includes(s.nome) ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input type="checkbox" checked={form.servicosContratados.includes(s.nome)}
                      onChange={() => toggleServico('servicosContratados', s.nome)} className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">{s.nome}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Valores */}
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor do Sinal (R$)</label>
                <input type="number" step="0.01" value={form.valorSinal} onChange={e => set('valorSinal', e.target.value)}
                  placeholder="0,00" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Valor da Parcela (R$)</label>
                <input type="number" step="0.01" value={form.valorPrestacao} onChange={e => set('valorPrestacao', e.target.value)}
                  placeholder="0,00" className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nº de Parcelas</label>
                <input type="number" value={form.numeroPrestacoes} onChange={e => set('numeroPrestacoes', e.target.value)}
                  placeholder="1" className="input-field" />
              </div>
            </div>

            {/* Gestor responsável */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Gestor/Supervisor responsável</label>
                <select value={form.gestorResponsavelId} onChange={e => set('gestorResponsavelId', e.target.value)} className="input-field">
                  <option value="">Não atribuído</option>
                  {gestores.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Supervisor de campo</label>
                <select value={form.supervisorId} onChange={e => set('supervisorId', e.target.value)} className="input-field">
                  <option value="">Não atribuído</option>
                  {gestores.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
            </div>
          </>)}

          {/* ── MODO OPERACIONAL (Gestor atribui analista) ──────── */}
          {modoReal === 'operacional' && (<>
            <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
              <p className="text-sm font-medium text-indigo-800">🚀 Sinal recebido — atribua um analista e defina o prazo</p>
              <p className="text-xs text-indigo-600 mt-1">O analista será notificado para iniciar a execução do projeto.</p>
            </div>

            <div className="bg-gray-50 rounded-xl p-4 space-y-1">
              <p className="text-sm"><span className="font-medium">Projeto:</span> {projeto?.codigo} — {projeto?.imovelNome}</p>
              <p className="text-sm"><span className="font-medium">Tipo:</span> {projeto?.tipoServico}</p>
              <p className="text-sm"><span className="font-medium">Município:</span> {projeto?.municipio}/{projeto?.estado}</p>
              <p className="text-sm"><span className="font-medium">Área:</span> {projeto?.areaHectares} ha</p>
              {projeto?.servicosContratados && (() => {
                try { const s = JSON.parse(projeto.servicosContratados); return s.length > 0 ? <p className="text-sm"><span className="font-medium">Serviços:</span> {s.join(', ')}</p> : null }
                catch { return null }
              })()}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Analista Responsável *</label>
              <select value={form.responsavelId} onChange={e => set('responsavelId', e.target.value)} className="input-field" required>
                <option value="">Selecione o analista...</option>
                {analistasOp.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Prazo para conclusão *</label>
              <input type="date" value={form.dataPrazo} onChange={e => set('dataPrazo', e.target.value)} className="input-field" required />
            </div>
          </>)}

          {/* ── MODO EDITAR LIVRE ─────────────────────────────────── */}
          {modoReal === 'editar' && (<>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Nome do Imóvel</label>
                <input type="text" value={form.imovelNome} onChange={e => set('imovelNome', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Município</label>
                <input type="text" value={form.municipio} onChange={e => set('municipio', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">UF</label>
                <select value={form.estado} onChange={e => set('estado', e.target.value)} className="input-field">
                  <option value="">UF</option>
                  {UFS.map(uf => <option key={uf} value={uf}>{uf}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Área (ha)</label>
                <input type="number" step="0.01" value={form.areaHectares} onChange={e => set('areaHectares', e.target.value)} className="input-field" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Analista Rápido</label>
                <select value={form.analistaRapidoId} onChange={e => set('analistaRapidoId', e.target.value)} className="input-field">
                  <option value="">Não atribuído</option>
                  {analistasRapidos.map(u => <option key={u.id} value={u.id}>{u.nome}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Observações</label>
              <textarea value={form.observacoes} onChange={e => set('observacoes', e.target.value)} rows={3} className="input-field resize-none" />
            </div>
          </>)}

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
            <button type="button" onClick={onClose} disabled={loading}
              className="px-5 py-2.5 border border-gray-200 rounded-xl text-gray-700 hover:bg-gray-50 font-medium text-sm">
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="px-5 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-semibold rounded-xl text-sm flex items-center gap-2">
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {modoReal === 'criar' && 'Criar e Notificar Analista'}
              {modoReal === 'analise' && <><CheckCircle className="w-4 h-4" /> Concluir Análise</>}
              {modoReal === 'validacao' && <><CheckCircle className="w-4 h-4" /> Validar e Encaminhar Contrato</>}
              {modoReal === 'operacional' && <><ArrowRight className="w-4 h-4" /> Atribuir e Iniciar</>}
              {modoReal === 'editar' && 'Salvar Alterações'}
            </button>
          </div>
        </form>
      </div>

      {/* Estilos inline para input-field */}
      <style jsx global>{`
        .input-field {
          width: 100%;
          padding: 0.625rem 1rem;
          border: 1px solid #e5e7eb;
          border-radius: 0.75rem;
          font-size: 0.875rem;
          background: white;
          outline: none;
          transition: box-shadow 0.15s, border-color 0.15s;
        }
        .input-field:focus {
          border-color: transparent;
          box-shadow: 0 0 0 2px #22c55e;
        }
      `}</style>
    </div>
  )
}
