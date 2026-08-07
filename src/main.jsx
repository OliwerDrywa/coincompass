import React, { useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { findMentalMethods, formatStep } from './conversion.js'
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

const SYMBOLS = { EUR: '€', USD: '$', GBP: '£', JPY: '¥', PLN: 'zł', CHF: 'Fr', CNY: '¥', INR: '₹', KRW: '₩' }

function CurrencyPicker({ label, value, onChange, currencies }) {
  return <label className="picker">
    <span>{label}</span>
    <select value={value} onChange={(event) => onChange(event.target.value)}>
      {Object.entries(currencies).map(([code, name]) => <option key={code} value={code} title={name}>{code}</option>)}
    </select>
  </label>
}

function MethodCard({ method, index, amount, exactValue, target }) {
  const mentalValue = amount * method.approxRate
  return <article className={`method method-${index + 1}`}>
    <header>
      <span className="rank">{String(index + 1).padStart(2, '0')}</span>
      <div><h3>{index === 0 ? 'Easiest route' : index === 1 ? 'Closer route' : 'Another route'}</h3>
      <p>{method.errorPercent < 0.05 ? 'Exact' : `${method.errorPercent.toFixed(1)}% off`} · effort {method.effort.toFixed(1)}</p></div>
    </header>
    <div className="steps">
      {method.steps.map((step, stepIndex) => <React.Fragment key={`${step.id}-${stepIndex}`}>
        {stepIndex > 0 && <span className="then">then</span>}
        <span className="step">{formatStep(step)}</span>
      </React.Fragment>)}
    </div>
    <div className="result"><span>In your head</span><strong>≈ {SYMBOLS[target] || ''}{mentalValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</strong></div>
    <small>Market result: {(SYMBOLS[target] || '') + exactValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</small>
  </article>
}

function App() {
  const [currencies, setCurrencies] = useState(FALLBACK_CURRENCIES)
  const [source, setSource] = useState('EUR')
  const [target, setTarget] = useState('PLN')
  const [amount, setAmount] = useState(20)
  const [rate, setRate] = useState(null)
  const [date, setDate] = useState('')
  const [status, setStatus] = useState('loading')
  const [query, setQuery] = useState('')

  useEffect(() => {
    fetch('https://api.frankfurter.dev/v1/currencies')
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setCurrencies).catch(() => {})
  }, [])

  useEffect(() => {
    if (source === target) { setRate(1); setStatus('ready'); setDate('Today'); return }
    setStatus('loading')
    fetch(`https://api.frankfurter.dev/v1/latest?from=${source}&to=${target}`)
      .then((response) => response.ok ? response.json() : Promise.reject(new Error('Rates unavailable')))
      .then((data) => { setRate(data.rates[target]); setDate(data.date); setStatus('ready') })
      .catch(() => setStatus('error'))
  }, [source, target])

  const methods = useMemo(() => rate ? findMentalMethods(rate, 3) : [], [rate])
  const filtered = useMemo(() => Object.entries(currencies).filter(([code, name]) => `${code} ${name}`.toLowerCase().includes(query.toLowerCase())).slice(0, 8), [currencies, query])
  const exactValue = amount * (rate || 0)
  const swap = () => { setSource(target); setTarget(source) }
  const chooseCurrency = (code) => { setSource(code); if (code === target) setTarget(code === 'EUR' ? 'USD' : 'EUR'); setQuery('') }

  return <main>
    <nav><a className="brand" href="#top" aria-label="Twist home"><span>↻</span> twist</a><div className="nav-note">MENTAL FX · LIVE RATES</div></nav>

    <section className="hero" id="top">
      <div className="hero-copy"><p className="kicker">Currency conversion, minus the calculator</p><h1>Turn prices<br />into <em>easy maths.</em></h1><p className="intro">Twist finds a short chain of simple operations—double it, halve it, take off 10%—so you can convert prices in your head.</p></div>
      <div className="converter">
        <div className="amount-wrap"><label htmlFor="amount">I’m looking at</label><div><span>{SYMBOLS[source] || source}</span><input id="amount" type="number" min="0" value={amount} onChange={(event) => setAmount(Number(event.target.value))} /></div></div>
        <div className="currency-row"><CurrencyPicker label="From" value={source} onChange={setSource} currencies={currencies}/><button className="swap" onClick={swap} aria-label="Swap currencies">⇄</button><CurrencyPicker label="My currency" value={target} onChange={setTarget} currencies={currencies}/></div>
        <div className="market-rate"><span><i className={status}></i>{status === 'error' ? 'Rate unavailable' : status === 'loading' ? 'Fetching live rate…' : `1 ${source} = ${rate.toLocaleString(undefined, { maximumFractionDigits: 5 })} ${target}`}</span><small>{date && `Updated ${date} · Frankfurter / ECB`}</small></div>
      </div>
    </section>

    <section className="routes">
      <div className="section-title"><p>YOUR MENTAL SHORTCUTS</p><h2>{status === 'ready' ? `${SYMBOLS[source] || ''}${amount || 0} → about ${SYMBOLS[target] || ''}${exactValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : 'Finding a route…'}</h2></div>
      <div className="method-grid">{methods.map((method, index) => <MethodCard key={method.steps.map((s) => s.id).join('-')} method={method} index={index} amount={amount} exactValue={exactValue} target={target} />)}</div>
    </section>

    <section className="index-section">
      <div><p className="kicker">Currency index</p><h2>Where are you going?</h2><p>Search currencies by country, name, or code. Pick one to make it the price you’re converting from.</p></div>
      <div className="search-panel"><label><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search USD, yen, Poland…" /></label><div className="currency-list">{filtered.map(([code, name]) => <button key={code} onClick={() => chooseCurrency(code)}><b>{code}</b><span>{name}</span><i>→</i></button>)}</div></div>
    </section>

    <footer><div className="brand"><span>↻</span> twist</div><p>Live reference rates by Frankfurter, sourced from the European Central Bank. For everyday estimates—not trading.</p></footer>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
