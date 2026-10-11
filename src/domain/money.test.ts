import { describe, expect, it } from 'vitest'
import { parsePriceInput } from './money'

describe('price input', () => {
  it('reads Polish and English number formats', () => {
    expect(parsePriceInput('129')).toBe(129)
    expect(parsePriceInput('49,90')).toBe(49.9)
    expect(parsePriceInput('49.9')).toBe(49.9)
    expect(parsePriceInput(' 1 299,00 ')).toBe(1299)
    expect(parsePriceInput('1.299,50')).toBe(1299.5)
    expect(parsePriceInput('1,299.50')).toBe(1299.5)
    expect(parsePriceInput('0')).toBe(0)
  })

  it('treats empty as "add price later" and rejects nonsense', () => {
    expect(parsePriceInput('')).toBeUndefined()
    expect(parsePriceInput('   ')).toBeUndefined()
    expect(parsePriceInput('abc')).toBeNull()
    expect(parsePriceInput('-5')).toBeNull()
    expect(parsePriceInput('12,345')).toBeNull()
    expect(parsePriceInput('12.5.1')).toBeNull()
  })
})
