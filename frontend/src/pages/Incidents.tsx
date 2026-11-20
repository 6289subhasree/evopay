import { useEffect, useMemo, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  Check,
  CheckCircle2,
  CircleAlert,
  Clock3,
  Eye,
  FileText,
  Filter,
  History,
  RefreshCw,
  Search,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
  X,
  Zap,
} from 'lucide-react'
import { Download } from 'lucide-react'
import { downloadCsv, stamp } from '../lib/exportCsv'
import { api, type AuditEvent, type Incident, type Investigation } from '../lib/api'

type StatusFilter = 'ALL' | 'OPEN' | 'INVESTIGATING' | 'CONTAINED' | 'RESOLVED'

export default function Incidents() {
  const [incidents, setIncidents] = useState<Incident[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const [filter, setFilter] = useState<StatusFilter>('ALL')
  const [search, setSearch] = useState('')
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null)
  const [investigation, setInvestigation] = useState<Investigation | null>(null)
  const [investigating, setInvestigating] = useState(false)

  const loadData = () => {
    setLoading(true)
    setError(false)
    Promise.all([api.incidents(), api.audit()])
      .then(([incList, auditList]) => {
        setIncidents(incList)
        setAuditEvents(auditList)
      })
      .catch((err) => {
        console.error(err)
        setError(true)
      })
      .finally(() => setLoading(false))
  }

  useEffect(loadData, [])

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.incidentAction(id, status)
      setIncidents((curr) => curr.map((item) => (item.id === id ? { ...item, status } : item)))
      if (selectedIncident && selectedIncident.id === id) {
        setSelectedIncident({ ...selectedIncident, status })
      }
      // Refresh audit trail
      api.audit().then(setAuditEvents).catch(console.error)
    } catch (err) {
      console.error(err)
      setError(true)
    }
  }

  const handleOpenInvestigation = async (inc: Incident) => {
    setSelectedIncident(inc)
    setInvestigating(true)
    setInvestigation(null)
    updateStatus(inc.id, 'INVESTIGATING')
    try {
      const targetId = (inc as unknown as { transaction_id?: string }).transaction_id ?? inc.id
      const res = await api.investigate(targetId)
      setInvestigation(res.investigation)
    } catch (err) {
      console.error(err)
    } finally {
      setInvestigating(false)
    }
  }

  const filtered = useMemo(() => {
    return incidents.filter((item) => {
      const matchFilter = filter === 'ALL' || item.status.toUpperCase() === filter
      const q = search.toLowerCase().trim()
      const matchSearch = !q || item.title.toLowerCase().includes(q) || item.id.toLowerCase().includes(q) || item.severity.toLowerCase().includes(q)
      return matchFilter && matchSearch
    })
  }, [incidents, filter, search])

  return (
    <div className="data-page">
      <div className="data-page-heading" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '24px' }}>
        <div>
<p className="eyebrow">Response Queue <span>•</span> Recorded incidents</p>
          <h1>Incidents</h1>
          <p className="subheading">Triage high-signal fraud threats, trigger AI investigation reports, and maintain an auditable state.</p>
        </div>
        <div className="heading-actions">
          <button className="secondary-button" onClick={() => downloadCsv(`evopay-incidents-${stamp()}.csv`, filtered.map(({ id, created_at, title, severity, status, transaction_id, attack_id, risk_score, reasons }) => ({ id, created_at, title, severity, status, transaction_id, attack_id, risk_score, reasons })))} disabled={!filtered.length}>
            <Download size={14} /> Export CSV
          </button>
          <button className="secondary-button" onClick={loadData}>
            <RefreshCw size={14} className={loading ? 'pulse-dot' : ''} /> Refresh Queue
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '20px' }}>
        <div className="command-metric">
          <span>Active Incidents</span>
          <strong>{incidents.filter((i) => i.status !== 'RESOLVED').length}</strong>
        </div>
        <div className="command-metric">
          <span>Critical Severity</span>
          <strong style={{ color: '#ef747b' }}>{incidents.filter((i) => i.severity.toUpperCase() === 'CRITICAL').length}</strong>
        </div>
        <div className="command-metric">
          <span>Under Investigation</span>
          <strong style={{ color: '#e4b258' }}>{incidents.filter((i) => i.status.toUpperCase() === 'INVESTIGATING').length}</strong>
        </div>
        <div className="command-metric">
          <span>Resolved</span>
          <strong style={{ color: '#5ed596' }}>{incidents.filter((i) => i.status.toUpperCase() === 'RESOLVED').length}</strong>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#24231e', border: '1px solid #3a3931', padding: '0 12px', borderRadius: '6px', height: '36px', width: 'min(300px, 100%)' }}>
          <Search size={14} color="#818076" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search incidents..."
            style={{ border: 0, background: 'transparent', outline: 'none', color: '#f1eee5', fontSize: '11px', width: '100%', fontFamily: 'DM Mono, monospace' }}
          />
        </div>

        <div style={{ display: 'flex', gap: '6px', background: '#1d1c18', padding: '3px', borderRadius: '6px', border: '1px solid #34342d' }}>
          {(['ALL', 'OPEN', 'INVESTIGATING', 'CONTAINED', 'RESOLVED'] as StatusFilter[]).map((st) => (
            <button
              key={st}
              onClick={() => setFilter(st)}
              style={{
                height: '28px',
                padding: '0 12px',
                border: 0,
                borderRadius: '4px',
                fontSize: '10px',
                fontFamily: 'DM Mono, monospace',
                background: filter === st ? '#3d4726' : 'transparent',
                color: filter === st ? '#f4f2eb' : '#8b8a81',
                transition: '.15s ease',
              }}
            >
              {st}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.8fr) minmax(320px, 1fr)', gap: '16px' }}>
        <section className="glass-card" style={{ padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
            <span style={{ fontSize: '11px', fontFamily: 'DM Mono, monospace', color: '#858479', textTransform: 'uppercase' }}>
              Incident Stream ({filtered.length})
            </span>
          </div>

          {loading && <div className="loading-state" style={{ padding: '32px', textAlign: 'center' }}>Loading incident queue</div>}
          {error && <div className="error-state" style={{ padding: '16px', textAlign: 'center' }}>Incident service unavailable. No substitute result is being shown.</div>}

          {!loading && filtered.length === 0 && (
            <div style={{ padding: '36px', textAlign: 'center', color: '#87867d', fontSize: '12px' }}>
              No incidents matching current criteria.
            </div>
          )}

          {!loading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {filtered.map((item) => {
                const isCrit = item.severity.toUpperCase() === 'CRITICAL'
                const isHigh = item.severity.toUpperCase() === 'HIGH'
                const isResolved = item.status.toUpperCase() === 'RESOLVED'
                const isInvestigating = item.status.toUpperCase() === 'INVESTIGATING'

                return (
                  <div
                    key={item.id}
                    className="glass-card"
                    style={{
                      padding: '14px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '14px',
                      borderLeft: `3px solid ${isCrit ? '#ef747b' : isHigh ? '#e4b258' : '#bff04c'}`,
                      background: selectedIncident?.id === item.id ? '#2b311b' : 'rgba(29,29,25, 0.65)',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '6px',
                          display: 'grid',
                          placeItems: 'center',
                          background: isCrit ? '#3b1c24' : '#23321d',
                          color: isCrit ? '#ef747b' : '#61d697',
                        }}
                      >
                        {isResolved ? <ShieldCheck size={16} /> : <CircleAlert size={16} />}
                      </div>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <strong style={{ fontSize: '13px', color: '#f8f6f2' }}>{item.title}</strong>
                          <span className={`severity-${item.severity.toLowerCase()}`}>{item.severity}</span>
                        </div>
                        <small style={{ color: '#89887e', fontFamily: 'DM Mono, monospace', fontSize: '10px' }}>
                          {item.id} · {item.created_at}
                        </small>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span
                        style={{
                          fontSize: '10px',
                          fontFamily: 'DM Mono, monospace',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          border: '1px solid #434d2a',
                          color: isResolved ? '#61d697' : isInvestigating ? '#e4b258' : '#dfcfaa',
                        }}
                      >
                        {item.status}
                      </span>

                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          className="secondary-button"
                          style={{ height: '30px', fontSize: '10px', padding: '0 8px' }}
                          onClick={() => handleOpenInvestigation(item)}
                        >
                          <Eye size={12} /> Investigate
                        </button>
                        <button
                          className="secondary-button"
                          style={{ height: '30px', fontSize: '10px', padding: '0 8px' }}
                          onClick={() => updateStatus(item.id, 'CONTAINED')}
                        >
                          Contain
                        </button>
                        <button
                          className={isResolved ? 'secondary-button' : 'success-button'}
                          style={{ height: '30px', fontSize: '10px', padding: '0 8px' }}
                          onClick={() => updateStatus(item.id, isResolved ? 'OPEN' : 'RESOLVED')}
                        >
                          <Check size={12} /> {isResolved ? 'Reopen' : 'Resolve'}
                        </button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </section>

        <aside style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {selectedIncident && (
            <div className="glass-card" style={{ padding: '18px', borderColor: '#596738' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '12px' }}>
                <div>
                  <p className="eyebrow">Active Investigation</p>
                  <h3 style={{ margin: 0, fontSize: '16px' }}>{selectedIncident.title}</h3>
                </div>
                <button onClick={() => setSelectedIncident(null)} style={{ border: 0, background: 'transparent', color: '#858479' }}>
                  <X size={15} />
                </button>
              </div>

              <div style={{ fontSize: '11px', color: '#a2a198', marginBottom: '14px' }}>
                Incident ID: <b style={{ color: '#bff04c', fontFamily: 'DM Mono, monospace' }}>{selectedIncident.id}</b>
              </div>

              {investigating && <div className="loading-state" style={{ padding: '16px 0', fontSize: '11px' }}>Analyzing fraud cluster...</div>}

              {investigation && (
                <div style={{ background: '#201f1b', padding: '12px', borderRadius: '6px', border: '1px solid #36352e', fontSize: '11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#e4b258', marginBottom: '6px', fontWeight: 500 }}>
                    <Sparkles size={13} />
                    <span>Investigator Assessment</span>
                  </div>
                  <p style={{ margin: '0 0 10px', color: '#e8e3d4', lineHeight: '1.45' }}>{investigation.finding}</p>

                  <div style={{ marginBottom: '8px' }}>
                    <span style={{ color: '#8e8d84', fontSize: '10px', display: 'block', marginBottom: '4px' }}>Evidence Signals:</span>
                    {investigation.evidence.map((ev) => (
                      <div key={ev} style={{ display: 'flex', gap: '6px', alignItems: 'center', color: '#bebeb8', fontSize: '10px', margin: '3px 0' }}>
                        <ShieldAlert size={12} color="#ef747b" />
                        <span>{ev}</span>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px', paddingTop: '8px', borderTop: '1px solid #34332c', fontSize: '10px' }}>
                    <span>Attack Vector: <b style={{ color: '#bff04c' }}>{investigation.attack_type}</b></span>
                    <span>Action: <b style={{ color: '#ef747b' }}>{investigation.recommended_action}</b></span>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="glass-card" style={{ padding: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <History size={16} color="#bff04c" />
              <h3 style={{ margin: 0, fontSize: '15px' }}>Security Audit Trail</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '420px', overflowY: 'auto' }}>
              {auditEvents.length === 0 && <span style={{ color: '#858479', fontSize: '11px' }}>No audit events logged yet.</span>}
              {auditEvents.slice(0, 15).map((evt) => (
                <div key={evt.id} style={{ padding: '8px 10px', background: '#1f1f1b', borderRadius: '5px', border: '1px solid #32322b', fontSize: '10px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', color: '#bff04c', fontFamily: 'DM Mono, monospace' }}>
                    <strong>{evt.event_type}</strong>
                    <span style={{ color: '#78776c' }}>{evt.created_at?.slice(11, 19) ?? 'Timestamp unavailable'}</span>
                  </div>
                  <div style={{ color: '#a2a198', marginTop: '3px' }}>
                    Target: <b style={{ color: '#e7e2d3' }}>{evt.entity_id}</b>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  )
}
