// supabase/functions/register-student/index.ts
// Edge Function: Public student registration (no auth required)
// It creates the auth user (default password TPB@123), student record,
// class enrollment, pending package, pending payment, and registration logs.
//
// Deploy: supabase functions deploy register-student

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
    const payload = await req.json()

    const {
      email,
      password = 'TPB@123',
      first_name,
      last_name,
      mobile_phone,
      class_id,
      package_id,
    } = payload

    if (!email || !first_name || !last_name || !mobile_phone || !class_id || !package_id) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, first_name, last_name, mobile_phone, class_id, package_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const rawFullName = `${last_name} ${first_name}`.trim()

    // 1. Create or fetch Auth User
    let authUserId = ''
    
    let page = 1
    let hasMore = true
    while (hasMore) {
      const { data: listData, error: listError } = await supabaseAdmin.auth.admin.listUsers({
        page,
        perPage: 100
      })
      
      if (listError) {
        throw new Error(`Failed to list users: ${listError.message}`)
      }
      
      const users = listData?.users || []
      if (users.length === 0) {
        break
      }
      
      const foundUser = users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())
      if (foundUser) {
        authUserId = foundUser.id
        break
      }
      
      if (users.length < 100) {
        hasMore = false
      } else {
        page++
      }
    }
    
    if (authUserId) {
      console.log('User auth already exists, checking for pending registrations:', authUserId)
      
      // Get student_id associated with this authUserId
      const { data: studentData, error: studentError } = await supabaseAdmin
        .from('students')
        .select('id')
        .eq('user_id', authUserId)
        .maybeSingle()
        
      if (studentError) {
        throw new Error(`Failed to query student record: ${studentError.message}`)
      }
      
      if (studentData) {
        // Check if there is any pending registration for this student
        const { data: pendingReg, error: regError } = await supabaseAdmin
          .from('registrations')
          .select('id')
          .eq('student_id', studentData.id)
          .eq('status', 'pending')
          .maybeSingle()
          
        if (regError) {
          throw new Error(`Failed to check pending registrations: ${regError.message}`)
        }
        
        if (pendingReg) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: 'EMAIL_EXISTS_WITH_PENDING_REGISTRATION', 
              message: 'Email này đã được đăng ký tài khoản trước đó và hiện đang có đơn đăng ký chờ duyệt. Vui lòng hủy đơn đăng ký cũ trước khi tạo đơn đăng ký mới.' 
            }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          )
        }
      }
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'EMAIL_EXISTS_NO_PENDING_REGISTRATION', 
          message: 'Email này đã được đăng ký tài khoản trước đó. Vui lòng đăng nhập để đăng ký học.' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    } else {
      console.log('Creating new auth user for student...')
      const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
        email: email.trim(),
        password: password,
        email_confirm: true,
        user_metadata: { full_name: rawFullName, role: 'student' },
      })

      if (createError || !newUserData.user) {
        throw new Error(`Failed to create auth user: ${createError?.message}`)
      }
      authUserId = newUserData.user.id
    }

    // 2. Upsert profile
    console.log('Upserting user profile...')
    let avatarUrl = payload.student_photo_url || null

    if (avatarUrl && avatarUrl.startsWith('data:image/')) {
      console.log('Detected base64 student portrait. Uploading to storage...')
      try {
        const match = avatarUrl.match(/^data:(image\/[a-zA-Z0-9+-\.]+);base64,(.+)$/)
        if (match) {
          const contentType = match[1]
          const base64Data = match[2]
          
          // Decode base64 to binary data
          const binaryString = atob(base64Data)
          const len = binaryString.length
          const bytes = new Uint8Array(len)
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i)
          }
          
          const fileExt = contentType.split('/')[1] || 'jpg'
          const fileName = `registrations/student-${authUserId}-${Date.now()}.${fileExt}`
          
          // Upload to Supabase Storage using admin client
          const { error: uploadError } = await supabaseAdmin.storage
            .from('image')
            .upload(fileName, bytes.buffer, {
              contentType: contentType,
              upsert: true
            })
            
          if (uploadError) {
            console.error('Failed to upload base64 portrait to storage:', uploadError.message)
          } else {
            // Get public URL
            const { data: urlData } = supabaseAdmin.storage
              .from('image')
              .getPublicUrl(fileName)
              
            avatarUrl = urlData.publicUrl
            console.log('Uploaded successfully! Public URL:', avatarUrl)
          }
        }
      } catch (err: any) {
        console.error('Failed to process base64 portrait:', err.message)
      }
    }

    const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
      id: authUserId,
      full_name: rawFullName,
      phone: mobile_phone || null,
      role: 'student',
      avatar_url: avatarUrl,
    })

    if (profileError) {
      throw new Error(`Failed to upsert profile: ${profileError.message}`)
    }

    // 3. Upsert student record
    console.log('Upserting student record...')
    // Get skill level from class
    const { data: classInfo } = await supabaseAdmin
      .from('classes')
      .select('skill_level')
      .eq('id', class_id)
      .single()

    const skillLevel = classInfo?.skill_level === 'kids' || classInfo?.skill_level === 'all'
      ? 'beginner'
      : (classInfo?.skill_level || 'beginner')

    const healthNotes = `
- Tên nhóm: ${payload.club_name ?? 'Không'}
- Dân tộc: ${payload.ethnicity ?? 'Kinh'}
- Sức khỏe: ${getHealthSummary(payload)}
${payload.q7_medications ? `- Chi tiết thuốc: ${payload.q7_medications_detail}` : ''}
${payload.q9_other_reasons ? `- Chi tiết hạn chế thể chất: ${payload.q9_other_reasons_detail}` : ''}
${payload.q10_disability ? `- Chi tiết khuyết tật: ${payload.q10_disability_detail}` : ''}
    `.trim()

    const emergencyContact = payload.parent_name
      ? `${payload.parent_name} (${payload.parent_relationship}) - SĐT: ${payload.parent_mobile_phone}`
      : `Liên hệ khẩn cấp: ${payload.emergency_phone ?? 'Không'}`

    const { data: studentData, error: studentError } = await supabaseAdmin
      .from('students')
      .upsert({
        user_id: authUserId,
        skill_level: skillLevel,
        date_of_birth: payload.date_of_birth,
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

    // 4. Enroll student in class
    console.log('Enrolling student in class...')
    const { error: enrollError } = await supabaseAdmin
      .from('class_students')
      .upsert({
        class_id: class_id,
        student_id: studentId,
        status: 'active',
      }, { onConflict: 'class_id, student_id' })

    if (enrollError) {
      throw new Error(`Failed to enroll student in class: ${enrollError.message}`)
    }

    // 5. Fetch package details to check price and sessions
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from('packages')
      .select('sessions_count, price')
      .eq('id', package_id)
      .single()

    if (pkgError || !pkg) {
      throw new Error(`Cannot find package: ${pkgError?.message}`)
    }

    // 6. Grant student package (pending_activation)
    console.log('Granting card package...')
    const { data: studentPkg, error: studentPkgError } = await supabaseAdmin
      .from('student_packages')
      .insert({
        student_id: studentId,
        package_id: package_id,
        sessions_total: pkg.sessions_count,
        sessions_remaining: pkg.sessions_count,
        status: 'pending_activation',
        notes: 'Khởi tạo từ đăng ký trực tuyến (Chờ thanh toán).',
        purchased_at: new Date().toISOString(),
      })
      .select('id')
      .single()

    if (studentPkgError || !studentPkg) {
      throw new Error(`Failed to grant package: ${studentPkgError?.message}`)
    }

    // 7. Record a pending payment
    console.log('Recording pending payment record...')
    const { data: paymentData, error: paymentError } = await supabaseAdmin
      .from('payments')
      .insert({
        student_id: studentId,
        student_package_id: studentPkg.id,
        amount: Number(pkg.price),
        payment_method: 'transfer',
        status: 'pending',
        notes: 'Chờ thanh toán học phí qua chuyển khoản VietQR.',
      })
      .select('id')
      .single()

    if (paymentError || !paymentData) {
      throw new Error(`Failed to create pending payment: ${paymentError?.message}`)
    }

    // 8. Insert registration record linked to student, package and payment
    console.log('Creating registration record...')
    const { data: regData, error: regError } = await supabaseAdmin
      .from('registrations')
      .insert({
        student_id: studentId,
        class_id: class_id,
        package_id: package_id,
        student_package_id: studentPkg.id,
        payment_id: paymentData.id,
        payment_status: 'unpaid',
        status: 'pending',
        club_name: payload.club_name,
        first_name: payload.first_name,
        last_name: payload.last_name,
        title: payload.title || 'VĐV/HV',
        gender: payload.gender,
        date_of_birth: payload.date_of_birth,
        home_address: payload.home_address,
        home_phone: payload.home_phone,
        mobile_phone: payload.mobile_phone,
        emergency_phone: payload.emergency_phone,
        email: payload.email,
        ethnicity: payload.ethnicity,
        q1_heart_condition: payload.q1_heart_condition,
        q2_chest_pain_activity: payload.q2_chest_pain_activity,
        q3_chest_pain_rest: payload.q3_chest_pain_rest,
        q4_fainting_dizziness: payload.q4_fainting_dizziness,
        q5_joint_problem: payload.q5_joint_problem,
        q6_high_blood_pressure: payload.q6_high_blood_pressure,
        q7_medications: payload.q7_medications,
        q7_medications_detail: payload.q7_medications_detail,
        q8_pregnant: payload.q8_pregnant,
        q9_other_reasons: payload.q9_other_reasons,
        q9_other_reasons_detail: payload.q9_other_reasons_detail,
        q10_disability: payload.q10_disability,
        q10_disability_detail: payload.q10_disability_detail,
        student_photo_url: avatarUrl,
        parent_name: payload.parent_name,
        parent_relationship: payload.parent_relationship,
        parent_address: payload.parent_address,
        parent_home_phone: payload.parent_home_phone,
        parent_mobile_phone: payload.parent_mobile_phone,
        parent_email: payload.parent_email,
        terms_accepted: true,
      })
      .select('id')
      .single()

    if (regError || !regData) {
      throw new Error(`Failed to create registration record: ${regError?.message}`)
    }

    console.log('Registration fully processed! User ID:', authUserId, 'Reg ID:', regData.id)

    return new Response(
      JSON.stringify({
        success: true,
        user_id: authUserId,
        registration_id: regData.id,
        email: email,
        password: password,
      }),
      { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: any) {
    console.error('Registration processing error:', err.message)
    return new Response(
      JSON.stringify({ error: err.message }),
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
