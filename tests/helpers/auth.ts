import { Page, expect } from '@playwright/test'

export const ACCOUNTS = {
  admin: {
    email: process.env.TEST_ADMIN_EMAIL ?? 'admin@shuttleclass.vn',
    password: process.env.TEST_ADMIN_PASSWORD ?? 'Admin@123',
    dashboard: '/admin/dashboard',
  },
  coach: {
    email: process.env.TEST_COACH_EMAIL ?? 'coach1@shuttleclass.vn',
    password: process.env.TEST_COACH_PASSWORD ?? 'Coach@123',
    dashboard: '/coach/dashboard',
  },
  student: {
    email: process.env.TEST_STUDENT_EMAIL ?? 'student1@shuttleclass.vn',
    password: process.env.TEST_STUDENT_PASSWORD ?? 'Student@123',
    dashboard: '/student/dashboard',
  },
} as const

export type Role = keyof typeof ACCOUNTS

export async function loginAs(page: Page, role: Role) {
  const { email, password, dashboard } = ACCOUNTS[role]
  await page.goto('/login')
  await page.waitForLoadState('networkidle')

  await page.getByPlaceholder('example@shuttleclass.vn').fill(email)
  await page.getByPlaceholder('••••••••').fill(password)
  await page.getByRole('button', { name: 'Đăng nhập' }).click()

  await page.waitForURL(`**${dashboard}`, { timeout: 15_000 })
  await expect(page).toHaveURL(new RegExp(dashboard))
}

export async function logout(page: Page) {
  await page.getByRole('button', { name: 'Đăng xuất' }).click()
  await page.waitForURL('**/login', { timeout: 10_000 })
}

/** Generate a unique name to avoid test data conflicts */
export function uniqueName(prefix: string): string {
  return `${prefix} [E2E-${Date.now()}]`
}
