// supabase/functions/sepay-webhook/index.ts
// Edge Function: Process bank transaction webhook from Sepay to auto-approve registrations
//
// Deploy: supabase functions deploy sepay-webhook

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  try {
    // 1. Verify API Key/Token from Sepay if configured
    let apiKey = req.headers.get('x-api-key') || req.headers.get('apikey')

    // Extract from Authorization header if present (Sepay sends "Apikey YOUR_KEY" or "Bearer YOUR_KEY")
    const authHeader = req.headers.get('authorization')
    if (!apiKey && authHeader) {
      if (authHeader.startsWith('Apikey ')) {
        apiKey = authHeader.substring(7).trim()
      } else if (authHeader.startsWith('Bearer ')) {
        apiKey = authHeader.substring(7).trim()
      } else {
        apiKey = authHeader.trim()
      }
    }

    const expectedApiKey = Deno.env.get('SEPAY_WEBHOOK_KEY')
    if (expectedApiKey && apiKey !== expectedApiKey) {
      console.warn('Unauthorized webhook request key:', apiKey)
      return new Response(
        JSON.stringify({ error: 'Unauthorized key' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const payload = await req.json()
    console.log('Received Sepay transaction payload:', JSON.stringify(payload))

    const {
      id: transactionId,
      gateway,
      transactionDate,
      accountNumber,
      subAccount,
      amountIn,
      amountOut,
      transferType,
      code,
      content,
    } = payload

    // Only process incoming credit transfers
    if (transferType !== 'in' || Number(amountIn) <= 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'Skipped: Not a credit transfer transaction' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2. Extract registration memo code
    let shortId: string | null = null
    if (code && typeof code === 'string' && code.toUpperCase().startsWith('TPB')) {
      shortId = code.substring(3).toLowerCase()
    } else if (content && typeof content === 'string') {
      const match = content.match(/TPB([a-f0-9]{8})/i)
      shortId = match ? match[1].toLowerCase() : null
    }

    if (!shortId) {
      console.warn('Cannot extract TPB registration code from memo:', content)
      return new Response(
        JSON.stringify({ success: false, error: 'Cannot extract TPB registration code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Extracted registration code TPB${shortId}. Checking transaction:`, transactionId)

    // 3. Idempotency check: Check if transaction has already been processed
    const { data: existingTx } = await supabaseAdmin
      .from('sepay_transactions')
      .select('id')
      .eq('transaction_id', String(transactionId))
      .maybeSingle()

    if (existingTx) {
      console.log('Transaction already processed (Idempotency):', transactionId)
      return new Response(
        JSON.stringify({ success: true, message: 'Transaction already processed' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 4. Fetch all pending registrations to find a match
    const { data: registrations, error: regError } = await supabaseAdmin
      .from('registrations')
      .select('*')
      .eq('status', 'pending')

    if (regError) {
      throw new Error(`Failed to query registrations: ${regError.message}`)
    }

    const registration = registrations?.find(r => r.id.substring(0, 8).toLowerCase() === shortId)

    if (!registration) {
      console.warn(`No pending registration found with prefix: TPB${shortId}`)
      return new Response(
        JSON.stringify({ success: false, error: `No pending registration matches TPB${shortId}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log(`Found matching registration ${registration.id} for student ${registration.last_name} ${registration.first_name}`)

    // 5. Fetch package details to check price
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from('packages')
      .select('*')
      .eq('id', registration.package_id)
      .single()

    if (pkgError || !pkg) {
      throw new Error(`Cannot find package for registration: ${pkgError?.message}`)
    }

    const expectedAmount = Number(pkg.price)
    const paidAmount = Number(amountIn)

    if (paidAmount < expectedAmount) {
      console.warn(`Insufficient amount: Paid ${paidAmount}, Expected ${expectedAmount}`)
      return new Response(
        JSON.stringify({ success: false, error: `Paid amount ${paidAmount} is less than package price ${expectedAmount}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 6. Create Auth User & Student
    const email = registration.email.trim()
    const rawFullName = `${registration.last_name} ${registration.first_name}`.trim()
    const phone = registration.mobile_phone
    const dob = registration.date_of_birth

    // Get skill level
    const { data: classInfo } = await supabaseAdmin
      .from('classes')
      .select('skill_level')
      .eq('id', registration.class_id)
      .single()

    const skillLevel = classInfo?.skill_level === 'kids' || classInfo?.skill_level === 'all'
      ? 'beginner'
      : (classInfo?.skill_level || 'beginner')

    let authUserId: string

    // Check if auth user exists
    const { data: existingUser } = await supabaseAdmin.auth.admin.getUserByEmail(email)
    if (existingUser?.user) {
      console.log('User auth already exists, reusing account:', existingUser.user.id)
      authUserId = existingUser.user.id
    } else {
      // Create user
      const password = phone || 'Student@123'
      console.log('Creating new auth user for student...')
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { full_name: rawFullName, role: 'student' },
      })

      if (createError || !newUserData.user) {
        throw new Error(`Failed to create auth user: ${createError?.message}`)
      }
      authUserId = newUserData.user.id
    }

    // Upsert profile
    console.log('Upserting user profile...')
    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authUserId,
      full_name: rawFullName,
      phone: phone || null,
      role: 'student',
      avatar_url: registration.student_photo_url || null,
    })

    if (profileError) {
      console.error('Profile upsert warning:', profileError.message)
    }

    // Upsert student record
    console.log('Upserting student record...')
    const healthNotes = `
- Tên nhóm: ${registration.club_name ?? 'Không'}
- Dân tộc: ${registration.ethnicity ?? 'Kinh'}
- Sức khỏe: ${getHealthSummary(registration)}
${registration.q7_medications ? `- Chi tiết thuốc: ${registration.q7_medications_detail}` : ''}
${registration.q9_other_reasons ? `- Chi tiết hạn chế thể chất: ${registration.q9_other_reasons_detail}` : ''}
${registration.q10_disability ? `- Chi tiết khuyết tật: ${registration.q10_disability_detail}` : ''}
    `.trim()

    const emergencyContact = registration.parent_name
      ? `${registration.parent_name} (${registration.parent_relationship}) - SĐT: ${registration.parent_mobile_phone}`
      : `Liên hệ khẩn cấp: ${registration.emergency_phone ?? 'Không'}`

    const { data: studentData, error: studentError } = await supabaseAdmin
      .from('students')
      .upsert({
        user_id: authUserId,
        skill_level: skillLevel,
        date_of_birth: dob,
        emergency_contact: emergencyContact,
        notes: healthNotes,
        status: 'active',
      }, { onConflict: 'user_id' })
      .select('id')
      .single()

    if (studentError || !studentData) {
      throw new Error(`Failed to upsert student record: ${studentError?.message}`)
    }

    const studentId = studentData.id
    console.log('Student record verified. Student ID:', studentId)

    // Enroll student in class
    console.log('Enrolling student in class...')
    const { error: enrollError } = await supabaseAdmin
      .from('class_students')
      .upsert({
        class_id: registration.class_id,
        student_id: studentId,
        status: 'active',
      }, { onConflict: 'class_id, student_id' })

    if (enrollError) {
      console.error('Class enrollment warning:', enrollError.message)
    }

    // Grant student package
    console.log('Granting card package...')
    const { data: studentPkg, error: studentPkgError } = await supabaseAdmin
      .from('student_packages')
      .insert({
        student_id: studentId,
        package_id: registration.package_id,
        sessions_total: pkg.sessions_count,
        sessions_remaining: pkg.sessions_count,
        status: 'pending_activation',
        notes: 'Kích hoạt tự động qua thanh toán Sepay Webhook.',
        purchased_at: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString(),
      })
      .select('id')
      .single()

    if (studentPkgError || !studentPkg) {
      throw new Error(`Failed to grant package: ${studentPkgError?.message}`)
    }

    // Record the payment
    console.log('Recording payment record...')
    const { error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        student_id: studentId,
        student_package_id: studentPkg.id,
        amount: paidAmount,
        payment_method: 'transfer',
        status: 'paid',
        paid_at: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString(),
        notes: `Chuyển khoản tự động qua Sepay. Mã GD ngân hàng: ${transactionId}. Cú pháp: ${memo}`,
      })

    if (paymentError) {
      console.error('Payment record warning:', paymentError.message)
    }

    // Log processed transaction in sepay_transactions (for idempotency and reconciliation)
    console.log('Logging Sepay transaction...')
    const { error: txError } = await supabaseAdmin
      .from('sepay_transactions')
      .insert({
        transaction_id: String(transactionId),
        amount: paidAmount,
        transfer_type: 'in',
        transfer_date: transactionDate ? new Date(transactionDate).toISOString() : new Date().toISOString(),
        gateway,
        account_number: accountNumber,
        sub_account: subAccount,
        code,
        content,
        registration_id: registration.id,
      })

    if (txError) {
      console.error('Sepay transaction logging warning:', txError.message)
    }

    // Finally approve the registration record
    console.log('Approving registration record...')
    const { error: regUpdateError } = await supabaseAdmin
      .from('registrations')
      .update({
        student_id: studentId,
        payment_status: 'paid',
        status: 'approved',
      })
      .eq('id', registration.id)

    if (regUpdateError) {
      throw new Error(`Failed to update registration status: ${regUpdateError.message}`)
    }

    console.log('Registration auto-approved and processed successfully!')

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Payment received and registration auto-approved successfully',
        registration_id: registration.id,
        student_id: studentId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Sepay Webhook Error:', err.message)
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function getHealthSummary(r: any) {
  const issues = []
  if (r.q1_heart_condition) issues.push('Bệnh tim')
  if (r.q2_chest_pain_activity || r.q3_chest_pain_rest) issues.push('Đau ngực')
  if (r.q4_fainting_dizziness) issues.push('Chóng mặt/Ngất')
  if (r.q5_joint_problem) issues.push('Vấn đề khớp')
  if (r.q6_high_blood_pressure) issues.push('Cao huyết áp')
  if (r.q7_medications) issues.push('Đang uống thuốc')
  if (r.q8_pregnant) issues.push('Có thai/mới sinh')
  if (r.q9_other_reasons) issues.push('Lý do thể chất khác')
  if (r.q10_disability) issues.push('Khuyết tật')

  return issues.length > 0 ? issues.join(', ') : 'Thể trạng tốt'
}
