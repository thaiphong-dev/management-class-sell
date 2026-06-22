/**
 * Maps Supabase Auth (GoTrue) errors to user-friendly Vietnamese messages.
 */
export function getAuthErrorMessage(err: any): string {
  if (!err) return 'Đã xảy ra lỗi không xác định. Vui lòng thử lại.'

  const message = err.message || ''
  const code = err.code || ''
  const status = err.status

  // 1. Rate limits
  if (
    code === 'over_email_send_rate_limit' ||
    message.toLowerCase().includes('email rate limit exceeded') ||
    message.toLowerCase().includes('rate limit') ||
    status === 429
  ) {
    return 'Bạn đang thao tác quá nhanh. Vui lòng thử lại sau ít phút.'
  }

  // 2. Duplicate Account / User Already Exists
  if (
    (code === 'unexpected_failure' && message.toLowerCase().includes('finding user')) ||
    message.toLowerCase().includes('database error finding user') ||
    message.toLowerCase().includes('already registered') ||
    message.toLowerCase().includes('already exists') ||
    code === 'email_exists' ||
    code === 'user_already_exists'
  ) {
    return 'Tài khoản (Email) này đã tồn tại trong hệ thống.'
  }

  // 3. Invalid credentials (login flow)
  if (
    code === 'invalid_credentials' ||
    message.toLowerCase().includes('invalid login credentials') ||
    message.toLowerCase().includes('invalid credentials')
  ) {
    return 'Email hoặc mật khẩu không đúng. Vui lòng thử lại.'
  }

  // Return the error message directly if it's already translated or just print it
  return message || 'Đã xảy ra lỗi trong quá trình xác thực. Vui lòng thử lại.'
}
