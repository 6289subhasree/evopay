import { useEffect, useMemo, useState } from 'react'
import { ArrowRight, RotateCcw } from 'lucide-react'
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { api, type Transaction } from '../lib/api'

type Bands = { verify: number; hold: number; block: number }
const CURRENT: Bands = { verify: 31, hold: 61, block: 81 }
const DECISIONS = ['ALLOW', 'VERIFY', 'HOLD', 'BLOCK'] as const
type Decision = typeof DECISIONS[number]

const decide = (score: number, b: Bands): Decision => score >= b.block ? 'BLOCK' : score >= b.hold ? 'HOLD' : score >= b.verify ? 'VERIFY' : 'ALLOW'
const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

/**
 * Policy backtester: move the decision thresholds and replay them over recorded
 * transactions to see what would have changed — before touching production.
 */
export default function Policy() {
  const [txns, setTxns] = useState<Transaction[]>([])
  const [error, setError] = useState<string | null>(null)
  const [bands, setBands] = useState<Bands>({ verify: 20, hold: 60, block: 70 })
  useEffect(() => { api.transactions(200).then(setTxns).catch((reason: Error) => setError(reason.message)) }, [])

  const set = (key: keyof Bands, value: number) => setBands((current) => {
    const next = { ...current, [key]: value }
    // keep bands ordered: verify < hold < block
    if (key === 'verify') { next.hold = Math.max(next.hold, value + 1); next.block = Math.max(next.block, next.hold + 1) }
    if (key === 'hold') { next.verify = Math.min(next.verify, value - 1); next.block = Math.max(next.block, value + 1) }
    if (key === 'block') { next.hold = Math.min(next.hold, value - 1); next.verify = Math.min(next.verify, next.hold - 1) }
    return next
  })

  const summary = useMemo(() => {
    const tally = (b: Bands) => {
      const out = Object.fromEntries(DECISIONS.map((d) => [d, { count: 0, value: 0 }])) as Record<Decision, { count: number; value: number }>
      txns.forEach((t) => { const d = decide(t.risk_score, b); out[d].count += 1; out[d].value += t.amount })
      return out
    }
    const before = tally(CURRENT)
    const after = tally(bands)
    const changed = txns.map((t) => ({ t, from: decide(t.risk_score, CURRENT), to: decide(t.risk_score, bands) })).filter((row) => row.from !== row.to)
    return { before, after, changed }
  }, [txns, bands])

  const chart = DECISIONS.map((d) => ({ decision: d, Current: summary.before[d].count, Proposed: summary.after[d].count }))
  const friction = (s: typeof summary.before) => s.VERIFY.count + s.HOLD.count
  const delta = (a: number, b: number) => (b - a === 0 ? '±0' : b - a > 0 ? `+${b - a}` : `${b - a}`)

  return <div className="policy-page">
    <div className="data-page-heading"><div><p className="eyebrow">Policy backtester · Safe changes</p><h1>Tune The Rules</h1><p className="subheading">Change when EvoPay asks for OTP, holds or blocks — then replay the new policy over every recorded transaction to see exactly what would have changed.</p></div></div>

    {error && <div className="error-state" style={{ padding: 20 }}>{error}</div>}

    <section className="glass-card policy-controls">
      <div className="section-heading"><div><p className="eyebrow">Proposed policy</p><h2>Decision thresholds</h2></div><button className="text-button" onClick={() => setBands(CURRENT)}><RotateCcw size={13} /> Back to current</button></div>
      <div className="band-track">
        <i className="allow" style={{ width: `${bands.verify}%` }} /><i className="verify" style={{ width: `${bands.hold - bands.verify}%` }} /><i className="hold" style={{ width: `${bands.block - bands.hold}%` }} /><i className="block" style={{ width: `${101 - bands.block}%` }} />
      </div>
      <div className="band-sliders">
        {([['verify', 'Ask for OTP from', 2, 97], ['hold', 'Hold for review from', 3, 98], ['block', 'Block from', 4, 99]] as const).map(([key, label, min, max]) => <label key={key} className={key}>
          <span>{label}<b>{bands[key]}</b><small>current {CURRENT[key]}</small></span>
          <input type="range" min={min} max={max} value={bands[key]} onChange={(event) => set(key, Number(event.target.value))} />
        </label>)}
      </div>
    </section>

    <div className="policy-kpis">
      <div className="glass-card"><span>Auto-blocked</span><strong>{summary.after.BLOCK.count}<em>{delta(summary.before.BLOCK.count, summary.after.BLOCK.count)}</em></strong><small>{rupees(summary.after.BLOCK.value)} stopped</small></div>
      <div className="glass-card"><span>Customer friction</span><strong>{friction(summary.after)}<em>{delta(friction(summary.before), friction(summary.after))}</em></strong><small>OTP or review needed</small></div>
      <div className="glass-card"><span>Straight through</span><strong>{summary.after.ALLOW.count}<em>{delta(summary.before.ALLOW.count, summary.after.ALLOW.count)}</em></strong><small>{rupees(summary.after.ALLOW.value)} approved instantly</small></div>
      <div className="glass-card"><span>Decisions changed</span><strong>{summary.changed.length}</strong><small>of {txns.length} recorded payments</small></div>
    </div>

    <section className="glass-card policy-chart">
      <div className="section-heading"><div><p className="eyebrow">Replay result</p><h2>Current vs proposed</h2></div></div>
      <div style={{ height: 260 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }} barGap={6}>
            <CartesianGrid stroke="rgba(238,234,225,.06)" vertical={false} />
            <XAxis dataKey="decision" tickLine={false} axisLine={false} />
            <YAxis allowDecimals={false} tickLine={false} axisLine={false} />
            <Tooltip cursor={{ fill: 'rgba(238,234,225,.04)' }} contentStyle={{ background: '#171814', border: '1px solid rgba(238,234,225,.14)', borderRadius: 3, fontSize: 11 }} />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Current" fill="#5b5c54" radius={[2, 2, 0, 0]} />
            <Bar dataKey="Proposed" fill="#c8f36a" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </section>

    <section className="glass-card policy-changes">
      <div className="section-heading"><div><p className="eyebrow">Impact list</p><h2>Payments that would be decided differently</h2></div><span className="threat-count">{summary.changed.length} changed</span></div>
      {summary.changed.map(({ t, from, to }) => <div className="change-row" key={t.id}>
        <b>{t.id}</b><span>{rupees(t.amount)} · {t.location}</span><span>risk {t.risk_score}</span>
        <span className="change"><i className={from.toLowerCase()}>{from}</i><ArrowRight size={13} /><i className={to.toLowerCase()}>{to}</i></span>
      </div>)}
      {!summary.changed.length && <div className="empty-state">No recorded payment changes decision under this policy.</div>}
    </section>
  </div>
}
