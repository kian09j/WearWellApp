import { describe, expect, it } from 'vitest'
import { judgeCutout, toAlpha, toModelInput } from './cutout'

describe('background removal maths', () => {
  it('turns RGBA pixels into planar, normalised RGB and ignores alpha', () => {
    // two pixels: white, then black (alpha differs and must not matter)
    const input = toModelInput(new Uint8ClampedArray([255, 255, 255, 10, 0, 0, 0, 255]))
    expect(input).toHaveLength(6)
    // red plane first: white then black
    expect(input[0]).toBeCloseTo((1 - 0.485) / 0.229, 5)
    expect(input[1]).toBeCloseTo((0 - 0.485) / 0.229, 5)
    // blue plane last
    expect(input[4]).toBeCloseTo((1 - 0.406) / 0.225, 5)
    expect(input[5]).toBeCloseTo((0 - 0.406) / 0.225, 5)
  })

  it('stretches the mask so its weakest pixel is transparent and its strongest opaque', () => {
    expect(Array.from(toAlpha(new Float32Array([0.25, 0.75, 0.5])))).toEqual([0, 255, 128])
  })

  it('makes a flat mask fully transparent instead of dividing by zero', () => {
    expect(Array.from(toAlpha(new Float32Array([0.5, 0.5, 0.5])))).toEqual([0, 0, 0])
  })

  it('only offers a cutout when it found a piece and removed something', () => {
    const withShare = (share: number) => {
      const alpha = new Uint8ClampedArray(1000)
      alpha.fill(255, 0, Math.round(share * 1000))
      return alpha
    }
    expect(judgeCutout(withShare(0.4))).toBe('ok')
    expect(judgeCutout(withShare(0.01))).toBe('nothingFound')
    expect(judgeCutout(withShare(0.99))).toBe('noBackground')
    expect(judgeCutout(new Uint8ClampedArray(0))).toBe('nothingFound')
  })
})
