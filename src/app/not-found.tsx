import Link from 'next/link'

export default function NaoEncontrado() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md rounded-2xl border border-gray-100 bg-white p-8 text-center">
        <p className="text-sm font-semibold text-green-700">404</p>
        <h1 className="mt-1 text-lg font-semibold text-gray-900">Página não encontrada</h1>
        <p className="mt-2 text-sm text-gray-500">O endereço pode estar errado ou o registro foi removido.</p>
        <Link href="/dashboard" className="mt-5 inline-block rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700">
          Ir para o início
        </Link>
      </div>
    </div>
  )
}
