import { describe, expect, it } from 'vitest'
import { findMentalMethods, formatStep, normalizeAmountInput, selectFeaturedMethods } from './conversion.js'

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

  it('uses hundreds and thousands as one easy step', () => {
    expect(findMentalMethods(100, 5)[0].steps.map((step) => step.id)).toEqual(['times100'])
    expect(findMentalMethods(0.001, 5)[0].steps.map((step) => step.id)).toEqual(['divide1000'])
    expect(findMentalMethods(100, 5)[0].effort).toBe(1)
  })

  it('strips leading zeroes while preserving a decimal amount', () => {
    expect(normalizeAmountInput('04')).toBe('4')
    expect(normalizeAmountInput('0004.50')).toBe('4.50')
    expect(normalizeAmountInput('0.5')).toBe('0.5')
  })

  it('returns separate easiest and lowest-error featured methods', () => {
    const featured = selectFeaturedMethods(findMentalMethods(0.86, 12))
    expect(featured.easiest).toBeDefined()
    expect(featured.lowestError).toBeDefined()
    expect(featured.easiest.effort).toBeLessThanOrEqual(featured.lowestError.effort)
    expect(featured.lowestError.errorPercent).toBeLessThanOrEqual(featured.easiest.errorPercent)
  })

  it('supports large place-value shifts as one harder step', () => {
    const tenThousand = findMentalMethods(10000, 50).find((method) => method.steps.length === 1 && method.steps[0].id === 'times10000')
    const millionth = findMentalMethods(0.000001, 50).find((method) => method.steps.length === 1 && method.steps[0].id === 'divide1000000')
    expect(tenThousand.steps).toHaveLength(1)
    expect(millionth.steps).toHaveLength(1)
    expect(tenThousand.effort).toBeGreaterThan(1)
  })

  it('formats percentage and place-value instructions', () => {
    expect(formatStep({ id: 'minus10' })).toBe('subtract 10%')
    expect(formatStep({ id: 'divide2' })).toBe('divide by 2')
    expect(formatStep({ id: 'times1000' })).toBe('multiply by 1,000')
  })
})
