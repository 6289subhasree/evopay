import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { RotateCcw, ShieldAlert, ShieldCheck } from 'lucide-react'
import { AskAnalystCard } from '../components/AnalystAI'
import { scoreSignals, WEIGHTS, type Signals } from '../lib/riskModel'

const NORMAL: Signals = { transaction_velocity: 1, amount_deviation: 0.2, failed_attempts: 0, historical_spending_deviation: 0.2, location_change: false, merchant_frequency: 1, device_sharing: 0, connected_high_risk_entities: 0, suspicious_relationships: 0 }

const PRESETS: { name: string; blurb: string; signals: Signals }[] = [
  { name: 'Normal purchase', blurb: 'Regular customer, usual city, own phone', signals: NORMAL },
  { name: 'Account takeover', blurb: 'New city, new device, unusual spend', signals: { ...NORMAL, location_change: true, historical_spending_deviation: 2.6, amount_deviation: 2.4, failed_attempts: 2, transaction_velocity: 4 } },
  { name: 'Card testing', blurb: 'Rapid micro-payments, many declines', signals: { ...NORMAL, transaction_velocity: 14, failed_attempts: 5, amount_deviation: 0.4, device_sharing: 4, merchant_frequency: 6, historical_spending_deviation: 1 } },
  { name: 'Money mule ring', blurb: 'Shared devices, linked risky accounts', signals: { ...NORMAL, device_sharing: 9, connected_high_risk_entities: 8, suspicious_relationships: 5, merchant_frequency: 5, transaction_velocity: 9, amount_deviation: 1.8, failed_attempts: 2, historical_spending_deviation: 1.4 } },
]

type SliderKey = Exclude<keyof Signals, 'location_change'>
const SLIDERS: { key: SliderKey; label: string; hint: string; max: number; step: number }[] = [
  { key: 'transaction_velocity', label: 'Transaction velocity', hint: 'payments in the last few minutes', max: 20, step: 1 },
  { key: 'amount_deviation', label: 'Amount deviation', hint: 'how far from the usual amount', max: 3, step: 0.1 },
  { key: 'failed_attempts', label: 'Failed attempts', hint: 'declined tries before this one', max: 5, step: 1 },
  { key: 'historical_spending_deviation', label: 'Spending vs history', hint: 'change from the customer’s baseline', max: 3, step: 0.1 },
  { key: 'merchant_frequency', label: 'Merchant concentration', hint: 'repeat hits on one merchant', max: 10, step: 1 },
  { key: 'device_sharing', label: 'Device sharing', hint: 'accounts using this device', max: 10, step: 1 },
  { key: 'connected_high_risk_entities', label: 'Risky connections', hint: 'linked high-risk entities', max: 10, step: 1 },
  { key: 'suspicious_relationships', label: 'Suspicious relationships', hint: 'odd links in the entity graph', max: 8, step: 1 },
]

const TONE: Record<string, string> = { ALLOW: 'allow', VERIFY: 'verify', HOLD: 'hold', BLOCK: 'block' }

export default function Playground() {
  const [signals, setSignals] = useState<Signals>(PRESETS[2].signals)
  const [preset, setPreset] = useState(PRESETS[2].name)
  const result = useMemo(() => scoreSignals(signals), [signals])
  const set = (key: keyof Signals, value: number | boolean) => { setPreset('Custom'); setSignals((current) => ({ ...current, [key]: value })) }

  const parts = [
    { name: 'ML classifier', value: result.ml, weight: WEIGHTS.ml },
    { name: 'Graph intelligence', value: result.graph, weight: WEIGHTS.graph },
    { name: 'Anomaly detection', value: result.anomaly, weight: WEIGHTS.anomaly },
    { name: 'Behavioural analysis', value: result.behavior, weight: WEIGHTS.behavior },
  ]
  const circumference = 2 * Math.PI * 88

  return <div className="playground-page">
    <div className="data-page-heading"><div><p className="eyebrow">Risk playground · Explainability</p><h1>What-If Lab</h1><p className="subheading">Move any signal and watch the risk engine re-score the payment instantly — the same four-signal formula and decision bands the backend uses.</p></div></div>

    <div className="preset-row">{PRESETS.map((item) => <button key={item.name} className={`preset ${preset === item.name ? 'active' : ''}`} onClick={() => { setPreset(item.name); setSignals(item.signals) }}><b>{item.name}</b><small>{item.blurb}</small></button>)}</div>

    <div className="playground-grid">
      <section className="glass-card playground-controls">
        <div className="section-heading"><div><p className="eyebrow">Inputs</p><h2>Payment signals</h2></div><button className="text-button" onClick={() => { setPreset(PRESETS[0].name); setSignals(NORMAL) }}><RotateCcw size={13} /> Reset</button></div>
        {SLIDERS.map((slider) => <label className="pg-slider" key={slider.key}>
          <span><b>{slider.label}</b><small>{slider.hint}</small></span>
          <output>{Number(signals[slider.key]).toFixed(slider.step < 1 ? 1 : 0)}</output>
          <input type="range" min={0} max={slider.max} step={slider.step} value={signals[slider.key]} onChange={(event) => set(slider.key, Number(event.target.value))} style={{ ['--fill' as string]: `${(Number(signals[slider.key]) / slider.max) * 100}%` }} />
        </label>)}
        <label className="pg-toggle"><input type="checkbox" checked={signals.location_change} onChange={(event) => set('location_change', event.target.checked)} /><i /><span><b>Location changed</b><small>payment from an unusual city</small></span></label>
      </section>

      <section className="glass-card playground-result">
        <p className="eyebrow">Live decision</p>
        <div className="pg-ring">
          <svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="88" className="track" /><motion.circle cx="100" cy="100" r="88" className={`fill ${TONE[result.decision]}`} strokeDasharray={circumference} animate={{ strokeDashoffset: circumference * (1 - result.final / 100) }} transition={{ type: 'spring', stiffness: 120, damping: 20 }} /></svg>
          <div><motion.strong key={result.final} initial={{ opacity: .4, y: 6 }} animate={{ opacity: 1, y: 0 }}>{result.final}</motion.strong><span>{result.level} risk</span></div>
        </div>
        <div className={`pg-decision ${TONE[result.decision]}`}>{result.decision === 'ALLOW' ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}{result.decision}<small>{result.decision === 'ALLOW' ? 'Payment goes through' : result.decision === 'VERIFY' ? 'Ask for OTP / step-up' : result.decision === 'HOLD' ? 'Sent to analyst queue' : 'Payment stopped'}</small></div>
        <div className="pg-bands">{['ALLOW', 'VERIFY', 'HOLD', 'BLOCK'].map((band, i) => <span key={band} className={result.decision === band ? `on ${TONE[band]}` : ''}>{band}<small>{['0–30', '31–60', '61–80', '81–100'][i]}</small></span>)}</div>

        <h3>How the score is built</h3>
        {parts.map((part) => <div className="pg-part" key={part.name}>
          <span>{part.name}<small>{part.value} × {Math.round(part.weight * 100)}%</small></span>
          <div><motion.i animate={{ width: `${part.value}%` }} transition={{ type: 'spring', stiffness: 140, damping: 22 }} /></div>
          <b>+{(part.value * part.weight).toFixed(1)}</b>
        </div>)}

        <h3>Why</h3>
        <ul className="pg-reasons">{result.reasons.length ? result.reasons.map((reason) => <li key={reason}><ShieldAlert size={13} />{reason}</li>) : <li className="ok"><ShieldCheck size={13} />No signal crossed its alert threshold</li>}</ul>
      </section>
    </div>

    <AskAnalystCard mode="scenario" context={{ preset, signals, scores: result }} title="Gemini explains this scenario" />
  </div>
}
