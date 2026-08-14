import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { filterCurrencies, findMentalMethods, formatStep, mergeCurrencyCatalogs, normalizeAmountInput, scrollIntoViewForKeyboard, selectFeaturedMethods, sortCurrencies, toCurrencyCatalog, updateRecentCurrencies } from './conversion.js'

describe('mental conversion methods', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

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

  it('adds Taiwan and other requested Asian currencies to an API catalog', () => {
    const currencies = mergeCurrencyCatalogs({ CNY: 'Chinese Renminbi Yuan', JPY: 'Japanese Yen' })
    expect(currencies).toMatchObject({
      CNY: 'Chinese Renminbi Yuan',
      JPY: 'Japanese Yen',
      TWD: 'New Taiwan Dollar',
      HKD: 'Hong Kong Dollar',
    })
  })

  it('uses the v2 currency response, including Taiwan', () => {
    expect(toCurrencyCatalog([{ iso_code: 'TWD', name: 'New Taiwan Dollar' }, { iso_code: 'JPY', name: 'Japanese Yen' }]))
      .toEqual({ TWD: 'New Taiwan Dollar', JPY: 'Japanese Yen' })
  })

  it('sorts currencies alphabetically by currency code', () => {
    expect(sortCurrencies({ TWD: 'New Taiwan Dollar', JPY: 'Japanese Yen', CNY: 'Chinese Renminbi Yuan' }))
      .toEqual([['CNY', 'Chinese Renminbi Yuan'], ['JPY', 'Japanese Yen'], ['TWD', 'New Taiwan Dollar']])
  })

  it('filters currencies by code or label without changing alphabetical order', () => {
    const currencies = { USD: 'United States Dollar', AED: 'United Arab Emirates Dirham', EUR: 'Euro' }
    expect(filterCurrencies(currencies, 'uni')).toEqual([
      ['AED', 'United Arab Emirates Dirham'],
      ['USD', 'United States Dollar'],
    ])
    expect(filterCurrencies(currencies, 'eu')).toEqual([['EUR', 'Euro']])
  })

  it('puts a selected currency first in a capped recent history without duplicates', () => {
    expect(updateRecentCurrencies(['EUR', 'USD', 'JPY', 'GBP', 'CHF'], 'USD'))
      .toEqual(['USD', 'EUR', 'JPY', 'GBP', 'CHF'])
    expect(updateRecentCurrencies(['EUR', 'USD', 'JPY', 'GBP', 'CHF'], 'PLN'))
      .toEqual(['PLN', 'EUR', 'USD', 'JPY', 'GBP'])
  })

  it('scrolls a picker search input into the keyboard-safe viewport after focus', () => {
    const scrollIntoView = vi.fn()
    const input = { scrollIntoView }
    scrollIntoViewForKeyboard(input)
    expect(scrollIntoView).not.toHaveBeenCalled()
    vi.runAllTimers()
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth', block: 'center', inline: 'nearest' })
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
