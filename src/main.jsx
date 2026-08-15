import React, { useEffect, useMemo, useRef, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { filterCurrencies, findMentalMethods, formatStep, getCachedRate, mergeCurrencyCatalogs, normalizeAmountInput, saveCachedRate, scrollIntoViewForKeyboard, selectFeaturedMethods, toCurrencyCatalog, updateRecentCurrencies } from './conversion.js'
import './style.css'

const FALLBACK_CURRENCIES = {
  AUD: 'Australian Dollar', BRL: 'Brazilian Real', CAD: 'Canadian Dollar', CHF: 'Swiss Franc',
  CNY: 'Chinese Renminbi Yuan', CZK: 'Czech Koruna', DKK: 'Danish Krone', EUR: 'Euro',
  GBP: 'British Pound', HKD: 'Hong Kong Dollar', HUF: 'Hungarian Forint', IDR: 'Indonesian Rupiah',
  INR: 'Indian Rupee', ISK: 'Icelandic Króna', JPY: 'Japanese Yen', KRW: 'South Korean Won',
  MXN: 'Mexican Peso', MYR: 'Malaysian Ringgit', NOK: 'Norwegian Krone', NZD: 'New Zealand Dollar',
  PHP: 'Philippine Peso', PLN: 'Polish Złoty', RON: 'Romanian Leu', SEK: 'Swedish Krona',
  SGD: 'Singapore Dollar', THB: 'Thai Baht', TRY: 'Turkish Lira', USD: 'United States Dollar', ZAR: 'South African Rand',
}
const PAIR_KEY = 'coincompass-last-currency-pair'
const PINS_KEY = 'coincompass-pinned-currencies'
const RECENTS_KEY = 'coincompass-recent-currencies'
const SYMBOLS = { EUR: '€', USD: '$', GBP: '£', JPY: '¥', PLN: 'zł', CHF: 'Fr', CNY: '¥', INR: '₹', KRW: '₩' }
const getStoredArray = (key) => {
  try {
    const value = JSON.parse(localStorage.getItem(key))
    return Array.isArray(value) ? value.filter((item) => typeof item === 'string') : []
  } catch { return [] }
}
const savedPair = () => {
  try { return JSON.parse(localStorage.getItem(PAIR_KEY)) || {} } catch { return {} }
}
const signedError = (method) => `${method.approxRate >= method.rate ? '+' : '−'}${method.errorPercent.toFixed(1)}%`

function CurrencyPicker({ label, value, onChange, currencies, pinnedCurrencies, recentCurrencies, onTogglePin }) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const pickerRef = useRef(null)
  useEffect(() => {
    if (!isOpen) return undefined
    const closeOnOutsidePointer = (event) => {
      if (!pickerRef.current?.contains(event.target)) setIsOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutsidePointer)
    return () => document.removeEventListener('pointerdown', closeOnOutsidePointer)
  }, [isOpen])
  const matchingCurrencies = useMemo(() => filterCurrencies(currencies, query), [currencies, query])
  const priorityCurrencies = useMemo(() => [...new Set([...pinnedCurrencies, ...recentCurrencies])]
    .map((code) => [code, currencies[code]])
    .filter(([code, name]) => name && (!query || filterCurrencies({ [code]: name }, query).length)), [currencies, pinnedCurrencies, query, recentCurrencies])
  const chooseCurrency = (code) => {
    onChange(code)
    setQuery('')
    setIsOpen(false)
  }
  return <div className="picker" ref={pickerRef}>
    <span id={`${label}-currency-label`}>{label}</span>
    <button className="picker-trigger" type="button" onClick={() => setIsOpen((open) => !open)} aria-expanded={isOpen} aria-haspopup="dialog" aria-labelledby={`${label}-currency-label`}>
      <b>{value}</b><span>{currencies[value]}</span><i aria-hidden="true">⌄</i>
    </button>
    {isOpen && <section className="currency-popover" role="dialog" aria-label={`Choose ${label.toLowerCase()} currency`}>
      <label className="currency-search"><span className="sr-only">Search currencies</span><i aria-hidden="true">⌕</i><input id={`${label}-currency-search`} autoFocus value={query} onFocus={(event) => scrollIntoViewForKeyboard(event.currentTarget)} onChange={(event) => setQuery(event.target.value)} placeholder="Search code or currency" /></label>
      <div className="currency-scroll" role="listbox" aria-label="Currencies">
        {priorityCurrencies.length > 0 && <><p className="currency-section-title">Pinned & recent</p>{priorityCurrencies.map(([code, name]) => <CurrencyOption key={`priority-${code}`} code={code} name={name} pinned={pinnedCurrencies.includes(code)} selected={value === code} onChoose={chooseCurrency} onTogglePin={onTogglePin}/>)}</>}
        {priorityCurrencies.length > 0 && <div className="currency-separator" />}
        <p className="currency-section-title">All currencies</p>
        {matchingCurrencies.map(([code, name]) => <CurrencyOption key={code} code={code} name={name} pinned={pinnedCurrencies.includes(code)} selected={value === code} onChoose={chooseCurrency} onTogglePin={onTogglePin}/>) }
        {matchingCurrencies.length === 0 && <p className="currency-empty">No currencies found.</p>}
      </div>
    </section>}
  </div>
}

function CurrencyOption({ code, name, pinned, selected, onChoose, onTogglePin }) {
  return <div className="currency-option" role="option" aria-selected={selected}>
    <button className="currency-choice" type="button" onClick={() => onChoose(code)}><b>{code}</b><span>{name}</span>{selected && <i aria-label="Selected">✓</i>}</button>
    <button className={`pin-button ${pinned ? 'is-pinned' : ''}`} type="button" onClick={() => onTogglePin(code)} aria-label={`${pinned ? 'Unpin' : 'Pin'} ${code}`} aria-pressed={pinned}>{pinned ? '★' : '☆'}</button>
  </div>
}

function MethodCard({ method, label, amount, exactValue, target, highlight }) {
  const mentalValue = amount * method.approxRate
  return <article className={`method ${highlight ? 'method-highlight' : ''}`}>
    <header><div><p className="method-label">{label}</p><h3>{method.steps.length} {method.steps.length === 1 ? 'step' : 'steps'} · {method.effort.toFixed(1)} effort</h3></div><b className={method.errorPercent < 0.05 ? 'error exact' : 'error'}>{method.errorPercent < 0.05 ? 'exact' : signedError(method)}</b></header>
    <div className="steps">{method.steps.map((step, index) => <React.Fragment key={`${step.id}-${index}`}><span className="step">{formatStep(step)}</span>{index < method.steps.length - 1 && <span className="then">→</span>}</React.Fragment>)}</div>
    <div className="result"><span>Head result</span><strong>≈ {SYMBOLS[target] || ''}{mentalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
    <small>Live: {(SYMBOLS[target] || '') + exactValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</small>
  </article>
}

function App() {
  const remembered = savedPair()
  const [currencies, setCurrencies] = useState(mergeCurrencyCatalogs(FALLBACK_CURRENCIES))
  const [source, setSource] = useState(remembered.source || 'EUR')
  const [target, setTarget] = useState(remembered.target || 'PLN')
  const [pinnedCurrencies, setPinnedCurrencies] = useState(() => getStoredArray(PINS_KEY))
  const [recentCurrencies, setRecentCurrencies] = useState(() => getStoredArray(RECENTS_KEY).slice(0, 5))
  const [amountText, setAmountText] = useState('20')
  const [rate, setRate] = useState(null)
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('loading')

  useEffect(() => { fetch('https://api.frankfurter.dev/v2/currencies').then((response) => response.ok ? response.json() : Promise.reject()).then((catalog) => setCurrencies(mergeCurrencyCatalogs(toCurrencyCatalog(catalog)))).catch(() => {}) }, [])
  useEffect(() => { try { localStorage.setItem(PAIR_KEY, JSON.stringify({ source, target })) } catch {} }, [source, target])
  useEffect(() => { try { localStorage.setItem(PINS_KEY, JSON.stringify(pinnedCurrencies)) } catch {} }, [pinnedCurrencies])
  useEffect(() => { try { localStorage.setItem(RECENTS_KEY, JSON.stringify(recentCurrencies)) } catch {} }, [recentCurrencies])
  const selectCurrency = (setter) => (currency) => {
    setter(currency)
    setRecentCurrencies((current) => updateRecentCurrencies(current, currency))
  }
  const togglePin = (currency) => setPinnedCurrencies((current) => current.includes(currency) ? current.filter((item) => item !== currency) : [...current, currency])
  useEffect(() => {
    if (source === target) { setRate(1); setStatus('ready'); setDate('Today'); return }
    const cached = getCachedRate(localStorage, source, target)
    if (cached) { setRate(cached.rate); setDate(cached.date); setStatus('cached') } else setStatus('loading')
    fetch(`https://api.frankfurter.dev/v2/rate/${source}/${target}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { saveCachedRate(localStorage, source, target, data); setRate(data.rate); setDate(data.date); setStatus('ready') })
      .catch(() => { if (!cached) setStatus('error') })
  }, [source, target])

  const amount = Number(amountText) || 0
  const methods = useMemo(() => rate ? findMentalMethods(rate, 12).map((method) => ({ ...method, rate })) : [], [rate])
  const { easiest, lowestError } = useMemo(() => selectFeaturedMethods(methods), [methods])
  const alternatives = methods.filter((method) => method !== easiest && method !== lowestError).slice(0, 1)
  const exactValue = amount * (rate || 0)

  return <main>
    <nav><a className="brand" href="#top" aria-label="CoinCompass home"><span>↻</span> CoinCompass</a><div className="nav-note">Friendly price maths</div></nav>
    <section className="hero" id="top">
      <div className="hero-copy"><p className="kicker">Your currency pal</p><h1>Prices, made<br /><em>friendly.</em></h1><p className="intro">A quick way to turn foreign prices into simple, memorable maths.</p></div>
      <div className="converter">
        <div className="amount-wrap"><label htmlFor="amount">Price</label><div><span>{SYMBOLS[source] || source}</span><input id="amount" inputMode="decimal" value={amountText} onChange={(event) => setAmountText(normalizeAmountInput(event.target.value.replace(/[^0-9.]/g, '')))} /></div></div>
        <div className="currency-row"><CurrencyPicker label="From" value={source} onChange={selectCurrency(setSource)} currencies={currencies} pinnedCurrencies={pinnedCurrencies} recentCurrencies={recentCurrencies} onTogglePin={togglePin}/><button className="swap" onClick={() => { setSource(target); setTarget(source) }} aria-label="Swap currencies">⇄</button><CurrencyPicker label="To" value={target} onChange={selectCurrency(setTarget)} currencies={currencies} pinnedCurrencies={pinnedCurrencies} recentCurrencies={recentCurrencies} onTogglePin={togglePin}/></div>
        <div className="market-rate"><span><i className={status}></i>{status === 'error' ? 'Rate unavailable — connect once to save this pair' : status === 'loading' ? 'Getting live rate…' : `1 ${source} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 5 })} ${target}`}</span><small>{date && `${status === 'cached' ? 'Saved rate' : 'ECB'} · ${date}`}</small></div>
      </div>
    </section>
    <section className="routes"><div className="section-title"><p>Mental routes</p><h2>{rate ? `${SYMBOLS[source] || ''}${amount} ≈ ${SYMBOLS[target] || ''}${exactValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'Finding shortcuts…'}</h2></div>
      <div className="method-grid">{easiest && <MethodCard method={easiest} label="Easiest" highlight amount={amount} exactValue={exactValue} target={target}/>} {lowestError && lowestError !== easiest && <MethodCard method={lowestError} label="Lowest error" amount={amount} exactValue={exactValue} target={target}/>} {alternatives.map((method) => <MethodCard key={method.steps.map((step) => step.id).join('-')} method={method} label="Alternative" amount={amount} exactValue={exactValue} target={target}/>)}</div>
    </section>
    <footer><div className="brand"><span>↻</span> CoinCompass</div><p>Live reference rates: Frankfurter / ECB.</p></footer>
  </main>
}
if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js')

createRoot(document.getElementById('root')).render(<App />)
