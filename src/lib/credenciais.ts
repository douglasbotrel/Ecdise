// Credenciais de órgãos (SIGLA, CTF, ...) guardadas em Projeto.credenciais.
//
// Formato no banco:
//   - cifrado:  "enc:v1:<iv b64>:<tag b64>:<dados b64>"  (AES-256-GCM)
//   - legado:   JSON em texto puro {"SIGLA":{"login":"...","senha":"..."}}
//
// A chave vem de CREDENCIAIS_KEY (32 bytes em hex ou base64). Gere com:
//   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
// Sem a chave, o sistema continua lendo e gravando em texto puro (compatibilidade)
// e registra um aviso no log do servidor. Use scripts/criptografar-credenciais.ts
// para cifrar os registros existentes depois de configurar a chave.

import crypto from 'crypto'

export type Credencial = { login?: string; senha?: string; [k: string]: any }
export type MapaCredenciais = Record<string, Credencial>

const PREFIXO = 'enc:v1:'

function chave(): Buffer | null {
  const raw = process.env.CREDENCIAIS_KEY
  if (!raw) return null
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  if (buf.length !== 32) throw new Error('CREDENCIAIS_KEY deve ter 32 bytes (64 caracteres hex ou base64).')
  return buf
}

let avisou = false
function avisarSemChave() {
  if (avisou) return
  avisou = true
  console.warn('[credenciais] CREDENCIAIS_KEY não configurada: credenciais gravadas SEM criptografia.')
}

export function cifrar(texto: string): string {
  const k = chave()
  if (!k) { avisarSemChave(); return texto }
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', k, iv)
  const dados = Buffer.concat([c.update(texto, 'utf8'), c.final()])
  const tag = c.getAuthTag()
  return `${PREFIXO}${iv.toString('base64')}:${tag.toString('base64')}:${dados.toString('base64')}`
}

export function decifrar(valor: string): string {
  if (!valor.startsWith(PREFIXO)) return valor // legado em texto puro
  const k = chave()
  if (!k) throw new Error('Credenciais cifradas, mas CREDENCIAIS_KEY não está configurada.')
  const [ivB64, tagB64, dadosB64] = valor.slice(PREFIXO.length).split(':')
  const d = crypto.createDecipheriv('aes-256-gcm', k, Buffer.from(ivB64, 'base64'))
  d.setAuthTag(Buffer.from(tagB64, 'base64'))
  return Buffer.concat([d.update(Buffer.from(dadosB64, 'base64')), d.final()]).toString('utf8')
}

export function estaCifrado(valor: string | null | undefined): boolean {
  return !!valor && valor.startsWith(PREFIXO)
}

export function lerCredenciais(valor: string | null | undefined): MapaCredenciais {
  if (!valor) return {}
  try {
    const obj = JSON.parse(decifrar(valor))
    return obj && typeof obj === 'object' ? obj : {}
  } catch (e) {
    console.error('[credenciais] não foi possível ler as credenciais', e)
    return {}
  }
}

export function gravarCredenciais(mapa: MapaCredenciais): string | null {
  const limpo: MapaCredenciais = {}
  for (const [sistema, c] of Object.entries(mapa || {})) {
    if (!sistema || !c) continue
    if (!c.login && !c.senha) continue
    limpo[sistema] = c
  }
  if (!Object.keys(limpo).length) return null
  return cifrar(JSON.stringify(limpo))
}

// Versão segura para enviar à tela: mantém o login e tira a senha.
export function credenciaisPublicas(valor: string | null | undefined): string | null {
  const mapa = lerCredenciais(valor)
  const pub: MapaCredenciais = {}
  for (const [sistema, c] of Object.entries(mapa)) {
    const { senha, ...resto } = c
    pub[sistema] = { ...resto, senha: '', temSenha: !!senha }
  }
  return Object.keys(pub).length ? JSON.stringify(pub) : null
}

// Mescla o que veio da tela com o que já está salvo: senha vazia = manter a atual.
// Sistemas ausentes no JSON recebido são removidos (permite excluir um sistema).
export function mesclarCredenciais(atual: string | null | undefined, recebido: string | MapaCredenciais | null): string | null {
  if (recebido === null || recebido === '') return null
  const novo: MapaCredenciais = typeof recebido === 'string' ? JSON.parse(recebido) : recebido
  const velho = lerCredenciais(atual)
  const resultado: MapaCredenciais = {}
  for (const [sistema, c] of Object.entries(novo || {})) {
    const { temSenha, ...dados } = (c || {}) as any
    resultado[sistema] = {
      ...dados,
      senha: dados.senha ? dados.senha : (velho[sistema]?.senha || ''),
    }
  }
  return gravarCredenciais(resultado)
}
