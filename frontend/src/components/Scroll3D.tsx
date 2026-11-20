import { useEffect } from 'react'

/**
 * 3D scroll engine.
 *
 * Every top-level card on the page becomes a "depth item": as it travels
 * through the viewport it rises out of depth, tilts on the X axis, and
 * settles flat at the centre of the screen — like panels mounted on a drum.
 * Hovering a card tilts it toward the pointer.
 *
 * The engine only writes CSS custom properties (--p, --ap, --k, --rx, --ry,
 * --scroll, --scroll-px); all of the actual 3D lives in index.css, so it is
 * cheap and easy to tune. Positions are measured from offsetTop (which ignores
 * transforms) so the effect never feeds back on itself.
 */

const ITEM_SELECTOR = [
  '.page-content .glass-card',
  '.page-content .command-metric',
  '.page-content .welcome-row',
  '.page-content .data-page-heading',
  '.page-content .page-header',
].join(',')

type Item = { el: HTMLElement; top: number; height: number }

const reducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function documentTop(el: HTMLElement) {
  let top = 0
  let node: HTMLElement | null = el
  while (node) {
    top += node.offsetTop
    node = node.offsetParent as HTMLElement | null
  }
  return top
}

export function useScroll3D(routeKey: string) {
  useEffect(() => {
    const root = document.documentElement
    if (reducedMotion()) {
      root.classList.remove('scroll-3d')
      return
    }
    root.classList.add('scroll-3d')

    let items: Item[] = []
    let frame = 0

    const measure = () => {
      const found = Array.from(document.querySelectorAll<HTMLElement>(ITEM_SELECTOR))
      // Only animate the outermost match so nested cards don't double-rotate.
      const outer = found.filter((el) => !el.parentElement?.closest(ITEM_SELECTOR))
      items = outer.map((el) => {
        el.classList.add('depth-item')
        return { el, top: documentTop(el), height: el.offsetHeight }
      })
    }

    const update = () => {
      frame = 0
      const vh = window.innerHeight
      const y = window.scrollY
      const max = Math.max(1, root.scrollHeight - vh)
      root.style.setProperty('--scroll', (y / max).toFixed(4))
      root.style.setProperty('--scroll-px', y.toFixed(1))

      for (const { el, top, height } of items) {
        const centre = top + height / 2 - y
        // -1 when the card is entering from below, 0 at screen centre, +1 when leaving the top.
        const raw = (vh / 2 - centre) / (vh / 2 + height / 2)
        const p = Math.max(-1.2, Math.min(1.2, raw))
        // Tall cards (tables, long lists) get a gentler effect so they stay readable.
        const k = Math.max(0.18, Math.min(1, (vh * 0.7) / Math.max(height, 1)))
        el.style.setProperty('--p', p.toFixed(3))
        el.style.setProperty('--ap', Math.abs(p).toFixed(3))
        el.style.setProperty('--k', k.toFixed(3))
      }
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    const remeasure = () => {
      measure()
      schedule()
    }

    // Pointer tilt
    const onPointerMove = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('.depth-item')
      if (!target) return
      const rect = target.getBoundingClientRect()
      const x = (event.clientX - rect.left) / rect.width - 0.5
      const yPos = (event.clientY - rect.top) / rect.height - 0.5
      const strength = rect.height > window.innerHeight * 0.7 ? 1.5 : 6
      target.style.setProperty('--ry', `${(x * strength).toFixed(2)}deg`)
      target.style.setProperty('--rx', `${(-yPos * strength).toFixed(2)}deg`)
      target.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`)
      target.style.setProperty('--my', `${((yPos + 0.5) * 100).toFixed(1)}%`)
      target.classList.add('is-tilting')
    }
    const onPointerOut = (event: PointerEvent) => {
      const target = (event.target as HTMLElement | null)?.closest<HTMLElement>('.depth-item')
      if (!target || target.contains(event.relatedTarget as Node | null)) return
      target.style.setProperty('--rx', '0deg')
      target.style.setProperty('--ry', '0deg')
      target.classList.remove('is-tilting')
    }

    // Content loads asynchronously (API calls), so watch for new cards.
    let mutationTimer = 0
    const observer = new MutationObserver(() => {
      window.clearTimeout(mutationTimer)
      mutationTimer = window.setTimeout(remeasure, 60)
    })
    const content = document.querySelector('.main-pane') ?? document.body
    observer.observe(content, { childList: true, subtree: true })

    const resizeObserver = new ResizeObserver(remeasure)
    resizeObserver.observe(document.body)

    remeasure()
    // Page transitions animate in; measure again once they settle.
    const settle = window.setTimeout(remeasure, 350)

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', remeasure)
    document.addEventListener('pointermove', onPointerMove, { passive: true })
    document.addEventListener('pointerout', onPointerOut, { passive: true })

    return () => {
      cancelAnimationFrame(frame)
      window.clearTimeout(settle)
      window.clearTimeout(mutationTimer)
      observer.disconnect()
      resizeObserver.disconnect()
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', remeasure)
      document.removeEventListener('pointermove', onPointerMove)
      document.removeEventListener('pointerout', onPointerOut)
    }
  }, [routeKey])
}

/** Fixed 3D backdrop: perspective grid floor, a scroll-driven wireframe cube, and parallax rings. */
export function ScrollScene() {
  return (
    <div className="scene-3d" aria-hidden="true">
      <div className="scene-progress" />
      <div className="scene-floor" />
      <div className="scene-ceiling" />
      <div className="scene-rings">
        <i className="ring r1" />
        <i className="ring r2" />
        <i className="ring r3" />
      </div>
      <div className="scene-cube-wrap">
        <div className="scene-cube">
          <b className="f front" />
          <b className="f back" />
          <b className="f right" />
          <b className="f left" />
          <b className="f top" />
          <b className="f bottom" />
          <div className="scene-cube inner">
            <b className="f front" />
            <b className="f back" />
            <b className="f right" />
            <b className="f left" />
            <b className="f top" />
            <b className="f bottom" />
          </div>
        </div>
      </div>
    </div>
  )
}
