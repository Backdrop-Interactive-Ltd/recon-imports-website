import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {X509Certificate} from 'node:crypto';
import pg from 'pg';
import { privateRun, taskRoot, writeReport, quoteIdentifier } from './launch05a-common.mjs';

export function validateTarget(input) {
  if (!/^[a-z0-9-]+\.pooler\.supabase\.com$/i.test(input.host ?? '')) throw Error('Use the exact Supabase Session Pooler hostname only.');
  if (!/^[a-z0-9]{20}$/.test(input.project ?? '')) throw Error('A valid Supabase project reference is required.');
  if (!/^[a-zA-Z0-9_-]+\.[a-z0-9]{20}$/.test(input.user ?? '') || !input.user.endsWith('.' + input.project)) throw Error('Session Pooler username must match the supplied project reference.');
  if (input.database !== 'postgres' || input.port !== 5432) throw Error('Only the Supabase Session Pooler database postgres on port 5432 is allowed.');
  if (typeof input.password !== 'string' || !input.password) throw Error('A hidden password entry is required.');
  const ssl={rejectUnauthorized:true};
  if(input.caFile){
    const certificate=new X509Certificate(fs.readFileSync(input.caFile));
    if(!certificate.ca||Date.parse(certificate.validFrom)>Date.now()||Date.parse(certificate.validTo)<Date.now())throw Error('Supabase CA must be a currently valid CA certificate downloaded from the trusted Dashboard.');
    ssl.ca=certificate.toString();
  }
  return { host: input.host, user: input.user, database: input.database, port: input.port, password: input.password,
    ssl, connectionTimeoutMillis: 12000, query_timeout: 15000,
    options: '-c default_transaction_read_only=on -c statement_timeout=10000', application_name: 'recon-launch05a-readonly' };
}

export async function inspectDatabase(db, observed = {}) {
    const identity = (await db.query("SELECT current_database() AS database,current_setting('server_version') AS version,current_setting('transaction_read_only') AS read_only,current_setting('search_path') AS search_path,current_schema() AS current_schema")).rows[0];
    if (identity.database !== 'postgres' || identity.read_only !== 'on') throw Error('Read-only target identity verification failed.');
    observed.identity=identity;
    const schemaRows = (await db.query("SELECT nspname AS schema,has_schema_privilege(current_user,oid,'USAGE') AS usage,has_schema_privilege(current_user,oid,'CREATE') AS create FROM pg_namespace WHERE nspname <> 'information_schema' AND nspname NOT LIKE 'pg_%' ORDER BY nspname")).rows;
    const role = (await db.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
    const permissions = (await db.query("SELECT has_database_privilege(current_user,current_database(),'CONNECT') AS connect,has_database_privilege(current_user,current_database(),'CREATE') AS create_schema,has_language_privilege(current_user,'plpgsql','USAGE') AS plpgsql")).rows[0];
    Object.assign(observed,{schemas:schemaRows,role,permissions});
    const tables = (await db.query("SELECT n.nspname AS schemaname,c.relname AS tablename,c.relkind,c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner)=current_user AS owns_table FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE c.relkind IN ('r','p','m','f') AND n.nspname <> 'information_schema' AND n.nspname NOT LIKE 'pg_%' ORDER BY n.nspname,c.relname")).rows;
    const appNames = [...fs.readFileSync('prisma/schema.prisma','utf8').matchAll(/^model (\w+) \{/gm)].map(match => match[1]);
    const managed = new Set(['auth','storage','realtime','supabase_functions','supabase_migrations','extensions','vault','graphql','graphql_public','net','cron','pgsodium','pgsodium_masks']);
    const inventory = [];
    for (const table of tables) {
      const {schemaname:schema,tablename:name} = table;
      const isManaged = managed.has(schema);
      const privileges = (await db.query('SELECT has_table_privilege(current_user,$1,\'SELECT\') AS readable', [`${quoteIdentifier(schema)}.${quoteIdentifier(name)}`])).rows[0];
      let count = null;
      const businessManaged = schema==='auth'&&name==='users'||schema==='storage'&&['buckets','objects'].includes(name);
      const rlsCanHideRows=table.relrowsecurity&&!role.rolsuper&&!role.rolbypassrls&&(!table.owns_table||table.relforcerowsecurity);
      // Counts only, never passwords, tokens, files or business row contents.
      if ((!isManaged||businessManaged) && privileges.readable && table.relkind!=='f') count = (await db.query(`SELECT count(*)::text AS count FROM ${quoteIdentifier(schema)}.${quoteIdentifier(name)}`)).rows[0].count;
      inventory.push({schema,table:name,kind:table.relkind,managed:isManaged,businessManaged,readable:privileges.readable,rows:count,rowCountMayBeFiltered:rlsCanHideRows});
    }
    const objects = (await db.query("SELECT 'relation' AS kind,relname AS name FROM pg_class WHERE relnamespace='public'::regnamespace UNION ALL SELECT 'type',typname FROM pg_type WHERE typnamespace='public'::regnamespace UNION ALL SELECT 'function',proname FROM pg_proc WHERE pronamespace='public'::regnamespace")).rows;
    const localSql = fs.readdirSync('prisma/migrations',{withFileTypes:true}).filter(e=>e.isDirectory()).map(e=>fs.readFileSync(path.join('prisma/migrations',e.name,'migration.sql'),'utf8')).join('\n');
    const names = new Set([...localSql.matchAll(/CREATE\s+(?:OR REPLACE\s+)?(?:UNIQUE\s+)?(?:TABLE|TYPE|SEQUENCE|INDEX|FUNCTION)\s+(?:"([^"]+)"|([a-z_][a-z0-9_]*))/gi)].map(match=>match[1]??match[2]));
    const collisions = objects.filter(object=>names.has(object.name));
    const hasHistory = tables.some(t=>t.schemaname==='public'&&t.tablename==='_prisma_migrations');
    const history = hasHistory ? (await db.query('SELECT migration_name,checksum,finished_at IS NOT NULL AS finished,rolled_back_at IS NOT NULL AS rolled_back FROM public."_prisma_migrations" ORDER BY migration_name')).rows : [];
    const unknownRows = inventory.some(t=>(!t.managed||t.businessManaged)&&(t.rows===null||t.rowCountMayBeFiltered));
    const userRows = inventory.filter(t=>(!t.managed||t.businessManaged)&&t.rows!==null&&Number(t.rows)>0);
    const publicSchema = schemaRows.find(s=>s.schema==='public');
    const ready = identity.current_schema==='public' && publicSchema?.create && publicSchema?.usage && permissions.plpgsql && !collisions.length && !hasHistory && !userRows.length && !unknownRows;
    return { status:'CONNECTED_READ_ONLY',tlsCertificateVerified:true,identity,schemas:schemaRows,role,permissions,tableInventory:inventory,
      existingApplicationTables:inventory.filter(t=>t.schema==='public'&&appNames.includes(t.table)).map(t=>t.table),collidingObjects:collisions,migrationHistoryPresent:hasHistory,migrations:history,
      existingUserDataTables:userRows.map(t=>({schema:t.schema,table:t.table,rows:t.rows})),unreadableUserTables:unknownRows,
      migrationReadiness:ready?'PRECHECKS_PASS_EXECUTION_NOT_AUTHORIZED':'BLOCKED_OR_REQUIRES_REVIEW',ddlExecutionTested:false,
      limits:'Read-only catalog/privilege checks cannot prove DDL execution, provider default-grant/API safety, or Hyperdrive origin/caching.' };
}

async function main() {
  if (process.argv[2] === '--prepare') { console.log(privateRun('supabase')); return; }
  const directory = path.resolve(process.argv[2] ?? '');
  if (!directory.startsWith(taskRoot + path.sep) || !fs.existsSync(directory)) throw Error('Invalid private report directory.');
  let raw = ''; for await (const chunk of process.stdin) { raw += chunk; if (raw.length > 16384) throw Error('Credential input too large.'); }
  let input,config;
  try { input=JSON.parse(raw); raw=''; config=validateTarget(input); }
  catch {
    writeReport(directory,'supabase-result.json',{status:'INPUT_OR_CA_VALIDATION_FAILED',errorCode:'CHECK_FIELDS_AND_DASHBOARD_CA',databaseConnectionsAttempted:false});
    console.log(JSON.stringify({status:'INPUT_OR_CA_VALIDATION_FAILED',report:path.join(directory,'supabase-result.json')}));
    process.exitCode=1;return;
  }
  const db = new pg.Client(config);
  let result;
  const observed={};
  try {
    await db.connect();
    await db.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
    result = await inspectDatabase(db, observed);
    await db.query('ROLLBACK');
  } catch (error) {
    result = {status:'CONNECTION_OR_READ_ONLY_CHECK_FAILED',...observed,errorCode:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',secretsLogged:false};
    process.exitCode=1;
  } finally { await db.end().catch(()=>{}); input.password=''; config.password=''; }
  writeReport(directory, 'supabase-result.json', result);
  console.log(JSON.stringify({status:result.status,report:path.join(directory,'supabase-result.json'),version:result.identity?.version,migrationReadiness:result.migrationReadiness}));
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(()=>{console.error('Supabase check stopped safely. No credential details logged.');process.exitCode=1;});
}
