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
    email:    'thaiphong.dev@gmail.com',
    password: 'LyLinh196465',
    fullName: 'Admin Thái Phong Badminton Class',
    role:     'admin',
    phone:    '0901234567',
  },
  {
    email:    'tuthaiphong600@gmail.com',
    password: 'ttphong1101',
    fullName: 'Từ Thái Phong',
    role:     'coach',
    phone:    '0377612701',
    coachData: {
      specialty: 'Đánh đơn nam',
      experience_years: 5,
      bio: 'HLV chuyên đào tạo kỹ thuật cơ bản và nâng cao.',
    },
  },
  {
    email:    'hanie@gmail.com',
    password: 'haokhongnho',
    fullName: 'Nguyễn Thị Như Hảo',
    role:     'coach',
    phone:    '0967273066',
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
  {
    email:    'quanghuy.tma@shuttleclass.vn',
    password: 'Student@123',
    fullName: 'Lê Quang Huy',
    role:     'student',
    phone:    '0866551124',
    studentData: { skill_level: 'beginner' },
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
      let userId;
      const result = await createUser(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, user)

      if (result.skipped) {
        // Find the user ID from auth.users using SQL
        const dbResult = await runSQL(SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, 
          `select id from auth.users where email = '${user.email}'`
        )
        if (dbResult && dbResult.length > 0 && dbResult[0].id) {
          userId = dbResult[0].id
          console.log(`\n      ⏭  đã tồn tại (ID: ${userId})`)
        } else {
          throw new Error(`User already registered in auth but not found in auth.users table`)
        }
      } else {
        userId = result.id
        console.log('✅')
      }

      // Update phone, full_name, role in profiles
      await runSQL(SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN,
        `insert into profiles (id, full_name, phone, role) 
         values ('${userId}', '${user.fullName}', '${user.phone}', '${user.role}') 
         on conflict (id) do update set phone = '${user.phone}', full_name = '${user.fullName}', role = '${user.role}'`
      )

      // Create coach or student record
      if (user.coachData) {
        const { specialty, experience_years, bio } = user.coachData
        await runSQL(SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, `
          insert into coaches (user_id, specialty, experience_years, bio)
          values ('${userId}', '${specialty}', ${experience_years}, '${bio}')
          on conflict (user_id) do update set specialty = '${specialty}', experience_years = ${experience_years}, bio = '${bio}'
        `)

        if (user.email === 'tuthaiphong600@gmail.com') {
          await runSQL(SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, `
            update classes 
            set coach_id = (select id from coaches where user_id = '${userId}')
            where id = '40000000-0000-0000-0000-000000000001'
          `)
        }
      }

      if (user.studentData) {
        const { skill_level } = user.studentData
        await runSQL(SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, `
          insert into students (user_id, skill_level)
          values ('${userId}', '${skill_level}')
          on conflict (user_id) do update set skill_level = '${skill_level}'
        `)
      }
    } catch (err) {
      console.log('❌')
      console.error(`      ${err.message}`)
    }
  }

  console.log('')
  console.log('✅  Seed users hoàn thành!')
  console.log('')
  console.log('📋  Test accounts:')
  console.log('   thaiphong.dev@gmail.com   / LyLinh196465')
  console.log('   tuthaiphong600@gmail.com  / ttphong1101')
  console.log('   hanie@gmail.com           / haokhongnho')
  console.log('   student1@shuttleclass.vn  / Student@123')
  console.log('   student2@shuttleclass.vn  / Student@123')
}

main().catch(err => {
  console.error('Unhandled error:', err)
  process.exit(1)
})
