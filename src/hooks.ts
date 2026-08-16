import { useEffect, useState } from "react";
import {
  getCachedRate,
  saveCachedRate,
  toCurrencyCatalog,
} from "./conversion.ts";
import type {
  CachedRate,
  CurrencyApiResponse,
  CurrencyCatalog,
  CurrencyCode,
  RateStatus,
} from "./conversion.ts";

type RateDetails = {
  date: string;
  rate: number | null;
  status: RateStatus;
};

const loadStoredCurrencies = (key: string): CurrencyCode[] => {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};

export const useStoredCurrencies = (key: string, limit?: number) => {
  const [currencies, setCurrencies] = useState(() =>
    loadStoredCurrencies(key).slice(0, limit),
  );

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(currencies));
    } catch {}
  }, [currencies, key]);

  return [currencies, setCurrencies] as const;
};

export const useCurrencyCatalog = (): CurrencyCatalog => {
  const [currencies, setCurrencies] = useState<CurrencyCatalog>({});

  useEffect(() => {
    const controller = new AbortController();
    void fetch("https://api.frankfurter.dev/v2/currencies", {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Currency catalog unavailable");
        return response.json() as Promise<CurrencyApiResponse[]>;
      })
      .then((catalog) => setCurrencies(toCurrencyCatalog(catalog)))
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return currencies;
};

export const useExchangeRate = (
  source: CurrencyCode,
  target: CurrencyCode,
): RateDetails => {
  const [details, setDetails] = useState<RateDetails>({
    date: "",
    rate: null,
    status: "loading",
  });

  useEffect(() => {
    if (source === target) {
      setDetails({ date: "Today", rate: 1, status: "ready" });
      return undefined;
    }

    const cached = getCachedRate(localStorage, source, target);
    setDetails(
      cached
        ? { ...cached, status: "cached" }
        : { date: "", rate: null, status: "loading" },
    );

    const controller = new AbortController();
    void fetch(`https://api.frankfurter.dev/v2/rate/${source}/${target}`, {
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("Exchange rate unavailable");
        return response.json() as Promise<CachedRate>;
      })
      .then((rate) => {
        saveCachedRate(localStorage, source, target, rate);
        setDetails({ ...rate, status: "ready" });
      })
      .catch(() => {
        if (!controller.signal.aborted && !cached)
          setDetails({ date: "", rate: null, status: "error" });
      });

    return () => controller.abort();
  }, [source, target]);

  return details;
};
