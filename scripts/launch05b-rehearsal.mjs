import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {randomBytes, randomUUID} from 'node:crypto';
import {execFile, execFileSync, spawn} from 'node:child_process';
import {promisify} from 'node:util';
import {createServer} from 'node:net';
import nextEnv from '@next/env';
import pg from 'pg';
import {fingerprint, sha256, quoteIdentifier as qi, writeReport} from './launch05a-common.mjs';

const execute = promisify(execFile);
const root = path.resolve('.');
const privateRoot = path.join(root, '.local/launch05b');
const migrationRoot = path.join(root, 'prisma/migrations');

export function validateDisposable(target) {
  assert.equal(target.host, '127.0.0.1');
  assert.ok(Number.isInteger(target.port) && target.port > 1024 && target.port < 65536 && target.port !== 54329);
  assert.match(target.database, /^(?:launch05b|eid03)_[a-f0-9]{12}$/);
  assert.match(target.marker, target.database.startsWith('eid03_')
    ? /^EID-03 isolated disposable [a-f0-9-]{36}$/
    : /^LAUNCH-05B isolated PostgreSQL 17 [a-f0-9-]{36}$/);
  assert.ok(target.cluster.startsWith(privateRoot + path.sep));
  assert.equal(path.basename(target.cluster), 'postgres');
  assert.equal(target.user, 'launch05b_migrator');
}

async function verifyTarget(db, target) {
  validateDisposable(target);
  const identity = (await db.query(`SELECT current_database() AS database, inet_server_port() AS port,
    current_setting('server_version') AS version, current_user AS role,
    shobj_description(oid,'pg_database') AS marker FROM pg_database WHERE datname=current_database()`)).rows[0];
  assert.equal(identity.database, target.database);
  assert.equal(identity.port, target.port);
  assert.equal(identity.version, '17.11');
  assert.equal(identity.role, target.user);
  assert.equal(identity.marker, target.marker);
  const role = (await db.query('SELECT rolsuper,rolcreatedb,rolcreaterole,rolbypassrls FROM pg_roles WHERE rolname=current_user')).rows[0];
  assert.ok(Object.values(role).every(value => value === false));
}

export async function transferCandidates(db, target, candidates) {
  await verifyTarget(db, target);
  await db.query('BEGIN');
  const result = {inserted: 0, skipped: 0};
  try {
    await db.query("SET LOCAL TIME ZONE 'UTC'");
    await db.query("SELECT pg_advisory_xact_lock(hashtext('recon-launch05b-candidate-transfer'))");
    assert.deepEqual(Object.keys(candidates).sort(), ['AdminUser', 'Media', 'SiteSetting']);
    for (const table of ['AdminUser', 'SiteSetting', 'Media']) {
      const columns = (await db.query("SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position", [table])).rows.map(row => row.column_name);
      assert.ok(columns.includes('id'));
      for (const canonical of candidates[table]) {
        const row = JSON.parse(canonical);
        assert.deepEqual(Object.keys(row).sort(), [...columns].sort());
        const existing = (await db.query(`SELECT to_jsonb(t)::text AS canonical FROM public.${qi(table)} t WHERE id=$1`, [row.id])).rows[0];
        if (existing) {
          if (existing.canonical !== canonical) throw Object.assign(Error('Candidate conflict; no existing row may be overwritten.'), {code:'CANDIDATE_CONFLICT'});
          result.skipped++;
        } else {
          const names = columns.map(qi).join(',');
          await db.query(`INSERT INTO public.${qi(table)} (${names}) SELECT ${names} FROM jsonb_populate_record(NULL::public.${qi(table)},$1::jsonb)`, [canonical]);
          result.inserted++;
        }
      }
      const actual = (await db.query(`SELECT to_jsonb(t)::text AS canonical FROM public.${qi(table)} t ORDER BY id`, [])).rows.map(row => row.canonical);
      assert.deepEqual(actual, candidates[table]);
    }
    await db.query('COMMIT');
    return result;
  } catch (error) {
    await db.query('ROLLBACK');
    throw error;
  }
}

function makePrivateRun() {
  assert.equal(process.platform, 'win32');
  assert.equal(JSON.parse(fs.readFileSync('package.json')).name, 'recon-imports-website');
  const directory = path.join(privateRoot, new Date().toISOString().replace(/\D/g, '') + '-' + randomBytes(4).toString('hex'));
  fs.mkdirSync(privateRoot, {recursive:true});
  fs.mkdirSync(directory);
  assert.equal(fs.realpathSync(directory), directory);
  const sid = execFileSync('whoami.exe', ['/user','/fo','csv','/nh'], {encoding:'utf8',windowsHide:true}).match(/S-1-5-[0-9-]+/)?.[0];
  assert.ok(sid);
  execFileSync('icacls.exe', [directory,'/inheritance:r','/grant:r',`*${sid}:(OI)(CI)F`,'*S-1-5-18:(OI)(CI)F'], {stdio:'pipe',windowsHide:true});
  execFileSync('git', ['check-ignore','--quiet',directory], {stdio:'pipe',windowsHide:true});
  return directory;
}

function preservationFiles() {
  const result = [];
  function scan(directory) {
    for (const entry of fs.readdirSync(directory,{withFileTypes:true}).sort((a,b)=>a.name.localeCompare(b.name))) {
      const file = path.join(directory,entry.name);
      if (entry.isDirectory()) scan(file);
      else result.push({file,sha256:sha256(fs.readFileSync(file))});
    }
  }
  for (const file of fs.readdirSync('.').filter(name=>/^\.env(?:\.|$)/.test(name)).sort()) result.push({file,sha256:sha256(fs.readFileSync(file))});
  scan('public/uploads'); scan('prisma/migrations');
  for (const entry of fs.readdirSync('.local/launch05a',{withFileTypes:true}).filter(entry=>entry.isDirectory())) {
    const report = path.join('.local/launch05a',entry.name,'backup-verification.json');
    if (!fs.existsSync(report)) continue;
    const verified = JSON.parse(fs.readFileSync(report));
    assert.equal(verified.status,'VERIFIED');
    const hash = sha256(fs.readFileSync(verified.backup));
    assert.equal(hash,verified.sha256);
    result.push({file:verified.backup,sha256:hash});
  }
  assert.equal(result.filter(row=>row.file.endsWith('.custom.dump')).length,2);
  return result;
}

async function control(binary,args) {
  await new Promise((resolve,reject)=>{
    const child=spawn(binary,args,{stdio:'ignore',windowsHide:true});
    child.once('error',reject); child.once('exit',code=>code===0?resolve():reject(Error('Disposable server control failed.')));
  });
}

async function main() {
  const run = makePrivateRun();
  let stage='preflight', started=false, source, admin, app;
  const cluster=path.join(run,'postgres');
  const bin=path.join(process.env.LOCALAPPDATA,'ReconImports/PostgreSQL-17.11-rehearsal/pgsql/bin');
  const archive=path.join(path.dirname(path.dirname(bin)),'postgresql-17.11-4-windows-x64-binaries.zip');
  let port;
  try {
    assert.equal(sha256(fs.readFileSync(archive)),'b9424ee7bc60b52450ff910a3630225df32e633f3cb29c1d126d9299d59aea28');
    assert.match((await execute(path.join(bin,'postgres.exe'),['--version'],{windowsHide:true})).stdout,/17\.11/);
    const filesBefore=preservationFiles();
    nextEnv.loadEnvConfig(root,true,{info(){},error(){}});
    const url=new URL(process.env.DATABASE_URL);
    assert.equal(url.protocol,'postgresql:'); assert.equal(url.hostname,'127.0.0.1'); assert.equal(url.port,'54329'); assert.equal(url.pathname,'/recon_local');
    source=new pg.Client({host:'127.0.0.1',port:54329,database:'recon_local',user:decodeURIComponent(url.username),password:decodeURIComponent(url.password),ssl:false,
      connectionTimeoutMillis:3000,options:'-c default_transaction_read_only=on -c statement_timeout=10000'});
    await source.connect(); await source.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
    const identity=(await source.query("SELECT current_database() AS database,current_setting('server_version') AS version,current_setting('data_directory') AS directory,current_setting('transaction_read_only') AS readonly")).rows[0];
    assert.equal(identity.database,'recon_local'); assert.match(identity.version,/^18\./); assert.equal(identity.readonly,'on');
    assert.equal(fs.realpathSync(identity.directory).toLowerCase(),fs.realpathSync('.local/postgres').toLowerCase());
    const original=await fingerprint(source);
    assert.equal(original.data.length,18); assert.equal(original.migrations.length,10);
    const migrations=fs.readdirSync(migrationRoot,{withFileTypes:true}).filter(entry=>entry.isDirectory()&&/^\d/.test(entry.name)).map(entry=>entry.name).sort();
    assert.equal(migrations.length,12);
    for (const row of original.migrations) {
      assert.ok(row.finished&&!row.rolled_back);
      assert.equal(row.checksum,sha256(fs.readFileSync(path.join(migrationRoot,row.migration_name,'migration.sql'))));
    }
    const candidates={};
    for (const table of ['AdminUser','SiteSetting','Media']) candidates[table]=(await source.query(`SELECT to_jsonb(t)::text AS canonical FROM public.${qi(table)} t ORDER BY id`)).rows.map(row=>row.canonical);
    assert.equal(candidates.AdminUser.length,1); assert.equal(candidates.SiteSetting.length,27); assert.equal(candidates.Media.length,4);
    const adminRecord=JSON.parse(candidates.AdminUser[0]);
    assert.equal(adminRecord.role,'SUPER_ADMIN'); assert.equal(adminRecord.isActive,true); assert.match(adminRecord.passwordHash,/^\$2[aby]\$\d{2}\$/);
    const settings=candidates.SiteSetting.map(JSON.parse);
    const used=settings.filter(row=>['websiteLogo','footerLogo','favicon'].includes(row.key));
    assert.equal(used.length,3);
    const references=new Set(used.map(row=>row.value)); assert.equal(references.size,3);
    candidates.Media=candidates.Media.filter(row=>references.has(JSON.parse(row).fileUrl)); assert.equal(candidates.Media.length,3);
    for (const row of used) {
      assert.match(row.value,/^\/uploads\/[a-zA-Z0-9/_.-]+$/);
      const file=fs.realpathSync(path.resolve('public',row.value.slice(1)));
      const relative=path.relative(fs.realpathSync('public/uploads'),file);
      assert.ok(relative&&!relative.startsWith('..')&&!path.isAbsolute(relative));
      assert.ok(candidates.Media.some(media=>JSON.parse(media).fileUrl===row.value));
    }
    await source.query('ROLLBACK');
    writeReport(run,'owner-before.json',original);
    writeReport(run,'candidate-manifest.json',{scope:'local rehearsal only; production publication approval outstanding',tables:Object.fromEntries(Object.entries(candidates).map(([table,rows])=>[table,rows.map(row=>({id:JSON.parse(row).id,sha256:sha256(row)}))])),referencedMedia:3,excludedHistoricalMedia:1});
    console.log('Read-only source verified. Candidate payload stays in memory; private manifest contains IDs and fingerprints only.');

    stage='initialize PostgreSQL 17';
    const socket=createServer(); await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve)); port=socket.address().port; await new Promise(resolve=>socket.close(resolve));
    assert.notEqual(port,54329);
    const password=randomBytes(32).toString('hex'), migrationPassword=randomBytes(32).toString('hex'), runtimePassword=randomBytes(32).toString('hex');
    const passwordFile=path.join(run,'bootstrap.secret'); fs.writeFileSync(passwordFile,password,{flag:'wx'});
    const initialized=await execute(path.join(bin,'initdb.exe'),['-D',cluster,'-U','launch05b_bootstrap','--auth=scram-sha-256',`--pwfile=${passwordFile}`,'--encoding=UTF8'],{windowsHide:true,maxBuffer:4*1024*1024});
    fs.writeFileSync(path.join(run,'initdb.log'),initialized.stdout+initialized.stderr);
    const databaseNames={launch05b:`launch05b_${randomBytes(6).toString('hex')}`,eid03:`eid03_${randomBytes(6).toString('hex')}`};
    fs.writeFileSync(path.join(cluster,'pg_hba.conf'),`host all launch05b_bootstrap 127.0.0.1/32 scram-sha-256\nhost ${Object.values(databaseNames).join(',')} launch05b_migrator,eid02b_runtime 127.0.0.1/32 scram-sha-256\nhost all all 127.0.0.1/32 reject\n`);
    await control(path.join(bin,'pg_ctl.exe'),['-D',cluster,'-l',path.join(run,'postgres.log'),'-o',`-p ${port} -h 127.0.0.1`,'-w','-t','60','start']); started=true;
    admin=new pg.Client({host:'127.0.0.1',port,user:'launch05b_bootstrap',password,database:'postgres',ssl:false}); await admin.connect();
    const location=(await admin.query("SELECT current_setting('data_directory') AS directory,current_setting('server_version') AS version")).rows[0];
    assert.equal(fs.realpathSync(location.directory),fs.realpathSync(cluster)); assert.equal(location.version,'17.11');
    await admin.query(`CREATE ROLE launch05b_migrator LOGIN PASSWORD '${migrationPassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    await admin.query(`CREATE ROLE eid02b_runtime LOGIN PASSWORD '${runtimePassword}' NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS`);
    async function newTarget(prefix) {
      assert.ok(Object.hasOwn(databaseNames,prefix));
      const target={host:'127.0.0.1',port,database:databaseNames[prefix],user:'launch05b_migrator',password:migrationPassword,ssl:false,cluster,
        marker:prefix==='eid03'?`EID-03 isolated disposable ${randomUUID()}`:`LAUNCH-05B isolated PostgreSQL 17 ${randomUUID()}`};
      validateDisposable(target);
      await admin.query(`CREATE DATABASE ${qi(target.database)} OWNER launch05b_migrator TEMPLATE template0 ENCODING 'UTF8'`);
      await admin.query(`REVOKE CONNECT ON DATABASE ${qi(target.database)} FROM PUBLIC`);
      await admin.query(`GRANT CONNECT ON DATABASE ${qi(target.database)} TO launch05b_migrator,eid02b_runtime`);
      await admin.query(`COMMENT ON DATABASE ${qi(target.database)} IS '${target.marker}'`);
      await admin.query(`ALTER DATABASE ${qi(target.database)} SET search_path TO "$user", public, extensions`);
      const db=new pg.Client(target); await db.connect();
      await verifyTarget(db,target);
      assert.equal((await db.query("SELECT count(*)::int AS count FROM pg_tables WHERE schemaname='public'")).rows[0].count,0);
      return {target,db};
    }
    async function nodeCommand(label,args,target,extra={}) {
      validateDisposable(target);
      const check=new pg.Client(target); await check.connect(); try{await verifyTarget(check,target);}finally{await check.end();}
      const targetUrl=new URL(`postgresql://127.0.0.1:${port}/${target.database}`); targetUrl.username=target.user; targetUrl.password=target.password;
      if(label==='production-build') targetUrl.searchParams.set('options','-c default_transaction_read_only=on');
      const inherited=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('PG')&&!/^(?:DATABASE_URL|DIRECT_URL|EID02B_|RECON_WORKERS_BUILD|HYPERDRIVE)/.test(key)));
      const env={...inherited,DATABASE_URL:targetUrl.toString(),AUTH_SECRET:randomBytes(32).toString('hex'),...extra};
      let result;
      try { result=await execute(process.execPath,args,{env,windowsHide:true,maxBuffer:16*1024*1024,timeout:300000}); }
      catch(error) { fs.writeFileSync(path.join(run,label+'.log'),String(error.stdout??'')+String(error.stderr??'')); throw Object.assign(Error('Isolated command failed; private log retained.'),{code:`${label.toUpperCase().replaceAll('-','_')}_FAILED`}); }
      fs.writeFileSync(path.join(run,label+'.log'),result.stdout+result.stderr);
      return result.stdout+result.stderr;
    }
    const first=await newTarget('launch05b'); app=first.db; const target=first.target;
    const provider=new pg.Client({...target,user:'launch05b_bootstrap',password}); await provider.connect();
    await provider.query('CREATE SCHEMA extensions; CREATE SCHEMA auth; CREATE SCHEMA storage; CREATE TABLE auth.launch05b_sentinel(id integer PRIMARY KEY); INSERT INTO auth.launch05b_sentinel VALUES (17); GRANT USAGE ON SCHEMA auth,storage,extensions TO launch05b_migrator; GRANT SELECT ON auth.launch05b_sentinel TO launch05b_migrator');
    await provider.end();

    stage='twelve migrations';
    const cli=path.resolve('node_modules/prisma/build/index.js');
    await nodeCommand('migrate-deploy',[cli,'migrate','deploy'],target);
    await nodeCommand('migrate-status',[cli,'migrate','status'],target);
    await app.query('BEGIN READ ONLY'); const migrated=await fingerprint(app); await app.query('ROLLBACK');
    assert.equal(migrated.data.filter(row=>row.schema==='public').length,24);
    assert.deepEqual(migrated.migrations.map(row=>row.migration_name),migrations);
    for(const row of migrated.migrations) { assert.ok(row.finished&&!row.rolled_back); assert.equal(row.checksum,sha256(fs.readFileSync(path.join(migrationRoot,row.migration_name,'migration.sql')))); }
    assert.ok(migrated.data.filter(row=>row.schema==='public'&&row.table!=='_prisma_migrations').every(row=>row.rows==='0'));
    const constraints=(await app.query("SELECT conname,contype,convalidated,pg_get_constraintdef(oid) AS definition FROM pg_constraint WHERE connamespace='public'::regnamespace ORDER BY conname")).rows;
    assert.ok(constraints.every(row=>row.convalidated));
    const triggers=(await app.query("SELECT tgname,tgenabled,pg_get_triggerdef(oid) AS definition FROM pg_trigger WHERE NOT tgisinternal AND tgrelid IN (SELECT oid FROM pg_class WHERE relnamespace='public'::regnamespace) ORDER BY tgname")).rows;
    assert.equal(triggers.length,5); assert.ok(triggers.every(row=>row.tgenabled==='O'));
    const functions=(await app.query("SELECT proname,pg_get_functiondef(oid) AS definition FROM pg_proc WHERE pronamespace='public'::regnamespace ORDER BY proname")).rows;
    assert.equal(functions.length,5);
    for(const name of ['department_name_ci','employee_one_draft','employee_one_live_identity','employee_one_published_scope']) assert.ok(migrated.indexes.some(row=>row.indexname===name));
    assert.equal(migrated.sequences.length,2);
    const sequenceState=(await app.query("SELECT 'legacy' AS name,last_value::text,is_called FROM recon_employee_code_seq UNION ALL SELECT 'official',last_value::text,is_called FROM recon_employee_official_code_seq ORDER BY name")).rows;
    assert.deepEqual(sequenceState,[{name:'legacy',last_value:'1',is_called:false},{name:'official',last_value:'101',is_called:false}]);
    writeReport(run,'schema-evidence.json',{migrations:migrated.migrations,columns:migrated.columns,indexes:migrated.indexes,constraints,triggers,functions,sequenceState});
    await nodeCommand('migrate-deploy-repeat',[cli,'migrate','deploy'],target);
    // Prisma omits unsupported expression/partial indexes and SQL guards. Those
    // are checked separately in catalogs and the existing real employee tests.
    const schemaDiff=await nodeCommand('schema-diff',[cli,'migrate','diff','--from-config-datasource','--to-schema','prisma/schema.prisma','--script'],target);
    const operations=schemaDiff.split(/\r?\n/).map(line=>line.trim()).filter(line=>line&&!line.startsWith('--')&&!line.startsWith('Loaded Prisma config'));
    assert.deepEqual(operations,[]);
    console.log('All twelve immutable migrations applied on PostgreSQL 17.11; schema safeguards and migration checksums verified.');

    stage='candidate transfer';
    const invalid=structuredClone(candidates); const bad=JSON.parse(invalid.Media.at(-1)); bad.size=2147483648; invalid.Media[invalid.Media.length-1]=JSON.stringify(bad);
    await assert.rejects(transferCandidates(app,target,invalid),error=>error.code==='22003');
    await app.query('BEGIN READ ONLY'); assert.deepEqual(await fingerprint(app),migrated); await app.query('ROLLBACK');
    const firstTransfer=await transferCandidates(app,target,candidates); assert.deepEqual(firstTransfer,{inserted:31,skipped:0});
    const repeatedTransfer=await transferCandidates(app,target,candidates); assert.deepEqual(repeatedTransfer,{inserted:0,skipped:31});
    const conflict=structuredClone(candidates), changed=JSON.parse(conflict.SiteSetting[0]); changed.value='LAUNCH-05B deliberate conflict'; conflict.SiteSetting[0]=JSON.stringify(changed);
    await assert.rejects(transferCandidates(app,target,conflict),error=>error.code==='CANDIDATE_CONFLICT');
    await app.query('BEGIN READ ONLY'); const transferred=await fingerprint(app); await app.query('ROLLBACK');
    for(const row of transferred.data.filter(row=>row.schema==='public'&&!['AdminUser','SiteSetting','Media','_prisma_migrations'].includes(row.table))) assert.equal(row.rows,'0');
    for(const table of ['AdminUser','SiteSetting','Media']) assert.equal(transferred.data.find(row=>row.schema==='public'&&row.table===table).rows,String(candidates[table].length));
    assert.deepEqual(transferred.migrations,migrated.migrations);
    assert.deepEqual((await app.query("SELECT last_value::text,is_called FROM recon_employee_official_code_seq")).rows,[{last_value:'101',is_called:false}]);
    const providerCheck=new pg.Client({...target,user:'launch05b_bootstrap',password}); await providerCheck.connect();
    assert.deepEqual((await providerCheck.query('SELECT id FROM auth.launch05b_sentinel')).rows,[{id:17}]); await providerCheck.end();
    const hashPreserved=JSON.parse((await app.query('SELECT to_jsonb(t)::text AS canonical FROM "AdminUser" t')).rows[0].canonical).passwordHash===adminRecord.passwordHash;
    assert.ok(hashPreserved);
    console.log('31 candidate rows preserved exactly. Repeat import is a no-op; conflict rejection and atomic rollback passed.');

    stage='employee PostgreSQL 17 regression';
    const second=await newTarget('eid03'); const testTarget=second.target;
    await second.db.end();
    await nodeCommand('employee-migrate',[cli,'migrate','deploy'],testTarget);
    const runtimeUrl=new URL(`postgresql://127.0.0.1:${port}/${testTarget.database}`); runtimeUrl.username='eid02b_runtime'; runtimeUrl.password=runtimePassword;
    const testFiles=fs.readdirSync('tests/employees').filter(file=>file.endsWith('.test.mjs')).sort().map(file=>'tests/employees/'+file);
    const employeeOutput=await nodeCommand('employee-tests',['--import','tsx','--experimental-vm-modules','--test','--test-concurrency=1',...testFiles],testTarget,
      {EID02B_DATABASE:testTarget.database,EID02B_MARKER:testTarget.marker,EID02B_RUNTIME_URL:runtimeUrl.toString()});
    console.log('Existing employee regression suite passed on a separate synthetic PostgreSQL 17 database.');

    stage='production build';
    await nodeCommand('production-build',[path.resolve('scripts/build-next.mjs')],target,{RECON_ISOLATED_BUILD:'eid03',NODE_ENV:'production'});
    console.log('Standard production build passed against the isolated PostgreSQL 17 database with read-only connection defaults.');

    stage='preservation';
    await source.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ'); assert.deepEqual(await fingerprint(source),original); await source.query('ROLLBACK');
    assert.deepEqual(preservationFiles(),filesBefore);
    writeReport(run,'result.json',{status:'VERIFIED',version:location.version,sourceVersion:identity.version,migrations:migrations.map(name=>({name,status:'APPLIED_CHECKSUM_MATCH'})),
      publicTables:24,applicationTables:23,constraints:constraints.length,foreignKeys:constraints.filter(row=>row.contype==='f').length,indexes:migrated.indexes.length,triggers:5,functions:5,sequences:2,
      prismaDiff:'EMPTY; SQL-only indexes/guards verified separately',migrationRetry:'NO_OP',firstTransfer,repeatedTransfer,atomicRollback:true,conflictRejected:true,passwordHashPreserved:hashPreserved,
      settingsPreserved:27,referencedMediaPreserved:3,historicalMediaExcluded:1,mediaUrls:'Local URLs preserved for rehearsal; production Cloudinary mapping outstanding',otherApplicationTablesEmpty:true,
      employeeTests:employeeOutput.match(/# tests (\d+)/)?.[1]??'passed; see private log',productionBuild:'PASSED_ISOLATED_READONLY',sourceUnchanged:true,envUploadsMigrationsAndBackupsUnchanged:true,supabaseConnections:0,
      limitations:'Local stock PostgreSQL 17.11; actual Supabase managed roles/default grants/TLS/pooler/Hyperdrive and production data approval remain separate gates.',privateRun:run});
    console.log(JSON.stringify({status:'VERIFIED',report:path.join(run,'result.json'),version:location.version,applicationTables:23,candidateRows:31}));
  } catch(error) {
    writeReport(run,'failure.json',{status:'FAILED',stage,code:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',
      location:error.stack?.split('\n').find(line=>line.trim().startsWith('at '))});
    console.error(JSON.stringify({status:'FAILED',stage,privateRun:run})); process.exitCode=1;
  } finally {
    await app?.end().catch(()=>{}); await admin?.end().catch(()=>{}); await source?.end().catch(()=>{});
    if(started) {
      const pid=fs.readFileSync(path.join(cluster,'postmaster.pid'),'utf8').split(/\r?\n/);
      assert.equal(path.resolve(pid[1]),path.resolve(cluster)); assert.equal(Number(pid[3]),port);
      await control(path.join(bin,'pg_ctl.exe'),['-D',cluster,'-m','fast','-w','-t','60','stop']);
      console.log('Stopped only the isolated PostgreSQL 17 server. Private evidence and original backups retained.');
    }
  }
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(()=>{console.error('Rehearsal stopped safely; no secret details logged.');process.exitCode=1;});
}
