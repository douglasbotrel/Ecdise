import { test } from 'node:test'
import assert from 'node:assert/strict'
import { cifrar, decifrar, estaCifrado, lerCredenciais, credenciaisPublicas, mesclarCredenciais } from '../src/lib/credenciais.ts'

process.env.CREDENCIAIS_KEY = 'a'.repeat(64)

test('cifra e decifra (AES-GCM)', () => {
  const c = cifrar('segredo')
  assert.ok(estaCifrado(c))
  assert.notEqual(c, 'segredo')
  assert.equal(decifrar(c), 'segredo')
})

test('lê registros legados em texto puro', () => {
  const legado = JSON.stringify({ SIGLA: { login: '1', senha: 'x' } })
  assert.equal(lerCredenciais(legado).SIGLA.senha, 'x')
})

test('versão pública nunca leva a senha (T2)', () => {
  const salvo = cifrar(JSON.stringify({ SIGLA: { login: '123', senha: 'x' } }))
  const pub = JSON.parse(credenciaisPublicas(salvo)!)
  assert.equal(pub.SIGLA.login, '123')
  assert.equal(pub.SIGLA.senha, '')
  assert.equal(pub.SIGLA.temSenha, true)
})

test('senha em branco ao editar mantém a atual', () => {
  const salvo = cifrar(JSON.stringify({ SIGLA: { login: '123', senha: 'antiga' }, CTF: { login: 'c', senha: 'k' } }))
  const novo = mesclarCredenciais(salvo, JSON.stringify({ SIGLA: { login: '456', senha: '' }, CTF: { login: 'c', senha: 'nova' } }))!
  const mapa = lerCredenciais(novo)
  assert.equal(mapa.SIGLA.login, '456')
  assert.equal(mapa.SIGLA.senha, 'antiga')
  assert.equal(mapa.CTF.senha, 'nova')
  assert.ok(estaCifrado(novo))
})
