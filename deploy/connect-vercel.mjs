#!/usr/bin/env node
/**
 * Connect the Vercel web app to the Cloud Run API.
 *
 *   node deploy/connect-vercel.mjs https://evopay-api-xxxxx-el.a.run.app
 *
 * - vercel.json: forwards /api/* to Cloud Run (same-origin for the browser, so
 *   login cookies are first-party and work in every browser).
 * - frontend/.env.production: the web app calls /api and allows time for
 *   Cloud Run to wake from zero instances.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const raw = (process.argv[2] || '').trim().replace(/\/+$/, '')
let url
try { url = new URL(raw) } catch { url = null }
if (!url || url.protocol !== 'https:' || !url.hostname.endsWith('.run.app')) {
  console.error('Usage: node deploy/connect-vercel.mjs https://<service>-<hash>.<region>.run.app')
  process.exit(1)
}
const origin = url.origin

// Vercel reads vercel.json from the project's Root Directory: the repo root, or
// frontend/ if the project is configured that way. Update both so either works.
const spa = { source: '/((?!api/).*)', destination: '/index.html' }
for (const vercelPath of [join(root, 'vercel.json'), join(root, 'frontend', 'vercel.json')]) {
  let config
  try { config = JSON.parse(readFileSync(vercelPath, 'utf8')) } catch { continue }
  config.rewrites = [
    { source: '/api/:path*', destination: `${origin}/api/:path*` },
    ...(config.rewrites || []).filter((rule) => !rule.source.startsWith('/api/') && rule.source !== spa.source && rule.source !== '/(.*)'),
    spa,
  ]
  writeFileSync(vercelPath, JSON.stringify(config, null, 2) + '\n')
}

writeFileSync(join(root, 'frontend', '.env.production'), [
  '# Written by deploy/connect-vercel.mjs — Vercel forwards /api/* to Cloud Run (see vercel.json).',
  'VITE_API_URL=/api',
  '# Cloud Run can take a few seconds to wake from zero instances.',
  'VITE_API_TIMEOUT_MS=20000',
  '',
].join('\n'))

console.log(`Connected: Vercel /api/* -> ${origin}/api/*`)
console.log('Updated vercel.json, frontend/vercel.json and frontend/.env.production')
