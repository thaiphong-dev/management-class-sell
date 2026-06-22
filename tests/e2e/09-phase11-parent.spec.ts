import { test, expect } from '@playwright/test'
import { logout } from '../helpers/auth'
import { createClient } from '@supabase/supabase-js'
import { readFile } from 'fs/promises'
import { join } from 'path'

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

test.describe('Phase 11 - Parent Portal & Multi-Student Management', () => {
  const uniqueEmail = `parent-${Date.now()}@gmail.com`
  const parentName = `Phụ Huynh E2E Test ${Date.now()}`
  const childName = `Bé Con E2E Test ${Date.now()}`

  test('P1 - Register parent, add child, and register child class', async ({ page }) => {
    page.on('console', msg => console.log('PAGE LOG:', msg.text()))
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message))

    // Route signup requests to bypass public email rate limits
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
    await page.getByPlaceholder('09XXXXXXXX').fill('0999888777')
    await page.getByPlaceholder('phuhuynh@gmail.com').fill(uniqueEmail)
    await page.getByPlaceholder('••••••••').fill('Parent@123')
    
    await page.getByRole('button', { name: 'Đăng ký tài khoản' }).click()
    
    // Should show success toast and redirect to login
    await expect(page).toHaveURL(/\/login/, { timeout: 12_000 })

    // 2. Login as the newly created Parent
    await page.getByPlaceholder('example@gmail.com').fill(uniqueEmail)
    await page.getByPlaceholder('••••••••').fill('Parent@123')
    await page.getByRole('button', { name: 'Đăng nhập' }).click()

    // Redirect to parent dashboard
    await expect(page).toHaveURL(/\/parent\/dashboard/, { timeout: 12_000 })
    await expect(page.getByText(`Xin chào, Phụ huynh ${parentName}`)).toBeVisible()
    await expect(page.getByText('Chưa đăng ký cho con học')).toBeVisible()

    // 3. Go to Family Management Page
    await page.getByRole('link', { name: 'Quản lý con' }).click()
    await expect(page).toHaveURL(/\/parent\/family/)
    await expect(page.getByText('Chưa có hồ sơ học viên con nào')).toBeVisible()

    // 4. Add Child Profile
    await page.getByRole('button', { name: 'Thêm con mới' }).click()
    await expect(page.getByText('Thêm Hồ Sơ Con Mới')).toBeVisible()

    await page.getByPlaceholder('Nguyễn Văn B').fill(childName)
    await page.locator('input[type="date"]').fill('2018-05-15')
    await page.getByPlaceholder('Bé bị cận thị, hen suyễn nhẹ...').fill('Bé có thể lực bình thường')
    await page.getByRole('button', { name: 'Xác nhận thêm con' }).click()

    // Modal should close and child should be listed
    await expect(page.getByRole('heading', { name: childName })).toBeVisible({ timeout: 10_000 })
    await expect(page.getByText('Giới tính: Nam | Ngày sinh: 15/5/2018')).toBeVisible()

    // 5. Open Check-in QR Code Modal
    await page.getByRole('button', { name: 'Mã QR đi học' }).click()
    await expect(page.getByText('Mã QR Đi Học Của Con')).toBeVisible()
    await expect(page.locator('img[alt="QR Code"]')).toBeVisible()
    await page.getByRole('button', { name: 'Đóng' }).click()

    // 6. Register Child for class and package
    await page.getByRole('button', { name: 'Đăng ký học cho con' }).click()
    await expect(page.getByText('Đăng Ký Khóa Học Cho Con')).toBeVisible()

    // Select child, class, package
    await page.click('button:has-text("Chọn con...")')
    await page.click(`role=option >> text=${childName}`)

    await page.click('button:has-text("Chọn lớp...")')
    // Select the first class option in dropdown
    await page.locator('role=option').first().click()

    await page.click('button:has-text("Chọn gói...")')
    // Select the first package option in dropdown
    await page.locator('role=option').first().click()

    // Optional survey details
    await page.getByText('1. Tiền sử bệnh tim/huyết áp').click()

    // Submit registration
    await page.getByRole('button', { name: 'Xác nhận đăng ký học' }).click()

    // 7. Verification: Payment VietQR modal should be displayed
    await expect(page.getByText('Mã QR Thanh Toán Học Phí')).toBeVisible({ timeout: 15_000 })
    await expect(page.locator('img[alt="VietQR Payment"]')).toBeVisible()
    await expect(page.getByText('Nội dung CK (Memo):')).toBeVisible()
    
    // Close payment modal
    await page.getByRole('button', { name: 'Để thanh toán sau' }).click()
    await expect(page.getByText('Mã QR Thanh Toán Học Phí')).not.toBeVisible()

    // Check dashboard again - switcher should have selected the child
    await page.getByRole('link', { name: 'Dashboard' }).click()
    await expect(page).toHaveURL(/\/parent\/dashboard/)
    await expect(page.getByText(childName).first()).toBeVisible()
    
    // Check navigation to Packages Page
    await page.getByRole('link', { name: 'Thẻ học của con' }).click()
    await expect(page).toHaveURL(/\/parent\/packages/)
    // Reused Packages page should load resolved for child
    await expect(page.getByText('Lịch sử thẻ', { exact: true })).toBeVisible()

    // Check navigation to Schedule Page
    await page.getByRole('link', { name: 'Lịch học của con' }).click()
    await expect(page).toHaveURL(/\/parent\/schedule/)
    await expect(page.getByRole('heading', { name: 'Lịch học', exact: true })).toBeVisible()

    // Check navigation to Attendance Page
    await page.getByRole('link', { name: 'Điểm danh của con' }).click()
    await expect(page).toHaveURL(/\/parent\/attendance/)
    await expect(page.getByText('Nhật ký đi học', { exact: true })).toBeVisible()

    // Check navigation to Progress Page
    await page.getByRole('link', { name: 'Tiến độ của con' }).click()
    await expect(page).toHaveURL(/\/parent\/progress/)
    await expect(page.getByRole('heading', { name: 'Tiến độ', exact: true })).toBeVisible()

    // Clean up: logout
    await logout(page)
  })
})
