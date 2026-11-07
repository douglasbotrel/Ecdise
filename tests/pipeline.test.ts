import { test } from 'node:test'
import assert from 'node:assert/strict'
import { podeAvancar, PROXIMA_ETAPA } from '../src/lib/pipeline.ts'

const u = (role: string, departamento = 'OPERACIONAL_AMBIENTAL', id = 'u1') => ({ id, role, departamento })

test('analista comum não libera projeto do Aguardando Sinal (P1)', () => {
  assert.equal(podeAvancar('AGUARDANDO_SINAL', u('ANALISTA'), {}), false)
})

test('financeiro e direção liberam o Aguardando Sinal', () => {
  assert.equal(podeAvancar('AGUARDANDO_SINAL', u('ANALISTA', 'FINANCEIRO'), {}), true)
  assert.equal(podeAvancar('AGUARDANDO_SINAL', u('ADMIN'), {}), true)
})

test('analista rápido só avança a solicitação que é dele', () => {
  assert.equal(podeAvancar('EM_ANALISE_RAPIDA', u('ANALISTA_RAPIDO', 'COMERCIAL_X', 'a'), { analistaRapidoId: 'a' }), true)
  assert.equal(podeAvancar('EM_ANALISE_RAPIDA', u('ANALISTA_RAPIDO', 'COMERCIAL_X', 'b'), { analistaRapidoId: 'a' }), false)
})

test('gestor responsável inicia a execução', () => {
  assert.equal(podeAvancar('OPERACIONAL', u('ANALISTA', 'X', 'g'), { gestorResponsavelId: 'g' }), true)
  assert.equal(podeAvancar('OPERACIONAL', u('ANALISTA', 'X', 'z'), { gestorResponsavelId: 'g' }), false)
})

test('sequência do pipeline não pula etapas', () => {
  assert.equal(PROXIMA_ETAPA.AGUARDANDO_SINAL, 'OPERACIONAL')
  assert.equal(PROXIMA_ETAPA.OPERACIONAL, 'EM_EXECUCAO')
})
