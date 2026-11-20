import { decisionFor } from './riskModel'

export type AnalystMode = 'transaction' | 'scenario' | 'arena' | 'chat'
export type AnalystReply = { text: string; source: 'gemini' | 'offline'; model?: string; note?: string }

/**
 * Ask the Gemini-backed analyst (/api/analyst). If Gemini isn't configured or
 * reachable, answer with the built-in rule-based analyst so the demo never breaks.
 */
export async function askAnalyst(mode: AnalystMode, context: unknown, question = ''): Promise<AnalystReply> {
  try {
    const response = await fetch('/api/analyst', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ mode, context, question }),
    })
    if (response.ok) {
      const data = await response.json()
      if (data?.text) return { text: data.text, source: 'gemini', model: data.model }
    }
    const note = response.status === 503 ? 'Gemini key not configured — showing the built-in analyst.' : 'Gemini unavailable — showing the built-in analyst.'
    return { text: offlineAnswer(mode, context, question), source: 'offline', note }
  } catch {
    return { text: offlineAnswer(mode, context, question), source: 'offline', note: 'Gemini unavailable — showing the built-in analyst.' }
  }
}

const rupees = (value: number) => `₹${Math.round(value).toLocaleString('en-IN')}`

function offlineAnswer(mode: AnalystMode, context: any, question: string): string {
  context = context ?? {}
  if (mode === 'transaction') {
    const txn = context.transaction ?? {}
    const score = Number(context.analysis?.risk_score ?? txn.risk_score ?? 0)
    const reasons: string[] = context.analysis?.reasons ?? []
    const signals = context.analysis?.signals ?? {}
    const strongest = (['ml_score', 'graph_score', 'anomaly_score', 'behavior_score'] as const)
      .map((key) => [key, Number(signals[key] ?? 0)] as const).sort((a, b) => b[1] - a[1])[0]
    return [
      `Verdict: ${decisionFor(score)} — risk ${score}/100 for ${txn.id ?? 'this transaction'} (${rupees(Number(txn.amount ?? 0))}, ${txn.location ?? 'unknown city'}).`,
      ...(reasons.length ? reasons.map((reason) => `- ${reason}`) : ['- No individual signal crossed its alert threshold.']),
      strongest && strongest[1] ? `- Strongest signal: ${strongest[0].replace('_score', '').replace('ml', 'ML classifier')} at ${strongest[1]}.` : '',
      `Next action: ${score > 80 ? 'keep blocked, open an incident and check linked devices in Fraud Network.' : score > 60 ? 'hold for analyst review and contact the customer.' : score > 30 ? 'require step-up authentication (OTP) before releasing.' : 'release — no further action needed.'}`,
    ].filter(Boolean).join('\n')
  }
  if (mode === 'scenario') {
    const s = context.scores ?? {}
    const parts = [['ML classifier', s.ml, 0.35], ['Graph intelligence', s.graph, 0.25], ['Anomaly detection', s.anomaly, 0.2], ['Behavioural analysis', s.behavior, 0.2]] as const
    const top = [...parts].sort((a, b) => Number(b[1]) * b[2] - Number(a[1]) * a[2])[0]
    return [
      `Verdict: ${s.decision} at ${s.final}/100.`,
      ...parts.map(([name, value, weight]) => `- ${name}: ${value} × ${weight * 100}% = ${(Number(value) * weight).toFixed(1)} points`),
      `- Biggest contributor: ${top[0]}.`,
      `Next action: ${s.final > 60 ? `lowering ${top[0].toLowerCase()} inputs is the fastest way to change the decision.` : s.final > 30 ? `borderline — a step-up check (OTP) is enough; a little more ${top[0].toLowerCase()} risk would push it into HOLD.` : 'this looks like normal spending; raise velocity or device sharing to see the defence react.'}`,
    ].join('\n')
  }
  if (mode === 'arena') {
    const runs: any[] = context.generations ?? []
    const firstEvasion = runs.find((run) => run.evadedBaseline)
    const adaptedEvasions = runs.filter((run) => run.evadedAdapted).length
    const baselineEvasions = runs.filter((run) => run.evadedBaseline).length
    const last = runs[runs.length - 1]
    return [
      `Verdict: adaptive defence cut successful evasions from ${baselineEvasions} to ${adaptedEvasions} across ${runs.length} generations of ${context.attack ?? 'the attack'}.`,
      firstEvasion ? `- The attack first slipped past a static defence at generation ${firstEvasion.generation} (detection ${firstEvasion.baseline}).` : '- The attack never got past the defence in this run.',
      `- Each evasion was recorded as a blind spot and added +14 detection for later generations.`,
      last ? `- Final generation: static defence ${last.baseline} vs adaptive defence ${last.adapted}.` : '',
      'Next action: run the same family again with more generations, or try Behavioral Mimicry — the hardest family to detect.',
    ].filter(Boolean).join('\n')
  }
  // chat
  const txns: any[] = context.transactions ?? []
  const incidents: any[] = context.incidents ?? []
  const blocked = txns.filter((txn) => txn.status === 'BLOCKED')
  const riskiest = [...txns].sort((a, b) => b.risk_score - a.risk_score)[0]
  const open = incidents.filter((incident) => incident.status !== 'RESOLVED')
  const q = question.toLowerCase()
  if (q.includes('first') || q.includes('review') || q.includes('priority')) {
    return riskiest ? `Review ${riskiest.id} first: risk ${riskiest.risk_score}, ${rupees(riskiest.amount)} in ${riskiest.location}, currently ${riskiest.status}.\n- ${open.length} incident(s) are still open.\nNext action: open it in Transactions and check its device links in Fraud Network.` : 'There are no transactions recorded yet. Run an attack from the Red Team Lab first.'
  }
  return [
    `Posture: ${txns.length} transactions recorded, ${blocked.length} blocked (${rupees(blocked.reduce((sum, txn) => sum + txn.amount, 0))} held back), ${open.length} open incident(s).`,
    riskiest ? `- Highest risk: ${riskiest.id} at ${riskiest.risk_score} (${riskiest.status}).` : '',
    ...open.slice(0, 3).map((incident) => `- ${incident.id}: ${incident.title} — ${incident.severity}, ${incident.status}.`),
    'Next action: work the open incidents from highest severity down.',
  ].filter(Boolean).join('\n')
}
