import { readFile } from 'fs/promises';
import { join } from 'path';

const ROOT = 'd:/antigravity/claude_code/management-class';

async function loadEnv() {
  const envPath = join(ROOT, '.env.local');
  const content = await readFile(envPath, 'utf-8');
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
  return env;
}

async function runSQL(projectRef, accessToken, sql) {
  const url = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(
      `HTTP ${res.status}: ${data.message || data.error || JSON.stringify(data)}`
    )
  }
  return data;
}

async function main() {
  const env = await loadEnv();
  const { SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN } = env;
  console.log(`📡 Project: ${SUPABASE_PROJECT_REF}`);

  const migrationFile = join(ROOT, 'migrations', '031_storage_policies.sql');
  const sql = await readFile(migrationFile, 'utf-8');

  console.log('Running 031_storage_policies.sql ...');
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  const result = await runSQL(SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN, sql);
  console.log('✅ Migration run successfully!');
  console.log(result);
}

main().catch(err => {
  console.error('❌ Error running migration:', err);
  process.exit(1);
});
