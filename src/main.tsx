import React, { useEffect, useMemo, useRef, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import { createRoot } from "react-dom/client";
import {
  filterCurrencies,
  findMentalMethods,
  formatStep,
  getCachedRate,
  mergeCurrencyCatalogs,
  normalizeAmountInput,
  rateIndicatorClass,
  saveCachedRate,
  scrollIntoViewForKeyboard,
  selectFeaturedMethods,
  toCurrencyCatalog,
  updateRecentCurrencies,
} from "./conversion.ts";
import "./style.css";
import type {
  CachedRate,
  CurrencyApiResponse,
  CurrencyCatalog,
  CurrencyCode,
  MentalMethod,
  RateStatus,
} from "./conversion.ts";

const FALLBACK_CURRENCIES: CurrencyCatalog = {
  AUD: "Australian Dollar",
  BRL: "Brazilian Real",
  CAD: "Canadian Dollar",
  CHF: "Swiss Franc",
  CNY: "Chinese Renminbi Yuan",
  CZK: "Czech Koruna",
  DKK: "Danish Krone",
  EUR: "Euro",
  GBP: "British Pound",
  HKD: "Hong Kong Dollar",
  HUF: "Hungarian Forint",
  IDR: "Indonesian Rupiah",
  INR: "Indian Rupee",
  ISK: "Icelandic Króna",
  JPY: "Japanese Yen",
  KRW: "South Korean Won",
  MXN: "Mexican Peso",
  MYR: "Malaysian Ringgit",
  NOK: "Norwegian Krone",
  NZD: "New Zealand Dollar",
  PHP: "Philippine Peso",
  PLN: "Polish Złoty",
  RON: "Romanian Leu",
  SEK: "Swedish Krona",
  SGD: "Singapore Dollar",
  THB: "Thai Baht",
  TRY: "Turkish Lira",
  USD: "United States Dollar",
  ZAR: "South African Rand",
};
const PAIR_KEY = "coincompass-last-currency-pair";
const PINS_KEY = "coincompass-pinned-currencies";
const RECENTS_KEY = "coincompass-recent-currencies";
const SYMBOLS: Record<CurrencyCode, string> = {
  EUR: "€",
  USD: "$",
  GBP: "£",
  JPY: "¥",
  PLN: "zł",
  CHF: "Fr",
  CNY: "¥",
  INR: "₹",
  KRW: "₩",
};
const getStoredArray = (key: string): CurrencyCode[] => {
  try {
    const value = JSON.parse(localStorage.getItem(key) ?? "[]");
    return Array.isArray(value)
      ? value.filter((item) => typeof item === "string")
      : [];
  } catch {
    return [];
  }
};
const savedPair = (): Partial<{
  source: CurrencyCode;
  target: CurrencyCode;
}> => {
  try {
    return JSON.parse(localStorage.getItem(PAIR_KEY) ?? "{}");
  } catch {
    return {};
  }
};
type DisplayMentalMethod = MentalMethod & { rate: number };
const signedError = (method: DisplayMentalMethod) =>
  `${method.approxRate >= method.rate ? "+" : "−"}${method.errorPercent.toFixed(1)}%`;

type CurrencyPickerProps = {
  label: string;
  value: CurrencyCode;
  onChange: (currency: CurrencyCode) => void;
  currencies: CurrencyCatalog;
  pinnedCurrencies: CurrencyCode[];
  recentCurrencies: CurrencyCode[];
  onTogglePin: (currency: CurrencyCode) => void;
};

function CurrencyPicker({
  label,
  value,
  onChange,
  currencies,
  pinnedCurrencies,
  recentCurrencies,
  onTogglePin,
}: CurrencyPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState("");
  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!isOpen) return undefined;
    const closeOnOutsidePointer = (event: PointerEvent) => {
      if (
        !(event.target instanceof Node) ||
        !pickerRef.current?.contains(event.target)
      )
        setIsOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointer);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointer);
  }, [isOpen]);
  const matchingCurrencies = useMemo(
    () => filterCurrencies(currencies, query),
    [currencies, query],
  );
  const priorityCurrencies = useMemo(
    () =>
      [...new Set([...pinnedCurrencies, ...recentCurrencies])].flatMap(
        (code) => {
          const name = currencies[code];
          return name &&
            (!query || filterCurrencies({ [code]: name }, query).length)
            ? ([[code, name]] as const)
            : [];
        },
      ),
    [currencies, pinnedCurrencies, query, recentCurrencies],
  );
  const chooseCurrency = (code: CurrencyCode): void => {
    onChange(code);
    setQuery("");
    setIsOpen(false);
  };
  return (
    <div className="relative min-w-0" ref={pickerRef}>
      <span
        id={`${label}-currency-label`}
        className="mb-2 block font-mono text-[11px] font-medium tracking-[.09em] text-[#5b5d58] uppercase"
      >
        {label}
      </span>
      <button
        className="bg-paper grid h-[54px] w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-[14px] border border-[#bfc3b9] px-[13px] text-left"
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        aria-labelledby={`${label}-currency-label`}
      >
        <b className="font-mono text-[13px] font-bold">{value}</b>
        <span className="overflow-hidden text-xs text-ellipsis whitespace-nowrap text-[#5b5d58]">
          {currencies[value]}
        </span>
        <svg
          className={`size-4 self-center stroke-current stroke-2 transition-transform duration-200 ${isOpen ? "rotate-180" : "rotate-0"}`}
          viewBox="0 0 16 16"
          fill="none"
          aria-hidden="true"
        >
          <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {isOpen && (
        <section
          className={`absolute top-[calc(100%+8px)] z-5 w-[min(360px,calc(100vw-40px))] rounded-[18px] border border-[#cfd3ca] bg-white p-3 shadow-[0_18px_50px_#0e0f0c24] ${label === "To" ? "right-0" : "left-0"}`}
          role="dialog"
          aria-label={`Choose ${label.toLowerCase()} currency`}
        >
          <label className="bg-paper flex items-center gap-2 rounded-[11px] border border-[#bfc3b9] px-2.5">
            <span className="sr-only">Search currencies</span>
            <i className="text-xl text-[#5b5d58] not-italic" aria-hidden="true">
              ⌕
            </i>
            <input
              id={`${label}-currency-search`}
              autoFocus
              value={query}
              onFocus={(event: React.FocusEvent<HTMLInputElement>) =>
                scrollIntoViewForKeyboard(event.currentTarget)
              }
              onChange={(event: React.ChangeEvent<HTMLInputElement>) =>
                setQuery(event.target.value)
              }
              placeholder="Search code or currency"
              className="w-full min-w-0 border-0 bg-transparent py-[11px] text-sm outline-0"
            />
          </label>
          <div
            className="scrollbar-coin mt-2.5 max-h-[330px] overflow-y-auto"
            role="listbox"
            aria-label="Currencies"
          >
            {priorityCurrencies.length > 0 && (
              <>
                <p className="mx-2 mt-3.5 mb-1.5 font-mono text-[10px] font-medium tracking-[.1em] text-[#65705e] uppercase first:mt-1">
                  Pinned & recent
                </p>
                {priorityCurrencies.map(([code, name]) => (
                  <CurrencyOption
                    key={`priority-${code}`}
                    code={code}
                    name={name}
                    pinned={pinnedCurrencies.includes(code)}
                    selected={value === code}
                    onChoose={chooseCurrency}
                    onTogglePin={onTogglePin}
                  />
                ))}
              </>
            )}
            {priorityCurrencies.length > 0 && (
              <div className="mx-0.5 my-2.5 h-px bg-[#dfe1da]" />
            )}
            <p className="mx-2 mt-3.5 mb-1.5 font-mono text-[10px] font-medium tracking-[.1em] text-[#65705e] uppercase">
              All currencies
            </p>
            {matchingCurrencies.map(([code, name]) => (
              <CurrencyOption
                key={code}
                code={code}
                name={name}
                pinned={pinnedCurrencies.includes(code)}
                selected={value === code}
                onChoose={chooseCurrency}
                onTogglePin={onTogglePin}
              />
            ))}
            {matchingCurrencies.length === 0 && (
              <p className="mx-2 my-[18px] text-[13px] text-[#72756f]">
                No currencies found.
              </p>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

type CurrencyOptionProps = {
  code: CurrencyCode;
  name: string;
  pinned: boolean;
  selected: boolean;
  onChoose: (currency: CurrencyCode) => void;
  onTogglePin: (currency: CurrencyCode) => void;
};

function CurrencyOption({
  code,
  name,
  pinned,
  selected,
  onChoose,
  onTogglePin,
}: CurrencyOptionProps) {
  return (
    <div
      className="grid grid-cols-[minmax(0,1fr)_auto] items-center rounded-[9px] hover:bg-[#e2f6d5]"
      role="option"
      aria-selected={selected}
    >
      <button
        className="grid min-w-0 grid-cols-[48px_minmax(0,1fr)_auto] items-center gap-2 border-0 bg-transparent px-2 py-2.5 text-left"
        type="button"
        onClick={() => onChoose(code)}
      >
        <b className="font-mono text-xs font-bold">{code}</b>
        <span className="overflow-hidden text-[13px] text-ellipsis whitespace-nowrap text-[#555950]">
          {name}
        </span>
        {selected && (
          <i className="text-[#337121] not-italic" aria-label="Selected">
            ✓
          </i>
        )}
      </button>
      <button
        className={`h-9 w-[38px] rounded-lg border-0 bg-transparent text-xl text-[#687064] hover:bg-[#d8f2c8] hover:text-[#337121] ${pinned ? "bg-[#d8f2c8] text-[#337121]" : ""}`}
        type="button"
        onClick={() => onTogglePin(code)}
        aria-label={`${pinned ? "Unpin" : "Pin"} ${code}`}
        aria-pressed={pinned}
      >
        {pinned ? "★" : "☆"}
      </button>
    </div>
  );
}

type MethodCardProps = {
  method: DisplayMentalMethod;
  label: string;
  amount: number;
  target: CurrencyCode;
  highlight?: boolean;
};

function MethodCard({
  method,
  label,
  amount,
  target,
  highlight = false,
}: MethodCardProps) {
  const mentalValue = amount * method.approxRate;
  return (
    <article
      className={`text-ink flex min-h-[290px] flex-col rounded-[27px] p-6 ${highlight ? "bg-lime -translate-y-2 max-[900px]:translate-y-0" : "bg-paper"}`}
    >
      <header className="flex items-start justify-between gap-[15px]">
        <div>
          <p className="mb-[7px] font-mono text-[10px] font-medium tracking-[.09em] text-[#3f6327] uppercase">
            {label}
          </p>
          <h3 className="m-0 text-[17px] font-bold tracking-[-.03em]">
            {method.steps.length} {method.steps.length === 1 ? "step" : "steps"}{" "}
            · {method.effort.toFixed(1)} effort
          </h3>
        </div>
        <b
          className={`rounded-full bg-[#e2e5dd] px-[9px] py-[7px] font-mono text-[11px] font-medium whitespace-nowrap text-[#343633] ${method.errorPercent < 0.05 ? "bg-paper text-forest" : ""}`}
        >
          {method.errorPercent < 0.05 ? "exact" : signedError(method)}
        </b>
      </header>
      <div className="mt-[45px] mb-auto flex flex-wrap items-center gap-2">
        {method.steps.map((step, index) => (
          <React.Fragment key={`${step.factor}-${index}`}>
            <span className="border-ink rounded-full border px-[13px] py-2.5 font-bold">
              {formatStep(step)}
            </span>
            {index < method.steps.length - 1 && (
              <span className="font-mono text-[10px] text-[#666]">→</span>
            )}
          </React.Fragment>
        ))}
      </div>
      <div className="mt-[35px] border-t border-[#0e0f0c44] pt-5 text-right">
        <strong className="text-[28px] tracking-[-.04em]">
          ≈ {SYMBOLS[target] || ""}
          {mentalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}
        </strong>
      </div>
    </article>
  );
}

function App() {
  const remembered = savedPair();
  const [currencies, setCurrencies] = useState<CurrencyCatalog>(
    mergeCurrencyCatalogs(FALLBACK_CURRENCIES),
  );
  const [source, setSource] = useState<CurrencyCode>(
    remembered.source || "EUR",
  );
  const [target, setTarget] = useState<CurrencyCode>(
    remembered.target || "PLN",
  );
  const [pinnedCurrencies, setPinnedCurrencies] = useState(() =>
    getStoredArray(PINS_KEY),
  );
  const [recentCurrencies, setRecentCurrencies] = useState(() =>
    getStoredArray(RECENTS_KEY).slice(0, 5),
  );
  const [amountText, setAmountText] = useState("20");
  const [rate, setRate] = useState<number | null>(null);
  const [date, setDate] = useState("");
  const [status, setStatus] = useState<RateStatus>("loading");
  useEffect(() => {
    fetch("https://api.frankfurter.dev/v2/currencies")
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((catalog: CurrencyApiResponse[]) =>
        setCurrencies(mergeCurrencyCatalogs(toCurrencyCatalog(catalog))),
      )
      .catch(() => {});
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(PAIR_KEY, JSON.stringify({ source, target }));
    } catch {}
  }, [source, target]);
  useEffect(() => {
    try {
      localStorage.setItem(PINS_KEY, JSON.stringify(pinnedCurrencies));
    } catch {}
  }, [pinnedCurrencies]);
  useEffect(() => {
    try {
      localStorage.setItem(RECENTS_KEY, JSON.stringify(recentCurrencies));
    } catch {}
  }, [recentCurrencies]);
  const selectCurrency =
    (setter: Dispatch<SetStateAction<CurrencyCode>>) =>
    (currency: CurrencyCode): void => {
      setter(currency);
      setRecentCurrencies((current) =>
        updateRecentCurrencies(current, currency),
      );
    };
  const togglePin = (currency: CurrencyCode): void =>
    setPinnedCurrencies((current) =>
      current.includes(currency)
        ? current.filter((item) => item !== currency)
        : [...current, currency],
    );
  useEffect(() => {
    if (source === target) {
      setRate(1);
      setStatus("ready");
      setDate("Today");
      return;
    }
    const cached = getCachedRate(localStorage, source, target);
    if (cached) {
      setRate(cached.rate);
      setDate(cached.date);
      setStatus("cached");
    } else setStatus("loading");
    fetch(`https://api.frankfurter.dev/v2/rate/${source}/${target}`)
      .then((response) => (response.ok ? response.json() : Promise.reject()))
      .then((data: CachedRate) => {
        saveCachedRate(localStorage, source, target, data);
        setRate(data.rate);
        setDate(data.date);
        setStatus("ready");
      })
      .catch(() => {
        if (!cached) setStatus("error");
      });
  }, [source, target]);
  const amount = Number(amountText) || 0;
  const methods = useMemo(
    () =>
      rate !== null
        ? findMentalMethods(rate, 12).map((method) => ({ ...method, rate }))
        : [],
    [rate],
  );
  const { easiest, lowestError } = useMemo(
    () => selectFeaturedMethods(methods),
    [methods],
  );
  const alternatives = methods
    .filter((method) => method !== easiest && method !== lowestError)
    .slice(0, 1);
  const exactValue = amount * (rate || 0);
  const rateDisplay =
    rate?.toLocaleString(undefined, { maximumFractionDigits: 5 }) ?? "";
  return (
    <main className="overflow-hidden">
      <nav className="bg-paper flex h-16 items-center justify-between border-b border-[#0e0f0c22] px-[clamp(20px,5vw,74px)] min-[561px]:h-[76px]">
        <a
          className="text-ink flex items-center gap-[9px] text-[22px] font-black tracking-[-.06em] no-underline"
          href="#top"
          aria-label="CoinCompass home"
        >
          <span className="bg-forest text-lime grid size-[29px] place-items-center rounded-full text-xl">
            ↻
          </span>{" "}
          CoinCompass
        </a>
        <div className="hidden font-mono text-[11px] font-medium tracking-[.13em] uppercase min-[561px]:block">
          Friendly price maths
        </div>
      </nav>
      <section className="hero-surface grid min-h-[650px] grid-cols-1 items-center gap-[clamp(32px,7vw,110px)] px-[clamp(20px,6vw,90px)] py-[clamp(65px,8vw,115px)] min-[901px]:grid-cols-[1.05fr_.95fr]">
        <div className="max-w-[700px]">
          <p className="mb-6 font-mono text-[11px] font-medium tracking-[.13em] text-[#44652c] uppercase">
            Your currency pal
          </p>
          <h1 className="m-0 text-[clamp(58px,7.3vw,112px)] leading-[.84] font-black tracking-[-.085em]">
            Prices, made
            <br />
            <em className="text-[#337121] not-italic">friendly.</em>
          </h1>
          <p className="mt-[35px] max-w-[620px] text-[clamp(17px,1.55vw,22px)] leading-[1.5] text-[#454745]">
            A quick way to turn foreign prices into simple, memorable maths.
          </p>
        </div>
        <div className="max-w-[590px] rounded-[32px] bg-white p-[clamp(22px,3vw,38px)] shadow-[0_0_0_1px_#0e0f0c1f] max-[900px]:max-w-none max-[560px]:rounded-[22px] max-[560px]:p-5">
          <div>
            <label
              htmlFor="amount"
              className="mb-2 block font-mono text-[11px] font-medium tracking-[.09em] text-[#5b5d58] uppercase"
            >
              Price
            </label>
            <div className="border-ink flex items-center border-b-2">
              <span className="text-[30px] font-bold">
                {SYMBOLS[source] || source}
              </span>
              <input
                id="amount"
                inputMode="decimal"
                value={amountText}
                onChange={(event) =>
                  setAmountText(
                    normalizeAmountInput(
                      event.target.value.replace(/[^0-9.]/g, ""),
                    ),
                  )
                }
                className="w-full border-0 bg-transparent px-2.5 pt-1.5 pb-3 text-[clamp(45px,6vw,72px)] font-extrabold tracking-[-.06em] outline-0 max-[560px]:text-[50px]"
              />
            </div>
          </div>
          <div className="mt-[27px] grid grid-cols-[1fr_auto] items-end gap-2.5 min-[561px]:grid-cols-[1fr_auto_1fr]">
            <CurrencyPicker
              label="From"
              value={source}
              onChange={selectCurrency(setSource)}
              currencies={currencies}
              pinnedCurrencies={pinnedCurrencies}
              recentCurrencies={recentCurrencies}
              onTogglePin={togglePin}
            />
            <button
              className="bg-forest text-lime col-start-2 row-start-1 mb-0.5 size-[49px] rounded-full border-0 text-2xl transition-transform duration-200 hover:scale-105 hover:rotate-180"
              onClick={() => {
                setSource(target);
                setTarget(source);
              }}
              aria-label="Swap currencies"
            >
              ⇄
            </button>
            <div className="col-span-2 min-[561px]:col-span-1">
              <CurrencyPicker
                label="To"
                value={target}
                onChange={selectCurrency(setTarget)}
                currencies={currencies}
                pinnedCurrencies={pinnedCurrencies}
                recentCurrencies={recentCurrencies}
                onTogglePin={togglePin}
              />
            </div>
          </div>
          <div className="mt-6 flex justify-between gap-[15px] border-t border-[#dfe1da] pt-[18px] text-[13px]">
            <span className="font-bold">
              <i
                className={`mr-[7px] inline-block size-[7px] rounded-full ${rateIndicatorClass(status)}`}
              ></i>
              {status === "error"
                ? "Rate unavailable — connect once to save this pair"
                : status === "loading"
                  ? "Getting live rate…"
                  : `1 ${source} = ${rateDisplay} ${target}`}
            </span>
            <small className="text-right text-[#72756f]">
              {date &&
                `${status === "cached" ? "Saved rate" : "ECB"} · ${date}`}
            </small>
          </div>
        </div>
      </section>
      <section className="bg-forest px-[clamp(20px,6vw,90px)] py-[clamp(70px,9vw,120px)] text-white">
        <div className="mb-12 block min-[561px]:flex min-[561px]:items-end min-[561px]:justify-between min-[561px]:gap-[30px]">
          <p className="font-mono text-[11px] font-medium tracking-[.13em] text-[#9fe870] uppercase">
            Mental routes
          </p>
          <h2 className="m-0 mt-[15px] text-[clamp(34px,4vw,64px)] leading-[.95] font-bold tracking-[-.055em] min-[561px]:mt-0">
            {rate
              ? `${SYMBOLS[source] || ""}${amount} = ${SYMBOLS[target] || ""}${exactValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}`
              : "Finding shortcuts…"}
          </h2>
        </div>
        <div className="grid max-w-[1180px] grid-cols-1 gap-[18px] min-[901px]:grid-cols-3">
          {easiest && (
            <MethodCard
              method={easiest}
              label="Easiest"
              highlight
              amount={amount}
              target={target}
            />
          )}{" "}
          {lowestError && lowestError !== easiest && (
            <MethodCard
              method={lowestError}
              label="Lowest error"
              amount={amount}
              target={target}
            />
          )}{" "}
          {alternatives.map((method) => (
            <MethodCard
              key={method.steps.map((step) => step.factor).join("-")}
              method={method}
              label="Alternative"
              amount={amount}
              target={target}
            />
          ))}
        </div>
      </section>
      <footer className="bg-ink block px-[clamp(20px,6vw,90px)] py-9 text-white min-[561px]:flex min-[561px]:items-center min-[561px]:justify-between min-[561px]:gap-[30px]">
        <div className="flex items-center gap-[9px] text-[22px] font-black tracking-[-.06em]">
          <span className="bg-forest text-lime grid size-[29px] place-items-center rounded-full text-xl">
            ↻
          </span>{" "}
          CoinCompass
        </div>
        <p className="mt-[25px] max-w-[600px] text-left text-xs leading-[1.5] text-[#aeb1aa] min-[561px]:mt-0 min-[561px]:text-right">
          Live reference rates: Frankfurter / ECB.
        </p>
      </footer>
    </main>
  );
}
if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js");
const root = document.getElementById("root");
if (!root) throw new Error("Missing root element");
createRoot(root).render(<App />);
