import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Bot, Send, Sparkles, X } from 'lucide-react'
import { api } from '../lib/api'
import { askAnalyst, type AnalystMode, type AnalystReply } from '../lib/analyst'

/** Renders an analyst answer: verdict line, bullets, next action. */
export function AnalystText({ reply }: { reply: AnalystReply }) {
  const lines = reply.text.split('\n').map((line) => line.trim()).filter(Boolean)
  return <div className="ai-text">
    {lines.map((line, i) => {
      const clean = line.replace(/\*\*/g, '')
      if (/^[-•*]\s/.test(clean)) return <p className="ai-bullet" key={i}>{clean.replace(/^[-•*]\s/, '')}</p>
      const label = clean.match(/^(Verdict|Posture|Next action|Recommended next action):\s*/i)
      if (label) return <p className={i === 0 ? 'ai-verdict' : 'ai-next'} key={i}><b>{label[1]}</b>{clean.slice(label[0].length)}</p>
      return <p className={i === 0 ? 'ai-verdict' : ''} key={i}>{clean}</p>
    })}
    <span className={`ai-source ${reply.source}`}>
      {reply.source === 'gemini' ? <><Sparkles size={11} /> Gemini · {reply.model}</> : <><Bot size={11} /> {reply.note ?? 'Built-in analyst'}</>}
    </span>
  </div>
}

/** A button + result card that asks the analyst about one thing (a transaction, a scenario, an arena run). */
export function AskAnalystCard({ mode, context, label = 'Ask Gemini to explain', title = 'AI analyst brief' }: { mode: AnalystMode; context: unknown; label?: string; title?: string }) {
  const [reply, setReply] = useState<AnalystReply | null>(null)
  const [loading, setLoading] = useState(false)
  const contextKey = JSON.stringify(context)
  useEffect(() => { setReply(null) }, [contextKey])
  const run = async () => { setLoading(true); setReply(await askAnalyst(mode, context)); setLoading(false) }
  return <div className="ai-card">
    <div className="ai-card-head">
      <span><Sparkles size={14} /> {title}</span>
      <button className="ai-ask" onClick={run} disabled={loading}>{loading ? 'Thinking…' : reply ? 'Ask again' : label}</button>
    </div>
    {loading && <div className="ai-thinking"><i /><i /><i /></div>}
    {reply && !loading && <AnalystText reply={reply} />}
  </div>
}

type Message = { role: 'user' | 'ai'; text?: string; reply?: AnalystReply }
const SUGGESTIONS = ['Summarise our fraud posture', 'Which transaction should I review first?', 'What pattern links the open incidents?']

/** Floating copilot available on every page; grounded in the dashboard + incident data. */
export function Copilot() {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }) }, [messages, busy])

  const ask = async (question: string) => {
    if (!question.trim() || busy) return
    setInput('')
    setMessages((current) => [...current, { role: 'user', text: question }])
    setBusy(true)
    const [dashboard, incidents] = await Promise.all([api.dashboard().catch(() => null), api.incidents(20).catch(() => [])])
    const all = dashboard?.transactions ?? []
    const byStatus = all.reduce<Record<string, { count: number; value: number }>>((acc, txn) => {
      const bucket = acc[txn.status] ?? { count: 0, value: 0 }
      bucket.count += 1; bucket.value += txn.amount; acc[txn.status] = bucket
      return acc
    }, {})
    const context = {
      metrics: dashboard?.metrics,
      // Totals over every recorded payment, plus the riskiest ones in detail (keeps the prompt small).
      totals: { transactions: all.length, by_status: byStatus },
      transactions: [...all].sort((a, b) => b.risk_score - a.risk_score).slice(0, 20).map(({ id, amount, location, payment_method, risk_score, status, device_id, created_at }) => ({ id, amount, location, payment_method, risk_score, status, device_id, created_at })),
      incidents: incidents.slice(0, 15).map(({ id, title, severity, status, transaction_id, created_at }) => ({ id, title, severity, status, transaction_id, created_at })),
    }
    const reply = await askAnalyst('chat', context, question)
    setMessages((current) => [...current, { role: 'ai', reply }])
    setBusy(false)
  }

  return <>
    <button className="copilot-fab" onClick={() => setOpen((value) => !value)} aria-label="Open AI copilot">
      {open ? <X size={18} /> : <Sparkles size={18} />}<span>{open ? 'Close' : 'Ask EvoPay AI'}</span>
    </button>
    <AnimatePresence>
      {open && <motion.aside className="copilot" initial={{ opacity: 0, y: 30, rotateX: 12, scale: .96 }} animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: .97 }} transition={{ duration: .25, ease: [0.22, 1, 0.36, 1] }} style={{ transformPerspective: 1000, transformOrigin: '100% 100%' }}>
        <header><div><p className="eyebrow">Powered by Gemini</p><h3>EvoPay Copilot</h3></div><button onClick={() => setOpen(false)} aria-label="Close"><X size={16} /></button></header>
        <div className="copilot-list" ref={listRef}>
          {!messages.length && <div className="copilot-empty"><p>Ask about your live transactions and incidents. Answers use only the data in your workspace.</p>{SUGGESTIONS.map((suggestion) => <button key={suggestion} onClick={() => ask(suggestion)}>{suggestion}</button>)}</div>}
          {messages.map((message, i) => message.role === 'user' ? <div className="copilot-user" key={i}>{message.text}</div> : <div className="copilot-ai" key={i}><AnalystText reply={message.reply!} /></div>)}
          {busy && <div className="ai-thinking"><i /><i /><i /></div>}
        </div>
        <form onSubmit={(event) => { event.preventDefault(); void ask(input) }}><input value={input} onChange={(event) => setInput(event.target.value)} placeholder="Ask about fraud in your workspace…" maxLength={500} /><button disabled={busy || !input.trim()} aria-label="Send"><Send size={15} /></button></form>
      </motion.aside>}
    </AnimatePresence>
  </>
}
