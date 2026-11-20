/**
 * Browser mirror of the backend scoring formulas so the Playground and the
 * Evolution Arena respond instantly, even without the API.
 *
 *  - Risk signals  → backend/services/risk_engine.py (rule-based fallback path)
 *  - Attack scoring → backend/services/attack_engine.py (_score / evolve_attack)
 *
 * Keep the two in sync if the Python weights change.
 */

const clamp = (value: number, low = 0, high = 100) => Math.max(low, Math.min(high, Math.round(value)))

export type Signals = {
  transaction_velocity: number
  amount_deviation: number
  failed_attempts: number
  historical_spending_deviation: number
  location_change: boolean
  merchant_frequency: number
  device_sharing: number
  connected_high_risk_entities: number
  suspicious_relationships: number
}

export const WEIGHTS = { ml: 0.35, graph: 0.25, anomaly: 0.2, behavior: 0.2 } as const

export function scoreSignals(s: Signals) {
  const velocity = Math.min(s.transaction_velocity, 20)
  const amount = Math.min(s.amount_deviation, 3)
  const failed = Math.min(s.failed_attempts, 5)
  const history = Math.min(s.historical_spending_deviation, 3)
  const merchant = Math.min(s.merchant_frequency, 10)
  const devices = Math.min(s.device_sharing, 10)
  const entities = Math.min(s.connected_high_risk_entities, 10)
  const relationships = Math.min(s.suspicious_relationships, 8)

  const ml = clamp(25 + amount * 15 + failed * 6 + velocity * 1.8)
  const behavior = clamp(18 + history * 18 + (s.location_change ? 18 : 0) + merchant * 2.2)
  const anomaly = clamp(22 + velocity * 2.2 + devices * 4 + failed * 4)
  const graph = clamp(24 + entities * 4 + devices * 3 + relationships * 3)
  const final = clamp(Math.ceil(WEIGHTS.ml * ml + WEIGHTS.anomaly * anomaly + WEIGHTS.behavior * behavior + WEIGHTS.graph * graph))

  const reasons: string[] = []
  if (s.transaction_velocity >= 6) reasons.push('High transaction velocity')
  if (s.device_sharing >= 2) reasons.push('Device linked to multiple accounts')
  if (s.merchant_frequency >= 4) reasons.push('Suspicious merchant relationship')
  if (s.historical_spending_deviation >= 1.2) reasons.push('Behavior differs significantly from historical baseline')
  if (s.connected_high_risk_entities >= 2) reasons.push('Connected to high-risk network cluster')
  if (s.failed_attempts >= 3) reasons.push('Repeated failed authorization attempts')
  if (s.location_change) reasons.push('Location changed from the usual pattern')

  return { ml, behavior, anomaly, graph, final, decision: decisionFor(final), level: levelFor(final), reasons }
}

export const decisionFor = (score: number) => (score <= 30 ? 'ALLOW' : score <= 60 ? 'VERIFY' : score <= 80 ? 'HOLD' : 'BLOCK')
export const levelFor = (score: number) => (score <= 30 ? 'LOW' : score <= 60 ? 'MEDIUM' : score <= 80 ? 'HIGH' : 'CRITICAL')

// ---------------------------------------------------------------------------
// Attack engine mirror
// ---------------------------------------------------------------------------
export type AttackParams = { accounts: number; devices: number; transaction_velocity: number; behavioral_similarity: number }

export const ATTACK_TYPES: { id: string; label: string; params: AttackParams }[] = [
  { id: 'synthetic_identity', label: 'Synthetic Identity', params: { accounts: 10, devices: 4, transaction_velocity: 2.1, behavioral_similarity: 0.72 } },
  { id: 'account_takeover', label: 'Account Takeover', params: { accounts: 6, devices: 3, transaction_velocity: 3.2, behavioral_similarity: 0.58 } },
  { id: 'card_testing', label: 'Card Testing', params: { accounts: 4, devices: 2, transaction_velocity: 8.4, behavioral_similarity: 0.36 } },
  { id: 'money_mule', label: 'Money Mule Network', params: { accounts: 18, devices: 7, transaction_velocity: 4.7, behavioral_similarity: 0.64 } },
  { id: 'merchant_collusion', label: 'Merchant Collusion', params: { accounts: 12, devices: 5, transaction_velocity: 3.8, behavioral_similarity: 0.69 } },
  { id: 'behavioral_mimicry', label: 'Behavioral Mimicry', params: { accounts: 8, devices: 3, transaction_velocity: 2.8, behavioral_similarity: 0.91 } },
  { id: 'device_rotation', label: 'Device Rotation', params: { accounts: 9, devices: 11, transaction_velocity: 5.1, behavioral_similarity: 0.61 } },
  { id: 'refund_abuse', label: 'Refund Abuse', params: { accounts: 7, devices: 4, transaction_velocity: 3.4, behavioral_similarity: 0.55 } },
  { id: 'velocity_attack', label: 'Velocity Attack', params: { accounts: 14, devices: 5, transaction_velocity: 9.2, behavioral_similarity: 0.42 } },
  { id: 'composite_attack', label: 'Composite Attack', params: { accounts: 18, devices: 7, transaction_velocity: 6.8, behavioral_similarity: 0.76 } },
]

/** Evasion threshold used by the attack engine: detection below this slips through. */
export const EVASION_LINE = 45
/** Detection boost the defence gains for each blind spot it has recorded for this attack family. */
export const ADAPTATION_BOOST = 14
export const ADAPTATION_CAP = 42

export function scoreAttack(p: AttackParams, generation: number) {
  const velocity = p.transaction_velocity
  const similarity = p.behavioral_similarity
  const coordination = Math.min(p.accounts / 20, 1)
  const deviceRatio = Math.min(p.devices / 12, 1)
  const realism = clamp(similarity * 58 + (1 - Math.min(Math.abs(velocity - 4) / 8, 1)) * 22 + coordination * 12 + deviceRatio * 8)
  const detection = clamp(82 - similarity * 22 - generation * 4 + velocity * 1.2 + deviceRatio * 8)
  return { realism, detection }
}

export function evolve(p: AttackParams): AttackParams {
  return {
    accounts: p.accounts + 2,
    devices: p.devices + 1,
    transaction_velocity: Math.round(p.transaction_velocity * 1.08 * 100) / 100,
    behavioral_similarity: Math.round(Math.min(0.99, p.behavioral_similarity + 0.04) * 100) / 100,
  }
}

export type GenerationResult = {
  generation: number
  params: AttackParams
  realism: number
  baseline: number
  adapted: number
  boost: number
  evadedBaseline: boolean
  evadedAdapted: boolean
  blindSpotRecorded: boolean
}

/** Runs the full red-vs-blue loop for one attack family. */
export function runEvolution(attackId: string, generations: number): GenerationResult[] {
  const type = ATTACK_TYPES.find((item) => item.id === attackId) ?? ATTACK_TYPES[0]
  let params = { ...type.params }
  let blindSpots = 0
  const results: GenerationResult[] = []
  for (let generation = 1; generation <= generations; generation++) {
    if (generation > 1) params = evolve(params)
    const { realism, detection } = scoreAttack(params, generation)
    const boost = Math.min(ADAPTATION_CAP, blindSpots * ADAPTATION_BOOST)
    const adapted = clamp(detection + boost)
    const evadedAdapted = adapted < EVASION_LINE
    results.push({ generation, params: { ...params }, realism, baseline: detection, adapted, boost, evadedBaseline: detection < EVASION_LINE, evadedAdapted, blindSpotRecorded: evadedAdapted })
    if (evadedAdapted) blindSpots += 1
  }
  return results
}
