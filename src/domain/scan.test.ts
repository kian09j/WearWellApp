import { describe, expect, it } from 'vitest'
import { scanItemName, validateScanResult } from './scan'

describe('scan result validation', () => {
  it('keeps well-formed rows and tidies their text', () => {
    expect(
      validateScanResult({
        items: [{ category: 'shirts', colour: 'white', description: '  White   linen shirt ', confidence: 'medium' }],
        notes: ' All clear. ',
      }),
    ).toEqual({ items: [{ category: 'shirts', colour: 'white', description: 'White linen shirt', confidence: 'medium' }], notes: 'All clear.' })
  })

  it('drops rows it cannot trust instead of failing the whole scan', () => {
    const result = validateScanResult({
      items: [
        { category: 'spaceship', colour: 'black', description: 'x', confidence: 'high' },
        { category: 'jeans', colour: 'teal', description: 'Wide jeans', confidence: 'very sure' },
        'nonsense',
        { category: 'shoes', description: 42 },
      ],
      notes: 7,
    })
    expect(result).toEqual({ items: [{ category: 'jeans', colour: null, description: 'Wide jeans', confidence: 'low' }], notes: '' })
  })

  it('rejects answers that are not a scan result at all, and caps runaway lists', () => {
    expect(validateScanResult(null)).toBeNull()
    expect(validateScanResult({ items: 'lots' })).toBeNull()
    const many = { items: Array.from({ length: 100 }, () => ({ category: 'tshirts', colour: null, description: 'Tee', confidence: 'low' })), notes: '' }
    expect(validateScanResult(many)!.items).toHaveLength(60)
  })

  it('names a piece from its description, or its category when there is none', () => {
    expect(scanItemName({ description: 'navy striped shirt', category: 'shirts' }, () => 'Shirt')).toBe('Navy striped shirt')
    expect(scanItemName({ description: '', category: 'shirts' }, () => 'Shirt')).toBe('Shirt')
  })
})
