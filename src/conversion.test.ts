import { readFileSync } from "node:fs";
import type { StorageLike } from "./conversion.ts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  currencyPairFromSearch,
  filterCurrencies,
  findMentalMethods,
  formatStep,
  getCachedRate,
  normalizeAmountInput,
  rateIndicatorClass,
  saveCachedRate,
  scrollIntoViewForKeyboard,
  selectFeaturedMethods,
  sortCurrencies,
  toCurrencyCatalog,
  updateRecentCurrencies,
} from "./conversion.ts";

const styles = readFileSync(new URL("./style.css", import.meta.url), "utf8");
const app = readFileSync(
  new URL("./routes/index.tsx", import.meta.url),
  "utf8",
);
const packageJson = readFileSync(
  new URL("../package.json", import.meta.url),
  "utf8",
);

describe("mental conversion methods", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("ranks an exact easy operation first", () => {
    const [method] = findMentalMethods(4, 5);
    expect(method.approxRate).toBe(4);
    expect(method.errorPercent).toBe(0);
    expect(method.steps).toEqual([{ factor: 4, cost: 1 }]);
  });

  it("combines simple operations to approximate a rate", () => {
    const methods = findMentalMethods(3.6, 5);
    expect(methods[0].errorPercent).toBeLessThanOrEqual(2);
    expect(methods[0].steps.length).toBeLessThanOrEqual(3);
  });

  it("returns distinct methods ordered by a blend of effort and accuracy", () => {
    const methods = findMentalMethods(0.86, 5);
    expect(methods).toHaveLength(5);
    expect(
      new Set(
        methods.map((method) =>
          method.steps.map((step) => step.factor).join(","),
        ),
      ).size,
    ).toBe(5);
    expect(methods.every((method) => Number.isFinite(method.score))).toBe(true);
  });

  it("uses hundreds and thousands as one easy step", () => {
    expect(
      findMentalMethods(100, 5)[0].steps.map((step) => step.factor),
    ).toEqual([100]);
    expect(
      findMentalMethods(0.001, 5)[0].steps.map((step) => step.factor),
    ).toEqual([0.001]);
    expect(findMentalMethods(100, 5)[0].effort).toBe(1);
  });

  it("strips leading zeroes while preserving a decimal amount", () => {
    expect(normalizeAmountInput("04")).toBe("4");
    expect(normalizeAmountInput("0004.50")).toBe("4.50");
    expect(normalizeAmountInput("0.5")).toBe("0.5");
  });

  it("relies on the currency API instead of bundled currency catalogs", () => {
    const conversion = readFileSync(
      new URL("./conversion.ts", import.meta.url),
      "utf8",
    );

    expect(conversion).not.toContain("EXTRA_CURRENCIES");
    expect(app).not.toContain("FALLBACK_CURRENCIES");
    expect(app).not.toContain("mergeCurrencyCatalogs");
  });

  it("uses the v2 currency response, including Taiwan", () => {
    expect(
      toCurrencyCatalog([
        { iso_code: "TWD", name: "New Taiwan Dollar" },
        { iso_code: "JPY", name: "Japanese Yen" },
      ]),
    ).toEqual({ TWD: "New Taiwan Dollar", JPY: "Japanese Yen" });
  });

  it("uses valid URL currency params and falls back independently", () => {
    expect(
      currencyPairFromSearch(
        { from: "usd", to: "jpy" },
        { source: "EUR", target: "PLN" },
      ),
    ).toEqual({ source: "USD", target: "JPY" });
    expect(
      currencyPairFromSearch(
        { from: "not-a-code", to: "CHF" },
        { source: "EUR", target: "PLN" },
      ),
    ).toEqual({ source: "EUR", target: "CHF" });
  });

  it("sorts currencies alphabetically by currency code", () => {
    expect(
      sortCurrencies({
        TWD: "New Taiwan Dollar",
        JPY: "Japanese Yen",
        CNY: "Chinese Renminbi Yuan",
      }),
    ).toEqual([
      ["CNY", "Chinese Renminbi Yuan"],
      ["JPY", "Japanese Yen"],
      ["TWD", "New Taiwan Dollar"],
    ]);
  });

  it("filters currencies by code or label without changing alphabetical order", () => {
    const currencies = {
      USD: "United States Dollar",
      AED: "United Arab Emirates Dirham",
      EUR: "Euro",
    };
    expect(filterCurrencies(currencies, "uni")).toEqual([
      ["AED", "United Arab Emirates Dirham"],
      ["USD", "United States Dollar"],
    ]);
    expect(filterCurrencies(currencies, "eu")).toEqual([["EUR", "Euro"]]);
  });

  it("puts a selected currency first in a capped recent history without duplicates", () => {
    expect(
      updateRecentCurrencies(["EUR", "USD", "JPY", "GBP", "CHF"], "USD"),
    ).toEqual(["USD", "EUR", "JPY", "GBP", "CHF"]);
    expect(
      updateRecentCurrencies(["EUR", "USD", "JPY", "GBP", "CHF"], "PLN"),
    ).toEqual(["PLN", "EUR", "USD", "JPY", "GBP"]);
  });

  it("uses Tailwind utility classes and the Tailwind Prettier class sorter", () => {
    expect(app).toContain('className="');
    expect(styles).not.toContain(".hero {");
    expect(packageJson).toContain("tailwindcss");
    expect(packageJson).toContain("prettier-plugin-tailwindcss");
  });

  it("configures TanStack Router file-based routing without TanStack Start", () => {
    const viteConfig = readFileSync(
      new URL("../vite.config.ts", import.meta.url),
      "utf8",
    );
    const routeTree = readFileSync(
      new URL("./routeTree.gen.ts", import.meta.url),
      "utf8",
    );
    const indexRoute = readFileSync(
      new URL("./routes/index.tsx", import.meta.url),
      "utf8",
    );

    expect(packageJson).toContain('"@tanstack/react-router"');
    expect(packageJson).toContain('"@tanstack/router-plugin"');
    expect(packageJson).not.toContain("@tanstack/react-start");
    expect(viteConfig).toContain("tanstackRouter");
    expect(routeTree).toContain("FileRoutesByPath");
    expect(indexRoute).toContain('createFileRoute("/")');
  });

  it("uses equals signs for live conversion results", () => {
    expect(app).toContain("`1 ${source} = ${");
    expect(app).toContain(
      '`${SYMBOLS[source] || ""}${amount} = ${SYMBOLS[target] || ""}${exactValue.toLocaleString',
    );
    expect(app).not.toContain("`1 ${source} ≈ ${");
    expect(app).not.toContain(
      '`${SYMBOLS[source] || ""}${amount} ≈ ${SYMBOLS[target] || ""}${exactValue.toLocaleString',
    );
  });

  it("shows a green indicator for ready and cached rates", () => {
    expect(rateIndicatorClass("ready")).toBe("bg-[#1c9c53]");
    expect(rateIndicatorClass("cached")).toBe("bg-[#1c9c53]");
  });

  it("keeps yellow for loading and red for failed rate requests", () => {
    expect(rateIndicatorClass("loading")).toBe("bg-[#e5a520]");
    expect(rateIndicatorClass("error")).toBe("bg-[#d03238]");
  });

  it("positions a picker search input 35% down the keyboard-safe viewport after focus", () => {
    const scrollBy = vi.fn();
    const input = {
      getBoundingClientRect: () => ({ top: 620 }),
      ownerDocument: {
        defaultView: {
          innerHeight: 1000,
          scrollBy,
          visualViewport: { height: 800 },
        },
      },
    };
    scrollIntoViewForKeyboard(input);
    expect(scrollBy).not.toHaveBeenCalled();
    vi.advanceTimersByTime(150);
    expect(scrollBy).toHaveBeenCalledWith({ behavior: "smooth", top: 340 });
  });

  it("returns separate easiest and lowest-error featured methods", () => {
    const featured = selectFeaturedMethods(findMentalMethods(0.86, 12));
    expect(featured.easiest).toBeDefined();
    expect(featured.lowestError).toBeDefined();
    expect(featured.easiest?.effort).toBeLessThanOrEqual(
      featured.lowestError?.effort ?? Infinity,
    );
    expect(featured.lowestError?.errorPercent).toBeLessThanOrEqual(
      featured.easiest?.errorPercent ?? Infinity,
    );
  });

  it("handles empty method collections and rejects invalid rates", () => {
    expect(selectFeaturedMethods([])).toEqual({
      easiest: null,
      lowestError: null,
    });
    expect(findMentalMethods(0)).toEqual([]);
    expect(findMentalMethods(-1)).toEqual([]);
    expect(findMentalMethods(Number.NaN)).toEqual([]);
  });

  it("preserves empty amounts and covers every rate-indicator state", () => {
    expect(normalizeAmountInput("")).toBe("");
    expect(rateIndicatorClass("ready")).toBe("bg-[#1c9c53]");
    expect(rateIndicatorClass("cached")).toBe("bg-[#1c9c53]");
  });

  it("supports large place-value shifts as one harder step", () => {
    const tenThousand = findMentalMethods(10000, 50).find(
      (method) => method.steps.length === 1 && method.steps[0].factor === 10000,
    );
    const millionth = findMentalMethods(0.000001, 50).find(
      (method) =>
        method.steps.length === 1 && method.steps[0].factor === 0.000001,
    );
    expect(tenThousand.steps).toHaveLength(1);
    expect(millionth.steps).toHaveLength(1);
    expect(tenThousand.effort).toBeGreaterThan(1);
  });

  it("formats percentage instructions strictly between divide and multiply by two", () => {
    expect(formatStep({ factor: 0.9 })).toBe("subtract 10%");
    expect(formatStep({ factor: 0.6 })).toBe("subtract 40%");
    expect(formatStep({ factor: 1.75 })).toBe("add 75%");
    expect(formatStep({ factor: 0.5 })).toBe("divide by 2");
    expect(formatStep({ factor: 2 })).toBe("multiply by 2");
    expect(formatStep({ factor: 1000 })).toBe("multiply by 1,000");
  });

  it("clears prior rate details before fetching an uncached currency pair", () => {
    expect(app).toContain(`    } else {
      setRate(null);
      setDate("");
      setStatus("loading");
    }
    fetch(\`https://api.frankfurter.dev/v2/rate/\${source}/\${target}\`)`);
  });

  it("returns a cached rate for the selected currency pair", () => {
    const storage = new Map();
    const cache: StorageLike = {
      getItem: (key) => storage.get(key) ?? null,
      setItem: (key, value) => {
        storage.set(key, value);
      },
    };

    saveCachedRate(cache, "EUR", "PLN", { rate: 4.25, date: "2026-08-14" });

    expect(getCachedRate(cache, "EUR", "PLN")).toEqual({
      rate: 4.25,
      date: "2026-08-14",
    });
  });

  it("rejects missing or malformed cached rates", () => {
    const cache = { getItem: () => "{bad json", setItem: vi.fn() };

    expect(getCachedRate(cache, "EUR", "PLN")).toBeNull();
  });

  it("declares installable PWA metadata and a service worker", () => {
    const html = readFileSync(
      new URL("../index.html", import.meta.url),
      "utf8",
    );
    const manifest = readFileSync(
      new URL("../public/manifest.webmanifest", import.meta.url),
      "utf8",
    );
    const worker = readFileSync(
      new URL("../public/sw.js", import.meta.url),
      "utf8",
    );

    expect(html).toContain('rel="manifest"');
    expect(manifest).toContain('"display": "standalone"');
    expect(worker).toMatch(/self\.addEventListener\(["']fetch["']/);
  });
});
