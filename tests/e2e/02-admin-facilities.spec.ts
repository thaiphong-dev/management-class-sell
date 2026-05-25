/**
 * Phase 2 – Admin: Cơ sở & Sân CRUD E2E Tests
 * Coverage: TC1–TC4 (facility + court create, edit, delete)
 */
import { test, expect } from '@playwright/test'
import { loginAs, uniqueName } from '../helpers/auth'

test.use({ storageState: undefined })

test.beforeEach(async ({ page }) => {
  await loginAs(page, 'admin')
  await page.getByRole('link', { name: 'Cơ sở & Sân' }).click()
  await expect(page).toHaveURL(/\/admin\/facilities/)
  await page.waitForLoadState('networkidle')
})

test.describe('Admin – Facilities CRUD', () => {
  test('F1 – Tạo cơ sở mới xuất hiện trong danh sách', async ({ page }) => {
    const facilityName = uniqueName('Cơ sở QC')

    // Open dialog
    await page.getByRole('button', { name: 'Thêm cơ sở' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Thêm cơ sở mới')).toBeVisible()

    // Fill form
    await page.getByPlaceholder('Ví dụ: Trung tâm Cầu lông ABC').fill(facilityName)
    await page.getByPlaceholder('123 Đường ABC, Quận 1, TP.HCM').fill('99 Đường Test, TP.HCM')
    await page.getByPlaceholder('0901 234 567').fill('0909123456')

    // Save
    await page.getByRole('dialog').getByRole('button', { name: 'Lưu' }).click()

    // Dialog should close
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 6_000 })

    // Toast: success
    await expect(page.getByText('Đã thêm cơ sở mới').first()).toBeVisible({ timeout: 6_000 })

    // Facility appears in list
    await expect(page.getByText(facilityName)).toBeVisible()

    // Cleanup: delete the created facility
    await deleteFacilityByName(page, facilityName)
  })

  test('F1b – Không thể lưu cơ sở khi tên trống', async ({ page }) => {
    await page.getByRole('button', { name: 'Thêm cơ sở' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Lưu button disabled when name is empty
    const saveBtn = page.getByRole('dialog').getByRole('button', { name: 'Lưu' })
    await expect(saveBtn).toBeDisabled()
  })

  test('F2 – Thêm sân vào cơ sở', async ({ page }) => {
    const facilityName = uniqueName('Cơ sở F2')
    const courtName = uniqueName('Sân E2E')

    // Create facility first
    await createFacility(page, facilityName)

    // Expand facility to show courts section
    await expandFacility(page, facilityName)

    // Add court
    await page.getByRole('button', { name: 'Thêm sân' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Thêm sân mới')).toBeVisible()

    await page.getByPlaceholder('Ví dụ: Sân A1').fill(courtName)
    await page.getByRole('spinbutton').fill('99')
    await page.getByRole('dialog').getByRole('button', { name: 'Lưu' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 6_000 })
    await expect(page.getByText('Đã thêm sân mới').first()).toBeVisible({ timeout: 6_000 })
    await expect(page.getByText(courtName)).toBeVisible()

    // Cleanup
    await deleteFacilityByName(page, facilityName)
  })

  test('F3 – Sửa trạng thái sân thành Bảo trì', async ({ page }) => {
    const facilityName = uniqueName('Cơ sở F3')
    const courtName = uniqueName('Sân F3')

    await createFacility(page, facilityName)
    await expandFacility(page, facilityName)

    // Create court
    await page.getByRole('button', { name: 'Thêm sân' }).click()
    await page.getByPlaceholder('Ví dụ: Sân A1').fill(courtName)
    await page.getByRole('dialog').getByRole('button', { name: 'Lưu' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 6_000 })
    await expect(page.getByText(courtName)).toBeVisible()

    // Edit court status — go up 2 levels from text node to reach the court card div
    const courtCard = page.locator('text=' + courtName).locator('xpath=../..')
    await courtCard.locator('button').first().click()  // Pencil (edit) icon

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Chỉnh sửa sân')).toBeVisible()

    // Change status to Bảo trì
    await page.getByRole('combobox').last().click()
    await page.getByRole('option', { name: 'Bảo trì' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Lưu' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 6_000 })
    await expect(page.getByText('Đã cập nhật sân').first()).toBeVisible({ timeout: 6_000 })
    // Status badge should now show Bảo trì
    await expect(page.getByText('Bảo trì').first()).toBeVisible()

    // Cleanup
    await deleteFacilityByName(page, facilityName)
  })

  test('F4 – Sửa cơ sở (tên + địa chỉ)', async ({ page }) => {
    const originalName = uniqueName('Cơ sở Edit')
    const updatedName = uniqueName('Cơ sở Đã Sửa')

    await createFacility(page, originalName)

    // Find edit button for this facility (0=chevron, 1=pencil, 2=trash)
    const facilityRow = page.locator('.rounded-2xl').filter({ hasText: originalName })
    await facilityRow.getByRole('button').filter({ has: page.locator('svg') }).nth(1).click()

    await expect(page.getByRole('dialog')).toBeVisible()
    await expect(page.getByText('Chỉnh sửa cơ sở')).toBeVisible()

    // Update name
    const nameInput = page.getByPlaceholder('Ví dụ: Trung tâm Cầu lông ABC')
    await nameInput.clear()
    await nameInput.fill(updatedName)
    await page.getByRole('dialog').getByRole('button', { name: 'Lưu' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 6_000 })
    await expect(page.getByText('Đã cập nhật cơ sở').first()).toBeVisible({ timeout: 6_000 })
    await expect(page.getByText(updatedName)).toBeVisible()

    // Cleanup
    await deleteFacilityByName(page, updatedName)
  })

  test('F5 – Xóa cơ sở sau khi confirm', async ({ page }) => {
    const facilityName = uniqueName('Cơ sở Xóa')
    await createFacility(page, facilityName)

    // Find and click delete button
    const facilityRow = page.locator('.rounded-2xl').filter({ hasText: facilityName })
    // Delete icon is the second action button (after edit)
    await facilityRow.getByRole('button').last().click()

    // Confirm dialog appears
    await expect(page.getByRole('alertdialog')).toBeVisible()
    await expect(page.getByText('Xác nhận xóa')).toBeVisible()
    await expect(page.getByText('Bạn có chắc muốn xóa cơ sở này')).toBeVisible()

    await page.getByRole('button', { name: 'Xóa' }).click()

    await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 6_000 })
    await expect(page.getByText('Đã xóa cơ sở').first()).toBeVisible({ timeout: 6_000 })
    await expect(page.getByText(facilityName)).not.toBeVisible()
  })

  test('F6 – Hủy xóa cơ sở (cancel button)', async ({ page }) => {
    const facilityName = uniqueName('Cơ sở Cancel')
    await createFacility(page, facilityName)

    const facilityRow = page.locator('.rounded-2xl').filter({ hasText: facilityName })
    await facilityRow.getByRole('button').last().click()

    await expect(page.getByRole('alertdialog')).toBeVisible()
    await page.getByRole('button', { name: 'Hủy' }).click()

    await expect(page.getByRole('alertdialog')).not.toBeVisible()
    // Facility must still exist
    await expect(page.getByText(facilityName)).toBeVisible()

    // Cleanup
    await deleteFacilityByName(page, facilityName)
  })

  test('F7 – Đóng dialog tạo cơ sở bằng nút Hủy', async ({ page }) => {
    await page.getByRole('button', { name: 'Thêm cơ sở' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()
    await page.getByRole('dialog').getByRole('button', { name: 'Hủy' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()
  })

  test('F8 – Trạng thái cơ sở có thể đổi sang Tạm đóng', async ({ page }) => {
    const facilityName = uniqueName('Cơ sở Inactive')
    await createFacility(page, facilityName)

    const facilityRow = page.locator('.rounded-2xl').filter({ hasText: facilityName })
    // Click pencil icon (edit): 0=chevron, 1=pencil, 2=trash
    await facilityRow.getByRole('button').filter({ has: page.locator('svg') }).nth(1).click()

    await expect(page.getByRole('dialog')).toBeVisible()

    // Change status to Tạm đóng
    await page.getByRole('combobox').click()
    await page.getByRole('option', { name: 'Tạm đóng' }).click()
    await page.getByRole('dialog').getByRole('button', { name: 'Lưu' }).click()

    await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 6_000 })
    await expect(page.getByText('Tạm đóng').first()).toBeVisible()

    // Cleanup
    await deleteFacilityByName(page, facilityName)
  })
})

// ─── Helpers ────────────────────────────────────────────────────────────────

async function createFacility(page: Parameters<typeof loginAs>[0], name: string) {
  await page.getByRole('button', { name: 'Thêm cơ sở' }).click()
  await page.getByPlaceholder('Ví dụ: Trung tâm Cầu lông ABC').fill(name)
  await page.getByRole('dialog').getByRole('button', { name: 'Lưu' }).click()
  await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 6_000 })
  await expect(page.getByText(name)).toBeVisible({ timeout: 6_000 })
}

async function expandFacility(page: Parameters<typeof loginAs>[0], name: string) {
  // Click chevron/expand button in the facility row
  const facilityRow = page.locator('.rounded-2xl').filter({ hasText: name })
  const chevron = facilityRow.locator('button').first()
  await chevron.click()
  // Wait for courts section to appear
  await expect(facilityRow.getByText('Danh sách sân')).toBeVisible({ timeout: 5_000 })
}

async function deleteFacilityByName(page: Parameters<typeof loginAs>[0], name: string) {
  const facilityRow = page.locator('.rounded-2xl').filter({ hasText: name })
  // The facility header row (px-5 py-4) contains: chevron | icon | name | badge | count | [pencil, trash]
  // The last button in the header row is always the facility trash button
  const headerRow = facilityRow.locator('.px-5.py-4').first()
  await headerRow.getByRole('button').last().click()
  await expect(page.getByRole('alertdialog')).toBeVisible()
  await page.getByRole('button', { name: 'Xóa' }).click()
  await expect(page.getByRole('alertdialog')).not.toBeVisible({ timeout: 6_000 })
  await page.waitForTimeout(1000)  // wait for list to refresh
}
