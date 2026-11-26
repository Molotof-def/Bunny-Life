import pg from 'pg';
import fs from 'node:fs';
import path from 'node:path';
const { Pool } = pg;
export const pool = process.env.DATABASE_URL ? new Pool({ connectionString: process.env.DATABASE_URL, ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined }) : null;
export async function initDb() {
  if (!pool) throw new Error('DATABASE_URL is not configured');
  const schema = fs.readFileSync(path.resolve(process.cwd(), 'sql/schema.sql'), 'utf8');
  await pool.query(schema);
}
