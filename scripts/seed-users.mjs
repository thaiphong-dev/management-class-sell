#!/usr/bin/env node
/**
 * seed-users.mjs — Tạo test accounts trên Supabase Auth
 *
 * Yêu cầu: Node.js 18+
 * Chạy SAU migrate.mjs
 *
 * Cách dùng:
 *   node scripts/seed-users.mjs
 */

import { readFile } from 'fs/promises'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ROOT = join(__dirname, '..')

// ─── Load .env.local ─────────────────────────────────────────────────────────
async function loadEnv() {
  const content = await readFile(join(ROOT, '.env.local'), 'utf-8')
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

// ─── Create a user via Supabase Admin Auth API ────────────────────────────────
async function createUser(supabaseUrl, serviceRoleKey, { email, password, fullName, role }) {
  const url = `${supabaseUrl}/auth/v1/admin/users`

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${serviceRoleKey}`,
      'apikey': serviceRoleKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, role },
    }),
  })

  const data = await res.json()

  if (!res.ok) {
    // "already registered" is fine — skip
    if (data.msg?.includes('already been registered') ||
        data.message?.includes('already been registered')) {
      return { skipped: true, email }
    }
    throw new Error(`${email}: ${data.msg || data.message || JSON.stringify(data)}`)
  }

  return { id: data.id, email }
}

// ─── Create coach/student record after user is created ───────────────────────
async function runSQL(projectRef, accessToken, sql) {
  const res = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/database/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: sql }),
    }
  )
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || JSON.stringify(data))
  return data
}

// ─── Test users definition ────────────────────────────────────────────────────
const TEST_USERS = [
  {
    email:    'admin@shuttleclass.vn',
    password: 'Admin@123',
    fullName: 'Admin ShuttleClass',
    role:     'admin',
    phone:    '0901234567',
  },
  {
    email:    'coach1@shuttleclass.vn',
    password: 'Coach@123',
    fullName: 'Nguyễn Văn Hùng',
    role:     'coach',
    phone:    '0912345678',
    coachData: {
      specialty: 'Đánh đơn nam',
      experience_years: 5,
      bio: 'HLV chuyên đào tạo kỹ thuật cơ bản và nâng cao.',
    },
  },
  {
    email:    'coach2@shuttleclass.vn',
    password: 'Coach@123',
    fullName: 'Trần Thị Mai',
    role:     'coach',
    phone:    '0923456789',
    coachData: {
      specialty: 'Đánh đôi',
      experience_years: 3,
      bio: 'HLV chuyên đào tạo đánh đôi và chiến thuật.',
    },
  },
  {
    email:    'student1@shuttleclass.vn',
    password: 'Student@123',
    fullName: 'Lê Minh Khoa',
    role:     'student',
    phone:    '0934567890',
    studentData: { skill_level: 'beginner' },
  },
  {
    email:    'student2@shuttleclass.vn',
    password: 'Student@123',
    fullName: 'Phạm Thị Linh',
    role:     'student',
    phone:    '0945678901',
    studentData: { skill_level: 'intermediate' },
  },
]

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('🏸  ShuttleClass — Seed Users')
  console.log('──────────────────────────────')

  const env = await loadEnv()
  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PROJECT_REF,
    SUPABASE_ACCESS_TOKEN,
  } = env

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌  Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY trong .env.local')
    process.exit(1)
  }

  for (const user of TEST_USERS) {
    process.stdout.write(`   ⏳ ${user.email} (${user.role}) ... `)

    try {
      const result = await createUser(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, user)

      if (result.skipped) {
        console.log('⏭  đã tồn tại')
        continue
      }

      const userId = result.id

      // Update phone in profiles
      await runSQL(SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN,
        `update profiles set phone = '${user.phone}' where id = '${userId}'`
      )

      // Create coach or student record
      if (user.coachData) {
        const { specialty, experience_years, bio } = user.coachData
        await runSQL(SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, `
          insert into coaches (user_id, specialty, experience_years, bio)
          values ('${userId}', '${specialty}', ${experience_years}, '${bio}')
          on conflict (user_id) do nothing
        `)
      }

      if (user.studentData) {
        const { skill_level } = user.studentData
        await runSQL(SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, `
          insert into students (user_id, skill_level)
          values ('${userId}', '${skill_level}')
          on conflict (user_id) do nothing
        `)
      }

      console.log('✅')
    } catch (err) {
      console.log('❌')
      console.error(`      ${err.message}`)
    }
  }

  console.log('')
  console.log('✅  Seed users hoàn thành!')
  console.log('')
  console.log('📋  Test accounts:')
  console.log('   admin@shuttleclass.vn   / Admin@123')
  console.log('   coach1@shuttleclass.vn  / Coach@123')
  console.log('   coach2@shuttleclass.vn  / Coach@123')
  console.log('   student1@shuttleclass.vn / Student@123')
  console.log('   student2@shuttleclass.vn / Student@123')
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
