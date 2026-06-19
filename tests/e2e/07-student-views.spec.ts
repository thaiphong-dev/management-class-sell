/**
 * Phase 3 – Student: Lịch học, Điểm danh, Tiến độ E2E Tests
 * Coverage: TC-S1 (schedule), TC-S2 (attendance history), TC-S3 (progress/radar)
 *
 * Note: student1 account có thể chưa được enroll vào lớp nào.
 * Tests handle cả hai state: empty và có dữ liệu.
 */
import { test, expect } from '@playwright/test'
import { loginAs } from '../helpers/auth'

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'student')
})

// ── Student Schedule ──────────────────────────────────────────────────────────

test.describe('Student – Schedule', () => {
  test('S-PAGE – Trang Lịch học hiển thị đúng', async ({ page }) => {
    await page.getByRole('link', { name: 'Lịch học' }).click()
    await expect(page).toHaveURL(/\/student\/schedule/)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h2').filter({ hasText: 'Lịch học' })).toBeVisible()
    await expect(page.getByText('Các buổi học sắp tới của bạn')).toBeVisible()
  })

  test('S-EMPTY-NO-CLASS – Hiển thị "chưa được thêm vào lớp" khi chưa enroll', async ({ page }) => {
    await page.getByRole('link', { name: 'Lịch học' }).click()
    await page.waitForLoadState('networkidle')

    const noClass = page.getByText('Bạn chưa được thêm vào lớp học nào')
    const hasClassNoSession = page.getByText('Bạn đã được thêm vào lớp')
    // Both are valid empty states; check for no TypeError
    await expect(page.locator('body')).not.toContainText('TypeError')

    const noClassCount = await noClass.count()
    const noSessionCount = await hasClassNoSession.count()

    if (noClassCount > 0) {
      await expect(noClass).toBeVisible()
      await expect(page.getByText('Liên hệ Admin để được xếp lớp')).toBeVisible()
    } else if (noSessionCount > 0) {
      await expect(hasClassNoSession).toBeVisible()
    }
    // If sessions exist, the page shows session cards (no empty state needed)
  })

  test('S-ENROLLED-STATE – Hiển thị thông tin lớp khi đã enroll nhưng chưa có buổi', async ({ page }) => {
    await page.getByRole('link', { name: 'Lịch học' }).click()
    await page.waitForLoadState('networkidle')

    const hasClassNoSession = page.getByText('Bạn đã được thêm vào lớp')
    const count = await hasClassNoSession.count()
    if (count === 0) {
      test.skip()
      return
    }

    await expect(hasClassNoSession).toBeVisible()
    await expect(page.getByText('Lớp đang theo học')).toBeVisible()
  })

  test('S-SESSIONS – Hiển thị sessions khi có dữ liệu', async ({ page }) => {
    await page.getByRole('link', { name: 'Lịch học' }).click()
    await page.waitForLoadState('networkidle')

    // Session cards are grouped by date (h3 date headers)
    const dateHeaders = page.locator('h3.text-xs.font-semibold.text-gray-400')
    const count = await dateHeaders.count()
    if (count === 0) {
      test.skip()
      return
    }

    // Verify session cards have class name info
    await expect(dateHeaders.first()).toBeVisible()
    // At least one session card exists in the first group
    await expect(page.locator('.bg-white.rounded-2xl.border').first()).toBeVisible()
  })

  test('S-NO-ERROR – Trang không crash', async ({ page }) => {
    await page.getByRole('link', { name: 'Lịch học' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('TypeError')
    await expect(page.locator('body')).not.toContainText('Unhandled')
  })
})

// ── Student Attendance History ────────────────────────────────────────────────

test.describe('Student – Attendance History', () => {
  test('SA-PAGE – Trang Điểm danh hiển thị đúng', async ({ page }) => {
    await page.getByRole('link', { name: 'Điểm danh' }).click()
    await expect(page).toHaveURL(/\/student\/attendance/)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h2').filter({ hasText: 'Điểm danh' })).toBeVisible()
    await expect(page.getByText('Lịch sử tham gia tập luyện và thời hạn thẻ học của bạn')).toBeVisible()
  })

  test('SA-EMPTY – Hiển thị empty state khi chưa có điểm danh', async ({ page }) => {
    await page.getByRole('link', { name: 'Điểm danh' }).click()
    await page.waitForLoadState('networkidle')

    const records = page.locator('.divide-y > div')
    await records.first().waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {})
    const count = await records.count()

    if (count === 0) {
      await expect(page.getByText('Chưa có lịch sử điểm danh')).toBeVisible()
    }
    // If records exist, test passes vacuously
  })

  test('SA-STATS – Hiển thị thống kê khi có bản ghi điểm danh', async ({ page }) => {
    await page.getByRole('link', { name: 'Điểm danh' }).click()
    await page.waitForLoadState('networkidle')

    const records = page.locator('.divide-y > div')
    await records.first().waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {})
    const count = await records.count()
    if (count === 0) {
      test.skip()
      return
    }

    // Stats grid shows Tổng buổi and Tỷ lệ (unique labels)
    await expect(page.getByText('Tổng buổi')).toBeVisible()
    await expect(page.getByText('Tỷ lệ')).toBeVisible()
  })

  test('SA-RECORDS – Bản ghi hiển thị class name + status badge', async ({ page }) => {
    await page.getByRole('link', { name: 'Điểm danh' }).click()
    await page.waitForLoadState('networkidle')

    const records = page.locator('.divide-y > div')
    await records.first().waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {})
    const count = await records.count()
    if (count === 0) {
      test.skip()
      return
    }

    // Each record has a status badge (rounded-full px-2.5)
    const statusBadge = records.first().locator('.rounded-full.font-medium')
    await expect(statusBadge).toBeVisible()
  })

  test('SA-STATUS-LABELS – Status badges có text hợp lệ', async ({ page }) => {
    await page.getByRole('link', { name: 'Điểm danh' }).click()
    await page.waitForLoadState('networkidle')

    const records = page.locator('.divide-y > div')
    await records.first().waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {})
    const count = await records.count()
    if (count === 0) {
      test.skip()
      return
    }

    // Find at least one valid status label in the list
    const validStatuses = ['Có mặt', 'Vắng', 'Trễ', 'Phép']
    let found = false
    for (const status of validStatuses) {
      const cnt = await page.locator('.rounded-full.font-medium').filter({ hasText: status }).count()
      if (cnt > 0) { found = true; break }
    }
    expect(found).toBe(true)
  })

  test('SA-NO-ERROR – Trang không crash', async ({ page }) => {
    await page.getByRole('link', { name: 'Điểm danh' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('TypeError')
    await expect(page.locator('body')).not.toContainText('Unhandled')
  })
})

// ── Student Progress ──────────────────────────────────────────────────────────

test.describe('Student – Progress', () => {
  test('SP-PAGE – Trang Tiến độ hiển thị đúng', async ({ page }) => {
    await page.getByRole('link', { name: 'Tiến độ' }).click()
    await expect(page).toHaveURL(/\/student\/progress/)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h2').filter({ hasText: 'Tiến độ' })).toBeVisible()
    await expect(page.getByText('Đánh giá kỹ năng từ huấn luyện viên')).toBeVisible()
  })

  test('SP-EMPTY – Hiển thị empty state khi chưa có đánh giá', async ({ page }) => {
    await page.getByRole('link', { name: 'Tiến độ' }).click()
    await page.waitForLoadState('networkidle')
    // Wait for useEffect data fetch to complete (skeleton disappears)
    await page.locator('.animate-pulse').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    const emptyState = page.getByText('Chưa có đánh giá kỹ năng nào')
    const skillSection = page.getByText('Kỹ năng hiện tại')

    const emptyCount = await emptyState.count()
    const skillCount = await skillSection.count()

    // One of the two states must be present
    expect(emptyCount + skillCount).toBeGreaterThan(0)

    if (emptyCount > 0) {
      await expect(emptyState).toBeVisible()
      await expect(page.getByText('HLV sẽ đánh giá sau mỗi buổi học')).toBeVisible()
    }
  })

  test('SP-RADAR – Hiển thị radar chart và skill scores khi có đánh giá', async ({ page }) => {
    await page.getByRole('link', { name: 'Tiến độ' }).click()
    await page.waitForLoadState('networkidle')
    await page.locator('.animate-pulse').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    const skillSection = page.getByText('Kỹ năng hiện tại')
    const count = await skillSection.count()
    if (count === 0) {
      test.skip()
      return
    }

    await expect(skillSection).toBeVisible()
    // Skill labels from SKILL_LABELS
    await expect(page.getByText('Kỹ thuật').first()).toBeVisible()
    await expect(page.getByText('Di chuyển').first()).toBeVisible()
    await expect(page.getByText('Chiến thuật').first()).toBeVisible()
    await expect(page.getByText('Thể lực').first()).toBeVisible()
  })

  test('SP-OVERALL-SCORE – Hiển thị điểm tổng khi có đánh giá', async ({ page }) => {
    await page.getByRole('link', { name: 'Tiến độ' }).click()
    await page.waitForLoadState('networkidle')
    await page.locator('.animate-pulse').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    const skillSection = page.getByText('Kỹ năng hiện tại')
    const count = await skillSection.count()
    if (count === 0) {
      test.skip()
      return
    }

    // Overall score section — exact to avoid matching "Tiến độ điểm tổng" heading
    await expect(page.getByText('Điểm tổng', { exact: true })).toBeVisible()
    await expect(page.getByText('/100')).toBeVisible()
  })

  test('SP-HISTORY – Hiển thị lịch sử đánh giá khi có >= 2 records', async ({ page }) => {
    await page.getByRole('link', { name: 'Tiến độ' }).click()
    await page.waitForLoadState('networkidle')
    await page.locator('.animate-pulse').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    const historySection = page.getByText('Lịch sử đánh giá')
    const count = await historySection.count()
    if (count === 0) {
      test.skip()
      return
    }

    await expect(historySection).toBeVisible()
  })

  test('SP-NO-ERROR – Trang không crash', async ({ page }) => {
    await page.getByRole('link', { name: 'Tiến độ' }).click()
    await page.waitForLoadState('networkidle')
    await expect(page.locator('body')).not.toContainText('TypeError')
    await expect(page.locator('body')).not.toContainText('Unhandled')
  })
})
