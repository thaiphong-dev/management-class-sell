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
  console.log("Starting safe test data cleanup...");

  // 1. Fetch all auth users
  console.log("Fetching all auth users...");
  const { data: { users }, error: errListUsers } = await supabase.auth.admin.listUsers();
  if (errListUsers) {
    console.error("Error listing users:", errListUsers.message);
    process.exit(1);
  }

  // 2. Identify test emails and user IDs
  const fixedTestEmails = [
    'hanie@gmail.com',
    'student1@shuttleclass.vn',
    'student2@shuttleclass.vn',
    'quanghuy.tma@shuttleclass.vn',
    'real_user_test@gmail.com',
    'parent-e2e-test@gmail.com'
  ];

  function isTestEmail(email) {
    if (!email) return false;
    const e = email.toLowerCase().trim();
    if (e.includes('e2e')) return true;
    if (e.endsWith('@test.shuttleclass.vn')) return true;
    if (e.endsWith('@shuttleclass.vn')) return true;
    if (e.startsWith('parent-')) return true;
    if (fixedTestEmails.includes(e)) return true;
    return false;
  }

  const deleteUsers = users.filter(u => isTestEmail(u.email));
  const deleteUserIds = deleteUsers.map(u => u.id);
  console.log(`Identified ${deleteUsers.length} test auth users to delete.`);

  // 3. Fetch all profiles
  console.log("Fetching profiles...");
  const { data: profiles, error: errProfiles } = await supabase.from('profiles').select('*');
  if (errProfiles) {
    console.error("Error fetching profiles:", errProfiles.message);
    process.exit(1);
  }

  // Identify profiles to delete
  // A profile is test if it belongs to a test auth user, has a test email, or belongs to a student of a test parent.
  // First, get all parents and students to find relationships
  const { data: parents } = await supabase.from('parents').select('*');
  const { data: students } = await supabase.from('students').select('*');

  const testParentIds = [];
  const testStudentIds = [];
  const testStudentProfileIds = [];

  // Parents belonging to test users
  if (parents) {
    for (const p of parents) {
      if (deleteUserIds.includes(p.user_id)) {
        testParentIds.push(p.id);
      }
    }
  }

  // Students belonging to test users or test parents
  if (students) {
    for (const s of students) {
      const isDirectTest = deleteUserIds.includes(s.user_id);
      const isParentTest = s.parent_id && testParentIds.includes(s.parent_id);
      
      // Also check if the student profile email (if exists) is test
      const profile = profiles.find(p => p.id === s.user_id);
      const isEmailTest = profile && isTestEmail(profile.email);

      if (isDirectTest || isParentTest || isEmailTest) {
        testStudentIds.push(s.id);
        testStudentProfileIds.push(s.user_id);
      }
    }
  }

  // All profile IDs to delete
  const deleteProfileIds = new Set([
    ...deleteUserIds,
    ...testStudentProfileIds
  ]);

  for (const p of profiles) {
    if (isTestEmail(p.email) || isTestEmail(p.phone)) {
      deleteProfileIds.add(p.id);
    }
  }

  // Retain the admin and coach profiles at all costs
  deleteProfileIds.delete('00000000-0000-0000-0000-100000000001'); // Admin
  deleteProfileIds.delete('00000000-0000-0000-0000-100000000002'); // Coach

  console.log(`Identified ${testStudentIds.length} test student records to delete.`);
  console.log(`Identified ${deleteProfileIds.size} public profiles to delete.`);

  // 4. Delete payments of test students
  if (testStudentIds.length > 0) {
    console.log("Deleting test payments...");
    const { error } = await supabase.from('payments').delete().in('student_id', testStudentIds);
    if (error) console.error("Error deleting payments:", error.message);
  }

  // 5. Delete student packages of test students
  if (testStudentIds.length > 0) {
    console.log("Deleting test student packages...");
    const { error } = await supabase.from('student_packages').delete().in('student_id', testStudentIds);
    if (error) console.error("Error deleting student packages:", error.message);
  }

  // 6. Delete attendance of test students
  if (testStudentIds.length > 0) {
    console.log("Deleting test attendance...");
    const { error } = await supabase.from('attendance').delete().in('student_id', testStudentIds);
    if (error) console.error("Error deleting attendance:", error.message);
  }

  // 7. Delete progress evaluations of test students
  if (testStudentIds.length > 0) {
    console.log("Deleting test progress evaluations...");
    const { error } = await supabase.from('progress_evaluations').delete().in('student_id', testStudentIds);
    if (error) console.error("Error deleting progress evaluations:", error.message);
  }

  // 8. Delete class students of test students
  if (testStudentIds.length > 0) {
    console.log("Deleting test class students...");
    const { error } = await supabase.from('class_students').delete().in('student_id', testStudentIds);
    if (error) console.error("Error deleting class students:", error.message);
  }

  // 9. Delete registrations (either test student, test email, or test parent email)
  console.log("Deleting test registrations...");
  const { data: registrations } = await supabase.from('registrations').select('id, email, parent_email, student_id');
  const deleteRegIds = [];
  if (registrations) {
    for (const r of registrations) {
      if (isTestEmail(r.email) || isTestEmail(r.parent_email) || (r.student_id && testStudentIds.includes(r.student_id))) {
        deleteRegIds.push(r.id);
      }
    }
  }
  if (deleteRegIds.length > 0) {
    const { error } = await supabase.from('registrations').delete().in('id', deleteRegIds);
    if (error) console.error("Error deleting registrations:", error.message);
  }

  // 10. Delete coach assistant registrations
  console.log("Deleting test coach/assistant registrations...");
  const { data: staffRegs } = await supabase.from('coach_assistant_registrations').select('id, email');
  const deleteStaffRegIds = [];
  if (staffRegs) {
    for (const sr of staffRegs) {
      if (isTestEmail(sr.email)) {
        deleteStaffRegIds.push(sr.id);
      }
    }
  }
  if (deleteStaffRegIds.length > 0) {
    const { error } = await supabase.from('coach_assistant_registrations').delete().in('id', deleteStaffRegIds);
    if (error) console.error("Error deleting staff registrations:", error.message);
  }

  // 11. Delete test sessions (notes contains 'E2E' or 'test')
  console.log("Deleting test sessions...");
  const { error: errDeleteSessions } = await supabase
    .from('sessions')
    .delete()
    .or('notes.ilike.%e2e%,notes.ilike.%test%,notes.ilike.%tc1%');
  if (errDeleteSessions) console.error("Error deleting sessions:", errDeleteSessions.message);

  // 11b. Delete test lesson plans (title contains 'E2E' or 'test')
  console.log("Deleting test lesson plans...");
  const { error: errDeleteLessonPlans } = await supabase
    .from('lesson_plans')
    .delete()
    .or('title.ilike.%e2e%,title.ilike.%test%');
  if (errDeleteLessonPlans) console.error("Error deleting lesson plans:", errDeleteLessonPlans.message);


  // 12. Delete test students
  if (testStudentIds.length > 0) {
    console.log("Deleting test student records...");
    const { error } = await supabase.from('students').delete().in('id', testStudentIds);
    if (error) console.error("Error deleting student records:", error.message);
  }

  // 13. Delete test parents
  if (testParentIds.length > 0) {
    console.log("Deleting test parent records...");
    const { error } = await supabase.from('parents').delete().in('id', testParentIds);
    if (error) console.error("Error deleting parent records:", error.message);
  }

  // 14. Delete profiles
  const profileIdsArray = Array.from(deleteProfileIds);
  if (profileIdsArray.length > 0) {
    console.log(`Deleting ${profileIdsArray.length} test profiles...`);
    const { error } = await supabase.from('profiles').delete().in('id', profileIdsArray);
    if (error) console.error("Error deleting profiles:", error.message);
  }

  // 15. Delete auth users
  console.log(`Deleting ${deleteUsers.length} test auth users...`);
  for (const user of deleteUsers) {
    console.log(`Deleting auth user: ${user.email} (ID: ${user.id})...`);
    const { error } = await supabase.auth.admin.deleteUser(user.id);
    if (error) {
      console.error(`Error deleting auth user for ${user.email}:`, error.message);
    } else {
      console.log(`Successfully deleted auth user ${user.email}`);
    }
  }

  // 16. Ensure Admin profile is fully restored and doesn't have an accidental student record
  console.log("Verifying Admin profile details...");
  await supabase.from('students').delete().eq('user_id', '00000000-0000-0000-0000-100000000001');
  await supabase
    .from('profiles')
    .update({
      full_name: 'Admin Thái Phong',
      role: 'admin',
      phone: '0377612701'
    })
    .eq('id', '00000000-0000-0000-0000-100000000001');

  console.log("Safe test data cleanup finished successfully!");
}

cleanup();
