import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {randomBytes,randomUUID} from 'node:crypto';
import {execFile,spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import nextEnv from '@next/env';
import pg from 'pg';
import bcrypt from 'bcryptjs';
import {privateRun,sha256,writeReport,fingerprint,quoteIdentifier as qi} from './launch05a-common.mjs';

const execute=promisify(execFile);
const root=path.resolve('.');
const privateRoot=path.resolve('.local/launch05d');
const sqlRoot=path.resolve('scripts/sql/launch05d');

export function validateTarget(target) {
  assert.equal(target.host,'127.0.0.1');
  assert.ok(Number.isInteger(target.port)&&target.port>1024&&target.port<65536&&target.port!==54329);
  assert.match(target.database,/^(?:launch05d|eid03)_[a-f0-9]{12}$/);
  assert.match(target.marker,/^(?:LAUNCH-05D isolated security|EID-03 isolated disposable) [a-f0-9-]{36}$/);
  assert.equal(target.cluster,path.resolve(target.cluster));
  assert.ok(target.cluster.startsWith(privateRoot+path.sep));
  assert.equal(path.basename(target.cluster),'postgres');
  assert.ok(['recon_migrator','recon_runtime','postgres','authenticator'].includes(target.user));
  assert.equal(target.ssl.rejectUnauthorized,true);
  assert.ok(target.ssl.ca);
}

async function verify(db,target) {
  validateTarget(target);
  assert.equal(db.connection.stream.encrypted,true);assert.equal(db.connection.stream.authorized,true);
  const row=(await db.query("SELECT current_database() AS database,current_user AS role,current_setting('server_version') AS version,inet_server_port() AS port,shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()")).rows[0];
  assert.equal(row.database,target.database);assert.equal(row.port,target.port);assert.equal(row.version,'17.11');
  assert.equal(row.role,target.user);assert.equal(row.marker,target.marker);
}

async function freePort() {const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;await new Promise(r=>server.close(r));assert.notEqual(port,54329);return port;}
async function control(binary,args) {await new Promise((resolve,reject)=>{const child=spawn(binary,args,{stdio:'ignore',windowsHide:true});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Disposable control failed.')));});}
async function publicData(db) {
  const result=[];
  for(const {tablename} of (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows) {
    const row=(await db.query(`SELECT count(*)::text AS count,coalesce(string_agg(to_jsonb(t)::text,E'\\n' ORDER BY to_jsonb(t)::text COLLATE "C"),'') AS canonical FROM public.${qi(tablename)} t`)).rows[0];
    result.push({table:tablename,rows:row.count,sha256:sha256(row.canonical)});
  }
  return result;
}

function preservedFiles() {
  const rows=[];
  function walk(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))){const file=path.join(dir,e.name);if(e.isDirectory())walk(file);else rows.push({file,sha256:sha256(fs.readFileSync(file))});}}
  for(const file of fs.readdirSync('.').filter(x=>/^\.env(?:\.|$)/.test(x)).sort())rows.push({file,sha256:sha256(fs.readFileSync(file))});
  walk('public/uploads');walk('prisma/migrations');
  for(const e of fs.readdirSync('.local/launch05a',{withFileTypes:true}).filter(e=>e.isDirectory())) {
    const file=path.join('.local/launch05a',e.name,'backup-verification.json');if(!fs.existsSync(file))continue;
    const report=JSON.parse(fs.readFileSync(file));assert.equal(sha256(fs.readFileSync(report.backup)),report.sha256);rows.push({file:report.backup,sha256:report.sha256});
  }
  assert.equal(rows.filter(r=>r.file.endsWith('.custom.dump')).length,2);
  return rows;
}

async function importCandidates(db,target,candidates) {
  assert.equal(target.user,'recon_migrator');await verify(db,target);await db.query('BEGIN');
  const counts={inserted:0,skipped:0};
  try {
    await db.query("SET LOCAL TIME ZONE 'UTC'");await db.query("SELECT pg_advisory_xact_lock(hashtext('recon-launch05d-import'))");
    assert.deepEqual(Object.keys(candidates).sort(),['AdminUser','Media','SiteSetting']);
    for(const table of ['AdminUser','SiteSetting','Media']) {
      const columns=(await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position",[table])).rows.map(r=>r.column_name);
      for(const canonical of candidates[table]) {
        const row=JSON.parse(canonical);assert.deepEqual(Object.keys(row).sort(),[...columns].sort());
        const old=(await db.query(`SELECT to_jsonb(t)::text AS canonical FROM public.${qi(table)} t WHERE id=$1`,[row.id])).rows[0];
        if(old){if(old.canonical!==canonical)throw Object.assign(Error('Candidate conflict'),{code:'CANDIDATE_CONFLICT'});counts.skipped++;}
        else {const names=columns.map(qi).join(',');await db.query(`INSERT INTO public.${qi(table)} (${names}) SELECT ${names} FROM jsonb_populate_record(NULL::public.${qi(table)},$1::jsonb)`,[canonical]);counts.inserted++;}
      }
      assert.deepEqual((await db.query(`SELECT to_jsonb(t)::text AS canonical FROM public.${qi(table)} t ORDER BY id`)).rows.map(r=>r.canonical),candidates[table]);
    }
    await db.query('COMMIT');return counts;
  }catch(error){await db.query('ROLLBACK');throw error;}
}

async function main() {
  const run=privateRun('rehearsal','launch05d');const cluster=path.join(run,'postgres');
  const bin=path.join(process.env.LOCALAPPDATA,'ReconImports/PostgreSQL-17.11-rehearsal/pgsql/bin');
  let stage='preflight',started=false,source,bootstrap;const clients=[];let port;
  try {
    const archive=path.join(path.dirname(path.dirname(bin)),'postgresql-17.11-4-windows-x64-binaries.zip');
    assert.equal(sha256(fs.readFileSync(archive)),'b9424ee7bc60b52450ff910a3630225df32e633f3cb29c1d126d9299d59aea28');
    assert.match((await execute(path.join(bin,'postgres.exe'),['--version'],{windowsHide:true})).stdout,/17\.11/);
    const filesBefore=preservedFiles();nextEnv.loadEnvConfig(root,true,{info(){},error(){}});
    const ownerUrl=new URL(process.env.DATABASE_URL);assert.equal(ownerUrl.hostname,'127.0.0.1');assert.equal(ownerUrl.port,'54329');assert.equal(ownerUrl.pathname,'/recon_local');
    source=new pg.Client({connectionString:ownerUrl.toString(),options:'-c default_transaction_read_only=on -c statement_timeout=10000'});
    await source.connect();await source.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
    const ownerIdentity=(await source.query("SELECT current_database() AS database,current_setting('data_directory') AS directory,current_setting('transaction_read_only') AS readonly")).rows[0];
    assert.equal(ownerIdentity.database,'recon_local');assert.equal(ownerIdentity.readonly,'on');
    assert.equal(fs.realpathSync(ownerIdentity.directory).toLowerCase(),fs.realpathSync('.local/postgres').toLowerCase());
    const ownerBefore=await fingerprint(source);assert.equal(ownerBefore.data.length,18);assert.equal(ownerBefore.migrations.length,10);
    const candidates={};for(const table of ['AdminUser','SiteSetting','Media'])candidates[table]=(await source.query(`SELECT to_jsonb(t)::text AS canonical FROM public.${qi(table)} t ORDER BY id`)).rows.map(r=>r.canonical);
    assert.equal(candidates.AdminUser.length,1);assert.equal(candidates.SiteSetting.length,27);assert.equal(candidates.Media.length,4);
    const mediaUrls=new Set(candidates.SiteSetting.map(JSON.parse).filter(r=>['websiteLogo','footerLogo','favicon'].includes(r.key)).map(r=>r.value));assert.equal(mediaUrls.size,3);
    candidates.Media=candidates.Media.filter(row=>mediaUrls.has(JSON.parse(row).fileUrl));assert.equal(candidates.Media.length,3);
    const migrationNames=fs.readdirSync('prisma/migrations',{withFileTypes:true}).filter(e=>e.isDirectory()&&/^\d/.test(e.name)).map(e=>e.name).sort();assert.equal(migrationNames.length,12);
    for(const m of ownerBefore.migrations){assert.ok(m.finished&&!m.rolled_back);assert.equal(m.checksum,sha256(fs.readFileSync(`prisma/migrations/${m.migration_name}/migration.sql`)));}
    await source.query('ROLLBACK');writeReport(run,'owner-before.json',ownerBefore);writeReport(run,'files-before.json',filesBefore);
    console.log('Owner PostgreSQL verified read-only. Creating a separate TLS-enabled PostgreSQL 17 cluster.');

    stage='isolated TLS cluster';port=await freePort();
    const certificate=path.join(run,'server.crt'),key=path.join(run,'server.key');
    const certConfig=path.join(run,'openssl.cnf');fs.writeFileSync(certConfig,'[req]\ndistinguished_name=dn\n[dn]\n');
    const openssl=await execute('C:/Program Files/Git/usr/bin/openssl.exe',['req','-config',certConfig,'-x509','-newkey','rsa:2048','-nodes','-keyout',key,'-out',certificate,'-days','2','-subj','/CN=localhost',
      '-addext','subjectAltName=IP:127.0.0.1,DNS:localhost','-addext','basicConstraints=critical,CA:TRUE','-addext','extendedKeyUsage=serverAuth'],{windowsHide:true});
    fs.writeFileSync(path.join(run,'openssl.log'),openssl.stderr);
    const tls={rejectUnauthorized:true,ca:fs.readFileSync(certificate,'utf8')};
    const passwords=Object.fromEntries(['bootstrap','postgres','recon_migrator','recon_runtime','authenticator'].map(r=>[r,randomBytes(32).toString('hex')]));
    const passwordFile=path.join(run,'bootstrap.secret');fs.writeFileSync(passwordFile,passwords.bootstrap,{flag:'wx'});
    const init=await execute(path.join(bin,'initdb.exe'),['-D',cluster,'-U','launch05d_bootstrap','--auth=scram-sha-256',`--pwfile=${passwordFile}`,'--encoding=UTF8'],{windowsHide:true});fs.writeFileSync(path.join(run,'initdb.log'),init.stdout+init.stderr);
    const names={candidate:`launch05d_${randomBytes(6).toString('hex')}`,runtime:`eid03_${randomBytes(6).toString('hex')}`};
    fs.writeFileSync(path.join(cluster,'pg_hba.conf'),`hostnossl all all 127.0.0.1/32 reject\nhostssl all launch05d_bootstrap 127.0.0.1/32 scram-sha-256\nhostssl ${Object.values(names).join(',')} postgres,recon_migrator,recon_runtime,authenticator 127.0.0.1/32 scram-sha-256\nhost all all 127.0.0.1/32 reject\n`);
    const quoteFile=value=>value.replaceAll('\\','/').replaceAll("'","''");
    fs.appendFileSync(path.join(cluster,'postgresql.conf'),`\nssl=on\nssl_cert_file='${quoteFile(certificate)}'\nssl_key_file='${quoteFile(key)}'\nssl_min_protocol_version='TLSv1.2'\nlog_statement='none'\nlog_min_error_statement='panic'\nlog_error_verbosity='terse'\n`);
    await control(path.join(bin,'pg_ctl.exe'),['-D',cluster,'-l',path.join(run,'postgres.log'),'-o',`-p ${port} -h 127.0.0.1`,'-w','-t','60','start']);started=true;
    bootstrap=new pg.Client({host:'127.0.0.1',port,database:'postgres',user:'launch05d_bootstrap',password:passwords.bootstrap,ssl:tls});await bootstrap.connect();
    const loc=(await bootstrap.query("SELECT current_setting('data_directory') AS directory,current_setting('server_version') AS version")).rows[0];assert.equal(fs.realpathSync(loc.directory),fs.realpathSync(cluster));assert.equal(loc.version,'17.11');assert.equal(bootstrap.connection.stream.authorized,true);
    await bootstrap.query(`CREATE ROLE postgres LOGIN PASSWORD '${passwords.postgres}' NOSUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS`);
    await bootstrap.query('CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS');
    await bootstrap.query(`CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD '${passwords.authenticator}'`);
    await bootstrap.query('GRANT anon,authenticated,service_role TO authenticator WITH INHERIT FALSE, SET TRUE');
    const targets={};const compatSchema=`compat_${randomBytes(6).toString('hex')}`;
    for(const [purpose,database] of Object.entries(names)) {
      await bootstrap.query(`CREATE DATABASE ${qi(database)} OWNER postgres TEMPLATE template0 ENCODING 'UTF8'`);
      const marker=purpose==='runtime'?`EID-03 isolated disposable ${randomUUID()}`:`LAUNCH-05D isolated security ${randomUUID()}`;
      await bootstrap.query(`COMMENT ON DATABASE ${qi(database)} IS '${marker}'`);
      targets[purpose]={host:'127.0.0.1',port,database,user:'postgres',password:passwords.postgres,ssl:tls,marker,cluster};validateTarget(targets[purpose]);
    }
    function roleTarget(target,user){return {...target,user,password:passwords[user]};}
    async function connect(target){const db=new pg.Client(target);await db.connect();clients.push(db);await verify(db,target);return db;}
    function nodeUrl(target){const u=new URL(`postgresql://127.0.0.1:${port}/${target.database}`);u.username=target.user;u.password=target.password;u.searchParams.set('sslmode','verify-full');u.searchParams.set('sslrootcert',certificate);return u.toString();}
    function cliUrl(target){const u=new URL(`postgresql://127.0.0.1:${port}/${target.database}`);u.username=target.user;u.password=target.password;u.searchParams.set('sslmode','require');u.searchParams.set('sslaccept','strict');u.searchParams.set('sslcert',certificate);return u.toString();}
    async function command(label,args,target,extra={},migration=false){
      const check=await connect(target);await check.end();
      const clean=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('PG')&&!/^(?:DATABASE_URL|DIRECT_URL|AUTH_|NEXTAUTH_|ADMIN_|CLOUDINARY_|EID02B_|RECON_WORKERS_BUILD|HYPERDRIVE)/.test(k)));
      let result;try{result=await execute(process.execPath,args,{env:{...clean,DATABASE_URL:migration?cliUrl(target):nodeUrl(target),AUTH_SECRET:randomBytes(32).toString('hex'),...extra},windowsHide:true,maxBuffer:16*1024*1024,timeout:300000});}
      catch(error){fs.writeFileSync(path.join(run,label+'.log'),String(error.stdout??'')+String(error.stderr??''));throw Object.assign(Error('Isolated command failed'),{code:label.toUpperCase().replaceAll('-','_')+'_FAILED'});}
      fs.writeFileSync(path.join(run,label+'.log'),result.stdout+result.stderr);return result.stdout+result.stderr;
    }
    async function phase(db,target,file){await verify(db,target);await db.query('BEGIN');try{await db.query("SELECT set_config('recon.hardening_target',$1,true)",[target.database]);await db.query(fs.readFileSync(path.join(sqlRoot,file),'utf8'));await db.query('COMMIT');}catch(error){await db.query('ROLLBACK');throw error;}}
    async function providerState(db){return (await db.query(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.kind,t.name,t.detail),'[]'::jsonb)::text AS state FROM (
      SELECT 'schema' AS kind,nspname AS name,coalesce(nspacl::text,'') AS detail FROM pg_namespace WHERE nspname IN ('auth','storage','extensions')
      UNION ALL SELECT 'relation',n.nspname||'.'||c.relname,coalesce(c.relacl::text,'') FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname IN ('auth','storage','extensions')
      UNION ALL SELECT 'function',n.nspname||'.'||p.proname,coalesce(p.proacl::text,'') FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname IN ('auth','storage','extensions')
      UNION ALL SELECT 'default',defaclobjtype::text||':'||defaclnamespace::text,defaclacl::text FROM pg_default_acl WHERE defaclrole='postgres'::regrole) t`)).rows[0].state;}
    async function applicationGrantState(db){return (await db.query(`SELECT coalesce(jsonb_agg(to_jsonb(t) ORDER BY t.kind,t.name),'[]'::jsonb)::text AS state FROM (
      SELECT 'relation' AS kind,relname AS name,coalesce(relacl::text,'') AS acl FROM pg_class WHERE relnamespace='public'::regnamespace
      UNION ALL SELECT 'function',proname,coalesce(proacl::text,'') FROM pg_proc WHERE pronamespace='public'::regnamespace
      UNION ALL SELECT 'type',typname,coalesce(typacl::text,'') FROM pg_type WHERE typnamespace='public'::regnamespace AND typtype='e'
      UNION ALL SELECT 'default',defaclobjtype::text||':'||defaclnamespace::text,defaclacl::text FROM pg_default_acl WHERE defaclrole='recon_migrator'::regrole) t`)).rows[0].state;}

    stage='scoped hardening and migrations';
    const cli=path.resolve('node_modules/prisma/build/index.js');const evidence=[];
    for(const [purpose,target] of Object.entries(targets)) {
      const op=await connect(target);
      await op.query('CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE SCHEMA extensions; CREATE TABLE auth.platform_sentinel(id integer PRIMARY KEY); INSERT INTO auth.platform_sentinel VALUES(17); CREATE FUNCTION extensions.platform_probe() RETURNS integer LANGUAGE sql AS $$SELECT 17$$; GRANT USAGE ON SCHEMA auth,storage,extensions TO anon,authenticated,service_role; GRANT SELECT ON auth.platform_sentinel TO anon,authenticated,service_role');
      await op.query('ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon,authenticated,service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon,authenticated,service_role; ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon,authenticated,service_role');
      const providerBefore=await providerState(op);
      await phase(op,target,'01-roles.sql');await phase(op,target,'01-roles.sql');
      if(purpose==='runtime')await op.query(`CREATE SCHEMA ${qi(compatSchema)}; GRANT USAGE,CREATE ON SCHEMA ${qi(compatSchema)} TO recon_migrator`);
      if(purpose==='candidate')for(const role of ['recon_migrator','recon_runtime'])await op.query(`ALTER ROLE ${role} LOGIN PASSWORD '${passwords[role]}'`);
      const migTarget=roleTarget(target,'recon_migrator'),mig=await connect(migTarget);
      await phase(mig,migTarget,'02-creator-defaults.sql');await phase(mig,migTarget,'02-creator-defaults.sql');
      await command(purpose+'-migrate',[cli,'migrate','deploy'],migTarget,{},true);
      await command(purpose+'-status',[cli,'migrate','status'],migTarget,{},true);
      const history=(await mig.query('SELECT migration_name,checksum,finished_at IS NOT NULL AS finished,rolled_back_at IS NOT NULL AS rolled_back FROM "_prisma_migrations" ORDER BY migration_name')).rows;
      assert.deepEqual(history.map(r=>r.migration_name),migrationNames);for(const row of history){assert.ok(row.finished&&!row.rolled_back);assert.equal(row.checksum,sha256(fs.readFileSync(`prisma/migrations/${row.migration_name}/migration.sql`)));}
      await phase(mig,migTarget,'03-runtime-grants.sql');const grantState=await applicationGrantState(mig);
      await phase(mig,migTarget,'03-runtime-grants.sql');assert.equal(await applicationGrantState(mig),grantState);
      await command(purpose+'-migrate-repeat',[cli,'migrate','deploy'],migTarget,{},true);
      const diff=await command(purpose+'-schema-diff',[cli,'migrate','diff','--from-config-datasource','--to-schema','prisma/schema.prisma','--script'],migTarget,{},true);
      assert.ok(diff.includes('This is an empty migration.'));
      const providerAfter=await providerState(op);assert.equal(providerAfter,providerBefore);
      evidence.push({purpose,migrations:history.length,checksumsMatch:true,repeatPhasesPassed:true,grantRetryUnchanged:true,prismaDiff:'EMPTY',providerStateUnchanged:true});
      if(purpose==='candidate') {
        await mig.query('BEGIN READ ONLY');const empty=await publicData(mig);await mig.query('ROLLBACK');
        const invalid=structuredClone(candidates),row=JSON.parse(invalid.Media.at(-1));row.size=2147483648;invalid.Media[invalid.Media.length-1]=JSON.stringify(row);
        await assert.rejects(importCandidates(mig,migTarget,invalid),error=>error.code==='22003');
        await mig.query('BEGIN READ ONLY');assert.deepEqual(await publicData(mig),empty);await mig.query('ROLLBACK');
        assert.deepEqual(await importCandidates(mig,migTarget,candidates),{inserted:31,skipped:0});assert.deepEqual(await importCandidates(mig,migTarget,candidates),{inserted:0,skipped:31});
        const conflicting=structuredClone(candidates),changed=JSON.parse(conflicting.SiteSetting[0]);changed.value='LAUNCH-05D conflict';conflicting.SiteSetting[0]=JSON.stringify(changed);
        await assert.rejects(importCandidates(mig,migTarget,conflicting),error=>error.code==='CANDIDATE_CONFLICT');
        const rt=await connect(roleTarget(target,'recon_runtime'));
        assert.equal((await rt.query('SELECT count(*)::int AS count FROM "SiteSetting"')).rows[0].count,27);
        const copiedHash=(await rt.query('SELECT "passwordHash" FROM "AdminUser"')).rows[0].passwordHash;assert.equal(copiedHash,JSON.parse(candidates.AdminUser[0]).passwordHash);
        assert.equal((await rt.query('SELECT count(*)::int AS count FROM "Media"')).rows[0].count,3);
        evidence.at(-1).candidateImport={rows:31,exactRetryNoOp:true,atomicRollback:true,conflictRejected:true,passwordHashPreserved:true};
      }
      await mig.end();await op.end();
    }
    console.log('Both PostgreSQL 17 targets migrated with restricted ownership; repeated hardening and candidate import passed.');

    stage='runtime permission and employee tests';
    const testTarget=roleTarget(targets.runtime,'recon_migrator'),runtimeTarget=roleTarget(targets.runtime,'recon_runtime');
    const syntheticPassword=randomBytes(24).toString('hex'),syntheticEmail='launch05d-login@example.invalid',authSecret=randomBytes(32).toString('hex');
    const seed=await connect(testTarget);await seed.query('INSERT INTO "AdminUser" (id,name,email,"passwordHash",role,"updatedAt") VALUES ($1,$2,$3,$4,$5,now())',['launch05d-http-admin','Synthetic launch rehearsal',syntheticEmail,await bcrypt.hash(syntheticPassword,10),'SUPER_ADMIN']);await seed.end();
    const testEnv={EID02B_DATABASE:testTarget.database,EID02B_MARKER:testTarget.marker,EID02B_RUNTIME_URL:nodeUrl(runtimeTarget),EID02B_COMPAT_SCHEMA:compatSchema,RECON_TEST_PREPROVISIONED_GRANTS:'LAUNCH-05D',LAUNCH05D_ACTIVE:'1',LAUNCH05D_CA:certificate,LAUNCH05D_API_URL:nodeUrl(roleTarget(targets.runtime,'authenticator')),AUTH_SECRET:authSecret,ADMIN_EMAIL:syntheticEmail,ADMIN_PASSWORD:syntheticPassword};
    const args=['--import','tsx','--experimental-vm-modules','--test','--test-concurrency=1'];
    const runtimeTests=await command('runtime-tests',[...args,'tests/deployment/launch05dRuntime.test.mjs'],testTarget,testEnv);
    const employeeTests=await command('employee-tests',[...args,...fs.readdirSync('tests/employees').filter(f=>f.endsWith('.test.mjs')).sort().map(f=>'tests/employees/'+f)],testTarget,testEnv);
    console.log('Restricted-role permissions and the existing employee regression suite passed without fixture grants.');

    stage='production build and HTTP authentication';
    const httpPort=await freePort();const base=`http://localhost:${httpPort}`;
    const buildEnv={...testEnv,RECON_ISOLATED_BUILD:'eid03',NODE_ENV:'production',AUTH_URL:base};
    await command('production-build',[path.resolve('scripts/build-next.mjs')],runtimeTarget,buildEnv);
    // Run a local production server only; it uses the restricted runtime URL.
    const serverEnv=Object.fromEntries(Object.entries(process.env).filter(([k])=>!k.startsWith('PG')&&!/^(?:DATABASE_URL|DIRECT_URL|AUTH_|NEXTAUTH_|ADMIN_|CLOUDINARY_|EID02B_|RECON_WORKERS_BUILD|HYPERDRIVE)/.test(k)));
    const log=fs.openSync(path.join(run,'http-server.log'),'a');
    const server=spawn(process.execPath,[path.resolve('node_modules/next/dist/bin/next'),'start','-p',String(httpPort),'-H','127.0.0.1'],{env:{...serverEnv,...buildEnv,DATABASE_URL:nodeUrl(runtimeTarget)},stdio:['ignore',log,log],windowsHide:true});
    try {
      let ready=false;for(let i=0;i<120;i++){if(server.exitCode!==null)throw Error('Local HTTP server exited');try{const response=await fetch(base+'/api/auth/csrf');if(response.ok){ready=true;break;}}catch{}await new Promise(r=>setTimeout(r,250));}assert.ok(ready);
      await command('http-tests',[...args,'tests/deployment/launch05dHttp.test.mjs'],testTarget,{...testEnv,LAUNCH05D_HTTP_BASE:base,AUTH_URL:base});
    }finally{server.kill();await new Promise(resolve=>{if(server.exitCode!==null)resolve();else server.once('exit',resolve);});fs.closeSync(log);}

    stage='preservation';
    await source.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');assert.deepEqual(await fingerprint(source),ownerBefore);await source.query('ROLLBACK');assert.deepEqual(preservedFiles(),filesBefore);
    const count=text=>Number(text.match(/(?:#|ℹ) tests (\d+)/u)?.[1]??0);
    writeReport(run,'result.json',{status:'VERIFIED',postgresVersion:'17.11',verifiedLocalTLS:true,phases:evidence,runtimeTests:count(runtimeTests),employeeTests:count(employeeTests),productionBuild:'PASSED_RESTRICTED_RUNTIME',httpAuthentication:'PASSED',ownerDatabaseUnchanged:true,filesUploadsEnvMigrationsBackupsUnchanged:true,productionConnections:0,
      limitations:'Stock PostgreSQL simulates roles/defaults/provider sentinels. Supabase event triggers/control plane and actual Hyperdrive remain separately verified production gates.',privateRun:run});
    console.log(JSON.stringify({status:'VERIFIED',report:path.join(run,'result.json'),runtimeTests:count(runtimeTests),employeeTests:count(employeeTests),productionWrites:0}));
  }catch(error){writeReport(run,'failure.json',{status:'FAILED',stage,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',location:error.stack?.split('\n').find(x=>x.trim().startsWith('at '))});console.error(JSON.stringify({status:'FAILED',stage,privateRun:run}));process.exitCode=1;}
  finally {
    for(const client of clients)await client.end().catch(()=>{});await source?.end().catch(()=>{});await bootstrap?.end().catch(()=>{});
    if(started){const pid=fs.readFileSync(path.join(cluster,'postmaster.pid'),'utf8').split(/\r?\n/);assert.equal(path.resolve(pid[1]),cluster);assert.equal(Number(pid[3]),port);await control(path.join(bin,'pg_ctl.exe'),['-D',cluster,'-m','fast','-w','-t','60','stop']);console.log('Stopped only the isolated TLS rehearsal server; evidence and existing backups retained.');}
  }
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(()=>{console.error('Rehearsal stopped safely; sensitive details suppressed.');process.exitCode=1;});
