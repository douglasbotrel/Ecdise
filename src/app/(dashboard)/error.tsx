'use client'

import { useEffect } from 'react'
import Link from 'next/link'

// Erro inesperado numa tela do sistema: mantém menu e cabeçalho e oferece saída.
export default function ErroDashboard({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error('[tela]', error)
  }, [error])

  return (
    <div role="alert" className="mx-auto mt-16 max-w-md rounded-2xl border border-red-100 bg-white p-8 text-center">
      <h1 className="text-lg font-semibold text-gray-900">Algo deu errado nesta tela</h1>
      <p className="mt-2 text-sm text-gray-500">
        Seus dados não foram perdidos. Tente de novo; se o erro continuar, avise o administrador
        {error.digest ? <> informando o código <code className="font-mono">{error.digest}</code></> : null}.
      </p>
      <div className="mt-5 flex justify-center gap-3">
        <button type="button" onClick={reset} className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          Tentar de novo
        </button>
        <Link href="/dashboard" className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
          Ir para o início
        </Link>
      </div>
    </div>
  )
}
