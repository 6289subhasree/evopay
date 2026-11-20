import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Pause, Play, RotateCcw, ShieldAlert, ShieldCheck, Swords } from 'lucide-react'
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AskAnalystCard } from '../components/AnalystAI'
import { ADAPTATION_BOOST, ATTACK_TYPES, EVASION_LINE, runEvolution } from '../lib/riskModel'

const STEP_MS = 900

export default function Arena() {
  const [attackId, setAttackId] = useState('behavioral_mimicry')
  const [generations, setGenerations] = useState(10)
  const [shown, setShown] = useState(0)
  const [playing, setPlaying] = useState(false)
  const timer = useRef<number | null>(null)

  const results = useMemo(() => runEvolution(attackId, generations), [attackId, generations])
  const visible = results.slice(0, shown)
  const done = shown >= results.length
  const attack = ATTACK_TYPES.find((item) => item.id === attackId)!

  useEffect(() => { setShown(0); setPlaying(false) }, [attackId, generations])
  useEffect(() => {
    if (!playing) return
    if (shown >= results.length) { setPlaying(false); return }
    timer.current = window.setTimeout(() => setShown((value) => value + 1), shown === 0 ? 250 : STEP_MS)
    return () => { if (timer.current) window.clearTimeout(timer.current) }
  }, [playing, shown, results.length])

  const start = () => { if (done) setShown(0); setPlaying(true) }
  const baselineEvasions = visible.filter((run) => run.evadedBaseline).length
  const adaptedEvasions = visible.filter((run) => run.evadedAdapted).length
  const blindSpots = visible.filter((run) => run.blindSpotRecorded).length
  const current = visible[visible.length - 1]
  const chartData = results.map((run, i) => ({ gen: `G${run.generation}`, static: i < shown ? run.baseline : null, adaptive: i < shown ? run.adapted : null, realism: i < shown ? run.realism : null }))

  return <div className="arena-page">
    <div className="data-page-heading"><div><p className="eyebrow">Evolution arena · Red vs Blue</p><h1>The Loop, Live</h1><p className="subheading">Watch one attack family mutate generation after generation. A static defence slowly goes blind; EvoPay’s adaptive defence records every blind spot and fights back.</p></div></div>

    <section className="glass-card arena-controls">
      <label><span>Attack family</span><select value={attackId} onChange={(event) => setAttackId(event.target.value)}>{ATTACK_TYPES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
      <label><span>Generations</span><input type="range" min={4} max={14} value={generations} onChange={(event) => setGenerations(Number(event.target.value))} /><output>{generations}</output></label>
      <div className="arena-buttons">
        <button className="novel-button" onClick={playing ? () => setPlaying(false) : start}>{playing ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {done && shown ? 'Replay' : shown ? 'Resume' : 'Run the loop'}</>}</button>
        <button className="secondary-button" onClick={() => { setPlaying(false); setShown(results.length) }}>Skip to end</button>
        <button className="secondary-button" onClick={() => { setPlaying(false); setShown(0) }} aria-label="Reset"><RotateCcw size={14} /></button>
      </div>
    </section>

    <div className="arena-scoreboard">
      <div className="arena-side red"><Swords size={18} /><span>Red Team</span><strong>{attack.label}</strong><small>Generation {current?.generation ?? 0} · realism {current?.realism ?? '—'}</small></div>
      <div className="arena-vs"><b>{adaptedEvasions}</b><i>evasions vs</i><b className="dim">{baselineEvasions}</b><small>adaptive vs static</small></div>
      <div className="arena-side blue"><ShieldCheck size={18} /><span>Blue Team</span><strong>{blindSpots} blind spot{blindSpots === 1 ? '' : 's'} learned</strong><small>+{Math.min(42, blindSpots * ADAPTATION_BOOST)} detection from adaptation</small></div>
    </div>

    <section className="glass-card arena-chart">
      <div className="section-heading"><div><p className="eyebrow">Detection score per generation</p><h2>Static vs adaptive defence</h2></div>
        <div className="chart-legend"><span><i className="dot" style={{ background: '#c8f36a' }} />Adaptive (EvoPay)</span><span><i className="dot" style={{ background: '#ff806e' }} />Static defence</span><span><i className="dot" style={{ background: '#6f7068' }} />Attack realism</span></div></div>
      <div style={{ height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 16, right: 16, left: -16, bottom: 0 }}>
            <CartesianGrid stroke="rgba(238,234,225,.06)" vertical={false} />
            <XAxis dataKey="gen" tickLine={false} axisLine={false} />
            <YAxis domain={[0, 100]} tickLine={false} axisLine={false} />
            <Tooltip contentStyle={{ background: '#171814', border: '1px solid rgba(238,234,225,.14)', borderRadius: 3, fontSize: 11 }} />
            <ReferenceLine y={EVASION_LINE} stroke="#e7bc66" strokeDasharray="5 5" label={{ value: 'evasion line', position: 'insideTopRight', fill: '#e7bc66', fontSize: 10 }} />
            <Line type="monotone" dataKey="realism" stroke="#6f7068" strokeWidth={1.2} dot={false} isAnimationActive={false} connectNulls={false} />
            <Line type="monotone" dataKey="static" stroke="#ff806e" strokeWidth={2} strokeDasharray="6 4" dot={{ r: 3 }} isAnimationActive={false} connectNulls={false} />
            <Line type="monotone" dataKey="adaptive" stroke="#c8f36a" strokeWidth={2.6} dot={{ r: 4, strokeWidth: 0, fill: '#c8f36a' }} isAnimationActive={false} connectNulls={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </section>

    <section className="glass-card arena-log">
      <div className="section-heading"><div><p className="eyebrow">Battle log</p><h2>Generation by generation</h2></div><span className="threat-count">{shown} / {results.length}</span></div>
      {!shown && <div className="empty-state">Press “Run the loop” to start the evolution.</div>}
      <div className="arena-rows">
        <AnimatePresence initial={false}>
          {[...visible].reverse().map((run) => <motion.div layout key={run.generation} className={`arena-row ${run.evadedAdapted ? 'evaded' : run.evadedBaseline ? 'saved' : ''}`} initial={{ opacity: 0, x: -30, rotateX: -30 }} animate={{ opacity: 1, x: 0, rotateX: 0 }} transition={{ duration: .4, ease: [0.22, 1, 0.36, 1] }} style={{ transformPerspective: 800 }}>
            <span className="gen">G{run.generation}</span>
            <span className="params">{run.params.accounts} accounts · {run.params.devices} devices · velocity {run.params.transaction_velocity} · mimicry {Math.round(run.params.behavioral_similarity * 100)}%</span>
            <span className="scores">static <b className={run.evadedBaseline ? 'bad' : ''}>{run.baseline}</b> · adaptive <b className={run.evadedAdapted ? 'bad' : 'good'}>{run.adapted}</b>{run.boost ? <em>+{run.boost}</em> : null}</span>
            <span className="outcome">{run.evadedAdapted ? <><ShieldAlert size={13} /> Evaded → blind spot recorded</> : run.evadedBaseline ? <><ShieldCheck size={13} /> Caught only by adaptation</> : <><ShieldCheck size={13} /> Contained</>}</span>
          </motion.div>)}
        </AnimatePresence>
      </div>
      <p className="arena-note">How it works: attack mutations and detection scoring follow EvoPay’s attack engine. An attack “evades” when detection drops below {EVASION_LINE}. Each evasion is stored as a defence pattern that adds +{ADAPTATION_BOOST} detection for that family (up to +42).</p>
    </section>

    {done && <AskAnalystCard mode="arena" context={{ attack: attack.label, generations: results }} title="Gemini summarises this run" label="Summarise for the judges" />}
  </div>
}
