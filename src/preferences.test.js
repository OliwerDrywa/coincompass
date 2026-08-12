import { describe, expect, it } from 'vitest'
import { addRecentPair, buildQuickSelectOptions, togglePinnedCurrency } from './preferences.js'

describe('currency preferences', () => {
  it('pins a currency once and removes it when toggled again', () => {
    expect(togglePinnedCurrency([], 'USD')).toEqual(['USD'])
    expect(togglePinnedCurrency(['EUR', 'USD'], 'USD')).toEqual(['EUR'])
  })

  it('stores the newest unique currency pair first and caps the list', () => {
    const startingPairs = [
      { source: 'EUR', target: 'PLN' },
      { source: 'USD', target: 'JPY' },
      { source: 'GBP', target: 'USD' },
      { source: 'CHF', target: 'EUR' },
      { source: 'CAD', target: 'USD' },
    ]

    expect(addRecentPair(startingPairs, { source: 'USD', target: 'JPY' })).toEqual([
      { source: 'USD', target: 'JPY' },
      { source: 'EUR', target: 'PLN' },
      { source: 'GBP', target: 'USD' },
      { source: 'CHF', target: 'EUR' },
      { source: 'CAD', target: 'USD' },
    ])
    expect(addRecentPair(startingPairs, { source: 'AUD', target: 'NZD' })).toHaveLength(5)
  })

  it('does not record a conversion pair with the same currency on both sides', () => {
    expect(addRecentPair([], { source: 'EUR', target: 'EUR' })).toEqual([])
  })

  it('combines pinned currencies and recent pairs into one labelled quick selector', () => {
    expect(buildQuickSelectOptions(['EUR', 'USD'], [{ source: 'GBP', target: 'PLN' }])).toEqual([
      { value: 'currency:EUR', label: '★ EUR' },
      { value: 'currency:USD', label: '★ USD' },
      { value: 'pair:GBP:PLN', label: '↺ GBP → PLN' },
    ])
  })
})
