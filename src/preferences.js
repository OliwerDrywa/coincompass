const MAX_RECENT_PAIRS = 5

export function togglePinnedCurrency(pinnedCurrencies, code) {
  return pinnedCurrencies.includes(code)
    ? pinnedCurrencies.filter((currency) => currency !== code)
    : [...pinnedCurrencies, code]
}

export function addRecentPair(recentPairs, pair) {
  if (!pair.source || !pair.target || pair.source === pair.target) return recentPairs

  const withoutCurrentPair = recentPairs.filter((item) => item.source !== pair.source || item.target !== pair.target)
  return [pair, ...withoutCurrentPair].slice(0, MAX_RECENT_PAIRS)
}
