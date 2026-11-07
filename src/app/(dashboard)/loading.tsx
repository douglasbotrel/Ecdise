// Esqueleto exibido enquanto uma tela do sistema carrega.
export default function Carregando() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true" aria-label="Carregando">
      <div className="h-7 w-56 rounded-lg bg-gray-200" />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-20 rounded-xl bg-gray-200" />)}
      </div>
      <div className="space-y-2 rounded-2xl border border-gray-100 bg-white p-4">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-10 rounded-lg bg-gray-100" />)}
      </div>
    </div>
  )
}
