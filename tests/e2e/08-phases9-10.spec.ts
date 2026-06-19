/**
 * Phase 9 & 10 E2E Tests
 * Coverage: Course Registration (Phase 9), Lesson Plans, Assistants, and Students List filtering (Phase 10)
 */
import { test, expect } from '@playwright/test'
import { loginAs, uniqueName } from '../helpers/auth'

test.describe('Phases 9 & 10 E2E Tests', () => {

  test.beforeEach(({ page }) => {
    // Log browser errors and messages to test runner stdout
    page.on('console', msg => {
      if (msg.type() === 'error' || msg.type() === 'warning') {
        console.log(`[BROWSER ${msg.type().toUpperCase()}] ${msg.text()}`)
      }
    })
  })

  // Test 1: Course Registration & VietQR Payment Display
  test('P9 - Đăng ký học viên dưới 16 tuổi và hiển thị mã thanh toán VietQR', async ({ page }) => {
    // 1. Mock register-student edge function call
    await page.route(url => url.pathname.includes('/functions/v1/register-student'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          registration_id: 'mock-reg-id-12345678'
        })
      })
    })

    // 2. Mock manual payment verification query (returns a single object for .single())
    await page.route(url => url.pathname.includes('/rest/v1/registrations'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          payment_status: 'paid',
          status: 'approved'
        })
      })
    })

    // Go to registration page
    await page.goto('/register-course')
    await page.waitForLoadState('networkidle')

    // Expect page title
    await expect(page.locator('h1')).toContainText('Mẫu Đăng Ký Học Viên')

    // Select Class and Package
    // Click class dropdown
    const classTrigger = page.locator('button[role="combobox"]').first()
    await classTrigger.click()
    await page.getByRole('option').first().click()

    // Click package dropdown
    const packageTrigger = page.locator('button[role="combobox"]').nth(1)
    await packageTrigger.click()
    await page.getByRole('option').first().click()

    // Fill Student Information
    const stLastName = uniqueName('Nguyễn')
    const stFirstName = 'E2ETestHV'
    const stEmail = `e2e_student_${Date.now()}@shuttleclass.vn`

    await page.getByPlaceholder('VD: Nguyễn Văn').fill(stLastName)
    await page.getByPlaceholder('VD: A').fill(stFirstName)
    
    // Choose gender "Nữ"
    await page.locator('label:has-text("Nữ")').first().click()

    // Fill Birth Date using native date input inside datepicker
    const dateInput = page.locator('input[type="date"]').first()
    await dateInput.fill('2015-06-15')

    // Address
    await page.getByPlaceholder('VD: 123 Đường ABC, Phường X, Quận Y').fill('456 E2E Road, HCM')

    // Mobile Phone (Vietnamese format)
    const stPhone = '0981234567'
    const emergencyPhone = '0912345678'
    await page.locator('div:has-text("Số điện thoại di động") > input[type="tel"]').first().fill(stPhone)
    await page.getByPlaceholder('VD: 091xxxxxxx').fill(emergencyPhone)
    await page.getByPlaceholder('VD: hocsinh@gmail.com').fill(stEmail)

    // Verify parent details section is displayed since birthdate < 16 (11 years old in 2026)
    const parentSection = page.locator('h3:has-text("THÔNG TIN LIÊN LẠC PHỤ HUYNH")')
    await expect(parentSection).toBeVisible()

    // Fill Parent details
    await page.getByPlaceholder('VD: Nguyễn Văn Cha').fill('Nguyễn Phụ Huynh')
    await page.getByPlaceholder('VD: Bố / Mẹ').fill('Mẹ')
    await page.locator('div:has-text("Số điện thoại di động phụ huynh") > input[type="tel"]').first().fill('0908765432')
    await page.getByPlaceholder('VD: phuhuynh@gmail.com').fill('phuhuynh@test.com')

    // Tick responsibility checkbox
    await page.locator('input[type="checkbox"]').check()

    // Submit form
    await page.getByRole('button', { name: 'Gửi đăng ký xếp lớp' }).click()

    // Should transition to success screen with VietQR
    await expect(page.locator('h2')).toContainText('Đăng Ký Thành Công!')
    await expect(page.getByText('Quét mã VietQR để thanh toán học phí')).toBeVisible()

    // Click check payment status button
    const checkBtn = page.getByRole('button', { name: 'Tôi đã chuyển khoản - Kiểm tra trạng thái' })
    await expect(checkBtn).toBeVisible()
    await checkBtn.click()

    // Should transition to Payment Confirmed screen
    await expect(page.locator('h2')).toContainText('Thanh Toán Thành Công!')
    await expect(page.getByText('Quay lại trang chủ')).toBeVisible()
  })

  // Test 2: Lesson Plan Creation, Toggling Public, Cloning & Public details view
  test('P10 - Coach: Tạo giáo án mới, công khai, nhân bản và xem chi tiết giáo án', async ({ page }) => {
    // Login as coach
    await loginAs(page, 'coach')

    // Navigate to "Thư viện giáo án"
    await page.getByRole('link', { name: 'Thư viện giáo án' }).click()
    await expect(page).toHaveURL(/\/coach\/lesson-plans/)

    // Click "Soạn giáo án"
    await page.getByRole('link', { name: 'Soạn giáo án' }).click()
    await expect(page).toHaveURL(/\/coach\/lesson-plans\/new/)

    // Fill form
    const planTitle = uniqueName('Bài tập E2E Test')
    await page.locator('#title').fill(planTitle)
    await page.locator('#location').fill('Sân Quận 10 - Tầng 2')
    await page.locator('#target_audience').fill('Lớp phong trào thiếu nhi')
    await page.locator('#equipment').fill('20 quả cầu Hải Yến, 2 cột lưới di động')
    await page.locator('#safety_check').fill('Mặt sân khô ráo, không bị ướt nước')

    // Objectives (Mục tiêu 1)
    await page.locator('input[placeholder="Mục tiêu số 1..."]').fill('Nắm được tư thế cầm vợt trái tay')

    // Exercises (Bài tập 1)
    await page.locator('input[placeholder="VD: Khởi động khớp"]').fill('Khởi động toàn thân')
    await page.locator('textarea[placeholder*="Di chuyển chạy bộ"]').fill('Xoay cổ tay, cổ chân, vai, hông và đầu gối kỹ lưỡng trong 5 phút')
    
    // Notes & Advice
    await page.locator('#comments').fill('HLV quan sát chỉnh sửa khuỷu tay cho từng em')
    await page.locator('#evaluation').fill('Đánh giá sau buổi học: Đa số nắm vững lý thuyết')

    // Toggle Public
    await page.locator('#is_public').click()

    // Click Save
    await page.getByRole('button', { name: 'Lưu giáo án' }).click()

    // Wait to return to library
    await expect(page).toHaveURL(/\/coach\/lesson-plans/)
    await page.waitForLoadState('networkidle')

    // Expect the newly created plan card to be visible
    const planCard = page.locator('div.bg-white.border.border-gray-200', { hasText: planTitle }).first()
    await expect(planCard).toBeVisible()
    await expect(planCard.getByText('Công khai')).toBeVisible()

    // Public view / Detail link check
    // We check the "Xem chi tiết" link
    const viewDetailBtn = planCard.getByRole('link', { name: 'Xem chi tiết' })
    await expect(viewDetailBtn).toBeVisible()
    const href = await viewDetailBtn.getAttribute('href')
    expect(href).not.toBeNull()

    // Navigate to shared link (public view)
    await page.goto(href!)
    await page.waitForLoadState('networkidle')
    await expect(page.getByText('Kế Hoạch Giảng Dạy Buổi Tập')).toBeVisible()
    await expect(page.getByText(planTitle)).toBeVisible()
    await expect(page.getByText('Mục tiêu buổi tập')).toBeVisible()
    await expect(page.getByText('Nội dung & kịch bản bài dạy')).toBeVisible()
  })

  // Test 3: Session details - Link Lesson Plan to Session, Take Attendance, and Save Evaluation
  test('P10 - Coach: Gắn giáo án, điểm danh và nhận xét đánh giá học viên', async ({ page }) => {
    await loginAs(page, 'coach')

    // Navigate to "Lớp của tôi"
    await page.getByRole('link', { name: 'Lớp của tôi' }).click()
    await expect(page).toHaveURL(/\/coach\/classes/)
    await page.waitForLoadState('networkidle')

    // Wait for class card to be visible
    const firstClassCard = page.locator('button.rounded-2xl.border').first()
    await expect(firstClassCard).toBeVisible({ timeout: 15000 })

    // Go to first class sessions list
    await firstClassCard.click()
    await expect(page).toHaveURL(/\/coach\/classes\/.+\/sessions/)
    await page.waitForLoadState('networkidle')

    // Find first session card and click "Cập nhật"
    const updateBtns = page.getByRole('button', { name: 'Cập nhật' })
    if (await updateBtns.count() === 0) {
      // Create a temporary session to ensure we can link it
      await page.getByRole('button', { name: 'Thêm buổi' }).click()
      await expect(page.getByRole('dialog')).toBeVisible()
      
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 2)
      const dateStr = tomorrow.toISOString().split('T')[0]
      
      await page.getByRole('dialog').locator('input[type="date"]').fill(dateStr)
      await page.getByRole('dialog').locator('input[type="time"]').fill('09:00')
      await page.getByRole('dialog').getByRole('button', { name: 'Tạo buổi học' }).click()
      await expect(page.getByRole('dialog')).not.toBeVisible({ timeout: 8_000 })
    }

    // Click "Cập nhật" on the session
    await page.getByRole('button', { name: 'Cập nhật' }).first().click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Find the lesson plan combobox inside the dialog
    const planTrigger = page.locator('button[role="combobox"]').first()
    await planTrigger.click()

    // Select the first available option or none if empty
    const firstOption = page.getByRole('option').first()
    if (await firstOption.count() > 0) {
      await firstOption.click()
      await page.getByRole('button', { name: 'Lưu giáo án' }).click()
      await expect(page.getByText('Đã cập nhật giáo án thành công').first()).toBeVisible()
    } else {
      await page.keyboard.press('Escape')
    }

    // Wait for the dialog to be closed/hidden
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // --- Attendance flow ---
    // Find the first "Điểm danh" button on the sessions page and click it
    await page.getByRole('button', { name: 'Điểm danh' }).first().click()
    await expect(page).toHaveURL(/\/coach\/classes\/.+\/sessions\/.+\/attendance/)
    await page.waitForLoadState('networkidle')

    // Wait for student list loader to detach
    await page.locator('.animate-pulse').waitFor({ state: 'detached', timeout: 10000 }).catch(() => {})

    // Check if there is a student to take attendance
    // Click 'Vắng' first then 'Có mặt' to guarantee that 'Có mặt' ends up selected
    // (if it was already present, clicking 'Có mặt' directly would toggle/deselect it to null)
    const absentBtn = page.getByRole('button', { name: 'Vắng' }).first()
    await expect(absentBtn).toBeVisible()
    await absentBtn.click()

    const presentBtn = page.getByRole('button', { name: 'Có mặt' }).first()
    await expect(presentBtn).toBeVisible()
    await presentBtn.click()

    // Click "Lưu điểm danh" (Save attendance)
    await page.getByRole('button', { name: 'Lưu điểm danh' }).click()

    // Verify toast or success message: "Đã lưu điểm danh"
    await expect(page.getByText('Đã lưu điểm danh').first()).toBeVisible()

    // --- Student Progress Evaluation flow ---
    // Navigate to "Đánh giá"
    await page.getByRole('link', { name: 'Đánh giá' }).click()
    await expect(page).toHaveURL(/\/coach\/progress/)
    await page.waitForLoadState('networkidle')

    // Click the first class card in the list (wait for it to be visible)
    const classEvalBtn = page.locator('.space-y-2 button').first()
    await expect(classEvalBtn).toBeVisible({ timeout: 10000 })
    await classEvalBtn.click()

    // Click the first student in the list (wait for it to be visible)
    const studentEvalBtn = page.locator('.divide-y button').first()
    await expect(studentEvalBtn).toBeVisible({ timeout: 10000 })
    await studentEvalBtn.click()

    // Fill evaluation scores (wait for inputs to be visible)
    const inputs = page.locator('input[type="number"]')
    await expect(inputs.first()).toBeVisible({ timeout: 10000 })
    
    // Fill the first 5 input number fields (technique, footwork, tactics, fitness, overall_score)
    const countInputs = await inputs.count()
    for (let i = 0; i < Math.min(5, countInputs); i++) {
      await inputs.nth(i).fill('85')
    }

    // Fill notes comment
    const textarea = page.locator('textarea')
    await expect(textarea).toBeVisible()
    await textarea.fill('Học viên tiếp thu tốt bài tập di chuyển trái tay và có sự tiến bộ rõ rệt.')

    // Click "Lưu đánh giá"
    await page.getByRole('button', { name: 'Lưu đánh giá' }).click()

    // Verify toast says "Đã lưu đánh giá"
    await expect(page.getByText('Đã lưu đánh giá').first()).toBeVisible()
  })

  // Test 4: Coach Assistants (Team / Crew management)
  test('P10 - Coach: Quản lý Trợ giảng và phân quyền đội ngũ', async ({ page }) => {
    // 1. Mock profiles call to return a mock assistant
    await page.route(url => url.pathname.includes('/rest/v1/profiles') && url.search.includes('role=eq.assistant'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mock-assistant-uuid-999',
            full_name: 'Nguyễn Văn Trợ Giảng E2E',
            phone: '0978654321',
            role: 'assistant'
          }
        ])
      })
    })

    // 2. Mock coach_assistants calls
    await page.route(url => url.pathname.includes('/rest/v1/coach_assistants'), async (route) => {
      const method = route.request().method()
      if (method === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([])
        })
      } else if (method === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            id: 'mock-assignment-uuid-888',
            coach_id: 'coach-id',
            assistant_id: 'mock-assistant-uuid-999'
          })
        })
      } else {
        await route.continue()
      }
    })

    await loginAs(page, 'coach')

    // Navigate to Assistants page
    await page.getByRole('link', { name: 'Quản lý Trợ giảng' }).click()
    await expect(page).toHaveURL(/\/coach\/assistants/)
    await page.waitForLoadState('networkidle')

    // Verify empty state initially
    await expect(page.getByText('Chưa có trợ giảng nào được gán')).toBeVisible()

    // Add assistant
    await page.getByRole('button', { name: 'Thêm trợ giảng' }).click()
    await expect(page.getByRole('dialog')).toBeVisible()

    // Select assistant
    await page.getByRole('dialog').locator('button[role="combobox"]').click()
    await page.getByRole('option', { name: 'Nguyễn Văn Trợ Giảng E2E' }).click()

    // Intercept subsequent load to return the assigned assistant
    await page.route(url => url.pathname.includes('/rest/v1/coach_assistants'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'mock-assignment-uuid-888',
            assigned_at: new Date().toISOString(),
            assistant: {
              id: 'mock-assistant-uuid-999',
              full_name: 'Nguyễn Văn Trợ Giảng E2E',
              phone: '0978654321'
            }
          }
        ])
      })
    })

    // Click add button
    await page.getByRole('button', { name: 'Thêm vào nhóm' }).click()
    await expect(page.getByRole('dialog')).not.toBeVisible()

    // Verify the assistant is visible in the list now
    await expect(page.getByText('Nguyễn Văn Trợ Giảng E2E')).toBeVisible()
    await expect(page.getByText('0978654321')).toBeVisible()

    // Remove assistant
    // Mock delete request
    await page.route(url => url.pathname.includes('/rest/v1/coach_assistants') && url.search.includes('id=eq.mock-assignment-uuid-888'), async (route) => {
      await route.fulfill({ status: 204 })
    })

    // Mock subsequent load to show empty list again
    await page.route(url => url.pathname.includes('/rest/v1/coach_assistants'), async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([])
      })
    })

    // Click remove trash icon
    page.once('dialog', dialog => dialog.accept())
    await page.locator('button.text-red-500').first().click()

    // Verify empty state is shown again
    await expect(page.getByText('Chưa có trợ giảng nào được gán')).toBeVisible()
  })

  // Test 5: Coach Students tab & Filters
  test('P10 - Coach: Xem danh sách học viên và lọc theo lớp, giới tính, độ tuổi', async ({ page }) => {
    // Mock the classes and class_students data
    await page.route('**/rest/v1/classes?select=id%2Cname&coach_id=in.*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 'class-uuid-1', name: 'Lớp Cầu Lông Cơ Bản A' },
          { id: 'class-uuid-2', name: 'Lớp Cầu Lông Trung Cấp B' }
        ])
      })
    })

    await page.route('**/rest/v1/class_students?select=id%2Cclass_id%2Cclasses%28name%29%2Cstudent_id%2Cstudents%28id%2Cdate_of_birth%2Cemergency_contact%2Cskill_level%2Cprofiles%28id%2Cfull_name%2Cphone%2Cgender%29%2Cstudent_packages%28id%2Cstatus%2Csessions_remaining%2Csessions_total%2Cpackages%28name%29%29%29&class_id=in.*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'cs-1',
            class_id: 'class-uuid-1',
            classes: { name: 'Lớp Cầu Lông Cơ Bản A' },
            student_id: 'student-1',
            students: {
              id: 'student-1',
              date_of_birth: '2015-05-10', // 11 years old
              emergency_contact: 'Mẹ - 0909090909',
              skill_level: 'beginner',
              profiles: {
                id: 'profile-1',
                full_name: 'Nguyễn Thị Hoa',
                phone: '0981234567',
                gender: 'Nữ'
              },
              student_packages: [
                {
                  id: 'sp-1',
                  status: 'active',
                  sessions_remaining: 8,
                  sessions_total: 12,
                  packages: { name: 'Gói 12 Buổi' }
                }
              ]
            }
          },
          {
            id: 'cs-2',
            class_id: 'class-uuid-2',
            classes: { name: 'Lớp Cầu Lông Trung Cấp B' },
            student_id: 'student-2',
            students: {
              id: 'student-2',
              date_of_birth: '2005-01-20', // 21 years old
              emergency_contact: 'Cha - 0919191919',
              skill_level: 'intermediate',
              profiles: {
                id: 'profile-2',
                full_name: 'Trần Văn Nam',
                phone: '0977654321',
                gender: 'Nam'
              },
              student_packages: [
                {
                  id: 'sp-2',
                  status: 'active',
                  sessions_remaining: 4,
                  sessions_total: 8,
                  packages: { name: 'Gói 8 Buổi' }
                }
              ]
            }
          }
        ])
      })
    })

    await loginAs(page, 'coach')

    // Navigate to "Học viên" tab
    await page.getByRole('link', { name: 'Học viên' }).click()
    await expect(page).toHaveURL(/\/coach\/students/)
    await page.waitForLoadState('networkidle')

    // Expect list of students initially containing both mocked students
    await expect(page.getByText('Nguyễn Thị Hoa')).toBeVisible()
    await expect(page.getByText('Trần Văn Nam')).toBeVisible()

    // Test Search input
    await page.getByPlaceholder('Tìm theo tên, SĐT...').fill('Hoa')
    await expect(page.getByText('Nguyễn Thị Hoa')).toBeVisible()
    await expect(page.getByText('Trần Văn Nam')).not.toBeVisible()

    // Clear search
    await page.getByPlaceholder('Tìm theo tên, SĐT...').fill('')
    await expect(page.getByText('Trần Văn Nam')).toBeVisible()

    // Test Gender filter
    const genderSelect = page.locator('div:has-text("Giới tính") > button[role="combobox"]').first()
    await genderSelect.click()
    await page.getByRole('option', { name: 'Nữ', exact: true }).click()

    await expect(page.getByText('Nguyễn Thị Hoa')).toBeVisible()
    await expect(page.getByText('Trần Văn Nam')).not.toBeVisible()

    // Reset gender filter
    await genderSelect.click()
    await page.getByRole('option', { name: 'Tất cả', exact: true }).click()
    await expect(page.getByText('Trần Văn Nam')).toBeVisible()

    // Test Age filter
    const ageSelect = page.locator('div:has-text("Độ tuổi") > button[role="combobox"]').first()
    await ageSelect.click()
    await page.getByRole('option', { name: 'Dưới 12 tuổi' }).click()

    await expect(page.getByText('Nguyễn Thị Hoa')).toBeVisible()
    await expect(page.getByText('Trần Văn Nam')).not.toBeVisible()
  })
})
