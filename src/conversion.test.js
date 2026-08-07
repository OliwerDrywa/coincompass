import { describe, expect, it } from 'vitest'
import { findMentalMethods, formatStep } from './conversion.js'

describe('mental conversion methods', () => {
  it('ranks an exact easy operation first', () => {
    const [method] = findMentalMethods(4, 5)
    expect(method.approxRate).toBe(4)
    expect(method.errorPercent).toBe(0)
    expect(method.steps).toEqual([{ id: 'times4', factor: 4, cost: 1 }])
  })

  it('combines simple operations to approximate a rate', () => {
    const methods = findMentalMethods(3.6, 5)
    expect(methods[0].errorPercent).toBeLessThanOrEqual(2)
    expect(methods[0].steps.length).toBeLessThanOrEqual(3)
  })

  it('returns distinct methods ordered by a blend of effort and accuracy', () => {
    const methods = findMentalMethods(0.86, 5)
    expect(methods).toHaveLength(5)
    expect(new Set(methods.map((method) => method.steps.map((step) => step.id).join(','))).size).toBe(5)
    expect(methods.every((method) => Number.isFinite(method.score))).toBe(true)
  })

  it('formats percentage adjustment instructions', () => {
    expect(formatStep({ id: 'minus10' })).toBe('subtract 10%')
    expect(formatStep({ id: 'divide2' })).toBe('divide by 2')
  })
})
