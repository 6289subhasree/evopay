import { useEffect, useMemo, useRef, useState } from 'react'
import type { NetworkData } from '../lib/api'

type Point = { x: number; y: number; z: number }

const TYPE_TONE: Record<string, string> = { customer: '#c8f36a', merchant: '#e7bc66', device: '#ff806e' }
const toneFor = (type: string) => TYPE_TONE[type.toLowerCase()] ?? '#d8cfb8'

/**
 * Rotatable 3D entity graph. Nodes sit on a sphere (Fibonacci lattice);
 * drag to orbit, it drifts on its own, and page scroll adds a little spin.
 * Click a node to isolate its recorded relationships.
 */
export function NetworkGraph3D({ data, highlight }: { data: NetworkData; highlight: Set<string> }) {
  const [angle, setAngle] = useState({ x: -0.35, y: 0.6 })
  const [selected, setSelected] = useState<string | null>(null)
  const drag = useRef<{ x: number; y: number; ax: number; ay: number } | null>(null)
  const idle = useRef(true)

  const base = useMemo(() => {
    const n = data.nodes.length || 1
    const golden = Math.PI * (3 - Math.sqrt(5))
    const map = new Map<string, Point>()
    // Sort by type so similar entities cluster on the same band of the sphere.
    const ordered = [...data.nodes].sort((a, b) => a.type.localeCompare(b.type))
    ordered.forEach((node, i) => {
      const y = 1 - (i / Math.max(1, n - 1)) * 2
      const r = Math.sqrt(1 - y * y)
      const theta = golden * i
      map.set(node.id, { x: Math.cos(theta) * r, y, z: Math.sin(theta) * r })
    })
    return map
  }, [data.nodes])

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let frame = 0
    let lastScroll = window.scrollY
    const tick = () => {
      const dy = window.scrollY - lastScroll
      lastScroll = window.scrollY
      if (!drag.current) setAngle((a) => ({ x: a.x + dy * 0.002, y: a.y + (idle.current && !reduced ? 0.0035 : 0) + dy * 0.003 }))
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [])

  const size = 520, radius = 190, depth = 620
  const project = (p: Point) => {
    const cy = Math.cos(angle.y), sy = Math.sin(angle.y), cx = Math.cos(angle.x), sx = Math.sin(angle.x)
    const x1 = p.x * cy - p.z * sy
    const z1 = p.x * sy + p.z * cy
    const y2 = p.y * cx - z1 * sx
    const z2 = p.y * sx + z1 * cx
    const scale = depth / (depth - z2 * radius)
    return { x: size / 2 + x1 * radius * scale, y: size / 2 + y2 * radius * scale, z: z2, s: scale }
  }

  const projected = new Map(data.nodes.map((node) => [node.id, project(base.get(node.id) ?? { x: 0, y: 0, z: 0 })]))
  const linked = new Set<string>()
  if (selected) data.relationships.forEach((e) => { if (e.from === selected) linked.add(e.to); if (e.to === selected) linked.add(e.from) })
  const selectedNode = data.nodes.find((node) => node.id === selected)
  const selectedEdges = data.relationships.filter((e) => e.from === selected || e.to === selected)

  const onDown = (event: React.PointerEvent) => { (event.target as Element).setPointerCapture?.(event.pointerId); drag.current = { x: event.clientX, y: event.clientY, ax: angle.x, ay: angle.y }; idle.current = false }
  const onMove = (event: React.PointerEvent) => { if (!drag.current) return; setAngle({ x: drag.current.ax + (event.clientY - drag.current.y) * 0.008, y: drag.current.ay + (event.clientX - drag.current.x) * 0.008 }) }
  const onUp = () => { drag.current = null; window.setTimeout(() => { idle.current = true }, 2500) }

  const nodesByDepth = [...data.nodes].sort((a, b) => (projected.get(a.id)!.z) - (projected.get(b.id)!.z))
  return <section className="graph-3d glass-card">
    <div className="section-heading"><div><p className="eyebrow">Orbit view · drag to rotate</p><h2>Entity constellation</h2></div>
      <div className="graph-legend">{['Customer', 'Merchant', 'Device'].map((t) => <span key={t}><i style={{ background: toneFor(t) }} />{t}</span>)}</div></div>
    <div className="graph-3d-body">
      <svg viewBox={`0 0 ${size} ${size}`} className="graph-3d-svg" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerLeave={onUp} role="img" aria-label="3D graph of recorded entities and relationships">
        <defs><radialGradient id="orb-glow"><stop offset="0%" stopColor="rgba(200,243,106,.10)" /><stop offset="100%" stopColor="rgba(200,243,106,0)" /></radialGradient></defs>
        <circle cx={size / 2} cy={size / 2} r={radius * 1.25} fill="url(#orb-glow)" />
        {[0.35, 0.7, 1].map((r) => <ellipse key={r} cx={size / 2} cy={size / 2} rx={radius * r} ry={radius * r * Math.abs(Math.sin(angle.x + 1.2)) * 0.9 + 4} fill="none" stroke="rgba(238,234,225,.06)" />)}
        {data.relationships.map((edge, i) => {
          const a = projected.get(edge.from), b = projected.get(edge.to)
          if (!a || !b) return null
          const on = selected ? edge.from === selected || edge.to === selected : highlight.has(edge.from) || highlight.has(edge.to)
          return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={on ? 'rgba(200,243,106,.75)' : 'rgba(238,234,225,.12)'} strokeWidth={on ? 1.4 : .8} strokeDasharray={edge.type.includes('DEVICE') ? '4 4' : undefined} />
        })}
        {nodesByDepth.map((node) => {
          const p = projected.get(node.id)!
          const dim = selected ? !(node.id === selected || linked.has(node.id)) : !highlight.has(node.id)
          const r = 5 + p.s * 4 + (node.id === selected ? 4 : 0)
          return <g key={node.id} className="graph-node" opacity={dim ? .22 : Math.min(1, .45 + p.s * .5)} onClick={() => setSelected(selected === node.id ? null : node.id)} onPointerDown={(event) => event.stopPropagation()}>
            <circle cx={p.x} cy={p.y} r={r + 6} fill={toneFor(node.type)} opacity={.12} />
            <circle cx={p.x} cy={p.y} r={r} fill="#11120f" stroke={toneFor(node.type)} strokeWidth={1.6} />
            {p.z > -0.2 && <text x={p.x + r + 6} y={p.y + 3}>{node.id}</text>}
          </g>
        })}
      </svg>
      <aside className="graph-3d-inspector">
        {selectedNode ? <>
          <p className="eyebrow">Selected entity</p>
          <h3>{selectedNode.name}</h3>
          <dl><div><dt>ID</dt><dd>{selectedNode.id}</dd></div><div><dt>Type</dt><dd>{selectedNode.type}</dd></div><div><dt>City</dt><dd>{selectedNode.city || '—'}</dd></div><div><dt>Links</dt><dd>{selectedEdges.length}</dd></div></dl>
          <ul>{selectedEdges.map((e, i) => <li key={i}><span>{e.type.replace(/_/g, ' ').toLowerCase()}</span><b>{e.from === selected ? e.to : e.from}</b></li>)}</ul>
          <button className="text-button" onClick={() => setSelected(null)}>Clear selection</button>
        </> : <>
          <p className="eyebrow">Inspector</p>
          <h3>Click a node</h3>
          <p>Isolate an entity to see only the relationships recorded for it. Dashed lines are shared or used devices.</p>
          <dl><div><dt>Entities</dt><dd>{data.nodes.length}</dd></div><div><dt>Relationships</dt><dd>{data.relationships.length}</dd></div></dl>
        </>}
      </aside>
    </div>
  </section>
}
