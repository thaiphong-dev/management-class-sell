// supabase/functions/create-user/index.ts
// Edge Function: Create a new auth user + profile + role-specific record
//
// Deploy: supabase functions deploy create-user
// Caller must be authenticated + have role=admin in profiles table

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

interface CreateUserPayload {
  email: string
  password: string
  full_name: string
  phone?: string
  role: 'admin' | 'coach' | 'student'
  // Coach-specific
  specialty?: string
  experience_years?: number
  bio?: string
  // Student-specific
  skill_level?: 'beginner' | 'intermediate' | 'advanced'
  dob?: string
}

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

  // Verify caller is an authenticated admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'No authorization header' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const { data: { user: caller }, error: authError } = await supabaseAdmin.auth.getUser(
    authHeader.replace('Bearer ', '')
  )

  if (authError || !caller) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Check if caller is admin
  const { data: callerProfile } = await supabaseAdmin
    .from('profiles')
    .select('role')
    .eq('id', caller.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return new Response(
      JSON.stringify({ error: 'Forbidden: Admin only' }),
      { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  let payload: CreateUserPayload
  try {
    payload = await req.json()
  } catch {
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Validate required fields
  if (!payload.email || !payload.password || !payload.full_name || !payload.role) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: email, password, full_name, role' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  // Create auth user (email_confirm=true to skip email verification)
  const { data: newUserData, error: createError } = await supabaseAdmin.auth.admin.createUser({
    email: payload.email,
    password: payload.password,
    email_confirm: true,
    user_metadata: { full_name: payload.full_name, role: payload.role },
  })

  if (createError || !newUserData.user) {
    return new Response(
      JSON.stringify({ error: createError?.message ?? 'Failed to create auth user' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  const userId = newUserData.user.id

  // Upsert profile (trigger handle_new_user may already create it)
  const { error: profileError } = await supabaseAdmin.from('profiles').upsert({
    id: userId,
    full_name: payload.full_name,
    phone: payload.phone ?? null,
    role: payload.role,
  })

  if (profileError) {
    console.error('Profile upsert error:', profileError.message)
  }

  // Create role-specific record
  if (payload.role === 'coach') {
    const { error: coachError } = await supabaseAdmin.from('coaches').upsert({
      user_id: userId,
      specialty: payload.specialty ?? null,
      experience_years: payload.experience_years ?? 0,
      bio: payload.bio ?? null,
    }, { onConflict: 'user_id' })
    if (coachError) console.error('Coach record error:', coachError.message)
  } else if (payload.role === 'student') {
    const { error: studentError } = await supabaseAdmin.from('students').upsert({
      user_id: userId,
      skill_level: payload.skill_level ?? 'beginner',
      dob: payload.dob ?? null,
    }, { onConflict: 'user_id' })
    if (studentError) console.error('Student record error:', studentError.message)
  }

  return new Response(
    JSON.stringify({
      success: true,
      user_id: userId,
      email: payload.email,
      role: payload.role,
    }),
    { status: 201, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
})
