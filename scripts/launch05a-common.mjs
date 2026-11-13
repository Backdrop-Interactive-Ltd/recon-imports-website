import fs from 'node:fs';
import path from 'node:path';
import { randomBytes, createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

export const taskRoot = path.resolve('.local/launch05a');
export function privateRun(label) {
  if (process.platform !== 'win32') throw Error('This backup/prompt workflow requires Windows.');
  const root = path.resolve('.');
  if (JSON.parse(fs.readFileSync(path.join(root, 'package.json'))).name !== 'recon-imports-website') throw Error('Unexpected workspace.');
  const dir = path.join(taskRoot, `${new Date().toISOString().replace(/[^0-9]/g, '')}-${label}-${randomBytes(4).toString('hex')}`);
  fs.mkdirSync(taskRoot, { recursive: true });
  fs.mkdirSync(dir);
  if (path.relative(fs.realpathSync(root), fs.realpathSync(dir)) !== path.relative(root, dir)) throw Error('Private directory escapes workspace.');
  const identity = execFileSync('whoami.exe', ['/user', '/fo', 'csv', '/nh'], { encoding: 'utf8', windowsHide: true });
  const sid = identity.match(/S-1-5-[0-9-]+/)?.[0];
  if (!sid) throw Error('Current Windows identity unavailable.');
  execFileSync('icacls.exe', [dir, '/inheritance:r', '/grant:r', `*${sid}:(OI)(CI)F`, '*S-1-5-18:(OI)(CI)F'], { stdio: 'pipe', windowsHide: true });
  execFileSync('git', ['check-ignore', '--quiet', dir], { stdio: 'pipe', windowsHide: true });
  return dir;
}
export const sha256 = value => createHash('sha256').update(value).digest('hex');
export const writeReport = (dir, name, result) => fs.writeFileSync(path.join(dir, name), JSON.stringify(result, null, 2), { flag: 'wx' });
export const quoteIdentifier = name => '"' + name.replaceAll('"', '""') + '"';
export async function fingerprint(db) {
  await db.query("SET LOCAL TIME ZONE 'UTC'");
  const schemas = (await db.query("SELECT nspname FROM pg_namespace WHERE nspname <> 'information_schema' AND nspname NOT LIKE 'pg_%' ORDER BY nspname")).rows.map(row => row.nspname);
  const tables = (await db.query("SELECT schemaname,tablename FROM pg_tables WHERE schemaname <> 'information_schema' AND schemaname NOT LIKE 'pg_%' ORDER BY schemaname,tablename")).rows;
  const data = [];
  for (const { schemaname, tablename } of tables) {
    const rows = (await db.query(`SELECT count(*)::text AS count, coalesce(string_agg(to_jsonb(t)::text, E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'') AS canonical FROM ${quoteIdentifier(schemaname)}.${quoteIdentifier(tablename)} t`)).rows[0];
    data.push({ schema: schemaname, table: tablename, rows: rows.count, sha256: sha256(rows.canonical) });
  }
  const columns = (await db.query("SELECT table_schema,table_name,column_name,ordinal_position,data_type,udt_name,is_nullable,column_default FROM information_schema.columns WHERE table_schema=ANY($1) ORDER BY table_schema,table_name,ordinal_position", [schemas])).rows;
  const indexes = (await db.query("SELECT schemaname,tablename,indexname,indexdef FROM pg_indexes WHERE schemaname=ANY($1) ORDER BY schemaname,tablename,indexname", [schemas])).rows;
  const sequences = (await db.query("SELECT schemaname,sequencename,start_value,min_value,max_value,increment_by,cycle,cache_size,last_value FROM pg_sequences WHERE schemaname=ANY($1) ORDER BY schemaname,sequencename", [schemas])).rows;
  const migrations = (await db.query('SELECT migration_name,checksum,finished_at IS NOT NULL AS finished,rolled_back_at IS NOT NULL AS rolled_back FROM public."_prisma_migrations" ORDER BY migration_name')).rows;
  return { schemas, data, columns, indexes, sequences, migrations };
}
