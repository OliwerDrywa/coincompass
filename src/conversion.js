const OPERATIONS = [
  { id: 'times2', factor: 2, cost: 1 },
  { id: 'divide2', factor: 0.5, cost: 1 },
  { id: 'times10', factor: 10, cost: 1 },
  { id: 'divide10', factor: 0.1, cost: 1 },
  { id: 'times4', factor: 4, cost: 1 },
  { id: 'divide4', factor: 0.25, cost: 1 },
  { id: 'times5', factor: 5, cost: 1.2 },
  { id: 'divide5', factor: 0.2, cost: 1.2 },
  { id: 'times8', factor: 8, cost: 1.4 },
  { id: 'divide8', factor: 0.125, cost: 1.4 },
  { id: 'plus10', factor: 1.1, cost: 1.6 },
  { id: 'minus10', factor: 0.9, cost: 1.6 },
  { id: 'plus20', factor: 1.2, cost: 1.8 },
  { id: 'minus20', factor: 0.8, cost: 1.8 },
  { id: 'plus25', factor: 1.25, cost: 1.8 },
  { id: 'minus25', factor: 0.75, cost: 1.8 },
  { id: 'times3', factor: 3, cost: 2 },
  { id: 'divide3', factor: 1 / 3, cost: 2 },
]

const LABELS = {
  times2: 'multiply by 2', divide2: 'divide by 2',
  times3: 'multiply by 3', divide3: 'divide by 3',
  times4: 'multiply by 4', divide4: 'divide by 4',
  times5: 'multiply by 5', divide5: 'divide by 5',
  times8: 'multiply by 8', divide8: 'divide by 8',
  times10: 'multiply by 10', divide10: 'divide by 10',
  plus10: 'add 10%', minus10: 'subtract 10%',
  plus20: 'add 20%', minus20: 'subtract 20%',
  plus25: 'add 25%', minus25: 'subtract 25%',
}

export function formatStep(step) {
  return LABELS[step.id]
}

export function findMentalMethods(rate, limit = 5) {
  if (!Number.isFinite(rate) || rate <= 0) return []

  const candidates = []
  const visit = (factor, steps, effort, depth) => {
    if (depth > 0) {
      const errorPercent = Math.abs((factor - rate) / rate) * 100
      candidates.push({
        steps,
        approxRate: factor,
        errorPercent,
        effort,
        score: effort + Math.min(errorPercent, 40) * 0.28,
      })
    }
    if (depth === 3) return
    for (const operation of OPERATIONS) {
      if (steps.at(-1)?.factor * operation.factor === 1) continue
      visit(factor * operation.factor, [...steps, operation], effort + operation.cost, depth + 1)
    }
  }
  visit(1, [], 0, 0)

  const unique = new Map()
  candidates
    .filter((candidate) => candidate.errorPercent <= 18)
    .sort((a, b) => a.score - b.score || a.errorPercent - b.errorPercent)
    .forEach((candidate) => {
      const key = candidate.steps.map((step) => step.id).join(',')
      const rateBucket = candidate.approxRate.toPrecision(6)
      if (!unique.has(key) && ![...unique.values()].some((item) => item.approxRate.toPrecision(6) === rateBucket)) {
        unique.set(key, candidate)
      }
    })

  return [...unique.values()].slice(0, limit)
}
