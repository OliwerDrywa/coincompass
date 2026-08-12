import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { findMentalMethods, formatStep, mergeCurrencyCatalogs, normalizeAmountInput, selectFeaturedMethods, sortCurrencies, toCurrencyCatalog } from './conversion.js'
import { registerServiceWorker } from './pwa.js'
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
const SYMBOLS = { EUR: '€', USD: '$', GBP: '£', JPY: '¥', PLN: 'zł', CHF: 'Fr', CNY: '¥', INR: '₹', KRW: '₩' }
const savedPair = () => {
  try { return JSON.parse(localStorage.getItem(PAIR_KEY)) || {} } catch { return {} }
}
const signedError = (method) => `${method.approxRate >= method.rate ? '+' : '−'}${method.errorPercent.toFixed(1)}%`

function CurrencyPicker({ label, value, onChange, currencies }) {
  const options = useMemo(() => sortCurrencies(currencies), [currencies])
  return <label className="picker"><span>{label}</span><select value={value} onChange={(event) => onChange(event.target.value)}>
    {options.map(([code, name]) => <option key={code} value={code} title={name}>{code} — {name}</option>)}
  </select></label>
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
  const [amountText, setAmountText] = useState('20')
  const [rate, setRate] = useState(null)
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('loading')

  useEffect(() => { fetch('https://api.frankfurter.dev/v2/currencies').then((response) => response.ok ? response.json() : Promise.reject()).then((catalog) => setCurrencies(mergeCurrencyCatalogs(toCurrencyCatalog(catalog)))).catch(() => {}) }, [])
  useEffect(() => { try { localStorage.setItem(PAIR_KEY, JSON.stringify({ source, target })) } catch {} }, [source, target])
  useEffect(() => {
    if (source === target) { setRate(1); setStatus('ready'); setDate('Today'); return }
    setStatus('loading')
    fetch(`https://api.frankfurter.dev/v2/rate/${source}/${target}`)
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((data) => { setRate(data.rate); setDate(data.date); setStatus('ready') })
      .catch(() => setStatus('error'))
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
        <div className="currency-row"><CurrencyPicker label="From" value={source} onChange={setSource} currencies={currencies}/><button className="swap" onClick={() => { setSource(target); setTarget(source) }} aria-label="Swap currencies">⇄</button><CurrencyPicker label="To" value={target} onChange={setTarget} currencies={currencies}/></div>
        <div className="market-rate"><span><i className={status}></i>{status === 'error' ? 'Rate unavailable' : status === 'loading' ? 'Getting live rate…' : `1 ${source} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 5 })} ${target}`}</span><small>{date && `ECB · ${date}`}</small></div>
      </div>
    </section>
    <section className="routes"><div className="section-title"><p>Mental routes</p><h2>{status === 'ready' ? `${SYMBOLS[source] || ''}${amount} ≈ ${SYMBOLS[target] || ''}${exactValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'Finding shortcuts…'}</h2></div>
      <div className="method-grid">{easiest && <MethodCard method={easiest} label="Easiest" highlight amount={amount} exactValue={exactValue} target={target}/>} {lowestError && lowestError !== easiest && <MethodCard method={lowestError} label="Lowest error" amount={amount} exactValue={exactValue} target={target}/>} {alternatives.map((method) => <MethodCard key={method.steps.map((step) => step.id).join('-')} method={method} label="Alternative" amount={amount} exactValue={exactValue} target={target}/>)}</div>
    </section>
    <footer><div className="brand"><span>↻</span> CoinCompass</div><p>Live reference rates: Frankfurter / ECB.</p></footer>
  </main>
}
createRoot(document.getElementById('root')).render(<App />)

registerServiceWorker().catch((error) => console.warn('Service worker registration failed', error))
