#!/usr/bin/env node
/**
 * migrate.mjs — Chạy tất cả SQL migrations lên Supabase
 *
 * Yêu cầu: Node.js 18+ (dùng built-in fetch)
 *
 * Cách dùng:
 *   node scripts/migrate.mjs
 *   node scripts/migrate.mjs --dry-run   (chỉ in SQL, không chạy)
 */

import { readFile, readdir } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')
const DRY_RUN = process.argv.includes('--dry-run')

// ─── Load .env.local ─────────────────────────────────────────────────────────
async function loadEnv() {
  const envPath = join(ROOT, '.env.local')
  let content
  try {
    content = await readFile(envPath, 'utf-8')
  } catch {
    console.error('❌  .env.local không tìm thấy.')
    console.error('   Hãy copy .env.example → .env.local và điền thông tin Supabase.')
    process.exit(1)
  }

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

// ─── Execute SQL via Supabase Management API ─────────────────────────────────
async function runSQL(projectRef, accessToken, sql, label) {
  if (DRY_RUN) {
    console.log(`\n── DRY RUN: ${label} ──────────────────`)
    console.log(sql.slice(0, 300) + (sql.length > 300 ? '\n...(truncated)' : ''))
    return
  }

  const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  })

  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = { raw: text }
  }

  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status}: ${data.message || data.error || JSON.stringify(data)}`
    )
  }

  return data
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏸  ShuttleClass — Migration Runner')
  console.log('────────────────────────────────────')

  const env = await loadEnv()
  const { SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN } = env

  if (!SUPABASE_PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
    console.error('❌  Thiếu SUPABASE_PROJECT_REF hoặc SUPABASE_ACCESS_TOKEN trong .env.local')
    console.error('   Xem hướng dẫn trong .env.example')
    process.exit(1)
  }

  if (DRY_RUN) {
    console.log('⚠️  DRY RUN mode — không thực sự chạy SQL\n')
  } else {
    console.log(`📡  Project: ${SUPABASE_PROJECT_REF}`)
    console.log(`🔑  Token: ${SUPABASE_ACCESS_TOKEN.slice(0, 8)}...`)
    console.log('')
  }

  // Get migration files in order
  const migrationsDir = join(ROOT, 'migrations')
  const allFiles = await readdir(migrationsDir)
  const sqlFiles = allFiles
    .filter(f => f.endsWith('.sql'))
    .sort()

  if (sqlFiles.length === 0) {
    console.log('⚠️  Không tìm thấy file .sql nào trong /migrations')
    process.exit(0)
  }

  console.log(`📂  Tìm thấy ${sqlFiles.length} file migrations:\n`)

  let success = 0
  let failed = 0

  for (const file of sqlFiles) {
    process.stdout.write(`   ⏳ ${file} ... `)
    const filePath = join(migrationsDir, file)
    const sql = await readFile(filePath, 'utf-8')

    try {
      await runSQL(SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, sql, file)
      console.log('✅')
      success++
    } catch (err) {
      console.log('❌')
      console.error(`      ${err.message}`)
      failed++
      // Stop on first failure to avoid cascading errors
      break
    }
  }

  console.log('')
  if (failed === 0) {
    console.log(`✅  Hoàn thành: ${success}/${sqlFiles.length} migrations thành công.`)
    if (!DRY_RUN) {
      console.log('\n👉  Bước tiếp theo: node scripts/seed-users.mjs')
    }
  } else {
    console.log(`❌  ${failed} migration thất bại. Kiểm tra lỗi bên trên.`)
    process.exit(1)
  }
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
