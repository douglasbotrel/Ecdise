// Catálogo central dos tipos de licença. Para incluir um tipo novo (ex: "Frigorífico"),
// basta acrescentar UMA linha em TIPOS_LICENCA — formulário, abas, selo da lista,
// pino do mapa e validação da API passam a reconhecê-lo automaticamente.
//
// `grupo` define quais campos específicos o formulário mostra:
//   'AGUA'      → vazão + tipo de outorga (uso de recursos hídricos)
//   'ATIVIDADE' → área (ha) + atividade permitida
//
// As classes Tailwind ficam escritas por extenso (o Tailwind só gera as que encontra no código).

export type IconeTipo = 'Sprout' | 'Droplet' | 'Car' | 'Fuel' | 'Wrench' | 'Factory' | 'Pickaxe' | 'Recycle' | 'FileText'

export interface TipoLicencaInfo {
  chave: string
  label: string        // nome curto (selo, abas)
  descricao: string    // texto do seletor no formulário
  icone: IconeTipo     // ícone lucide (lista, abas, formulário)
  emoji: string        // emoji do pino no mapa
  corPino: string      // cor do pino no mapa
  grupo: 'AGUA' | 'ATIVIDADE'
  placeholderNumero: string
  selo: string         // selo na lista
  iconeCor: string     // cor do ícone no seletor do formulário
  abaAtiva: string     // aba de filtro selecionada
  abaInativa: string   // aba de filtro não selecionada
}

export const TIPOS_LICENCA: TipoLicencaInfo[] = [
  {
    chave: 'ATIVIDADE', label: 'Atividade', descricao: 'Atividade rural / licença ambiental',
    icone: 'Sprout', emoji: '🌾', corPino: '#16a34a', grupo: 'ATIVIDADE', placeholderNumero: 'Ex: LP-1234/2026',
    selo: 'text-green-700 bg-green-50', iconeCor: 'text-green-600',
    abaAtiva: 'bg-green-600 text-white', abaInativa: 'bg-green-50 text-green-700 hover:bg-green-100',
  },
  {
    chave: 'OUTORGA', label: 'Outorga', descricao: 'Outorga (uso de água)',
    icone: 'Droplet', emoji: '💧', corPino: '#0284c7', grupo: 'AGUA', placeholderNumero: 'Ex: OUT-0456/2026',
    selo: 'text-sky-700 bg-sky-50', iconeCor: 'text-sky-600',
    abaAtiva: 'bg-sky-600 text-white', abaInativa: 'bg-sky-50 text-sky-700 hover:bg-sky-100',
  },
  {
    chave: 'LAVA_JATO', label: 'Lava jato', descricao: 'Lava jato / lavagem de veículos',
    icone: 'Car', emoji: '🚗', corPino: '#0891b2', grupo: 'ATIVIDADE', placeholderNumero: 'Ex: LO-0789/2026',
    selo: 'text-cyan-700 bg-cyan-50', iconeCor: 'text-cyan-600',
    abaAtiva: 'bg-cyan-600 text-white', abaInativa: 'bg-cyan-50 text-cyan-700 hover:bg-cyan-100',
  },
  {
    chave: 'POSTO_COMBUSTIVEL', label: 'Posto de combustível', descricao: 'Posto de combustível',
    icone: 'Fuel', emoji: '⛽', corPino: '#dc2626', grupo: 'ATIVIDADE', placeholderNumero: 'Ex: LO-0321/2026',
    selo: 'text-red-700 bg-red-50', iconeCor: 'text-red-600',
    abaAtiva: 'bg-red-600 text-white', abaInativa: 'bg-red-50 text-red-700 hover:bg-red-100',
  },
  {
    chave: 'OFICINA', label: 'Oficina mecânica', descricao: 'Oficina mecânica / auto center',
    icone: 'Wrench', emoji: '🔧', corPino: '#ea580c', grupo: 'ATIVIDADE', placeholderNumero: 'Ex: LO-0555/2026',
    selo: 'text-orange-700 bg-orange-50', iconeCor: 'text-orange-600',
    abaAtiva: 'bg-orange-600 text-white', abaInativa: 'bg-orange-50 text-orange-700 hover:bg-orange-100',
  },
  {
    chave: 'INDUSTRIA', label: 'Indústria', descricao: 'Indústria / agroindústria',
    icone: 'Factory', emoji: '🏭', corPino: '#7c3aed', grupo: 'ATIVIDADE', placeholderNumero: 'Ex: LI-0900/2026',
    selo: 'text-violet-700 bg-violet-50', iconeCor: 'text-violet-600',
    abaAtiva: 'bg-violet-600 text-white', abaInativa: 'bg-violet-50 text-violet-700 hover:bg-violet-100',
  },
  {
    chave: 'MINERACAO', label: 'Mineração', descricao: 'Mineração / extração mineral',
    icone: 'Pickaxe', emoji: '⛏️', corPino: '#92400e', grupo: 'ATIVIDADE', placeholderNumero: 'Ex: LP-0100/2026',
    selo: 'text-amber-800 bg-amber-50', iconeCor: 'text-amber-700',
    abaAtiva: 'bg-amber-700 text-white', abaInativa: 'bg-amber-50 text-amber-800 hover:bg-amber-100',
  },
  {
    chave: 'RESIDUOS', label: 'Resíduos', descricao: 'Gestão de resíduos / reciclagem',
    icone: 'Recycle', emoji: '♻️', corPino: '#15803d', grupo: 'ATIVIDADE', placeholderNumero: 'Ex: LO-0222/2026',
    selo: 'text-emerald-700 bg-emerald-50', iconeCor: 'text-emerald-600',
    abaAtiva: 'bg-emerald-600 text-white', abaInativa: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100',
  },
  {
    chave: 'OUTRA', label: 'Outra', descricao: 'Outro tipo de licença',
    icone: 'FileText', emoji: '📄', corPino: '#6b7280', grupo: 'ATIVIDADE', placeholderNumero: 'Ex: 1234/2026',
    selo: 'text-gray-700 bg-gray-100', iconeCor: 'text-gray-500',
    abaAtiva: 'bg-gray-700 text-white', abaInativa: 'bg-gray-100 text-gray-700 hover:bg-gray-200',
  },
]

const CHAVES = new Set(TIPOS_LICENCA.map(t => t.chave))

/** Normaliza qualquer valor vindo do banco/cliente. Valor desconhecido/antigo → ATIVIDADE (comportamento anterior). */
export function normalizarTipoLicenca(tipo: string | null | undefined): string {
  return tipo && CHAVES.has(tipo) ? tipo : 'ATIVIDADE'
}

export function infoTipo(tipo: string | null | undefined): TipoLicencaInfo {
  const chave = normalizarTipoLicenca(tipo)
  return TIPOS_LICENCA.find(t => t.chave === chave)!
}

/** true quando o tipo usa os campos de água (vazão + tipo de outorga). */
export function ehTipoAgua(tipo: string | null | undefined): boolean {
  return infoTipo(tipo).grupo === 'AGUA'
}
