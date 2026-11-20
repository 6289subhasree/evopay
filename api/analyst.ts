/**
 * EvoPay AI Analyst — Vercel serverless function backed by Google Gemini.
 *
 * Set GEMINI_API_KEY in the Vercel project (Settings → Environment Variables).
 * Optional: GEMINI_MODEL (defaults to gemini-3.5-flash-lite).
 * Without a key it answers 503 and the frontend falls back to its built-in analyst.
 */

const MODEL = process.env.GEMINI_MODEL || 'gemini-3.5-flash-lite'
const MAX_CONTEXT = 14000
const MAX_QUESTION = 600

const SYSTEM = `You are EvoPay's fraud analyst copilot, embedded in a payment-fraud red-team / blue-team platform.
EvoPay scores every payment 0-100 from four signals: ML classifier (35%), graph intelligence (25%), anomaly detection (20%), behavioural analysis (20%).
Decisions: 0-30 ALLOW, 31-60 VERIFY (step-up auth), 61-80 HOLD (analyst queue), 81-100 BLOCK.
Rules:
- Use only the data provided in CONTEXT. Never invent transactions, amounts, entities or metrics.
- If the data does not answer the question, say what is missing.
- Be concise and practical: a one-line verdict, then at most 5 short bullet points, then one recommended next action.
- Plain text only. Use "- " for bullets. No markdown headings, no tables.
- Amounts are Indian rupees (₹).`

const PROMPTS: Record<string, string> = {
  transaction: 'Write an investigation brief for this transaction: verdict, the evidence that drove the score, likely fraud pattern, and what the analyst should do next.',
  scenario: 'Explain this risk scenario from the playground: why it scored the way it did, which signal matters most, and what would change the decision.',
  arena: 'Summarise this attack-evolution run for a judge: when the attack started evading, how the defence adapted, and what the result proves.',
  chat: '',
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method_not_allowed' })

  // Only accept calls from this deployment (or localhost) so the key can't be used from other sites.
  const origin = String(req.headers.origin || '')
  const host = String(req.headers.host || '')
  let originHost = ''
  try { originHost = origin ? new URL(origin).host : '' } catch { originHost = 'invalid' }
  if (origin && originHost !== host && !/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(originHost)) {
    return res.status(403).json({ error: 'forbidden_origin' })
  }

  const key = process.env.GEMINI_API_KEY
  if (!key) return res.status(503).json({ error: 'not_configured' })

  const body = typeof req.body === 'string' ? safeJson(req.body) : req.body || {}
  const mode = typeof body.mode === 'string' && body.mode in PROMPTS ? body.mode : 'chat'
  const question = String(body.question || '').slice(0, MAX_QUESTION)
  const context = JSON.stringify(body.context ?? {}).slice(0, MAX_CONTEXT)
  const task = mode === 'chat' ? question || 'Summarise the current fraud posture.' : PROMPTS[mode]

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: [{ role: 'user', parts: [{ text: `TASK: ${task}\n\nCONTEXT (JSON):\n${context}` }] }],
        generationConfig: { maxOutputTokens: 700 },
      }),
    })
    const data: any = await response.json()
    if (!response.ok) return res.status(502).json({ error: 'gemini_error', detail: data?.error?.message || response.statusText })
    const text = (data?.candidates?.[0]?.content?.parts ?? []).map((part: any) => part.text || '').join('').trim()
    if (!text) return res.status(502).json({ error: 'empty_response' })
    return res.status(200).json({ text, source: 'gemini', model: MODEL })
  } catch (error: any) {
    return res.status(502).json({ error: 'gemini_unreachable', detail: String(error?.message || error) })
  }
}

function safeJson(value: string) {
  try { return JSON.parse(value) } catch { return {} }
}
