'use client'

// Diálogos de confirmação e de motivo, no lugar de window.confirm / window.prompt.
// Uso (assíncrono, sem precisar de provider):
//   if (!(await confirmar({ titulo: 'Excluir equipe?' }))) return
//   const motivo = await pedirTexto({ titulo: 'Cancelar tarefa', label: 'Motivo' })
//   if (motivo === null) return   // usuário desistiu
//
// Acessível: role="dialog", aria-modal, foco no primeiro campo, Esc fecha,
// Tab fica preso dentro do diálogo e o foco volta ao elemento de origem.

import { useEffect, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'

type Base = {
  titulo: string
  mensagem?: string
  textoConfirmar?: string
  textoCancelar?: string
  perigo?: boolean
}

type OpcoesTexto = Base & {
  label?: string
  placeholder?: string
  valorInicial?: string
  obrigatorio?: boolean
  multilinha?: boolean
}

function abrir<T>(render: (fechar: (v: T) => void) => JSX.Element): Promise<T> {
  return new Promise<T>(resolve => {
    const origem = document.activeElement as HTMLElement | null
    const host = document.createElement('div')
    document.body.appendChild(host)
    const root = createRoot(host)
    const fechar = (v: T) => {
      root.unmount()
      host.remove()
      origem?.focus?.()
      resolve(v)
    }
    root.render(render(fechar))
  })
}

function Moldura({
  titulo, mensagem, children, onCancelar, onConfirmar, textoConfirmar, textoCancelar, perigo, desabilitado,
}: Base & {
  children?: React.ReactNode
  onCancelar: () => void
  onConfirmar: () => void
  desabilitado?: boolean
}) {
  const ref = useRef<HTMLDivElement>(null)
  const idTitulo = useRef(`dlg-${Math.random().toString(36).slice(2)}`).current

  useEffect(() => {
    const el = ref.current
    const foco = el?.querySelector<HTMLElement>('input, textarea, button[data-confirmar]')
    foco?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onCancelar() }
      if (e.key === 'Tab' && el) {
        const itens = Array.from(el.querySelectorAll<HTMLElement>('input, textarea, button')).filter(i => !i.hasAttribute('disabled'))
        if (!itens.length) return
        const primeiro = itens[0], ultimo = itens[itens.length - 1]
        if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus() }
        else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onCancelar])

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onCancelar() }}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={idTitulo} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h2 id={idTitulo} className="text-lg font-semibold text-gray-900">{titulo}</h2>
        {mensagem && <p className="mt-2 whitespace-pre-line text-sm text-gray-600">{mensagem}</p>}
        <form onSubmit={e => { e.preventDefault(); if (!desabilitado) onConfirmar() }}>
          {children}
          <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onCancelar} className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
              {textoCancelar || 'Cancelar'}
            </button>
            <button
              type="submit"
              data-confirmar
              disabled={desabilitado}
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50 ${perigo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              {textoConfirmar || 'Confirmar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function confirmar(opts: Base): Promise<boolean> {
  return abrir<boolean>(fechar => (
    <Moldura {...opts} onCancelar={() => fechar(false)} onConfirmar={() => fechar(true)} />
  ))
}

function CampoTexto({ opts, fechar }: { opts: OpcoesTexto; fechar: (v: string | null) => void }) {
  const [valor, setValor] = useState(opts.valorInicial || '')
  const vazio = opts.obrigatorio !== false && !valor.trim()
  const Campo: any = opts.multilinha ? 'textarea' : 'input'
  return (
    <Moldura
      {...opts}
      desabilitado={vazio}
      onCancelar={() => fechar(null)}
      onConfirmar={() => fechar(valor.trim())}
    >
      <label className="mt-4 block text-sm font-medium text-gray-700">
        {opts.label || 'Motivo'}{opts.obrigatorio !== false && <span className="text-red-500"> *</span>}
        <Campo
          value={valor}
          onChange={(e: any) => setValor(e.target.value)}
          placeholder={opts.placeholder}
          rows={opts.multilinha ? 3 : undefined}
          className="mt-1.5 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-green-500"
        />
      </label>
    </Moldura>
  )
}

export function pedirTexto(opts: OpcoesTexto): Promise<string | null> {
  return abrir<string | null>(fechar => <CampoTexto opts={opts} fechar={fechar} />)
}
