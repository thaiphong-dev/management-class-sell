import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// 1. Read .env.local
const envPath = join(process.cwd(), '.env.local');
const content = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of content.split('\n')) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) continue;
  const eqIdx = trimmed.indexOf('=');
  if (eqIdx === -1) continue;
  const key = trimmed.slice(0, eqIdx).trim();
  const value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
  env[key] = value;
}

const supabaseUrl = env.SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

// Disable TLS reject to avoid local cert issues
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

async function cleanup() {
  console.log("Starting test data cleanup...");

  // Keep these emails
  const keepEmails = ['thaiphong.dev@gmail.com', 'tuthaiphong600@gmail.com'];

  // 1. Delete all payments
  console.log("Deleting all payments...");
  const { error: errPayments } = await supabase.from('payments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errPayments) console.error("Error deleting payments:", errPayments.message);

  // 2. Delete all student packages
  console.log("Deleting all student packages...");
  const { error: errStudentPkgs } = await supabase.from('student_packages').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errStudentPkgs) console.error("Error deleting student packages:", errStudentPkgs.message);

  // 3. Delete all attendance
  console.log("Deleting all attendance...");
  const { error: errAttendance } = await supabase.from('attendance').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errAttendance) console.error("Error deleting attendance:", errAttendance.message);

  // 4. Delete all progress evaluations
  console.log("Deleting all progress evaluations...");
  const { error: errEvaluations } = await supabase.from('progress_evaluations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errEvaluations) console.error("Error deleting progress evaluations:", errEvaluations.message);

  // 5. Delete all class students
  console.log("Deleting all class students...");
  const { error: errClassStudents } = await supabase.from('class_students').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errClassStudents) console.error("Error deleting class students:", errClassStudents.message);

  // 6. Delete all registrations
  console.log("Deleting all registrations...");
  const { error: errRegistrations } = await supabase.from('registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errRegistrations) console.error("Error deleting registrations:", errRegistrations.message);

  // 7. Delete all coach assistant registrations
  console.log("Deleting all coach/assistant registrations...");
  const { error: errStaffRegistrations } = await supabase.from('coach_assistant_registrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errStaffRegistrations) console.error("Error deleting staff registrations:", errStaffRegistrations.message);

  // 8. Delete all sessions
  console.log("Deleting all sessions...");
  const { error: errSessions } = await supabase.from('sessions').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  if (errSessions) console.error("Error deleting sessions:", errSessions.message);

  // 9. Set coach_id to null for all classes (to allow deleting test coaches)
  console.log("Setting class coaches to null...");
  const { error: errClasses } = await supabase.from('classes').update({ coach_id: null }).neq('id', '00000000-0000-0000-0000-000000000000');
  if (errClasses) console.error("Error updating classes:", errClasses.message);

  // 10. Fetch all users from auth.users
  console.log("Fetching all auth users...");
  const { data: { users }, error: errListUsers } = await supabase.auth.admin.listUsers();
  if (errListUsers) {
    console.error("Error listing users:", errListUsers.message);
    process.exit(1);
  }

  // Identify users to keep and to delete
  const keepUserIds = [];
  const deleteUsers = [];

  for (const user of users) {
    if (keepEmails.includes(user.email)) {
      keepUserIds.push(user.id);
      console.log(`Keeping user: ${user.email} (ID: ${user.id})`);
    } else {
      deleteUsers.push(user);
    }
  }

  // 11. Find the Coach profile ID for the remaining coach
  const coachUser = users.find(u => u.email === 'tuthaiphong600@gmail.com');
  let coachProfileId = null;
  if (coachUser) {
    // Find coach record in public.coaches
    const { data: coachData, error: errFindCoach } = await supabase
      .from('coaches')
      .select('id')
      .eq('user_id', coachUser.id)
      .maybeSingle();
      
    if (!errFindCoach && coachData) {
      coachProfileId = coachData.id;
      console.log(`Found active coach record for tuthaiphong600@gmail.com: ${coachProfileId}`);
    }
  }

  // Re-assign coach_id to classes for our remaining coach
  if (coachProfileId) {
    console.log(`Re-assigning all classes to coach ${coachProfileId}...`);
    const { error: errUpdateCoach } = await supabase
      .from('classes')
      .update({ coach_id: coachProfileId })
      .neq('id', '00000000-0000-0000-0000-000000000000');
    if (errUpdateCoach) console.error("Error re-assigning classes to coach:", errUpdateCoach.message);
  }

  // 12. Delete test users
  console.log(`Deleting ${deleteUsers.length} test users...`);
  for (const user of deleteUsers) {
    console.log(`Deleting user: ${user.email} (ID: ${user.id})...`);
    // Delete child records first if any (e.g. from profiles, coaches, assistants, students, parents)
    // Deleting from profiles will cascade delete coaches, assistants, students, parents
    const { error: errDeleteProfile } = await supabase.from('profiles').delete().eq('id', user.id);
    if (errDeleteProfile) {
      console.error(`Error deleting profile for ${user.email}:`, errDeleteProfile.message);
    }
    
    // Delete the auth user
    const { error: errDeleteAuth } = await supabase.auth.admin.deleteUser(user.id);
    if (errDeleteAuth) {
      console.error(`Error deleting auth user for ${user.email}:`, errDeleteAuth.message);
    } else {
      console.log(`Successfully deleted ${user.email}`);
    }
  }

  console.log("Test data cleanup finished successfully!");
}

cleanup();
