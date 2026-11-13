import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {spawn,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomBytes} from 'node:crypto';
import {createServer} from 'node:net';
import nextEnv from '@next/env';
import pg from 'pg';
import {privateRun,sha256,writeReport,fingerprint} from './launch05a-common.mjs';

const execute=promisify(execFile);
const require=createRequire(import.meta.url);
function pgEnvironment(target,readOnly=false){
  const inherited=Object.fromEntries(Object.entries(process.env).filter(([key])=>!key.startsWith('PG')));
  return {...inherited,PGHOST:'127.0.0.1',PGPORT:String(target.port),PGDATABASE:target.database,PGUSER:target.user,PGPASSWORD:target.password,PGSSLMODE:'disable',
    ...(readOnly?{PGOPTIONS:'-c default_transaction_read_only=on'}:{})};
}
async function control(binary,args){
  await new Promise((resolve,reject)=>{const child=spawn(binary,args,{stdio:'ignore',windowsHide:true});child.once('error',reject);child.once('exit',code=>code===0?resolve():reject(Error('Disposable PostgreSQL control failed.')));});
}
function fileState(){
  const files=[];
  function scan(dir){for(const item of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory())scan(file);else files.push({file,sha256:sha256(fs.readFileSync(file))});}}
  scan('public/uploads');
  return {environment:sha256(fs.readFileSync('.env')),uploads:files};
}
async function main(){
  nextEnv.loadEnvConfig(process.cwd(),true,{info(){},error(){}});
  const url=new URL(process.env.DATABASE_URL);
  if(url.protocol!=='postgresql:'||!['127.0.0.1','localhost'].includes(url.hostname)||url.port!=='54329'||url.pathname!=='/recon_local')throw Error('Unexpected source. No backup connection attempted.');
  const owner={host:'127.0.0.1',port:54329,database:'recon_local',user:decodeURIComponent(url.username),password:decodeURIComponent(url.password)};
  const tools=path.join(process.env.LOCALAPPDATA,'ReconImports/PostgreSQL-client-18.7/bin');
  const dump=path.join(tools,'pg_dump.exe'),restore=path.join(tools,'pg_restore.exe');
  for(const tool of [dump,restore]){const version=await execute(tool,['--version'],{windowsHide:true});if(!/18\.7/.test(version.stdout))throw Error('Unverified PostgreSQL client version.');}
  const run=privateRun('backup');
  const archive=path.join(run,'recon_local.custom.dump');
  const originalFiles=fileState();
  const source=new pg.Client({...owner,connectionTimeoutMillis:2000,options:'-c default_transaction_read_only=on -c statement_timeout=10000'});
  let started=false,cluster,bin,target,sourceSnapshot;
  try{
    await source.connect();await source.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
    const identity=(await source.query("SELECT current_database() AS database,inet_server_port() AS port,current_setting('server_version') AS version,current_setting('data_directory') AS directory,current_setting('transaction_read_only') AS read_only")).rows[0];
    if(identity.database!=='recon_local'||identity.port!==54329||identity.read_only!=='on'||fs.realpathSync(identity.directory).toLowerCase()!==fs.realpathSync('.local/postgres').toLowerCase()||!identity.version.startsWith('18.'))throw Error('Source identity/read-only check failed.');
    const snapshot=(await source.query('SELECT pg_export_snapshot() AS snapshot')).rows[0].snapshot;
    sourceSnapshot=await fingerprint(source);
    const migrationNames=fs.readdirSync('prisma/migrations',{withFileTypes:true}).filter(entry=>entry.isDirectory()).map(entry=>entry.name).sort();
    for(const migration of sourceSnapshot.migrations){
      const file=path.join('prisma/migrations',migration.migration_name,'migration.sql');
      if(!migration.finished||migration.rolled_back||!fs.existsSync(file)||sha256(fs.readFileSync(file))!==migration.checksum)throw Error('Source migration history differs from reviewed source files.');
    }
    const pendingMigrations=migrationNames.filter(name=>!sourceSnapshot.migrations.some(row=>row.migration_name===name));
    writeReport(run,'source-fingerprints.json',sourceSnapshot);
    console.log('Verified owner database read-only; taking a full custom-format backup from the same exported snapshot.');
    const dumped=await execute(dump,['--format=custom',`--snapshot=${snapshot}`,`--file=${archive}`],{env:pgEnvironment(owner,true),windowsHide:true,maxBuffer:4*1024*1024});
    fs.writeFileSync(path.join(run,'pg-dump.log'),dumped.stderr);
    await source.query('ROLLBACK');
    const list=await execute(restore,['--list',archive],{windowsHide:true,maxBuffer:4*1024*1024});
    fs.writeFileSync(path.join(run,'archive-list.txt'),list.stdout);
    const size=fs.statSync(archive).size,checksum=sha256(fs.readFileSync(archive));
    if(!size||!list.stdout.includes('TABLE DATA'))throw Error('Archive is empty or unreadable.');
    const socket=createServer();await new Promise(resolve=>socket.listen(0,'127.0.0.1',resolve));const port=socket.address().port;await new Promise(resolve=>socket.close(resolve));
    if(port===54329)throw Error('Disposable port overlaps owner server.');
    target={host:'127.0.0.1',port,database:`launch05a_restore_${randomBytes(6).toString('hex')}`,user:'launch05a_verify',password:randomBytes(32).toString('hex')};
    cluster=path.join(run,'restore-cluster');
    if(fs.existsSync(cluster))throw Error('Refusing existing restore cluster.');
    bin=path.resolve(path.dirname(require.resolve('@embedded-postgres/windows-x64')),'../native/bin');
    const passwordFile=path.join(run,'disposable-init.secret');
    fs.writeFileSync(passwordFile,target.password,{flag:'wx'});
    const initialized=await execute(path.join(bin,'initdb.exe'),['-D',cluster,'-U',target.user,'--auth=scram-sha-256',`--pwfile=${passwordFile}`,'--encoding=UTF8'],{windowsHide:true,maxBuffer:4*1024*1024});
    fs.writeFileSync(path.join(run,'initdb.log'),initialized.stdout+initialized.stderr);
    fs.writeFileSync(path.join(cluster,'pg_hba.conf'),`host postgres ${target.user} 127.0.0.1/32 scram-sha-256\nhost ${target.database} ${target.user} 127.0.0.1/32 scram-sha-256\nhost all all 127.0.0.1/32 reject\n`);
    await control(path.join(bin,'pg_ctl.exe'),['-D',cluster,'-l',path.join(run,'restore-server.log'),'-o',`-p ${port} -h 127.0.0.1`,'-w','-t','60','start']);started=true;
    const bootstrap=new pg.Client({...target,database:'postgres'});
    await bootstrap.connect();
    try{
      const location=(await bootstrap.query("SELECT current_setting('data_directory') AS directory,inet_server_port() AS port")).rows[0];
      if(fs.realpathSync(location.directory)!==fs.realpathSync(cluster)||location.port!==target.port)throw Error('Disposable cluster identity mismatch.');
      await bootstrap.query(`CREATE DATABASE "${target.database}" OWNER "${target.user}" TEMPLATE template0 ENCODING 'UTF8'`);
    }finally{await bootstrap.end();}
    const destination=new pg.Client(target);await destination.connect();
    try{
      const empty=(await destination.query("SELECT count(*)::integer AS count FROM pg_tables WHERE schemaname='public'")).rows[0].count;
      if(empty!==0)throw Error('Refusing nonempty restore target.');
    }finally{await destination.end();}
    console.log('Archive readable. Restoring only into a new, separately initialized loopback cluster.');
    const restored=await execute(restore,['--single-transaction','--exit-on-error','--no-owner','--no-privileges',`--dbname=${target.database}`,archive],{env:pgEnvironment(target),windowsHide:true,maxBuffer:4*1024*1024});
    fs.writeFileSync(path.join(run,'pg-restore.log'),restored.stdout+restored.stderr);
    const verify=new pg.Client({...target,options:'-c default_transaction_read_only=on'});await verify.connect();
    let restoredSnapshot;
    try{await verify.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');restoredSnapshot=await fingerprint(verify);await verify.query('ROLLBACK');}finally{await verify.end();}
    writeReport(run,'restored-fingerprints.json',restoredSnapshot);
    if(JSON.stringify(restoredSnapshot)!==JSON.stringify(sourceSnapshot))throw Error('Restore comparison failed; backup retained for review.');
    await source.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
    const after=await fingerprint(source);await source.query('ROLLBACK');
    if(JSON.stringify(after)!==JSON.stringify(sourceSnapshot))throw Error('Source changed concurrently; backup is consistent but preservation requires review.');
    if(JSON.stringify(fileState())!==JSON.stringify(originalFiles))throw Error('Environment or uploads changed during verification.');
    const result={status:'VERIFIED',backup:archive,bytes:size,sha256:checksum,sourceDatabase:'recon_local',sourceVersion:identity.version,clientVersion:'18.7',restoredDatabase:target.database,
      tableCount:sourceSnapshot.data.length,tableRows:sourceSnapshot.data.map(({schema,table,rows})=>({schema,table,rows})),migrationCount:sourceSnapshot.migrations.length,pendingMigrations,
      sameSnapshotDump:true,allTableFingerprintsMatch:true,columnsAndIndexesMatch:true,migrationHistoryMatches:true,originalDatabaseUnchanged:true,environmentAndUploadsUnchanged:true,
      ownerAclNotRestored:'Disposable restore uses no-owner/no-privileges; archive retains original metadata. Cluster-wide roles are not part of a single-database pg_dump.'};
    writeReport(run,'backup-verification.json',result);
    console.log(JSON.stringify(result));
  }catch(error){
    fs.writeFileSync(path.join(run,'failure.txt'),'Backup workflow failed; any archive is retained. Raw exception is deliberately suppressed.');
    console.error(JSON.stringify({status:'BACKUP_CHECK_FAILED',directory:run,errorCode:error.code??'CHECK_FAILED'}));process.exitCode=1;
  }finally{
    await source.end().catch(()=>{});
    if(started){
      const lines=fs.readFileSync(path.join(cluster,'postmaster.pid'),'utf8').split(/\r?\n/);
      if(path.resolve(lines[1])!==path.resolve(cluster)||Number(lines[3])!==target.port)throw Error('Refusing to stop an unverified database process.');
      await control(path.join(bin,'pg_ctl.exe'),['-D',cluster,'-m','fast','-w','-t','60','stop']);
      console.log('Stopped only the disposable verification cluster; backup and restored files retained.');
    }
  }
}
main().catch(()=>{console.error('Backup preflight stopped safely. No credential details logged.');process.exitCode=1;});
