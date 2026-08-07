import React from 'react'
import { createRoot } from 'react-dom/client'
import './style.css'

function App() {
  return <main className="shell">
    <p className="eyebrow">KRAUT × SOFTWARE LOOP</p>
    <h1>Ship the idea.<br /><span>Check the preview.</span></h1>
    <p className="lede">A clean Vercel preview is created for every pull request. Open it on your phone, test the change, then merge with confidence.</p>
    <div className="card"><strong>PR preview pipeline</strong><ol><li>Push a feature branch</li><li>Open a pull request</li><li>Vercel deploys an isolated preview</li><li>Review the URL shared by Hermes</li></ol></div>
  </main>
}

createRoot(document.getElementById('root')).render(<App />)
