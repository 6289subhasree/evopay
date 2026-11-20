import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Ban, Bell, CheckCheck, Clock3, TriangleAlert } from 'lucide-react'
import { api, type Incident, type Transaction } from '../lib/api'

type Alert = { id: string; kind: 'block' | 'hold' | 'incident'; title: string; detail: string; at: string; path: string }

const SEEN_KEY = 'evopay-seen-alerts'
const readSeen = (): Set<string> => { try { return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || '[]')) } catch { return new Set() } }
const writeSeen = (ids: Set<string>) => { try { localStorage.setItem(SEEN_KEY, JSON.stringify([...ids].slice(-300))) } catch { /* storage unavailable */ } }

function ago(iso: string) {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000))
  if (!Number.isFinite(minutes)) return ''
  if (minutes < 60) return `${minutes}m ago`
  if (minutes < 60 * 24) return `${Math.round(minutes / 60)}h ago`
  return `${Math.round(minutes / 1440)}d ago`
}

/** Alerts centre: blocked / held payments and open high-severity incidents, refreshed every 30 s. */
export function NotificationBell({ navigate }: { navigate: (path: string) => void }) {
  const [open, setOpen] = useState(false)
  const [txns, setTxns] = useState<Transaction[]>([])
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [seen, setSeen] = useState<Set<string>>(readSeen)
  const [toast, setToast] = useState<Alert | null>(null)
  const known = useRef<Set<string> | null>(null)
  const wrap = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    const load = () => Promise.all([api.transactions(50).catch(() => []), api.incidents(50).catch(() => [])]).then(([t, i]) => { if (active) { setTxns(t); setIncidents(i) } })
    void load()
    const timer = window.setInterval(load, 30000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])

  const alerts = useMemo<Alert[]>(() => [
    ...txns.filter((t) => t.status === 'BLOCKED' || t.status === 'HOLD').map((t) => ({
      id: `txn-${t.id}-${t.status}`, kind: t.status === 'BLOCKED' ? 'block' as const : 'hold' as const,
      title: `${t.status === 'BLOCKED' ? 'Payment blocked' : 'Payment held for review'} · ${t.id}`,
      detail: `₹${t.amount.toLocaleString('en-IN')} · ${t.location} · risk ${t.risk_score}`, at: t.created_at, path: '/transactions',
    })),
    ...incidents.filter((i) => i.status !== 'RESOLVED' && ['CRITICAL', 'HIGH'].includes(i.severity)).map((i) => ({
      id: `inc-${i.id}-${i.status}`, kind: 'incident' as const, title: `${i.severity} incident · ${i.id}`, detail: `${i.title} · ${i.status.toLowerCase()}`, at: i.created_at, path: '/incidents',
    })),
  ].sort((a, b) => b.at.localeCompare(a.at)), [txns, incidents])

  // Toast for alerts that appear while the app is open (not on first load).
  useEffect(() => {
    if (!alerts.length && known.current === null) return
    if (known.current === null) { known.current = new Set(alerts.map((a) => a.id)); return }
    const fresh = alerts.find((a) => !known.current!.has(a.id))
    alerts.forEach((a) => known.current!.add(a.id))
    if (fresh) { setToast(fresh); window.setTimeout(() => setToast(null), 6000) }
  }, [alerts])

  useEffect(() => {
    if (!open) return
    const onDown = (event: MouseEvent) => { if (!wrap.current?.contains(event.target as Node)) setOpen(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const unread = alerts.filter((a) => !seen.has(a.id)).length
  const markAll = () => { const next = new Set([...seen, ...alerts.map((a) => a.id)]); setSeen(next); writeSeen(next) }
  const openAlert = (alert: Alert) => { const next = new Set([...seen, alert.id]); setSeen(next); writeSeen(next); setOpen(false); navigate(alert.path) }
  const Icon = (kind: Alert['kind']) => kind === 'block' ? <Ban size={14} /> : kind === 'hold' ? <Clock3 size={14} /> : <TriangleAlert size={14} />

  return <div className="bell-wrap" ref={wrap}>
    <button className="icon-button bell-button" aria-label={`Alerts${unread ? `, ${unread} unread` : ''}`} onClick={() => setOpen((value) => !value)}>
      <Bell size={18} />{unread > 0 && <span className="bell-count">{unread > 9 ? '9+' : unread}</span>}
    </button>
    <AnimatePresence>
      {open && <motion.div className="bell-panel" initial={{ opacity: 0, y: -8, rotateX: -12 }} animate={{ opacity: 1, y: 0, rotateX: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: .18 }} style={{ transformPerspective: 900, transformOrigin: '100% 0' }}>
        <header><div><p className="eyebrow">Alerts centre</p><h3>{unread ? `${unread} need attention` : 'All caught up'}</h3></div>{alerts.length > 0 && <button onClick={markAll}><CheckCheck size={14} /> Mark all read</button>}</header>
        <div className="bell-list">
          {alerts.slice(0, 20).map((alert) => <button key={alert.id} className={`bell-item ${alert.kind} ${seen.has(alert.id) ? 'seen' : ''}`} onClick={() => openAlert(alert)}>
            <span className="bell-icon">{Icon(alert.kind)}</span>
            <span className="bell-copy"><b>{alert.title}</b><small>{alert.detail}</small></span>
            <time>{ago(alert.at)}</time>
          </button>)}
          {!alerts.length && <p className="bell-empty">No blocked payments or open high-severity incidents.</p>}
        </div>
      </motion.div>}
    </AnimatePresence>
    <AnimatePresence>
      {toast && <motion.button className={`alert-toast ${toast.kind}`} initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }} onClick={() => { setToast(null); openAlert(toast) }}>
        <span className="bell-icon">{Icon(toast.kind)}</span><span className="bell-copy"><b>{toast.title}</b><small>{toast.detail}</small></span>
      </motion.button>}
    </AnimatePresence>
  </div>
}
