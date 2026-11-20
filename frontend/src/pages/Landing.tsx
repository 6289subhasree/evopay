import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, ArrowUpRight, BadgeCheck, Blocks, Bot, Code2, FileSearch, Fingerprint, KeyRound, Lock, Network, Scale, ScrollText, ShoppingCart, SlidersHorizontal, Sparkles, Swords } from 'lucide-react'
import { CardStack3D } from './Auth'

const GITHUB = 'https://github.com/6289subhasree/evopay'

const STATS = [
  { value: '25.47 bn', label: 'UPI payments in October 2026 — each one needs a fraud decision in milliseconds', source: 'NPCI, Oct 2026' },
  { value: '₹1 lakh cr+', label: 'moving over UPI every single day', source: 'NPCI, Oct 2026' },
  { value: '₹48,021 cr', label: 'involved in bank frauds in FY26 — up 46% in a year, a three-year high', source: 'RBI Annual Report 2025-26' },
]

const LOOP = [
  { icon: Swords, step: '01', title: 'Attack', copy: 'Our Red Team engine generates realistic fraud across 10 attack families — account takeover, mule rings, card testing, synthetic identities and more.' },
  { icon: FileSearch, step: '02', title: 'Detect', copy: 'Every payment is scored 0–100 by four independent signals — ML, graph, anomaly and behaviour — and gets an explainable decision.' },
  { icon: Sparkles, step: '03', title: 'Adapt', copy: 'When an attack slips through, EvoPay records the blind spot, evolves the attack and hardens the defence — before real fraudsters find the gap.' },
]

const PRODUCT = [
  { icon: Swords, title: 'Evolution Arena', copy: 'Watch an attack mutate generation by generation against static vs adaptive defence.', path: '/arena' },
  { icon: ShoppingCart, title: 'Live Checkout', copy: 'The customer’s view: instant approval, OTP step-up, review or decline.', path: '/checkout' },
  { icon: SlidersHorizontal, title: 'What-If Lab', copy: 'Move any signal and see the risk score and decision change instantly.', path: '/playground' },
  { icon: Network, title: '3D Fraud Network', copy: 'Rotate the entity graph and isolate shared devices that expose mule rings.', path: '/network' },
  { icon: Scale, title: 'Policy Backtester', copy: 'Replay new thresholds over past payments before changing anything live.', path: '/policy' },
  { icon: Bot, title: 'Gemini Copilot', copy: 'Ask questions about your payments and get grounded, plain-English answers.', path: '/dashboard' },
]

const TRUST = [
  { icon: KeyRound, title: 'Argon2 password hashing', copy: 'Industry-standard memory-hard hashing for every analyst account.' },
  { icon: Lock, title: 'Server-side sessions + CSRF', copy: 'Session tokens never touch browser storage; every write is CSRF-protected.' },
  { icon: Fingerprint, title: 'Strict record ownership', copy: 'Each analyst’s workspace and records are isolated from every other user.' },
  { icon: ScrollText, title: 'Full audit trail', copy: 'Every decision, action and investigation is written to the audit log.' },
  { icon: BadgeCheck, title: 'Explainable decisions', copy: 'Every block comes with the signals and reasons behind it — no black box.' },
  { icon: Code2, title: 'API-first', copy: 'Score, explain and act from your own checkout or back office.' },
]

const PLANS = [
  { name: 'Pilot', price: 'Free', note: '30 days', points: ['Full platform on your test data', 'Red Team + Evolution Arena', 'Policy backtesting', 'Onboarding support'], cta: 'Start a pilot' },
  { name: 'Growth', price: 'Usage-based', note: 'per 1,000 payments scored', points: ['Real-time scoring API', 'Gemini Copilot for analysts', 'Alerts, incidents & CSV export', 'Email support'], cta: 'Talk to us', featured: true },
  { name: 'Enterprise', price: 'Custom', note: 'for banks & PSPs', points: ['Dedicated deployment', 'Custom attack families', 'Model retraining on your data', 'SLA & compliance reviews'], cta: 'Contact sales' },
]

export default function Landing({ navigate, signedIn }: { navigate: (path: string) => void; signedIn: boolean }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    onScroll(); window.addEventListener('scroll', onScroll, { passive: true })
    document.title = 'EvoPay AI — Adaptive payment fraud defence'
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const go = (path: string) => navigate(path)
  const jump = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  const reveal = { initial: { opacity: 0, y: 40, rotateX: 12 }, whileInView: { opacity: 1, y: 0, rotateX: 0 }, viewport: { once: true, margin: '-80px' }, transition: { duration: .7, ease: [0.22, 1, 0.36, 1] as const } }

  return <div className="landing">
    <header className={`landing-nav ${scrolled ? 'scrolled' : ''}`}>
      <button className="landing-brand" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}><span><Blocks size={17} /></span>EvoPay <b>AI</b></button>
      <nav><button onClick={() => jump('how')}>How it works</button><button onClick={() => jump('product')}>Product</button><button onClick={() => jump('trust')}>Security</button><button onClick={() => jump('pricing')}>Pricing</button></nav>
      <div className="landing-nav-cta"><button className="ghost" onClick={() => go('/dashboard')}>{signedIn ? 'Dashboard' : 'Sign in'}</button><button className="solid" onClick={() => go('/dashboard')}>Open live demo <ArrowRight size={14} /></button></div>
    </header>

    <section className="landing-hero">
      <div className="hero-copy">
        <motion.p className="hero-kicker" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}><i />Adaptive payment fraud defence · Built with Gemini</motion.p>
        <motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .1, duration: .8, ease: [0.22, 1, 0.36, 1] }}>Fraud evolves.<br /><em>Your defence should too.</em></motion.h1>
        <motion.p className="hero-sub" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: .3 }}>EvoPay attacks your fraud defences the way criminals will — then shows exactly why every payment was allowed, challenged or blocked, and hardens the gaps automatically.</motion.p>
        <motion.div className="hero-ctas" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .4 }}>
          <button className="solid big" onClick={() => go('/arena')}>Watch the loop live <ArrowUpRight size={16} /></button>
          <button className="ghost big" onClick={() => go('/checkout')}>Try a payment</button>
        </motion.div>
        <div className="hero-proof"><span><b>4</b> independent risk signals</span><span><b>10</b> attack families</span><span><b>4</b> decision tiers</span></div>
      </div>
      <div className="hero-visual"><CardStack3D /><div className="hero-badge allow">ALLOW · 18</div><div className="hero-badge verify">VERIFY · 52</div><div className="hero-badge block">BLOCK · 94</div></div>
    </section>

    <section className="landing-stats">
      {STATS.map((stat, i) => <motion.div key={stat.value} {...reveal} transition={{ ...reveal.transition, delay: i * .08 }}><strong>{stat.value}</strong><p>{stat.label}</p><small>Source: {stat.source}</small></motion.div>)}
    </section>

    <section className="landing-section" id="how">
      <motion.div className="section-intro" {...reveal}><p className="hero-kicker"><i />The problem</p><h2>Fraud models are tested on yesterday’s fraud.</h2><p>Attackers change tactics every week, but most detection systems are only ever measured against historical patterns. The gap shows up as losses — and as genuine customers getting blocked with no explanation.</p></motion.div>
      <div className="loop-grid">{LOOP.map((item, i) => <motion.article key={item.title} className="loop-card" {...reveal} transition={{ ...reveal.transition, delay: i * .1 }}><span>{item.step}</span><item.icon size={22} /><h3>{item.title}</h3><p>{item.copy}</p></motion.article>)}</div>
    </section>

    <section className="landing-section" id="product">
      <motion.div className="section-intro" {...reveal}><p className="hero-kicker"><i />The platform</p><h2>Everything a fraud team needs, in one loop.</h2></motion.div>
      <div className="product-grid">{PRODUCT.map((item, i) => <motion.button key={item.title} className="product-card" onClick={() => go(item.path)} {...reveal} transition={{ ...reveal.transition, delay: (i % 3) * .08 }}><item.icon size={20} /><h3>{item.title}</h3><p>{item.copy}</p><span>Open <ArrowUpRight size={13} /></span></motion.button>)}</div>
    </section>

    <section className="landing-section google">
      <motion.div className="google-card" {...reveal}>
        <div><p className="hero-kicker"><i />Built with Google AI</p><h2>Gemini turns risk scores into answers.</h2><p>EvoPay’s analyst copilot uses Google Gemini to write investigation briefs, explain decisions and summarise attack runs — grounded only in the workspace’s own data, so it never invents numbers.</p></div>
        <ul><li><Sparkles size={15} />Investigation brief for any transaction</li><li><Sparkles size={15} />Plain-English “why was this blocked?”</li><li><Sparkles size={15} />Attack-run summaries for risk committees</li><li><Sparkles size={15} />Copilot chat over live payments & incidents</li></ul>
      </motion.div>
    </section>

    <section className="landing-section" id="trust">
      <motion.div className="section-intro" {...reveal}><p className="hero-kicker"><i />Security & trust</p><h2>Built like the systems it protects.</h2></motion.div>
      <div className="trust-grid">{TRUST.map((item, i) => <motion.div key={item.title} className="trust-item" {...reveal} transition={{ ...reveal.transition, delay: (i % 3) * .06 }}><item.icon size={18} /><div><h3>{item.title}</h3><p>{item.copy}</p></div></motion.div>)}</div>
    </section>

    <section className="landing-section" id="pricing">
      <motion.div className="section-intro" {...reveal}><p className="hero-kicker"><i />Pricing</p><h2>Start with a pilot. Scale with your volume.</h2><p>For fintechs, payment apps, banks and payment service providers.</p></motion.div>
      <div className="plan-grid">{PLANS.map((plan, i) => <motion.div key={plan.name} className={`plan ${plan.featured ? 'featured' : ''}`} {...reveal} transition={{ ...reveal.transition, delay: i * .08 }}>
        {plan.featured && <span className="plan-tag">Most popular</span>}
        <h3>{plan.name}</h3><strong>{plan.price}</strong><small>{plan.note}</small>
        <ul>{plan.points.map((point) => <li key={point}><BadgeCheck size={14} />{point}</li>)}</ul>
        <button className={plan.featured ? 'solid' : 'ghost'} onClick={() => go('/dashboard')}>{plan.cta}</button>
      </motion.div>)}</div>
    </section>

    <section className="landing-cta">
      <motion.div {...reveal}><h2>See it stop an attack<br />it has never seen before.</h2><button className="solid big" onClick={() => go('/arena')}>Open the Evolution Arena <ArrowUpRight size={16} /></button></motion.div>
    </section>

    <footer className="landing-footer">
      <div><span className="landing-brand static"><span><Blocks size={15} /></span>EvoPay <b>AI</b></span><p>Adaptive payment fraud defence. Made in India.</p></div>
      <div><h4>Product</h4><button onClick={() => go('/arena')}>Evolution Arena</button><button onClick={() => go('/checkout')}>Live Checkout</button><button onClick={() => go('/playground')}>What-If Lab</button><button onClick={() => go('/policy')}>Policy Backtester</button></div>
      <div><h4>Developers</h4><button onClick={() => go('/developers')}>API & integration</button><a href={GITHUB} target="_blank" rel="noreferrer">GitHub</a></div>
      <div><h4>Company</h4><button onClick={() => jump('trust')}>Security</button><button onClick={() => jump('pricing')}>Pricing</button></div>
      <p className="landing-legal">© {new Date().getFullYear()} EvoPay AI. Figures cited from NPCI and the Reserve Bank of India.</p>
    </footer>
  </div>
}
