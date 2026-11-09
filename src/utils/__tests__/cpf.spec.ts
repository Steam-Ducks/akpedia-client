import { describe, it, expect } from 'vitest'
import { cpfProblem, formatCpf } from '@/utils/cpf'

describe('cpfProblem', () => {
  it('accepts a CPF with the right check digits, with or without punctuation', () => {
    expect(cpfProblem('529.982.247-25')).toBeNull()
    expect(cpfProblem('12345678909')).toBeNull()
  })

  it('asks for 11 digits', () => {
    expect(cpfProblem('123.456')).toBe('O CPF deve ter 11 dígitos.')
  })

  it('refuses wrong check digits and one repeated digit', () => {
    expect(cpfProblem('12345678901')).toBe('CPF inválido: confira os dígitos.')
    expect(cpfProblem('529.982.247-24')).toBe('CPF inválido: confira os dígitos.')
    expect(cpfProblem('00000000000')).toBe('CPF inválido: confira os dígitos.')
  })
})

describe('formatCpf', () => {
  it('formats 11 digits', () => {
    expect(formatCpf('12345678909')).toBe('123.456.789-09')
  })
})
