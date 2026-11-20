import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, Command, CornerDownLeft, LogOut, Search, Sparkles, Zap } from 'lucide-react'
import { CHAPTERS } from '../lib/chapters'

type Action = { id: string; label: string; hint: string; group: string; keys?: string; run: () => void }

/**
 * ⌘K / Ctrl+K command palette, plus vim-style "g then letter" navigation
 * (g d → dashboard, g t → transactions …) and "?" to open the palette.
 */
export function CommandPalette({ navigate, onLogout, onTour, onToggleMotion, motionOn }: {
  navigate: (path: string) => void
  onLogout: () => void
  onTour: () => void
  onToggleMotion: () => void
  motionOn: boolean
}) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const actions = useMemo<Action[]>(() => [
    ...CHAPTERS.map((chapter) => ({ id: chapter.path, label: chapter.title, hint: chapter.kicker, group: 'Go to', keys: `g ${chapter.key}`, run: () => navigate(chapter.path) })),
    { id: 'tour', label: 'Start guided tour', hint: 'Walk through every page', group: 'Actions', run: onTour },
    { id: 'motion', label: motionOn ? 'Turn 3D motion off' : 'Turn 3D motion on', hint: 'Scroll depth, tilt and backdrop', group: 'Actions', keys: 'm', run: onToggleMotion },
    { id: 'top', label: 'Back to top', hint: 'Scroll to the start of the page', group: 'Actions', keys: 't', run: () => window.scrollTo({ top: 0, behavior: 'smooth' }) },
    { id: 'logout', label: 'Sign out', hint: 'End this session', group: 'Account', run: onLogout },
  ], [navigate, onLogout, onTour, onToggleMotion, motionOn])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return actions
    return actions
      .map((action) => {
        const text = `${action.label} ${action.hint} ${action.group}`.toLowerCase()
        // subsequence match, scored by how early and how tightly it matches
        let pos = -1, score = 0
        for (const char of q) {
          const next = text.indexOf(char, pos + 1)
          if (next === -1) return null
          score += next - pos
          pos = next
        }
        return { action, score }
      })
      .filter((item): item is { action: Action; score: number } => item !== null)
      .sort((a, b) => a.score - b.score)
      .map((item) => item.action)
  }, [actions, query])

  useEffect(() => { setIndex(0) }, [query, open])
  useEffect(() => { if (open) window.setTimeout(() => inputRef.current?.focus(), 20); else setQuery('') }, [open])

  useEffect(() => {
    let pendingG = 0
    const typing = (target: EventTarget | null) => {
      const el = target as HTMLElement | null
      return !!el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable)
    }
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setOpen((value) => !value); return }
      if (event.key === 'Escape') { setOpen(false); return }
      if (open || typing(event.target) || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key === '?' || event.key === '/') { event.preventDefault(); setOpen(true); return }
      if (pendingG && Date.now() - pendingG < 900) {
        const chapter = CHAPTERS.find((item) => item.key === event.key.toLowerCase())
        pendingG = 0
        if (chapter) { event.preventDefault(); navigate(chapter.path) }
        return
      }
      if (event.key === 'g') { pendingG = Date.now(); return }
      if (event.key === 'm') onToggleMotion()
      if (event.key === 't') window.scrollTo({ top: 0, behavior: 'smooth' })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, navigate, onToggleMotion])

  const run = (action?: Action) => { if (!action) return; setOpen(false); action.run() }
  const onInputKey = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown') { event.preventDefault(); setIndex((value) => Math.min(results.length - 1, value + 1)) }
    if (event.key === 'ArrowUp') { event.preventDefault(); setIndex((value) => Math.max(0, value - 1)) }
    if (event.key === 'Enter') { event.preventDefault(); run(results[index]) }
  }

  let lastGroup = ''
  return <>
    <button className="palette-trigger" onClick={() => setOpen(true)} aria-label="Open command palette">
      <Search size={14} /><span>Jump to…</span><kbd><Command size={11} />K</kbd>
    </button>
    <AnimatePresence>
      {open && <motion.div className="palette-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onMouseDown={() => setOpen(false)}>
        <motion.div className="palette" role="dialog" aria-label="Command palette" initial={{ opacity: 0, y: -24, rotateX: 18, scale: .96 }} animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }} exit={{ opacity: 0, y: -12, rotateX: 10, scale: .97 }} transition={{ duration: .22, ease: [0.22, 1, 0.36, 1] }} style={{ transformPerspective: 1000 }} onMouseDown={(event) => event.stopPropagation()}>
          <div className="palette-input"><Search size={16} /><input ref={inputRef} value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={onInputKey} placeholder="Search pages and actions…" /><kbd>esc</kbd></div>
          <div className="palette-list">
            {results.map((action, i) => {
              const header = action.group !== lastGroup ? action.group : null
              lastGroup = action.group
              const Icon = action.id === 'logout' ? LogOut : action.id === 'tour' ? Zap : action.group === 'Go to' ? ArrowRight : Sparkles
              return <div key={action.id}>
                {header && <p className="palette-group">{header}</p>}
                <button className={`palette-item ${i === index ? 'active' : ''}`} onMouseEnter={() => setIndex(i)} onClick={() => run(action)}>
                  <Icon size={14} /><span><b>{action.label}</b><small>{action.hint}</small></span>
                  {action.keys && <kbd>{action.keys}</kbd>}
                  {i === index && <CornerDownLeft size={13} className="palette-enter" />}
                </button>
              </div>
            })}
            {!results.length && <p className="palette-empty">Nothing matches “{query}”.</p>}
          </div>
          <div className="palette-foot"><span><kbd>↑</kbd><kbd>↓</kbd> move</span><span><kbd>↵</kbd> open</span><span><kbd>g</kbd> + letter jumps anywhere</span></div>
        </motion.div>
      </motion.div>}
    </AnimatePresence>
  </>
}
