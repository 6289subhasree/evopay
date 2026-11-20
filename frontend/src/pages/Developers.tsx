import { useEffect, useState } from 'react'
import { Check, Copy, Play } from 'lucide-react'
import { api, type Transaction } from '../lib/api'

type Endpoint = { id: string; method: 'GET' | 'POST'; path: string; title: string; body?: string; run: (id: string) => Promise<unknown> }

const ENDPOINTS: Endpoint[] = [
  { id: 'risk', method: 'GET', path: '/api/transactions/{id}/risk', title: 'Get the four-signal risk breakdown for a payment', run: (id) => api.risk(id) },
  { id: 'analyze', method: 'POST', path: '/api/transactions/{id}/analyze', title: 'Re-score a payment and record the decision', run: (id) => api.analyze(id) },
  { id: 'investigate', method: 'POST', path: '/api/investigate', title: 'Automated investigation: finding, evidence, attack type', body: '{ "transaction_id": "{id}" }', run: (id) => api.investigate(id) },
  { id: 'action', method: 'POST', path: '/api/transactions/{id}/action', title: 'Apply an analyst decision (approve / verify / hold / block)', body: '{ "action": "HOLD" }', run: async (id) => ({ note: 'Dry run — this console does not change records. Request that would be sent:', request: { action: 'HOLD', transaction_id: id } }) },
  { id: 'network', method: 'GET', path: '/api/network', title: 'Entity graph: customers, merchants, devices and links', run: () => api.network() },
]

const snippet = (lang: 'curl' | 'js' | 'python', ep: Endpoint, id: string) => {
  const path = ep.path.replace('{id}', id)
  const body = ep.body?.replace('{id}', id)
  if (lang === 'curl') return `curl -X ${ep.method} "https://YOUR-EVOPAY-HOST${path}" \\\n  -H "Cookie: evopay_session=…" \\\n  -H "X-CSRF-Token: …"${body ? ` \\\n  -H "Content-Type: application/json" \\\n  -d '${body}'` : ''}`
  if (lang === 'js') return `const res = await fetch("https://YOUR-EVOPAY-HOST${path}", {\n  method: "${ep.method}",\n  credentials: "include",${body ? `\n  headers: { "Content-Type": "application/json", "X-CSRF-Token": csrf },\n  body: JSON.stringify(${body}),` : ''}\n});\nconst data = await res.json();`
  return `import requests\n\nsession = requests.Session()  # signed in via /api/auth/login\nres = session.${ep.method.toLowerCase()}(\n    "https://YOUR-EVOPAY-HOST${path}",${body ? `\n    json=${body.replace(/"/g, "'")},\n    headers={"X-CSRF-Token": csrf},` : ''}\n)\nprint(res.json())`
}

/** Integration guide + live API console for merchants and fintech engineers. */
export default function Developers() {
  const [txns, setTxns] = useState<Transaction[]>([])
  const [txnId, setTxnId] = useState('')
  const [active, setActive] = useState(ENDPOINTS[0])
  const [lang, setLang] = useState<'curl' | 'js' | 'python'>('curl')
  const [response, setResponse] = useState<string>('')
  const [meta, setMeta] = useState('')
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)
  useEffect(() => { api.transactions(20).then((rows) => { setTxns(rows); if (rows[0]) setTxnId(rows[0].id) }).catch(() => undefined) }, [])

  const run = async () => {
    setBusy(true); setResponse(''); setMeta('')
    const started = performance.now()
    try {
      const data = await active.run(txnId)
      setResponse(JSON.stringify(data, null, 2)); setMeta(`200 OK · ${Math.round(performance.now() - started)} ms`)
    } catch (error) {
      setResponse(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2)); setMeta('Request failed')
    } finally { setBusy(false) }
  }
  const code = snippet(lang, active, txnId || 'TXN-84921')
  const copy = async () => { try { await navigator.clipboard.writeText(code); setCopied(true); window.setTimeout(() => setCopied(false), 1500) } catch { /* clipboard blocked */ } }

  return <div className="dev-page">
    <div className="data-page-heading"><div><p className="eyebrow">Developers · Integration</p><h1>Plug It In</h1><p className="subheading">EvoPay is API-first. Score payments, pull explanations and trigger investigations from your own checkout or back office — try every call live below.</p></div></div>

    <div className="dev-steps">
      {[['01', 'Authenticate', 'Sign in once; EvoPay uses secure server-side sessions with Argon2 passwords and CSRF tokens.'], ['02', 'Score', 'Send each payment for a 0–100 risk score with the four signals behind it.'], ['03', 'Act', 'Allow, ask for OTP, hold or block — and log the decision to the audit trail.']].map(([n, t, d]) => <div className="glass-card" key={n}><b>{n}</b><h3>{t}</h3><p>{d}</p></div>)}
    </div>

    <div className="dev-grid">
      <aside className="glass-card dev-endpoints">
        <p className="eyebrow">Endpoints</p>
        {ENDPOINTS.map((ep) => <button key={ep.id} className={active.id === ep.id ? 'active' : ''} onClick={() => { setActive(ep); setResponse(''); setMeta('') }}>
          <span className={`verb ${ep.method.toLowerCase()}`}>{ep.method}</span><span><code>{ep.path}</code><small>{ep.title}</small></span>
        </button>)}
      </aside>

      <section className="glass-card dev-console">
        <div className="dev-console-head">
          <div><span className={`verb ${active.method.toLowerCase()}`}>{active.method}</span><code>{active.path.replace('{id}', txnId || '{id}')}</code></div>
          {active.path.includes('{id}') || active.body?.includes('{id}') ? <select value={txnId} onChange={(event) => setTxnId(event.target.value)}>{txns.map((t) => <option key={t.id} value={t.id}>{t.id} · risk {t.risk_score}</option>)}</select> : null}
          <button className="novel-button" onClick={run} disabled={busy}><Play size={14} /> {busy ? 'Sending…' : 'Send request'}</button>
        </div>
        <div className="dev-tabs">{(['curl', 'js', 'python'] as const).map((item) => <button key={item} className={lang === item ? 'active' : ''} onClick={() => setLang(item)}>{item === 'js' ? 'JavaScript' : item === 'python' ? 'Python' : 'cURL'}</button>)}<button className="dev-copy" onClick={copy}>{copied ? <><Check size={13} /> Copied</> : <><Copy size={13} /> Copy</>}</button></div>
        <pre className="dev-code">{code}</pre>
        <div className="dev-response-head"><span>Response</span><em>{meta}</em></div>
        <pre className="dev-code response">{response || '// Press “Send request” to call the API'}</pre>
      </section>
    </div>
  </div>
}
