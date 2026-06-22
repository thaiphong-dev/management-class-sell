import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');

async function loadEnv() {
  const content = await readFile(join(ROOT, '.env.local'), 'utf-8');
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

async function run() {
  const sqlFile = process.argv[2];
  if (!sqlFile) {
    console.error('Usage: node scratch/run_query.js <path_to_sql_file>');
    process.exit(1);
  }

  const env = await loadEnv();
  const { SUPABASE_PROJECT_REF, SUPABASE_ACCESS_TOKEN } = env;

  if (!SUPABASE_PROJECT_REF || !SUPABASE_ACCESS_TOKEN) {
    console.error('Missing SUPABASE_PROJECT_REF or SUPABASE_ACCESS_TOKEN in .env.local');
    process.exit(1);
  }

  const sqlPath = join(ROOT, sqlFile);
  const sql = await readFile(sqlPath, 'utf-8');

  console.log(`Running SQL from ${sqlFile} against project ${SUPABASE_PROJECT_REF}...`);

  const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`;

  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_ACCESS_TOKEN}`,
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
    console.error('Error running SQL:');
    console.error(data.message || data.error || JSON.stringify(data));
    process.exit(1);
  }

  console.log('SQL executed successfully!');
  console.log(JSON.stringify(data, null, 2));
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
