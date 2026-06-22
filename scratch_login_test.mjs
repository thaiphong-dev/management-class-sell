import { readFile } from 'fs/promises'
import { join } from 'path'

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'

async function loadEnv() {
  const envPath = join(process.cwd(), '.env.local')
  const content = await readFile(envPath, 'utf-8')
  const env = {}
  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '')
    env[key] = value
  }
  return env
}

async function main() {
  try {
    const env = await loadEnv()
    const projectRef = env.SUPABASE_PROJECT_REF
    const accessToken = env.SUPABASE_ACCESS_TOKEN
    
    console.log(`Inspecting coach_assistant_registrations...`)
    
    const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`
    const sql = `
      SELECT id, role, email, status, created_at 
      FROM coach_assistant_registrations 
      ORDER BY created_at DESC 
      LIMIT 10;
    `
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    })
    
    if (!res.ok) {
      const txt = await res.text()
      throw new Error(`Management API error: ${res.status} ${txt}`)
    }
    
    const data = await res.json()
    console.table(data)
  } catch (err) {
    console.error('Failed to query database:', err)
  }
}

main()
