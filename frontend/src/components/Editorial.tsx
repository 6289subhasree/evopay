import { useEffect, useState } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import { api, type Transaction } from '../lib/api'
import { CHAPTERS, chapterIndex } from '../lib/chapters'

const pad = (value: number) => String(value).padStart(2, '0')

/** Stock-ticker style tape of recorded transactions. Pauses on hover. */
export function LiveTape() {
  const [items, setItems] = useState<Transaction[]>([])
  useEffect(() => {
    let active = true
    const load = () => api.transactions(24).then((rows) => { if (active) setItems(rows) }).catch(() => undefined)
    load()
    const timer = window.setInterval(load, 30000)
    return () => { active = false; window.clearInterval(timer) }
  }, [])
  if (!items.length) return null
  const row = items.map((txn) => {
    const tone = txn.status === 'BLOCKED' ? 'bad' : txn.status === 'ALLOWED' ? 'good' : 'warn'
    return <span className={`tape-item ${tone}`} key={txn.id}>
      <b>{txn.id}</b>
      <span>₹{txn.amount.toLocaleString('en-IN')}</span>
      <span>{txn.location}</span>
      <i>{tone === 'good' ? <ArrowUpRight size={11} /> : <ArrowDownRight size={11} />}{txn.status}</i>
      <em>risk {txn.risk_score}</em>
    </span>
  })
  return <div className="live-tape" aria-label="Recorded transactions">
    <span className="tape-label"><i />Live tape</span>
    <div className="tape-track"><div className="tape-run">{row}{row}</div></div>
  </div>
}

/** Right-hand chapter rail: one tick per section heading, highlights the one in view. */
export function SectionRail({ routeKey }: { routeKey: string }) {
  const [sections, setSections] = useState<{ el: HTMLElement; label: string }[]>([])
  const [active, setActive] = useState(0)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    const collect = () => {
      const headings = Array.from(document.querySelectorAll<HTMLElement>('.page-content h1, .page-content h2'))
        .filter((el) => el.offsetParent !== null && el.textContent?.trim())
        .slice(0, 12)
      setSections(headings.map((el) => ({ el, label: el.textContent!.trim().slice(0, 32) })))
    }
    let timer = window.setTimeout(collect, 500)
    const observer = new MutationObserver(() => { window.clearTimeout(timer); timer = window.setTimeout(collect, 150) })
    const content = document.querySelector('.main-pane')
    if (content) observer.observe(content, { childList: true, subtree: true })
    return () => { window.clearTimeout(timer); observer.disconnect() }
  }, [routeKey])

  useEffect(() => {
    const onScroll = () => {
      const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight)
      setProgress(Math.round((window.scrollY / max) * 100))
      let current = 0
      sections.forEach((section, i) => { if (section.el.getBoundingClientRect().top < window.innerHeight * 0.45) current = i })
      setActive(current)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [sections])

  if (sections.length < 2) return null
  return <nav className="section-rail" aria-label="Sections on this page">
    <span className="rail-progress">{pad(progress)}%</span>
    {sections.map((section, i) => <button key={`${section.label}-${i}`} className={i === active ? 'active' : ''} onClick={() => section.el.scrollIntoView({ behavior: 'smooth', block: 'center' })}>
      <span>{section.label}</span><i />
    </button>)}
  </nav>
}

/** Top-bar chapter counter, e.g. "04 / 09". */
export function ChapterCount({ path }: { path: string }) {
  return <span className="chapter-count"><b>{pad(chapterIndex(path) + 1)}</b> / {pad(CHAPTERS.length)}</span>
}

/** End-of-page outro: marquee band + oversized link to the next chapter. */
export function PageOutro({ path, navigate }: { path: string; navigate: (path: string) => void }) {
  const index = chapterIndex(path)
  const next = CHAPTERS[(index + 1) % CHAPTERS.length]
  const words = ['Simulate the attack', 'Score every payment', 'Explain every decision', 'Adapt the defence']
  const band = words.map((word) => <span key={word}>{word}<i>✦</i></span>)
  return <footer className="page-outro">
    <div className="outro-marquee" aria-hidden="true"><div>{band}{band}{band}</div></div>
    <button className="outro-next" onClick={() => navigate(next.path)}>
      <span className="outro-meta"><b>{pad(((index + 1) % CHAPTERS.length) + 1)}</b> Next chapter · {next.kicker}</span>
      <span className="outro-title">{next.title}<ArrowUpRight className="outro-arrow" /></span>
    </button>
    <div className="outro-foot">
      <span>EvoPay <b>AI</b></span>
      <span>Press <kbd>⌘K</kbd> to jump anywhere · <kbd>g</kbd> + letter for shortcuts</span>
      <button onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>Back to top ↑</button>
    </div>
  </footer>
}
