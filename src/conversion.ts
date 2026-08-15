export type CurrencyCode = string;
export type CurrencyCatalog = Record<CurrencyCode, string>;
export type CurrencyEntry = readonly [CurrencyCode, string];
export type RateStatus = "cached" | "error" | "loading" | "ready";

export type OperationId =
  | "times2"
  | "divide2"
  | "times10"
  | "divide10"
  | "times100"
  | "divide100"
  | "times1000"
  | "divide1000"
  | "times10000"
  | "divide10000"
  | "times1000000"
  | "divide1000000"
  | "times4"
  | "divide4"
  | "times5"
  | "divide5"
  | "times8"
  | "divide8"
  | "plus10"
  | "minus10"
  | "plus20"
  | "minus20"
  | "plus25"
  | "minus25"
  | "times3"
  | "divide3";
export type Operation = { id: OperationId; factor: number; cost: number };
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

const OPERATIONS: Operation[] = [
  { id: "times2", factor: 2, cost: 1 },
  { id: "divide2", factor: 0.5, cost: 1 },
  { id: "times10", factor: 10, cost: 1 },
  { id: "divide10", factor: 0.1, cost: 1 },
  { id: "times100", factor: 100, cost: 1 },
  { id: "divide100", factor: 0.01, cost: 1 },
  { id: "times1000", factor: 1000, cost: 1 },
  { id: "divide1000", factor: 0.001, cost: 1 },
  { id: "times10000", factor: 10000, cost: 2.5 },
  { id: "divide10000", factor: 0.0001, cost: 2.5 },
  { id: "times1000000", factor: 1000000, cost: 3.4 },
  { id: "divide1000000", factor: 0.000001, cost: 3.4 },
  { id: "times4", factor: 4, cost: 1 },
  { id: "divide4", factor: 0.25, cost: 1 },
  { id: "times5", factor: 5, cost: 1.2 },
  { id: "divide5", factor: 0.2, cost: 1.2 },
  { id: "times8", factor: 8, cost: 1.4 },
  { id: "divide8", factor: 0.125, cost: 1.4 },
  { id: "plus10", factor: 1.1, cost: 1.6 },
  { id: "minus10", factor: 0.9, cost: 1.6 },
  { id: "plus20", factor: 1.2, cost: 1.8 },
  { id: "minus20", factor: 0.8, cost: 1.8 },
  { id: "plus25", factor: 1.25, cost: 1.8 },
  { id: "minus25", factor: 0.75, cost: 1.8 },
  { id: "times3", factor: 3, cost: 2 },
  { id: "divide3", factor: 1 / 3, cost: 2 },
];

export const EXTRA_CURRENCIES: CurrencyCatalog = {
  AED: "United Arab Emirates Dirham",
  ARS: "Argentine Peso",
  BDT: "Bangladeshi Taka",
  CLP: "Chilean Peso",
  COP: "Colombian Peso",
  EGP: "Egyptian Pound",
  HKD: "Hong Kong Dollar",
  IDR: "Indonesian Rupiah",
  ILS: "Israeli New Shekel",
  KES: "Kenyan Shilling",
  KRW: "South Korean Won",
  MAD: "Moroccan Dirham",
  NGN: "Nigerian Naira",
  PKR: "Pakistani Rupee",
  SAR: "Saudi Riyal",
  THB: "Thai Baht",
  TWD: "New Taiwan Dollar",
  UAH: "Ukrainian Hryvnia",
  VND: "Vietnamese Dong",
};

export const mergeCurrencyCatalogs = (
  currencies: CurrencyCatalog,
): CurrencyCatalog => ({ ...EXTRA_CURRENCIES, ...currencies });
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

const LABELS: Record<OperationId, string> = {
  times2: "multiply by 2",
  divide2: "divide by 2",
  times3: "multiply by 3",
  divide3: "divide by 3",
  times4: "multiply by 4",
  divide4: "divide by 4",
  times5: "multiply by 5",
  divide5: "divide by 5",
  times8: "multiply by 8",
  divide8: "divide by 8",
  times10: "multiply by 10",
  divide10: "divide by 10",
  times100: "multiply by 100",
  divide100: "divide by 100",
  times1000: "multiply by 1,000",
  divide1000: "divide by 1,000",
  times10000: "multiply by 10,000",
  divide10000: "divide by 10,000",
  times1000000: "multiply by 1,000,000",
  divide1000000: "divide by 1,000,000",
  plus10: "add 10%",
  minus10: "subtract 10%",
  plus20: "add 20%",
  minus20: "subtract 20%",
  plus25: "add 25%",
  minus25: "subtract 25%",
};
export const formatStep = (step: Pick<Operation, "id">): string =>
  LABELS[step.id];
const rateCacheKey = (source: CurrencyCode, target: CurrencyCode): string =>
  `coincompass-rate-${source}-${target}`;
export const getCachedRate = (
  storage: StorageLike,
  source: CurrencyCode,
  target: CurrencyCode,
): CachedRate | null => {
  try {
    const cached: unknown = JSON.parse(
      storage.getItem(rateCacheKey(source, target)) ?? "null",
    );
    if (typeof cached !== "object" || cached === null) return null;
    const { date, rate } = cached as Partial<CachedRate>;
    return typeof rate === "number" &&
      Number.isFinite(rate) &&
      typeof date === "string"
      ? { date, rate }
      : null;
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
      const key = candidate.steps.map((step) => step.id).join(",");
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
