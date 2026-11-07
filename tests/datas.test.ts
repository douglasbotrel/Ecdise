import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dataPura, toInputDate, formatDate, isAtrasada } from '../src/lib/utils.ts'

// Rode com TZ=America/Sao_Paulo (o script npm test já define).

test('prazo gravado à meia-noite UTC é exibido no mesmo dia (O2)', () => {
  assert.equal(formatDate('2026-11-10T00:00:00.000Z'), '10/11/2026')
  assert.equal(toInputDate('2026-11-10T00:00:00.000Z'), '2026-11-10')
})

test('string yyyy-mm-dd vira data local sem deslocamento', () => {
  const d = dataPura('2026-01-31')!
  assert.equal(d.getFullYear(), 2026)
  assert.equal(d.getMonth(), 0)
  assert.equal(d.getDate(), 31)
})

test('data com hora não é reinterpretada', () => {
  const d = dataPura('2026-11-10T15:30:00.000Z')!
  assert.equal(d.toISOString(), '2026-11-10T15:30:00.000Z')
})

test('vencer hoje não é atraso; ontem é (O4/O7)', () => {
  const hoje = new Date()
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}T00:00:00.000Z`
  const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1)
  assert.equal(isAtrasada(iso(hoje)), false)
  assert.equal(isAtrasada(iso(ontem)), true)
  assert.equal(isAtrasada(null), false)
})
