import { test, expect } from '@playwright/test'
import { loginAs, logout } from '../helpers/auth'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { join } from 'path'
import { writeFileSync, readFileSync, existsSync, unlinkSync } from 'fs'

// Module-level list to collect emails to clean up after tests complete
const emailsToCleanup: string[] = []

async function loadEnv() {
  const envPath = join(process.cwd(), '.env.local')
  const content = await readFile(envPath, 'utf-8')
  const env: Record<string, string> = {}
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

async function createAdminUser(email: string, password: string, metadata: any) {
  const env = await loadEnv()
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: metadata
  })
  if (error) throw error
  return data.user
}

async function cleanupTestData(emails: string[]) {
  if (emails.length === 0) return
  console.log('Cleaning up E2E test data for emails:', emails)
  const env = await loadEnv()
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
  const supabase = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

  for (const email of emails) {
    try {
      // 1. Delete from registrations table
      await supabase
        .from('coach_assistant_registrations')
        .delete()
        .eq('email', email)

      // 2. Find user in auth.users by email to clean up auth records
      const { data: { users }, error: listError } = await supabase.auth.admin.listUsers()
      if (!listError && users) {
        const user = users.find(u => u.email === email)
        if (user) {
          const userId = user.id
          
          // First delete child records of the user
          // Delete from coaches/assistants profiles
          await supabase.from('coaches').delete().eq('user_id', userId)
          await supabase.from('assistants').delete().eq('user_id', userId)
          
          // If it was a parent user, delete students first
          const { data: parentData } = await supabase.from('parents').select('id').eq('user_id', userId).maybeSingle()
          if (parentData) {
            // Find students of parent
            const { data: students } = await supabase.from('students').select('id').eq('parent_id', parentData.id)
            if (students && students.length > 0) {
              const studentIds = students.map(s => s.id)
              await supabase.from('student_packages').delete().in('student_id', studentIds)
              await supabase.from('students').delete().in('id', studentIds)
            }
            await supabase.from('parents').delete().eq('id', parentData.id)
          }

          // Delete from profiles
          await supabase.from('profiles').delete().eq('id', userId)

          // Delete auth user
          await supabase.auth.admin.deleteUser(userId)
          console.log(`Successfully cleaned up user with email: ${email}`)
        }
      }
    } catch (err) {
      console.error(`Error cleaning up user for email: ${email}`, err)
    }
  }
}

const TS_FILE = join(process.cwd(), 'tests/e2e/.test-timestamp')
let timestamp: string
if (existsSync(TS_FILE)) {
  timestamp = readFileSync(TS_FILE, 'utf-8').trim()
} else {
  timestamp = Date.now().toString()
  writeFileSync(TS_FILE, timestamp, 'utf-8')
}

test.describe('Phase 12 - Recruitment, Approval, Profiles & Mobile Layout', () => {
  const coachEmail = `coach-e2e-${timestamp}@gmail.com`
  const assistantEmail = `assistant-e2e-${timestamp}@gmail.com`
  const parentEmail = `parent-m-e2e-${timestamp}@gmail.com`

  const coachName = `Huấn Luyện Viên E2E Test ${timestamp}`
  const assistantName = `Trợ Giảng E2E Test ${timestamp}`
  const parentName = `Phụ Huynh Mobile E2E ${timestamp}`
  const childName = `Bé Mobile E2E ${timestamp}`

  // Queue emails for teardown
  if (!emailsToCleanup.includes(coachEmail)) {
    emailsToCleanup.push(coachEmail, assistantEmail, parentEmail)
  }

  test.afterAll(async () => {
    // Teardown test data from database
    await cleanupTestData(emailsToCleanup)
    try {
      if (existsSync(TS_FILE)) {
        unlinkSync(TS_FILE)
      }
    } catch (err) {
      console.error('Failed to delete test timestamp file:', err)
    }
  })

  test('P12-1 - Public Coach Application Form', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()))
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message))

    await page.goto('/register-coach')
    await expect(page).toHaveURL(/\/register-coach/)
    await expect(page.getByRole('heading', { name: 'Đăng Ký Tuyển Dụng Huấn Luyện Viên' })).toBeVisible()

    // Fill personal info
    await page.getByPlaceholder('VD: Nguyễn Văn').fill('Huấn Luyện Viên')
    await page.getByPlaceholder('VD: Hải').fill(`E2E Test ${timestamp}`)
    await page.click('text=Nam')
    await page.locator('input[type="date"]').fill('1990-08-25')
    await page.getByPlaceholder('VD: 090xxxxxxx').fill('0911223344')
    await page.getByPlaceholder('VD: email@example.com').fill(coachEmail)
    await page.getByPlaceholder('VD: 12A Đường số 5, Phường 2, Quận Bình Thạnh, TP.HCM').fill('123 Đường Sân Cầu Lông, Quận 7, TP.HCM')

    // Fill professional info
    await page.locator('input[type="number"]').fill('5')
    await page.getByPlaceholder('VD: Đánh đôi, Kỹ thuật nâng cao, Đào tạo trẻ em').fill('Kỹ thuật đập cầu & Đánh đôi')
    await page.getByPlaceholder('VD: Đạt huy chương Vàng giải các câu lạc bộ TPHCM 2024. Đã huấn luyện 2 học viên đạt thành tích cấp học sinh thành phố.').fill('Vô địch đôi nam CLB Cầu Lông Sài Gòn 2024')
    await page.getByPlaceholder('Giới thiệu phong cách giảng dạy, tâm huyết hoặc bài học kinh nghiệm bạn muốn truyền tải tới học viên...').fill('Giảng dạy tận tâm, nhiệt huyết.')

    // Add certification
    await page.getByPlaceholder('VD: Chứng chỉ BWF Level 1, Cử nhân Sư phạm TDTT...').fill('Chứng chỉ BWF Level 1')
    await page.getByRole('button', { name: 'Thêm' }).click()
    await expect(page.getByText('Chứng chỉ BWF Level 1')).toBeVisible()

    // Submit
    await page.getByRole('button', { name: 'Gửi hồ sơ tuyển dụng' }).click()

    // Verification: Success Page should render
    await expect(page.getByRole('heading', { name: 'Nộp Hồ Sơ Thành Công!' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Cảm ơn bạn đã ứng tuyển vị trí/)).toBeVisible()
  })

  test('P12-2 - Public Assistant Application Form', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()))
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message))

    await page.goto('/register-assistant')
    await expect(page).toHaveURL(/\/register-assistant/)
    await expect(page.getByRole('heading', { name: 'Đăng Ký Tuyển Dụng Trợ Giảng' })).toBeVisible()

    // Fill personal info
    await page.getByPlaceholder('VD: Trần Hoàng').fill('Trợ Giảng')
    await page.getByPlaceholder('VD: Nam').fill(`E2E Test ${timestamp}`)
    await page.click('text=Nữ')
    await page.locator('input[type="date"]').fill('2003-12-15')
    await page.getByPlaceholder('VD: 091xxxxxxx').fill('0922334455')
    await page.getByPlaceholder('VD: trogiang@gmail.com').fill(assistantEmail)
    await page.getByPlaceholder('VD: 45/3 Đường Phạm Thế Hiển, Phường 4, Quận 8, TP.HCM').fill('456 Đường Sân Cầu Lông, Quận 3, TP.HCM')

    // Fill assistant professional info
    await page.getByPlaceholder('VD: Đại học Sư phạm TDTT TPHCM').fill('Đại học Thể dục Thể thao')
    await page.getByPlaceholder('VD: Giáo dục Thể chất, Quản lý thể thao').fill('Giáo dục Thể chất')
    await page.getByPlaceholder('VD: Sinh viên năm 2 / Đang đi làm').fill('Năm 3')
    await page.getByPlaceholder('VD: Có kỹ năng giao tiếp tốt với trẻ nhỏ, biết kỹ thuật sơ cứu chấn thương cơ bản, quản lý hồ sơ...').fill('Thị phạm động tác, hỗ trợ chuẩn bị sân bãi')
    await page.getByPlaceholder('Mô tả số năm chơi cầu lông, trình độ cá nhân hiện tại, các hoạt động cầu lông bạn hay tham gia và tại sao bạn ứng tuyển...').fill('Năng động, nhiệt tình, yêu thích cầu lông.')

    // Submit
    await page.getByRole('button', { name: 'Gửi hồ sơ tuyển dụng' }).click()

    // Verification: Success Page should render
    await expect(page.getByRole('heading', { name: 'Nộp Hồ Sơ Thành Công!' })).toBeVisible({ timeout: 15_000 })
    await expect(page.getByText(/Cảm ơn bạn đã ứng tuyển vị trí/)).toBeVisible()
  })

  test('P12-3 - Admin Approves Recruitment Applications', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()))
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message))

    // Login as Admin
    await loginAs(page, 'admin')

    // Go to Staff Registrations Page
    await page.getByRole('link', { name: 'Đăng ký' }).first().click() // Or go directly
    await page.goto('/admin/staff-registrations')
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/admin\/staff-registrations/)

    // 1. Approve Coach
    await page.getByPlaceholder('Tìm theo họ tên, số điện thoại, email...').fill(coachEmail)
    await page.waitForTimeout(1000)

    // Locate the row and click check icon (approve)
    const coachRow = page.locator('tr').filter({ hasText: coachEmail })
    await coachRow.locator('button[title="Phê duyệt"]').click()

    // Verification: Approve Dialog open
    await expect(page.getByRole('heading', { name: 'Phê duyệt tuyển dụng' })).toBeVisible()
    await page.locator('#temp-password').fill('123456')
    await page.getByRole('button', { name: 'Xác nhận duyệt' }).click()

    // Toast: Success
    await expect(page.getByText('Đã phê duyệt ứng tuyển').first()).toBeVisible({ timeout: 15_000 })
    
    // 2. Approve Assistant
    await page.getByPlaceholder('Tìm theo họ tên, số điện thoại, email...').fill(assistantEmail)
    await page.waitForTimeout(1000)

    const assistantRow = page.locator('tr').filter({ hasText: assistantEmail })
    await assistantRow.locator('button[title="Phê duyệt"]').click()

    await expect(page.getByRole('heading', { name: 'Phê duyệt tuyển dụng' })).toBeVisible()
    await page.locator('#temp-password').fill('123456')
    await page.getByRole('button', { name: 'Xác nhận duyệt' }).click()

    await expect(page.getByText('Đã phê duyệt ứng tuyển').first()).toBeVisible({ timeout: 15_000 })

    // Verify Approved list
    await page.getByRole('tab', { name: /Đã từ chối|Đã duyệt/ }).filter({ hasText: 'Đã duyệt' }).click()
    await page.getByPlaceholder('Tìm theo họ tên, số điện thoại, email...').fill(coachEmail)
    await expect(page.locator('tr').filter({ hasText: coachEmail }).getByText('Đã cấp tài khoản')).toBeVisible()

    await page.getByPlaceholder('Tìm theo họ tên, số điện thoại, email...').fill(assistantEmail)
    await expect(page.locator('tr').filter({ hasText: assistantEmail }).getByText('Đã cấp tài khoản')).toBeVisible()

    await logout(page)
  })

  test('P12-4 - Admin Users Profile Management Verification', async ({ page }) => {
    // Login as Admin
    await loginAs(page, 'admin')

    // Go to Users management Page
    await page.getByRole('link', { name: 'Người dùng' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page).toHaveURL(/\/admin\/users/)

    // 1. Verify Coach Profile
    await page.getByRole('tab', { name: /HLV/ }).click()
    await page.getByPlaceholder('Tìm theo tên hoặc số điện thoại...').fill(coachName)
    await expect(page.getByText(coachName).first()).toBeVisible()
    await expect(page.getByText('5 năm KN').first()).toBeVisible()

    // 2. Verify Assistant Profile
    await page.getByRole('tab', { name: /Trợ giảng/ }).click()
    await page.getByPlaceholder('Tìm theo tên hoặc số điện thoại...').fill(assistantName)
    await expect(page.getByText(assistantName).first()).toBeVisible()

    await logout(page)
  })

  test('P12-5 - Mobile Layout Verification (Curved Dock & SubHeader)', async ({ page }) => {
    // Set Mobile Viewport
    await page.setViewportSize({ width: 375, height: 667 })

    page.on('console', msg => console.log('PAGE LOG:', msg.text()))
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message))

    // Route signup requests to bypass parent registration rate limits
    await page.route('**/auth/v1/signup**', async (route) => {
      const request = route.request()
      const postData = JSON.parse(request.postData() || '{}')
      
      try {
        const user = await createAdminUser(postData.email, postData.password, postData.data || postData.options?.data || {})
        const responseData = {
          user,
          session: null
        }
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(responseData),
        })
      } catch (err: any) {
        console.error('E2E Admin User Creation failed:', err)
        await route.fulfill({
          status: 400,
          contentType: 'application/json',
          body: JSON.stringify({ error: { message: err.message } }),
        })
      }
    })

    // 1. Register Parent Account
    await page.goto('/login')
    await page.getByRole('button', { name: 'Đăng ký tài khoản Phụ huynh' }).click()
    await expect(page).toHaveURL(/\/register/)

    await page.getByPlaceholder('Nguyễn Văn A').fill(parentName)
    await page.getByPlaceholder('09XXXXXXXX').fill('0999000333')
    await page.getByPlaceholder('phuhuynh@gmail.com').fill(parentEmail)
    await page.getByPlaceholder('••••••••').fill('Parent@123')
    
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click()
    await expect(page).toHaveURL(/\/login/, { timeout: 12_000 })

    // 2. Login as Parent
    await page.getByPlaceholder('example@gmail.com').fill(parentEmail)
    await page.getByPlaceholder('••••••••').fill('Parent@123')
    await page.getByRole('button', { name: 'Đăng nhập' }).click()

    await expect(page).toHaveURL(/\/parent\/dashboard/, { timeout: 12_000 })

    // 3. Verify Mobile Bottom Bar is visible
    const mobileBottomBar = page.locator('.fixed.bottom-4.left-4.right-4')
    await expect(mobileBottomBar).toBeVisible()
    
    // Check elements in bottom bar
    await expect(mobileBottomBar.locator('a[href="/parent/dashboard"]')).toBeVisible()
    await expect(mobileBottomBar.locator('a[href="/parent/family"]')).toBeVisible()

    // 4. Verify Mobile SubHeader / ChildSwitcher is HIDDEN on Dashboard
    await expect(page.getByText('Đang xem thông tin:')).not.toBeVisible()

    // 5. Navigate to Family management to add a child (use bottom bar link!)
    await mobileBottomBar.locator('a[href="/parent/family"]').click()
    await expect(page).toHaveURL(/\/parent\/family/)

    // Verify Mobile SubHeader / ChildSwitcher is HIDDEN on Family page
    await expect(page.getByText('Đang xem thông tin:')).not.toBeVisible()

    // Add a child profile via "Đăng ký học cho con"
    await page.getByRole('button', { name: 'Đăng ký học cho con' }).click()
    
    // Fill new child info in the nested form
    await page.getByPlaceholder('Nguyễn Văn B').fill(childName)
    await page.locator('input[type="date"]').fill('2018-05-15')
    await page.getByPlaceholder('Bé bị cận thị, hen suyễn nhẹ...').fill('Bé khỏe mạnh')

    // Select class
    await page.click('button:has-text("Chọn lớp...")')
    await page.locator('role=option').first().click()

    // Select package
    await page.click('button:has-text("Chọn gói...")')
    await page.locator('role=option').first().click()

    // Submit course registration
    await page.getByRole('button', { name: 'Xác nhận đăng ký học' }).click()

    // Close payment modal
    await expect(page.getByText('Mã QR Thanh Toán Học Phí')).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Để thanh toán sau' }).click()
    await expect(page.getByText('Mã QR Thanh Toán Học Phí')).not.toBeVisible()

    // Confirm child added in family list
    await expect(page.getByRole('heading', { name: childName })).toBeVisible({ timeout: 10_000 })

    // 6. Navigate to Schedule Page
    await page.goto('/parent/schedule')
    await expect(page).toHaveURL(/\/parent\/schedule/)

    // Verify Mobile SubHeader / ChildSwitcher is VISIBLE on Schedule page
    await expect(page.getByText('Đang xem thông tin:')).toBeVisible()

    // Clean up - logout from mobile view (requires opening sidebar first)
    await page.locator('header button').first().click()
    await page.getByRole('button', { name: 'Đăng xuất' }).click()
    await page.waitForURL(url => url.pathname === '/' || url.pathname === '/login', { timeout: 10_000 })
  })
})
