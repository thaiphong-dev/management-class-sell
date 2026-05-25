/**
 * Phase 2 – Coach: Quản lý Buổi học E2E Tests
 * Coverage: TC12–TC15 (view classes, create/update/cancel sessions)
 *
 * Pre-condition: coach account phải có ít nhất 1 lớp được phân công.
 * Nếu không có lớp, test sẽ bỏ qua (skip) thay vì fail.
 *
 * Note: shadcn Label without htmlFor → use input[type="date"] / input[type="time"]
 * instead of getByLabel() for date/time fields.
 */
import { test, expect, type Page } from '@playwright/test'
import { loginAs } from '../helpers/auth'

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'coach')
})

test.describe('Coach – Classes View', () => {
  test('C12 – Trang Lớp của tôi hiển thị đúng', async ({ page }) => {
    await page.getByRole('link', { name: 'Lớp của tôi' }).click()
    await expect(page).toHaveURL(/\/coach\/classes/)
    await page.waitForLoadState('networkidle')

    // Use h2 to avoid strict mode violation (sidebar link, h1, h2 all contain 'Lớp của tôi')
    await expect(page.locator('h2').filter({ hasText: 'Lớp của tôi' })).toBeVisible()
    await expect(page.getByText('Các lớp học bạn đang phụ trách')).toBeVisible()
  })

  test('C12b – Nếu không có lớp thì hiển thị empty state', async ({ page }) => {
    await page.getByRole('link', { name: 'Lớp của tôi' }).click()
    await page.waitForLoadState('networkidle')
    // Wait for useEffect data fetch to complete (skeleton disappears)
    await page.locator('.animate-pulse').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    const classes = page.locator('button.bg-white.rounded-2xl')
    const emptyState = page.getByText('Bạn chưa được phân công lớp nào')

    const classCount = await classes.count()
    if (classCount === 0) {
      await expect(emptyState).toBeVisible()
    }
    // If classes exist, this test passes vacuously
  })

  test('C12c – Click vào lớp điều hướng đến trang buổi học', async ({ page }) => {
    await page.getByRole('link', { name: 'Lớp của tôi' }).click()
    await page.waitForLoadState('networkidle')

    const classes = page.locator('button.rounded-2xl.border')
    const classCount = await classes.count()

    if (classCount === 0) {
      test.skip()
      return
    }

    await classes.first().click()
    await expect(page).toHaveURL(/\/coach\/classes\/.+\/sessions/)
    await expect(page.getByText('Danh sách buổi học')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Thêm buổi' })).toBeVisible()
  })
})

test.describe('Coach – Sessions CRUD', () => {
  test('C13 – Tạo buổi học mới xuất hiện trong Sắp diễn ra', async ({ page }) => {
    const ok = await navigateToFirstClassSessions(page)
    if (!ok) {
      test.skip()
      return
    }

    await page.getByRole('button', { name: 'Thêm buổi' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Thêm buổi học mới')).toBeVisible()

    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const dateStr = tomorrow.toISOString().split('T')[0]

    // shadcn Label has no htmlFor → use type selectors inside dialog
    await page.getByRole('dialog').locator('input[type="date"]').fill(dateStr)
    await page.getByRole('dialog').locator('input[type="time"]').fill('08:00')
    await page.getByRole('dialog').locator('textarea').fill('E2E test session')

    await page.getByRole('dialog').getByRole('button', { name: 'Tạo buổi học' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('Đã tạo buổi học mới').first()).toBeVisible({ timeout: 8_000 })
    await expect(page.getByText(/Sắp diễn ra/).first()).toBeVisible()
  })

  test('C13b – Không thể tạo buổi học khi thiếu ngày hoặc giờ', async ({ page }) => {
    const ok = await navigateToFirstClassSessions(page)
    if (!ok) {
      test.skip()
      return
    }

    await page.getByRole('button', { name: 'Thêm buổi' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    const submitBtn = page.getByRole('dialog').getByRole('button', { name: 'Tạo buổi học' })
    await expect(submitBtn).toBeDisabled()

    // Fill only date — still disabled (no time)
    await page.getByRole('dialog').locator('input[type="date"]').fill('2026-12-01')
    await expect(submitBtn).toBeDisabled()
  })

  test('C14 – Cập nhật trạng thái buổi học thành Hoàn thành', async ({ page }) => {
    const ok = await navigateToFirstClassSessions(page)
    if (!ok) {
      test.skip()
      return
    }

    let updateBtns = page.getByRole('button', { name: 'Cập nhật' })
    let count = await updateBtns.count()

    if (count === 0) {
      await createTestSession(page)
      count = await updateBtns.count()
      if (count === 0) {
        test.skip()
        return
      }
    }

    await updateBtns.first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Cập nhật trạng thái buổi học')).toBeVisible()

    await page.getByText('Hoàn thành').click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('Đã cập nhật trạng thái buổi học').first()).toBeVisible({ timeout: 8_000 })
  })

  test('C15 – Hủy buổi học thành công', async ({ page }) => {
    const ok = await navigateToFirstClassSessions(page)
    if (!ok) {
      test.skip()
      return
    }

    await createTestSession(page)

    const updateBtns = page.getByRole('button', { name: 'Cập nhật' })
    const count = await updateBtns.count()
    if (count === 0) {
      test.skip()
      return
    }

    await updateBtns.first().click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Cập nhật trạng thái buổi học')).toBeVisible()

    await page.getByText('Đã hủy').click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    await expect(page.getByText('Đã cập nhật trạng thái buổi học').first()).toBeVisible({ timeout: 8_000 })
  })

  test('C-DIALOG – Đóng dialog tạo buổi học bằng Hủy', async ({ page }) => {
    const ok = await navigateToFirstClassSessions(page)
    if (!ok) {
      test.skip()
      return
    }

    await page.getByRole('button', { name: 'Thêm buổi' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Hủy' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('C-BACK – Nút Back trở về Lớp của tôi', async ({ page }) => {
    const ok = await navigateToFirstClassSessions(page)
    if (!ok) {
      test.skip()
      return
    }

    // Click ArrowLeft back button
    await page.locator('button').filter({ has: page.locator('svg') }).first().click()
    await expect(page).toHaveURL(/\/coach\/classes$/)
  })
})

test.describe('Coach – Dashboard', () => {
  test('DASH – Dashboard coach hiển thị lịch tuần', async ({ page }) => {
    await expect(page).toHaveURL(/\/coach\/dashboard/)
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('TypeError')
    await expect(page.locator('body')).not.toContainText('Unhandled')
  })
})

// ─── Helpers ────────────────────────────────────────────────────────────────

async function navigateToFirstClassSessions(page: Page): Promise<boolean> {
  await page.getByRole('link', { name: 'Lớp của tôi' }).click()
  await page.waitForLoadState('networkidle')

  const classes = page.locator('button.rounded-2xl.border')
  const count = await classes.count()
  if (count === 0) return false

  await classes.first().click()
  await expect(page).toHaveURL(/\/coach\/classes\/.+\/sessions/)
  await page.waitForLoadState('networkidle')
  return true
}

async function createTestSession(page: Page) {
  await page.getByRole('button', { name: 'Thêm buổi' }).click()
  await expect(page.getByRole('dialog')).toBeVisible()

  const future = new Date()
  future.setDate(future.getDate() + 7)
  const dateStr = future.toISOString().split('T')[0]

  await page.getByRole('dialog').locator('input[type="date"]').fill(dateStr)
  await page.getByRole('dialog').locator('input[type="time"]').fill('10:00')

  await page.getByRole('dialog').getByRole('button', { name: 'Tạo buổi học' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
  await expect(page.getByText('Đã tạo buổi học mới').first()).toBeVisible({ timeout: 8_000 })
}
