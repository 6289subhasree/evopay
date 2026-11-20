import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Code2, Scale, ShoppingCart, SlidersHorizontal, Swords } from 'lucide-react'
import { Activity, Bell, ChevronRight, Circle, CreditCard, Gauge, LayoutDashboard, LineChart, Network as NetworkIcon, Radar, Settings as SettingsIcon, ShieldCheck, Sparkles, Target, TriangleAlert } from 'lucide-react'
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { AppShell } from './layouts/AppShell'
import CommandDashboard from './pages/Dashboard'
import BlueTeam from './pages/BlueTeam'
import Network from './pages/Network'
import Simulation from './pages/Simulation'
import Transactions from './pages/Transactions'
import Incidents from './pages/Incidents'
import Analytics from './pages/Analytics'
import Settings from './pages/Settings'
import { ApiError, api, type DashboardData, type User } from './lib/api'
import { mockUser } from './lib/mockData'
import Auth from './pages/Auth'
import Landing from './pages/Landing'
import { NotificationBell } from './components/NotificationBell'
import Arena from './pages/Arena'
import Checkout from './pages/Checkout'
import Policy from './pages/Policy'
import Developers from './pages/Developers'
import Playground from './pages/Playground'
import { ChapterCount, LiveTape, PageOutro } from './components/Editorial'

type RouteConfig = { title: string; kicker: string; icon: typeof LayoutDashboard; description: string }
const routes: Record<string, RouteConfig> = {
  '/dashboard': { title: 'Command Center', kicker: 'Operational overview', icon: LayoutDashboard, description: 'Recorded simulation activity.' },
  '/red-team': { title: 'Red Team', kicker: 'Adversarial operations', icon: Target, description: 'Explore controlled fraud simulations.' },
  '/simulation': { title: 'Attack Simulator', kicker: 'Attack simulation', icon: Radar, description: 'Run attack scenarios.' },
  '/arena': { title: 'Evolution Arena', kicker: 'Red vs Blue, live', icon: Swords, description: 'Watch attacks evolve against an adaptive defence.' },
  '/transactions': { title: 'Transactions', kicker: 'Payment intelligence', icon: CreditCard, description: 'Inspect recorded payment events.' },
  '/checkout': { title: 'Live Checkout', kicker: 'Customer view', icon: ShoppingCart, description: 'See what customers experience for each decision.' },
  '/network': { title: 'Fraud Network', kicker: 'Entity intelligence', icon: NetworkIcon, description: 'Map recorded entity relationships.' },
  '/blue-team': { title: 'Blue Team', kicker: 'Defense operations', icon: ShieldCheck, description: 'Inspect deterministic risk decisions.' },
  '/playground': { title: 'What-If Lab', kicker: 'Explainable risk', icon: SlidersHorizontal, description: 'Change payment signals and see the score react.' },
  '/policy': { title: 'Policy Backtester', kicker: 'Safe rule changes', icon: Scale, description: 'Replay new thresholds over recorded payments.' },
  '/incidents': { title: 'Incidents', kicker: 'Response queue', icon: TriangleAlert, description: 'Manage recorded investigations.' },
  '/analytics': { title: 'Analytics', kicker: 'Measured results', icon: LineChart, description: 'Review metrics supported by stored records.' },
  '/developers': { title: 'Developers', kicker: 'API & integration', icon: Code2, description: 'Integration guide and live API console.' },
  '/settings': { title: 'Settings', kicker: 'Workspace configuration', icon: SettingsIcon, description: 'Manage local workspace preferences.' },
}

function GlassCard({ children, className = '' }: { children: React.ReactNode; className?: string }) { return <div className={`glass-card ${className}`}>{children}</div> }
function MetricCard({ label, value, note, icon: Icon, tone = 'cyan' }: { label: string; value: string; note: string; icon: typeof Activity; tone?: string }) { return <GlassCard className="metric-card"><div className={`metric-icon ${tone}`}><Icon size={17} /></div><span className="metric-label">{label}</span><strong className="metric-value"><motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{value}</motion.span></strong><span className={`metric-change ${tone}`}>{note}</span></GlassCard> }
function RiskBadge({ children, tone = 'amber' }: { children: React.ReactNode; tone?: string }) { return <span className={`risk-badge ${tone}`}>{children}</span> }

function Dashboard({ navigate }: { navigate: (path: string) => void }) {
  const [data, setData] = useState<DashboardData | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => { api.dashboard().then(setData).catch((reason: Error) => setError(reason.message)) }, [])
  if (error) return <div className="dashboard-page"><div className="welcome-row"><div><p className="eyebrow">Command center</p><h1>Defense posture</h1></div></div><section className="glass-card error-state" style={{ padding: 32 }}><TriangleAlert size={22} /><h2>Dashboard unavailable</h2><p>{error}</p><button className="primary-button" onClick={() => window.location.reload()}>Retry connection</button></section></div>
  if (!data) return <div className="dashboard-page"><div className="welcome-row"><div><p className="eyebrow">Command center</p><h1>Defense posture</h1></div></div><section className="glass-card loading-state" style={{ padding: 32 }}>Loading recorded simulation data</section></div>
  const notEvaluated = 'Not evaluated'
  const blocked = data.transactions.filter((item) => item.status === 'BLOCKED').length
  const reviewed = data.transactions.filter((item) => ['VERIFY', 'HOLD'].includes(item.status)).length
  const chartData = [...data.transactions].reverse().map((item) => ({ time: new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), blocked: item.status === 'BLOCKED' ? 1 : 0, reviewed: ['VERIFY', 'HOLD'].includes(item.status) ? 1 : 0 }))
  const priority = data.incidents.filter((item) => item.status !== 'RESOLVED').slice(0, 3)
  const recent = [...data.incidents.map((item) => ({ id: item.id, title: item.title, detail: `${item.severity} · ${item.status}`, createdAt: item.created_at })), ...data.transactions.map((item) => ({ id: item.id, title: `${item.status.toLowerCase()} transaction`, detail: `Risk ${item.risk_score}`, createdAt: item.created_at }))].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 4)
  const outcomes: [string, number, string][] = [['Blocked', blocked, 'green'], ['Review or hold', reviewed, 'cyan'], ['Other statuses', data.transactions.length - blocked - reviewed, 'blue']]
  return <div className="dashboard-page">
    <div className="welcome-row"><div><p className="eyebrow">Recorded simulation posture</p><h1>Defense Posture</h1><p className="subheading">Live risk scores, decisions and incidents for every payment the engine has evaluated.</p></div><button className="primary-button" onClick={() => navigate('/red-team')}><Sparkles size={16} /> Open Red Team Lab</button></div>
    <div className="metric-grid"><MetricCard label="Transactions monitored" value={data.metrics.transactions_monitored.toLocaleString()} note="recorded in database" icon={CreditCard} /><MetricCard label="Blocked transactions" value={blocked.toLocaleString()} note={`₹${data.transactions.filter((item) => item.status === 'BLOCKED').reduce((sum, item) => sum + item.amount, 0).toLocaleString('en-IN')} protected`} icon={ShieldCheck} tone="green" /><MetricCard label="Mean heuristic detection score" value={data.metrics.mean_detection_score === null ? notEvaluated : `${data.metrics.mean_detection_score} / 100`} note={data.metrics.mean_detection_score === null ? 'insufficient attack data' : 'configured attack heuristics; not a measured rate'} icon={Gauge} tone="blue" /><MetricCard label="Active incidents" value={data.metrics.active_threats.toLocaleString()} note="unresolved records" icon={TriangleAlert} tone="amber" /></div>
    <div className="dashboard-grid"><section className="chart-card glass-card"><div className="section-heading"><div><p className="eyebrow">Recorded outcomes</p><h2>Transaction activity</h2></div></div><div className="chart-summary"><strong>{data.transactions.length}</strong><span>transactions shown</span></div>{chartData.length ? <div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={chartData}><XAxis dataKey="time" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip /><Area type="monotone" dataKey="blocked" stroke="#c8f36a" fill="none" /><Area type="monotone" dataKey="reviewed" stroke="#94958b" fill="none" /></AreaChart></ResponsiveContainer></div> : <div className="empty-state">No transactions have been recorded.</div>}</section>
    <section className="activity-card glass-card"><div className="section-heading"><div><p className="eyebrow">Database records</p><h2>Recent activity</h2></div><button className="text-button" onClick={() => navigate('/transactions')}>View all <ChevronRight size={15} /></button></div><div className="activity-list">{recent.map((item) => <div className="activity-item" key={item.id}><div className="activity-icon cyan"><Activity size={16} /></div><div className="activity-copy"><strong>{item.title}</strong><span>{item.detail}</span></div><time>{new Date(item.createdAt).toLocaleString()}</time></div>)}</div>{!recent.length && <div className="empty-state">No activity has been recorded yet.</div>}</section></div>
    <div className="lower-grid"><section className="coverage-card glass-card"><div className="section-heading"><div><p className="eyebrow">Recorded outcomes</p><h2>Transaction disposition</h2></div><span className="status-badge green"><Circle size={6} />{data.transactions.length ? 'Data available' : 'Awaiting data'}</span></div>{outcomes.map(([name, count, tone]) => { const value = data.transactions.length ? `${Math.round(count / data.transactions.length * 100)}%` : '0%'; return <div className="coverage-row" key={name}><span>{name}</span><div className="progress"><i className={tone} style={{ width: value }} /></div><strong>{value}</strong></div> })}</section>
    <section className="queue-card glass-card"><div className="section-heading"><div><p className="eyebrow">Requires review</p><h2>Priority queue</h2></div><RiskBadge>{priority.length} open</RiskBadge></div>{priority.map((incident) => <div className="queue-row" key={incident.id} onClick={() => navigate('/incidents')}><div className="queue-avatar">{incident.severity.slice(0, 2)}</div><div><strong>{incident.title}</strong><span>{incident.id} · {incident.status}</span></div><RiskBadge tone={incident.severity === 'CRITICAL' ? 'red' : 'amber'}>{incident.severity}</RiskBadge></div>)}{!priority.length && <div className="empty-state">No unresolved incidents.</div>}</section></div>
  </div>
}

function TopBar({ config, user, onLogout, path, navigate }: { config: RouteConfig; user: User; onLogout: () => void; path: string; navigate: (path: string) => void }) { const initials = user.display_name.split(/\s+/).map((part) => part[0]).join('').slice(0, 2).toUpperCase(); return <header className="top-bar"><div className="mobile-title"><config.icon size={16} />{config.title}</div><div className="top-context"><ChapterCount path={path} /><span>{config.kicker}</span><b>Secure workspace</b></div><div className="top-actions"><NotificationBell navigate={navigate} /><div className="user-chip"><div className="user-avatar">{initials}</div><span><b>{user.display_name}</b><small>{user.email}</small></span><button className="logout-button" onClick={onLogout}>Sign out</button></div></div></header> }

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [restoring, setRestoring] = useState(true)
  const [sessionError, setSessionError] = useState<string | null>(null)
  const [sessionAttempt, setSessionAttempt] = useState(0)
  const resolvePath = (pathname: string) => pathname === '/' || pathname === '' ? '/' : pathname in routes ? pathname : '/dashboard'
  const [path, setPath] = useState(resolvePath(window.location.pathname))
  useEffect(() => { let active = true; setRestoring(true); setSessionError(null); api.me().then((value) => { if (active) setUser(value) }).catch((reason) => { if (!active) return; if (reason instanceof ApiError && reason.status === 401) setUser(null); else setSessionError(reason instanceof Error ? reason.message : 'Unable to restore the secure session.') }).finally(() => { if (active) setRestoring(false) }); const expired = () => { if (active) setUser(null) }; window.addEventListener('evopay:session-expired', expired); return () => { active = false; window.removeEventListener('evopay:session-expired', expired) } }, [sessionAttempt])
  useEffect(() => { const onPop = () => setPath(resolvePath(window.location.pathname)); window.addEventListener('popstate', onPop); return () => window.removeEventListener('popstate', onPop) }, [])
  const navigate = (nextPath: string) => { window.history.pushState({}, '', nextPath); setPath(nextPath); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  const config = routes[path] ?? routes['/dashboard']
  useEffect(() => { if (path !== '/') document.title = `${config.title} · EvoPay AI` }, [path, config.title])
  const logout = async () => { try { await api.logout() } finally { setUser(null) } }
  if (path === '/') return <Landing navigate={navigate} signedIn={!!user} />
  if (restoring) return <div className="session-restore"><div className="brand-symbol"><ShieldCheck size={18} /></div><span>Restoring secure session</span></div>
  if (sessionError) return <div className="session-restore"><div className="brand-symbol"><TriangleAlert size={18} /></div><h1>Connection unavailable</h1><p>{sessionError}</p><div style={{ display: 'flex', gap: '10px', marginTop: '16px' }}><button className="primary-button" onClick={() => setSessionAttempt((value) => value + 1)}>Retry connection</button><button className="primary-button" style={{ background: 'rgba(255,255,255,0.1)' }} onClick={() => { setSessionError(null); setUser(mockUser) }}>Explore in Demo Mode</button></div></div>
  if (!user) return <Auth onAuthenticated={setUser} />
  return <AppShell path={path} onNavigate={navigate} onLogout={logout}><TopBar config={config} user={user} onLogout={logout} path={path} navigate={navigate} /><LiveTape /><AnimatePresence mode="wait"><motion.main key={path} className="page-content" initial={{ opacity: 0, y: 60, rotateX: 14, scale: .94, transformPerspective: 1400 }} animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1, transformPerspective: 1400 }} exit={{ opacity: 0, y: -40, rotateX: -10, scale: .96, transformPerspective: 1400 }} transition={{ duration: .45, ease: [0.22, 1, 0.36, 1] }} style={{ transformOrigin: '50% 0%' }}>{path === '/dashboard' && <Dashboard navigate={navigate} />}{path === '/red-team' && <CommandDashboard navigate={navigate} />}{path === '/simulation' && <Simulation />}{path === '/arena' && <Arena />}{path === '/transactions' && <Transactions />}{path === '/checkout' && <Checkout />}{path === '/network' && <Network />}{path === '/blue-team' && <BlueTeam />}{path === '/playground' && <Playground />}{path === '/policy' && <Policy />}{path === '/incidents' && <Incidents />}{path === '/analytics' && <Analytics />}{path === '/developers' && <Developers />}{path === '/settings' && <Settings />}<PageOutro path={path} navigate={navigate} /></motion.main></AnimatePresence></AppShell>
}
export default App
