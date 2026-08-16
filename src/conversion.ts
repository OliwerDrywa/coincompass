export type CurrencyCode = string;
export type CurrencyCatalog = Record<CurrencyCode, string>;
export type CurrencyEntry = readonly [CurrencyCode, string];
export type RateStatus = "cached" | "error" | "loading" | "ready";

export type Operation = { factor: number; cost: number };
export type MentalMethod = {
  approxRate: number;
  effort: number;
  errorPercent: number;
  score: number;
  steps: Operation[];
};
export type CachedRate = { date: string; rate: number };
export type StorageLike = Pick<Storage, "getItem" | "setItem">;
export type CurrencyApiResponse = { iso_code: CurrencyCode; name: string };

export const currencyCodeFromSearch = (
  value: unknown,
  fallback: CurrencyCode,
): CurrencyCode =>
  typeof value === "string" && /^[a-z]{3}$/i.test(value)
    ? value.toUpperCase()
    : fallback;
export const currencyCodeFromCatalog = (
  currency: CurrencyCode,
  currencies: CurrencyCatalog,
  fallback: CurrencyCode,
): CurrencyCode =>
  Object.keys(currencies).length === 0 || currencies[currency]
    ? currency
    : fallback;

const OPERATIONS: Operation[] = [
  { factor: 2, cost: 1 },
  { factor: 0.5, cost: 1 },
  { factor: 10, cost: 1 },
  { factor: 0.1, cost: 1 },
  { factor: 100, cost: 1 },
  { factor: 0.01, cost: 1 },
  { factor: 1000, cost: 1 },
  { factor: 0.001, cost: 1 },
  { factor: 10000, cost: 2.5 },
  { factor: 0.0001, cost: 2.5 },
  { factor: 1000000, cost: 3.4 },
  { factor: 0.000001, cost: 3.4 },
  { factor: 4, cost: 1 },
  { factor: 0.25, cost: 1 },
  { factor: 5, cost: 1.2 },
  { factor: 0.2, cost: 1.2 },
  { factor: 8, cost: 1.4 },
  { factor: 0.125, cost: 1.4 },
  { factor: 1.1, cost: 1.6 },
  { factor: 0.9, cost: 1.6 },
  { factor: 1.2, cost: 1.8 },
  { factor: 0.8, cost: 1.8 },
  { factor: 1.25, cost: 1.8 },
  { factor: 0.75, cost: 1.8 },
  { factor: 3, cost: 2 },
  { factor: 1 / 3, cost: 2 },
];

export const toCurrencyCatalog = (
  currencies: CurrencyApiResponse[],
): CurrencyCatalog =>
  Object.fromEntries(currencies.map(({ iso_code, name }) => [iso_code, name]));
export const sortCurrencies = (currencies: CurrencyCatalog): CurrencyEntry[] =>
  Object.entries(currencies).sort(([codeA], [codeB]) =>
    codeA.localeCompare(codeB),
  );
export const filterCurrencies = (
  currencies: CurrencyCatalog,
  query: string,
): CurrencyEntry[] => {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return sortCurrencies(currencies).filter(
    ([code, name]) =>
      !normalizedQuery ||
      code.toLocaleLowerCase().includes(normalizedQuery) ||
      name.toLocaleLowerCase().includes(normalizedQuery),
  );
};
export const updateRecentCurrencies = (
  recentCurrencies: CurrencyCode[],
  currency: CurrencyCode,
): CurrencyCode[] =>
  [currency, ...recentCurrencies.filter((item) => item !== currency)].slice(
    0,
    5,
  );
export const getPriorityCurrencies = (
  currencies: CurrencyCatalog,
  pinnedCurrencies: CurrencyCode[],
  recentCurrencies: CurrencyCode[],
  query: string,
): CurrencyEntry[] => {
  const priorityCodes = [
    ...new Set([...pinnedCurrencies, ...recentCurrencies]),
  ];
  const matches = new Map(filterCurrencies(currencies, query));
  return priorityCodes.flatMap((code) => {
    const name = matches.get(code);
    return name ? [[code, name] as const] : [];
  });
};
export const scrollIntoViewForKeyboard = (
  element: HTMLElement | null,
): void => {
  setTimeout(() => {
    if (!element) return;
    const window = element.ownerDocument.defaultView;
    const visibleHeight = window?.visualViewport?.height ?? window?.innerHeight;
    if (!window || !visibleHeight) return;
    window.scrollBy({
      behavior: "smooth",
      top: element.getBoundingClientRect().top - visibleHeight * 0.35,
    });
  }, 150);
};

export const formatStep = ({ factor }: Pick<Operation, "factor">): string => {
  if (factor > 0.5 && factor < 2) {
    const roundedPercent = Math.round(Math.abs(factor - 1) * 100);
    if (roundedPercent)
      return factor > 1
        ? `add ${roundedPercent}%`
        : `subtract ${roundedPercent}%`;
  }
  const [operator, operand] =
    factor >= 1 ? ["multiply", factor] : ["divide", 1 / factor];
  return `${operator} by ${operand.toLocaleString(undefined, { maximumFractionDigits: 6 })}`;
};
const rateCacheKey = (source: CurrencyCode, target: CurrencyCode): string =>
  `coincompass-rate-${source}-${target}`;
export const parseCachedRate = (value: unknown): CachedRate | null => {
  if (typeof value !== "object" || value === null) return null;
  const { date, rate } = value as Partial<CachedRate>;
  return typeof rate === "number" &&
    Number.isFinite(rate) &&
    rate > 0 &&
    typeof date === "string" &&
    date.length > 0
    ? { date, rate }
    : null;
};
export const getCachedRate = (
  storage: StorageLike,
  source: CurrencyCode,
  target: CurrencyCode,
): CachedRate | null => {
  try {
    const cached: unknown = JSON.parse(
      storage.getItem(rateCacheKey(source, target)) ?? "null",
    );
    return parseCachedRate(cached);
  } catch {
    return null;
  }
};
export const saveCachedRate = (
  storage: StorageLike,
  source: CurrencyCode,
  target: CurrencyCode,
  rate: CachedRate,
): void => {
  try {
    storage.setItem(rateCacheKey(source, target), JSON.stringify(rate));
  } catch {}
};
export const normalizeAmountInput = (value: string): string => {
  if (value === "") return "";
  const [whole = "", decimal] = value.split(".");
  const normalizedWhole = whole.replace(/^0+(?=\d)/, "") || "0";
  return decimal === undefined
    ? normalizedWhole
    : `${normalizedWhole}.${decimal}`;
};
export const rateIndicatorClass = (status: RateStatus): string =>
  status === "error"
    ? "bg-[#d03238]"
    : status === "loading"
      ? "bg-[#e5a520]"
      : "bg-[#1c9c53]";
export const selectFeaturedMethods = <T extends MentalMethod>(
  methods: T[],
): { easiest: T | null; lowestError: T | null } => {
  const easiest = methods.reduce<T | null>(
    (best, method) =>
      !best ||
      method.effort < best.effort ||
      (method.effort === best.effort && method.errorPercent < best.errorPercent)
        ? method
        : best,
    null,
  );
  const lowestError = methods.reduce<T | null>(
    (best, method) =>
      !best ||
      method.errorPercent < best.errorPercent ||
      (method.errorPercent === best.errorPercent && method.effort < best.effort)
        ? method
        : best,
    null,
  );
  return { easiest, lowestError };
};
export const findMentalMethods = (rate: number, limit = 5): MentalMethod[] => {
  if (!Number.isFinite(rate) || rate <= 0) return [];
  const candidates: MentalMethod[] = [];
  const visit = (
    factor: number,
    steps: Operation[],
    effort: number,
    depth: number,
  ): void => {
    if (depth > 0) {
      const errorPercent = Math.abs((factor - rate) / rate) * 100;
      candidates.push({
        steps,
        approxRate: factor,
        errorPercent,
        effort,
        score: effort + Math.min(errorPercent, 40) * 0.28,
      });
    }
    if (depth === 3) return;
    for (const operation of OPERATIONS) {
      if (steps.at(-1)?.factor === 1 / operation.factor) continue;
      visit(
        factor * operation.factor,
        [...steps, operation],
        effort + operation.cost,
        depth + 1,
      );
    }
  };
  visit(1, [], 0, 0);
  const unique = new Map<string, MentalMethod>();
  candidates
    .filter((candidate) => candidate.errorPercent <= 18)
    .sort((a, b) => a.score - b.score || a.errorPercent - b.errorPercent)
    .forEach((candidate) => {
      const key = candidate.steps.map((step) => step.factor).join(",");
      const sameResultAndSteps = [...unique.values()].some(
        (item) =>
          item.approxRate.toPrecision(6) ===
            candidate.approxRate.toPrecision(6) &&
          item.steps.length === candidate.steps.length,
      );
      if (!unique.has(key) && !sameResultAndSteps) unique.set(key, candidate);
    });
  return [...unique.values()].slice(0, limit);
};
