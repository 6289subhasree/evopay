import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Ban, CheckCircle2, Clock3, KeyRound, MapPin, RotateCcw, Smartphone, Zap } from 'lucide-react'
import { scoreSignals, type Signals } from '../lib/riskModel'

const MERCHANTS = ['Swiggy Instamart', 'Croma Electronics', 'IRCTC', 'New Merchant 4412', 'Zara Bandra']
const USUAL_SPEND = 2000
const WINDOW_MS = 2 * 60 * 1000

type Outcome = 'ALLOW' | 'VERIFY' | 'HOLD' | 'BLOCK'
type Attempt = { id: number; merchant: string; amount: number; score: number; decision: Outcome; final: string; ms: number; at: number }

const SCENARIOS: { name: string; merchant: string; amount: number; newDevice: boolean; newCity: boolean }[] = [
  { name: 'Groceries at home', merchant: 'Swiggy Instamart', amount: 640, newDevice: false, newCity: false },
  { name: 'Big buy, new phone', merchant: 'Croma Electronics', amount: 74990, newDevice: true, newCity: false },
  { name: 'Stolen phone, new city', merchant: 'New Merchant 4412', amount: 18500, newDevice: true, newCity: true },
]

/**
 * Customer-side view of EvoPay: a UPI checkout scored in real time.
 * Each tap of "Pay" counts toward velocity, so hammering the button looks like card testing.
 */
export default function Checkout() {
  const [merchant, setMerchant] = useState(MERCHANTS[0])
  const [amount, setAmount] = useState(640)
  const [newDevice, setNewDevice] = useState(false)
  const [newCity, setNewCity] = useState(false)
  const [attempts, setAttempts] = useState<Attempt[]>([])
  const [screen, setScreen] = useState<'form' | 'scoring' | Outcome>('form')
  const [otp, setOtp] = useState('')
  const [otpFails, setOtpFails] = useState(0)
  const [current, setCurrent] = useState<Attempt | null>(null)
  const timer = useRef<number | null>(null)
  useEffect(() => () => { if (timer.current) window.clearTimeout(timer.current) }, [])

  const signals = useMemo<Signals>(() => {
    const recent = attempts.filter((attempt) => Date.now() - attempt.at < WINDOW_MS).length
    return {
      transaction_velocity: recent * 2,
      amount_deviation: Math.max(0, Math.min(3, Math.log2(Math.max(amount, 1) / USUAL_SPEND) + (amount > USUAL_SPEND ? 0.5 : 0))),
      failed_attempts: otpFails + attempts.filter((attempt) => Date.now() - attempt.at < WINDOW_MS && (attempt.decision === 'BLOCK' || attempt.final === 'OTP failed')).length,
      historical_spending_deviation: amount > USUAL_SPEND * 5 ? 1.6 : amount > USUAL_SPEND * 2 ? 0.8 : 0.2,
      location_change: newCity,
      merchant_frequency: merchant.startsWith('New Merchant') ? 5 : 1,
      device_sharing: newDevice ? 3 : 0,
      connected_high_risk_entities: merchant.startsWith('New Merchant') ? 2 : 0,
      suspicious_relationships: newDevice && newCity ? 3 : 0,
    }
  }, [amount, merchant, newDevice, newCity, attempts, otpFails])
  const preview = useMemo(() => scoreSignals(signals), [signals])

  const pay = () => {
    if (!amount || amount < 1) return
    const started = performance.now()
    const result = scoreSignals(signals)
    const ms = Math.max(1, Math.round((performance.now() - started) * 100) / 100)
    const attempt: Attempt = { id: Date.now(), merchant, amount, score: result.final, decision: result.decision as Outcome, final: result.decision === 'ALLOW' ? 'Paid' : result.decision === 'VERIFY' ? 'Awaiting OTP' : result.decision === 'HOLD' ? 'Under review' : 'Declined', ms, at: Date.now() }
    setCurrent(attempt)
    setAttempts((list) => [attempt, ...list].slice(0, 12))
    setScreen('scoring')
    setOtp('')
    timer.current = window.setTimeout(() => setScreen(attempt.decision), 650)
  }

  const submitOtp = () => {
    if (!current) return
    const ok = otp === '123456'
    if (!ok) setOtpFails((value) => value + 1)
    const final = ok ? 'Paid after OTP' : 'OTP failed'
    setAttempts((list) => list.map((attempt) => attempt.id === current.id ? { ...attempt, final } : attempt))
    setScreen(ok ? 'ALLOW' : 'BLOCK')
  }

  const apply = (scenario: typeof SCENARIOS[number]) => { setMerchant(scenario.merchant); setAmount(scenario.amount); setNewDevice(scenario.newDevice); setNewCity(scenario.newCity); setScreen('form') }
  const reset = () => { setAttempts([]); setOtpFails(0); setScreen('form'); setCurrent(null) }

  return <div className="checkout-page">
    <div className="data-page-heading"><div><p className="eyebrow">Live checkout · Customer view</p><h1>Pay With EvoPay</h1><p className="subheading">This is what your customer sees. Every payment is scored before it completes — good customers sail through, risky ones get an OTP, a review or a block.</p></div></div>

    <div className="scenario-chips">{SCENARIOS.map((scenario) => <button key={scenario.name} onClick={() => apply(scenario)}><Zap size={13} />{scenario.name}</button>)}<button onClick={reset}><RotateCcw size={13} />Reset session</button></div>

    <div className="checkout-grid">
      <div className="phone">
        <div className="phone-notch" />
        <div className="phone-screen">
          <div className="phone-top"><span>9:41</span><span>EvoPay ✓</span></div>
          <AnimatePresence initial={false}>
            {screen === 'form' && <motion.div key="form" className="pay-form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <p className="pay-label">Paying to</p>
              <select value={merchant} onChange={(event) => setMerchant(event.target.value)}>{MERCHANTS.map((name) => <option key={name}>{name}</option>)}</select>
              <p className="pay-label">Amount</p>
              <div className="pay-amount"><span>₹</span><input inputMode="numeric" value={amount ? amount.toLocaleString('en-IN') : ''} onChange={(event) => setAmount(Number(event.target.value.replace(/[^\d]/g, '')) || 0)} /></div>
              <div className="pay-toggles">
                <button className={newDevice ? 'on' : ''} onClick={() => setNewDevice((value) => !value)}><Smartphone size={14} />{newDevice ? 'New device' : 'My usual phone'}</button>
                <button className={newCity ? 'on' : ''} onClick={() => setNewCity((value) => !value)}><MapPin size={14} />{newCity ? 'Different city' : 'Home city'}</button>
              </div>
              <button className="pay-button" onClick={pay}>Pay ₹{(amount || 0).toLocaleString('en-IN')}</button>
              <p className="pay-hint">Tip: tap Pay several times quickly — that’s what card testing looks like.</p>
            </motion.div>}
            {screen === 'scoring' && <motion.div key="scoring" className="pay-state" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}><div className="pay-spinner" /><b>Checking this payment…</b><small>EvoPay is scoring 4 signals</small></motion.div>}
            {screen === 'ALLOW' && <motion.div key="allow" className="pay-state ok" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><CheckCircle2 size={54} /><b>Payment successful</b><small>₹{current?.amount.toLocaleString('en-IN')} to {current?.merchant}</small><button className="pay-again" onClick={() => setScreen('form')}>Done</button></motion.div>}
            {screen === 'VERIFY' && <motion.div key="verify" className="pay-state verify" initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}><KeyRound size={44} /><b>Quick security check</b><small>Enter the OTP sent to your phone (demo: 123456)</small><input className="otp" inputMode="numeric" maxLength={6} value={otp} onChange={(event) => setOtp(event.target.value.replace(/\D/g, ''))} placeholder="••••••" /><button className="pay-button" onClick={submitOtp} disabled={otp.length !== 6}>Verify & pay</button></motion.div>}
            {screen === 'HOLD' && <motion.div key="hold" className="pay-state hold" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><Clock3 size={50} /><b>Payment under review</b><small>We’re confirming this payment with you. Most reviews finish in a few minutes.</small><button className="pay-again" onClick={() => setScreen('form')}>Back</button></motion.div>}
            {screen === 'BLOCK' && <motion.div key="block" className="pay-state block" initial={{ opacity: 0, scale: .9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}><Ban size={50} /><b>Payment declined for your safety</b><small>This didn’t look like you. No money has left your account.</small><button className="pay-again" onClick={() => setScreen('form')}>Back</button></motion.div>}
          </AnimatePresence>
        </div>
      </div>

      <section className="glass-card behind">
        <div className="section-heading"><div><p className="eyebrow">Behind the scenes</p><h2>What EvoPay sees</h2></div><span className={`behind-badge ${preview.decision.toLowerCase()}`}>{preview.decision} · {preview.final}</span></div>
        <div className="behind-signals">
          {[['ML classifier', preview.ml], ['Graph intelligence', preview.graph], ['Anomaly detection', preview.anomaly], ['Behavioural analysis', preview.behavior]].map(([name, value]) => <div key={name as string}><span>{name}</span><div><motion.i animate={{ width: `${value}%` }} /></div><b>{value}</b></div>)}
        </div>
        <ul className="behind-reasons">{preview.reasons.length ? preview.reasons.map((reason) => <li key={reason}>{reason}</li>) : <li className="ok">Looks like this customer’s normal behaviour</li>}</ul>
        <h3>This session</h3>
        <div className="session-log">
          {attempts.map((attempt) => <div key={attempt.id} className={`session-row ${attempt.decision.toLowerCase()}`}><span>{new Date(attempt.at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</span><span>{attempt.merchant}</span><span>₹{attempt.amount.toLocaleString('en-IN')}</span><b>{attempt.score}</b><em>{attempt.final}</em><small>{attempt.ms} ms</small></div>)}
          {!attempts.length && <p className="empty-state">No payments yet — make one on the phone.</p>}
        </div>
      </section>
    </div>
  </div>
}
