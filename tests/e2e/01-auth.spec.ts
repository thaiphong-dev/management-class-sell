/**
 * Phase 1 – Authentication & Layout E2E Tests
 * Coverage: A1–A8 (login/logout/redirects), U1–U4 (UI layout)
 */
import { test, expect } from '@playwright/test'
import { loginAs, logout, ACCOUNTS } from '../helpers/auth'

test.describe('Auth – Login & Redirect', () => {
  test('A1 – Admin login redirects to /admin/dashboard', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(page).toHaveURL(/\/admin\/dashboard/)
    // Admin sidebar navigation items should be visible
    await expect(page.getByRole('link', { name: 'Dashboard' }).first()).toBeVisible()
    await expect(page.getByRole('link', { name: 'Cơ sở & Sân' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Lớp học' })).toBeVisible()
  })

  test('A2 – Coach login redirects to /coach/dashboard', async ({ page }) => {
    await loginAs(page, 'coach')
    await expect(page).toHaveURL(/\/coach\/dashboard/)
    await expect(page.getByRole('link', { name: 'Lớp của tôi' })).toBeVisible()
  })

  test('A3 – Student login redirects to /student/dashboard', async ({ page }) => {
    await loginAs(page, 'student')
    await expect(page).toHaveURL(/\/student\/dashboard/)
    await expect(page.getByRole('link', { name: 'Thẻ học' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Lịch học' })).toBeVisible()
  })

  test('A4 – Wrong password shows error message', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('example@shuttleclass.vn').fill(ACCOUNTS.admin.email)
    await page.getByPlaceholder('••••••••').fill('WrongPassword999!')
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    await expect(page.getByText('Email hoặc mật khẩu không đúng')).toBeVisible({ timeout: 8_000 })
    // Must stay on /login
    await expect(page).toHaveURL(/\/login/)
  })

  test('A4b – Invalid email format (browser native validation) stays on login', async ({ page }) => {
    // Note: input type="email" triggers browser native validation, preventing form submission
    // Zod validation only runs after browser allows the submit event to fire
    await page.goto('/login')
    await page.getByPlaceholder('example@shuttleclass.vn').fill('not-an-email')
    await page.getByPlaceholder('••••••••').fill('password123')
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    // Browser prevents navigation — we stay on /login
    await expect(page).toHaveURL(/\/login/)
    // Must not navigate to any dashboard
    await expect(page).not.toHaveURL(/\/admin|\/coach|\/student/)
  })

  test('A4c – Short password shows validation error', async ({ page }) => {
    await page.goto('/login')
    await page.getByPlaceholder('example@shuttleclass.vn').fill(ACCOUNTS.admin.email)
    await page.getByPlaceholder('••••••••').fill('abc')
    await page.getByRole('button', { name: 'Đăng nhập' }).click()
    await expect(page.getByText('Mật khẩu tối thiểu 6 ký tự')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('A5 – Student cannot access /admin/dashboard (redirected)', async ({ page }) => {
    await loginAs(page, 'student')
    await page.goto('/admin/dashboard')
    // Should redirect away from admin
    await expect(page).not.toHaveURL(/\/admin\/dashboard/)
    await expect(page).toHaveURL(/\/student\/dashboard/)
  })

  test('A5b – Coach cannot access /admin/dashboard (redirected)', async ({ page }) => {
    await loginAs(page, 'coach')
    await page.goto('/admin/dashboard')
    await expect(page).not.toHaveURL(/\/admin\/dashboard/)
    await expect(page).toHaveURL(/\/coach\/dashboard/)
  })

  test('A6 – Unauthenticated access to /admin/dashboard redirects to /login', async ({ page }) => {
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('A6b – Unauthenticated access to /coach/dashboard redirects to /login', async ({ page }) => {
    await page.goto('/coach/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('A6c – Unauthenticated access to /student/dashboard redirects to /login', async ({ page }) => {
    await page.goto('/student/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })

  test('A7 – Already logged-in admin on /login redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/login')
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test('A8 – Logout clears session and redirects to /login', async ({ page }) => {
    await loginAs(page, 'admin')
    await logout(page)
    await expect(page).toHaveURL(/\/login/)
    // Session must be cleared: visiting dashboard redirects back to login
    await page.goto('/admin/dashboard')
    await expect(page).toHaveURL(/\/login/)
  })
})

test.describe('Auth – Password Visibility Toggle', () => {
  test('PV1 – Password toggle shows/hides password text', async ({ page }) => {
    await page.goto('/login')
    const pwInput = page.getByPlaceholder('••••••••')
    await pwInput.fill('MySecret123')

    // Initially hidden
    await expect(pwInput).toHaveAttribute('type', 'password')

    // Click toggle
    await page.locator('button[type="button"]').click()
    await expect(pwInput).toHaveAttribute('type', 'text')

    // Toggle back
    await page.locator('button[type="button"]').click()
    await expect(pwInput).toHaveAttribute('type', 'password')
  })
})

test.describe('Layout – Sidebar & Responsive', () => {
  test('U1 – Desktop (1280px): sidebar is visible', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 })
    await loginAs(page, 'admin')
    // Desktop sidebar (aside.hidden.lg:flex) should be visible
    await expect(page.locator('aside').first()).toBeVisible()
    await expect(page.getByText('ShuttleClass').first()).toBeVisible()
  })

  test('U1b – Mobile (375px): sidebar is hidden, hamburger is visible', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await loginAs(page, 'admin')
    // Desktop aside should be hidden at mobile viewport
    const desktopSidebar = page.locator('aside.hidden')
    await expect(desktopSidebar).toHaveCount(1)
    // Hamburger button is in the header (lg:hidden = visible on mobile, hidden on desktop)
    const hamburger = page.locator('header button').first()
    await expect(hamburger).toBeVisible()
  })

  test('U2 – Mobile sidebar opens on hamburger click', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 })
    await loginAs(page, 'admin')
    // Click the hamburger (first button in header area)
    const header = page.locator('header')
    await header.locator('button').first().click()
    // Mobile sidebar overlay should be visible
    await expect(page.locator('aside.fixed')).toBeVisible()
  })

  test('U3 – Admin dashboard shows KPI cards', async ({ page }) => {
    await loginAs(page, 'admin')
    // Wait for page to fully load (KPIs fetched from Supabase)
    await page.waitForLoadState('networkidle')
    // KPI cards render with text-2xl font-bold for the value
    const kpiValues = page.locator('.text-2xl.font-bold')
    await expect(kpiValues.first()).toBeVisible({ timeout: 10_000 })
    // At minimum 1 KPI card is shown (4 total: students, classes, revenue, sessions)
    const count = await kpiValues.count()
    expect(count).toBeGreaterThanOrEqual(1)
  })

  test('U4 – Student dashboard renders without crash', async ({ page }) => {
    await loginAs(page, 'student')
    await expect(page).toHaveURL(/\/student\/dashboard/)
    // Page must not show a JS error or blank screen
    await expect(page.locator('body')).not.toContainText('Unhandled')
    await expect(page.locator('body')).not.toContainText('TypeError')
  })

  test('U5 – ShuttleClass logo and brand name visible in sidebar', async ({ page }) => {
    await loginAs(page, 'admin')
    await expect(page.getByText('ShuttleClass').first()).toBeVisible()
    // Role label shown in sidebar
    await expect(page.getByText('Quản trị viên').first()).toBeVisible()
  })
})

test.describe('Layout – Root redirect', () => {
  test('ROOT – "/" redirects to role dashboard after login', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/')
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })

  test('ROOT – Unknown path redirects to dashboard', async ({ page }) => {
    await loginAs(page, 'admin')
    await page.goto('/some/unknown/path')
    await expect(page).toHaveURL(/\/admin\/dashboard/)
  })
})
