import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

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

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const query = 'Lê Quang Huy';
  const phone = '0866551124';

  console.log("--- SEARCHING REGISTRATIONS ---");
  const { data: regs } = await supabase.from('registrations').select('*').or(`first_name.ilike.%Huy%,last_name.ilike.%Huy%,mobile_phone.eq.${phone}`);
  console.log(regs);

  console.log("--- SEARCHING STUDENTS ---");
  const { data: students } = await supabase.from('students').select('*').eq('user_id', '00000000-0000-0000-0000-100000000001');
  console.log(students);
}

main();
