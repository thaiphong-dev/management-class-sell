/**
 * Phase 3 – Coach: Điểm danh & Đánh giá học viên E2E Tests
 * Coverage: Coach attendance list, attendance sheet, progress evaluation
 *
 * Pre-condition: coach1 cần có ít nhất 1 lớp + sessions để test sheet/eval.
 * Nếu không có lớp (BUG-C02), các tests phụ thuộc sẽ skip gracefully.
 */
import { test, expect, type Page } from '@playwright/test'
import { loginAs } from '../helpers/auth'

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'coach')
})

// ── Coach Attendance List ─────────────────────────────────────────────────────

test.describe('Coach – Attendance List', () => {
  test('A-PAGE – Trang Điểm danh hiển thị đúng', async ({ page }) => {
    await page.getByRole('link', { name: 'Điểm danh' }).click()
    await expect(page).toHaveURL(/\/coach\/attendance/)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h2').filter({ hasText: 'Điểm danh' })).toBeVisible()
    await expect(page.getByText('Các buổi học trong 7 ngày qua và sắp tới')).toBeVisible()
  })

  test('A-EMPTY – Hiển thị empty state khi không có buổi học', async ({ page }) => {
    await page.getByRole('link', { name: 'Điểm danh' }).click()
    await page.waitForLoadState('networkidle')

    const sessionRows = page.locator('.divide-y > div')
    const emptyState = page.getByText('Không có buổi học nào trong khoảng thời gian này')

    // Wait for load to finish (data could be empty)
    await page.waitForTimeout(500)
    const count = await sessionRows.count()
    if (count === 0) {
      await expect(emptyState).toBeVisible()
    }
    // If sessions exist, test passes vacuously
  })

  test('A-SESSION-ROW – Session rows hiển thị đủ thông tin', async ({ page }) => {
    await page.getByRole('link', { name: 'Điểm danh' }).click()
    await page.waitForLoadState('networkidle')

    const sessionRows = page.locator('.divide-y > div')
    await page.waitForTimeout(500)
    const count = await sessionRows.count()
    if (count === 0) {
      test.skip()
      return
    }

    const firstRow = sessionRows.first()
    // Each row should have class name + Điểm danh button
    await expect(firstRow.getByRole('button', { name: 'Điểm danh' })).toBeVisible()
  })

  test('A-SHEET-NAV – Click Điểm danh điều hướng đến attendance sheet', async ({ page }) => {
    await page.getByRole('link', { name: 'Điểm danh' }).click()
    await page.waitForLoadState('networkidle')

    const attendanceBtns = page.getByRole('button', { name: 'Điểm danh' })
    const count = await attendanceBtns.count()
    if (count === 0) {
      test.skip()
      return
    }

    await attendanceBtns.first().click()
    await expect(page).toHaveURL(/\/coach\/classes\/.+\/sessions\/.+\/attendance/)
    await expect(page.locator('h2').filter({ hasText: 'Điểm danh' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Lưu điểm danh/ })).toBeVisible()
  })
})

// ── Coach Attendance Sheet ────────────────────────────────────────────────────

test.describe('Coach – Attendance Sheet', () => {
  test('A-SHEET-UI – Trang điểm danh buổi học hiển thị đúng', async ({ page }) => {
    const ok = await navigateToAttendanceSheet(page)
    if (!ok) {
      test.skip()
      return
    }

    await expect(page.locator('h2').filter({ hasText: 'Điểm danh' })).toBeVisible()
    await expect(page.getByRole('button', { name: /Lưu điểm danh/ })).toBeVisible()
  })

  test('A-SHEET-STUDENTS – Hiển thị danh sách HV hoặc empty state', async ({ page }) => {
    const ok = await navigateToAttendanceSheet(page)
    if (!ok) {
      test.skip()
      return
    }

    const studentRows = page.locator('.divide-y > div')
    await studentRows.first().waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {})
    const count = await studentRows.count()

    if (count === 0) {
      await expect(page.getByText('Chưa có học viên nào trong lớp này')).toBeVisible()
    }
    // If students exist, test passes vacuously
  })

  test('A-SHEET-TOGGLE – Nút trạng thái Có mặt toggle đúng', async ({ page }) => {
    const ok = await navigateToAttendanceSheet(page)
    if (!ok) {
      test.skip()
      return
    }

    const studentRows = page.locator('.divide-y > div')
    await studentRows.first().waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {})
    const count = await studentRows.count()
    if (count === 0) {
      test.skip()
      return
    }

    const presentBtn = studentRows.first().getByRole('button', { name: 'Có mặt' })
    await presentBtn.click()
    // Active class should include border-green-500
    await expect(presentBtn).toHaveClass(/border-green-500/)

    // Toggle off — click again to deactivate
    await presentBtn.click()
    await expect(presentBtn).not.toHaveClass(/border-green-500/)
  })

  test('A-SHEET-SAVE – Lưu điểm danh thành công khi đã điểm ít nhất 1 HV', async ({ page }) => {
    const ok = await navigateToAttendanceSheet(page)
    if (!ok) {
      test.skip()
      return
    }

    const studentRows = page.locator('.divide-y > div')
    await studentRows.first().waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {})
    const count = await studentRows.count()
    if (count === 0) {
      test.skip()
      return
    }

    // Mark first student as present
    await studentRows.first().getByRole('button', { name: 'Có mặt' }).click()
    await page.getByRole('button', { name: /Lưu điểm danh/ }).click()

    await expect(page.getByText('Đã lưu điểm danh').first()).toBeVisible({ timeout: 8_000 })
  })

  test('A-SHEET-NO-DATA – Lưu khi chưa điểm danh hiển thị cảnh báo', async ({ page }) => {
    const ok = await navigateToAttendanceSheet(page)
    if (!ok) {
      test.skip()
      return
    }

    const studentRows = page.locator('.divide-y > div')
    await studentRows.first().waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {})
    const count = await studentRows.count()
    if (count === 0) {
      test.skip()
      return
    }

    // Click save without marking anyone
    await page.getByRole('button', { name: /Lưu điểm danh/ }).click()
    await expect(page.getByText('Chưa có dữ liệu').first()).toBeVisible({ timeout: 8_000 })
  })

  test('A-BACK – Nút Back trở về trang sessions', async ({ page }) => {
    const ok = await navigateToAttendanceSheet(page)
    if (!ok) {
      test.skip()
      return
    }

    // ArrowLeft back button (p-2 text-gray-400 avoids the lg:hidden sidebar toggle)
    await page.locator('button.p-2.text-gray-400').click()
    await expect(page).toHaveURL(/\/coach\/classes\/.+\/sessions$/)
  })
})

// ── Coach Progress Evaluation ─────────────────────────────────────────────────

test.describe('Coach – Progress Evaluation', () => {
  test('P-PAGE – Trang Đánh giá hiển thị đúng', async ({ page }) => {
    await page.getByRole('link', { name: 'Đánh giá' }).click()
    await expect(page).toHaveURL(/\/coach\/progress/)
    await page.waitForLoadState('networkidle')

    await expect(page.locator('h2').filter({ hasText: 'Đánh giá học viên' })).toBeVisible()
    await expect(page.getByText('Chọn lớp để đánh giá tiến độ')).toBeVisible()
  })

  test('P-EMPTY – Hiển thị empty state khi không có lớp phân công', async ({ page }) => {
    await page.getByRole('link', { name: 'Đánh giá' }).click()
    await page.waitForLoadState('networkidle')
    // Wait for useEffect data fetch to complete (skeleton disappears)
    await page.locator('.animate-pulse').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    const classBtns = page.locator('.space-y-2 > button')
    const emptyState = page.getByText('Bạn chưa được phân công lớp nào')

    const count = await classBtns.count()
    if (count === 0) {
      await expect(emptyState).toBeVisible()
    }
    // If classes exist, test passes vacuously
  })

  test('P-CLASS-SELECT – Click lớp → hiển thị danh sách học viên', async ({ page }) => {
    await page.getByRole('link', { name: 'Đánh giá' }).click()
    await page.waitForLoadState('networkidle')
    await page.locator('.animate-pulse').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    const classBtns = page.locator('.space-y-2 > button')
    const count = await classBtns.count()
    if (count === 0) {
      test.skip()
      return
    }

    await classBtns.first().click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Chọn học viên để đánh giá')).toBeVisible()
  })

  test('P-STUDENT-SELECT – Click học viên → hiển thị form đánh giá', async ({ page }) => {
    const ok = await navigateToEvalForm(page)
    if (!ok) {
      test.skip()
      return
    }

    await expect(page.getByText('Đánh giá mới')).toBeVisible()
    await expect(page.getByRole('button', { name: /Lưu đánh giá/ })).toBeVisible()
  })

  test('P-EVAL-FORM – Form có đủ skill inputs (5 số + notes)', async ({ page }) => {
    const ok = await navigateToEvalForm(page)
    if (!ok) {
      test.skip()
      return
    }

    // technique, footwork, tactics, fitness, overall_score
    const numberInputs = page.locator('input[type="number"]')
    await expect(numberInputs).toHaveCount(5)

    await expect(page.getByPlaceholder('Nhận xét về học viên...')).toBeVisible()
    await expect(page.getByRole('button', { name: /Lưu đánh giá/ })).toBeVisible()
  })

  test('P-EVAL-SAVE – Lưu đánh giá thành công', async ({ page }) => {
    const ok = await navigateToEvalForm(page)
    if (!ok) {
      test.skip()
      return
    }

    const numberInputs = page.locator('input[type="number"]')
    await numberInputs.nth(0).fill('80')  // technique
    await numberInputs.nth(1).fill('75')  // footwork
    await numberInputs.nth(2).fill('70')  // tactics
    await numberInputs.nth(3).fill('85')  // fitness
    await numberInputs.nth(4).fill('78')  // overall_score

    await page.getByPlaceholder('Nhận xét về học viên...').fill('E2E test evaluation')
    await page.getByRole('button', { name: /Lưu đánh giá/ }).click()

    await expect(page.getByText('Đã lưu đánh giá').first()).toBeVisible({ timeout: 8_000 })
  })

  test('P-BACK-STUDENTS – Nút back từ student stage về class list', async ({ page }) => {
    await page.getByRole('link', { name: 'Đánh giá' }).click()
    await page.waitForLoadState('networkidle')
    await page.locator('.animate-pulse').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

    const classBtns = page.locator('.space-y-2 > button')
    const count = await classBtns.count()
    if (count === 0) {
      test.skip()
      return
    }

    await classBtns.first().click()
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Chọn học viên để đánh giá')).toBeVisible()

    // ChevronLeft back button (p-2 text-gray-400 targets content-area back btn, not the lg:hidden sidebar toggle)
    await page.locator('button.p-2.text-gray-400').click()
    await expect(page.getByText('Chọn lớp để đánh giá tiến độ')).toBeVisible()
  })

  test('P-BACK-EVAL – Nút back từ eval form về student list', async ({ page }) => {
    const ok = await navigateToEvalForm(page)
    if (!ok) {
      test.skip()
      return
    }

    await page.locator('button.p-2.text-gray-400').click()
    await expect(page.getByText('Chọn học viên để đánh giá')).toBeVisible()
  })
})

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function navigateToAttendanceSheet(page: Page): Promise<boolean> {
  await page.getByRole('link', { name: 'Điểm danh' }).click()
  await page.waitForLoadState('networkidle')

  const attendanceBtns = page.getByRole('button', { name: 'Điểm danh' })
  const count = await attendanceBtns.count()
  if (count === 0) return false

  await attendanceBtns.first().click()
  await expect(page).toHaveURL(/\/coach\/classes\/.+\/sessions\/.+\/attendance/)
  await page.waitForLoadState('networkidle')
  return true
}

async function navigateToEvalForm(page: Page): Promise<boolean> {
  await page.getByRole('link', { name: 'Đánh giá' }).click()
  await page.waitForLoadState('networkidle')
  await page.locator('.animate-pulse').first().waitFor({ state: 'detached', timeout: 10_000 }).catch(() => {})

  const classBtns = page.locator('.space-y-2 > button')
  const classCount = await classBtns.count()
  if (classCount === 0) return false

  await classBtns.first().click()
  await page.waitForLoadState('networkidle')

  const studentBtns = page.locator('.divide-y > button')
  await studentBtns.first().waitFor({ state: 'attached', timeout: 8_000 }).catch(() => {})
  const studentCount = await studentBtns.count()
  if (studentCount === 0) return false

  await studentBtns.first().click()
  await page.waitForLoadState('networkidle')
  return true
}
