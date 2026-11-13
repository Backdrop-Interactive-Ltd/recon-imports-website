import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import pg from 'pg';
import {validateTarget, inspectDatabase} from './launch05a-supabase-probe.mjs';
import {privateRun, writeReport, sha256} from './launch05a-common.mjs';

const taskRoot=path.resolve('.local/launch05c');
const apiNames=['anon','authenticated','service_role','authenticator'];

// Catalog/privilege metadata only. Never select role passwords, JWT settings,
// function bodies, owner records or API keys. No SET ROLE or DDL probes.
export const securityQueries={
  identity:`SELECT current_database() AS database,current_user AS current_role,session_user AS session_role,
    current_setting('server_version') AS version,current_setting('transaction_read_only') AS read_only,
    current_schema() AS current_schema,current_setting('search_path') AS search_path`,
  roles:`SELECT oid,rolname AS role,rolcanlogin,rolinherit,rolsuper,rolcreatedb,rolcreaterole,rolreplication,rolbypassrls
    FROM pg_roles WHERE rolname=current_user OR rolname=ANY($1) OR rolname NOT LIKE 'pg_%' ORDER BY rolname`,
  memberships:`SELECT parent.rolname AS parent,member.rolname AS member,m.admin_option,m.inherit_option,m.set_option
    FROM pg_auth_members m JOIN pg_roles parent ON parent.oid=m.roleid JOIN pg_roles member ON member.oid=m.member ORDER BY parent.rolname,member.rolname`,
  schemaPrivileges:`SELECT r.rolname AS role,n.nspname AS schema,has_schema_privilege(r.oid,n.oid,'USAGE') AS usage,
    has_schema_privilege(r.oid,n.oid,'CREATE') AS create FROM pg_roles r CROSS JOIN pg_namespace n
    WHERE (r.rolname=current_user OR r.rolname=ANY($1) OR r.rolname LIKE 'recon%') AND n.nspname IN ('public','extensions') ORDER BY r.rolname,n.nspname`,
  schemaAcl:`SELECT n.nspname AS schema,owner.rolname AS owner,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,
    a.privilege_type,a.is_grantable FROM pg_namespace n JOIN pg_roles owner ON owner.oid=n.nspowner
    CROSS JOIN LATERAL aclexplode(coalesce(n.nspacl,acldefault('n',n.nspowner))) a LEFT JOIN pg_roles grantee ON grantee.oid=a.grantee
    WHERE n.nspname IN ('public','extensions') ORDER BY n.nspname,grantee,a.privilege_type`,
  defaults:`SELECT owner.rolname AS creator,CASE WHEN d.defaclnamespace=0 THEN '(global)' ELSE n.nspname END AS schema,
    d.defaclobjtype AS kind,CASE WHEN a.grantee=0 THEN 'PUBLIC' ELSE grantee.rolname END AS grantee,a.privilege_type,a.is_grantable
    FROM pg_default_acl d JOIN pg_roles owner ON owner.oid=d.defaclrole LEFT JOIN pg_namespace n ON n.oid=d.defaclnamespace
    CROSS JOIN LATERAL aclexplode(d.defaclacl) a LEFT JOIN pg_roles grantee ON grantee.oid=a.grantee
    WHERE d.defaclnamespace=0 OR n.nspname='public' ORDER BY creator,schema,kind,grantee,a.privilege_type`,
  forecast:`WITH creator AS (SELECT oid,rolname FROM pg_roles WHERE rolname=current_user),kinds(kind) AS (VALUES ('r'::"char"),('S'::"char"),('f'::"char"),('T'::"char")),
    grants AS (SELECT c.rolname AS creator,k.kind,a.grantee,a.privilege_type FROM creator c CROSS JOIN kinds k
      CROSS JOIN LATERAL aclexplode(coalesce((SELECT d.defaclacl FROM pg_default_acl d WHERE d.defaclrole=c.oid AND d.defaclnamespace=0 AND d.defaclobjtype=k.kind),acldefault(k.kind,c.oid))) a
      UNION SELECT c.rolname,d.defaclobjtype,a.grantee,a.privilege_type FROM creator c JOIN pg_default_acl d ON d.defaclrole=c.oid
      CROSS JOIN LATERAL aclexplode(d.defaclacl) a WHERE d.defaclnamespace='public'::regnamespace)
    SELECT DISTINCT g.creator,r.rolname AS role,g.kind,g.privilege_type FROM grants g CROSS JOIN pg_roles r
    WHERE r.rolname=ANY($1) AND CASE WHEN g.grantee=0 THEN true ELSE pg_has_role(r.oid,g.grantee,'USAGE') END ORDER BY role,kind,privilege_type`,
  apiSettings:`SELECT coalesce(r.rolname,'(all roles)') AS role,CASE WHEN s.setdatabase=0 THEN '(all databases)' ELSE '(current database)' END AS scope,
    split_part(setting,'=',1) AS name,substring(setting FROM position('=' IN setting)+1) AS value
    FROM pg_db_role_setting s LEFT JOIN pg_roles r ON r.oid=s.setrole CROSS JOIN LATERAL unnest(s.setconfig) setting
    WHERE (s.setdatabase=0 OR s.setdatabase=(SELECT oid FROM pg_database WHERE datname=current_database()))
    AND split_part(setting,'=',1) IN ('pgrst.db_schemas','pgrst.db_extra_search_path') ORDER BY role,name`,
  objects:`SELECT 'relation' AS kind,c.relname AS name,c.relkind::text AS subtype,
    EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e') AS extension_owned
    FROM pg_class c WHERE c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','v','m','S','f')
    UNION ALL SELECT 'function',p.proname,'function',EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')
    FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
    UNION ALL SELECT 'type',t.typname,t.typtype::text,EXISTS(SELECT 1 FROM pg_depend d WHERE d.classid='pg_type'::regclass AND d.objid=t.oid AND d.deptype='e')
    FROM pg_type t WHERE t.typnamespace='public'::regnamespace AND t.typrelid=0 AND t.typelem=0 ORDER BY kind,name`,
  tablePrivileges:`SELECT r.rolname AS role,c.relname AS table,c.relrowsecurity AS rls,c.relforcerowsecurity AS force_rls,p.privilege,
    has_table_privilege(r.oid,c.oid,p.privilege) AS allowed FROM pg_roles r CROSS JOIN pg_class c
    CROSS JOIN unnest(ARRAY['SELECT','INSERT','UPDATE','DELETE','TRUNCATE','REFERENCES','TRIGGER']) p(privilege)
    WHERE r.rolname=ANY($1) AND c.relnamespace='public'::regnamespace AND c.relkind IN ('r','p','v','m') ORDER BY role,c.relname,p.privilege`,
  policies:`SELECT c.relname AS table,p.polname AS policy,p.polcmd AS command,p.polpermissive AS permissive,
    ARRAY(SELECT CASE WHEN x=0 THEN 'PUBLIC' ELSE pg_get_userbyid(x) END FROM unnest(p.polroles) x) AS roles
    FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid WHERE c.relnamespace='public'::regnamespace ORDER BY c.relname,p.polname`,
  functions:`SELECT p.proname AS name,p.prosecdef AS security_definer,pg_get_userbyid(p.proowner) AS owner,
    EXISTS(SELECT 1 FROM unnest(p.proconfig) setting WHERE setting LIKE 'search_path=%') AS fixed_search_path
    FROM pg_proc p WHERE p.pronamespace='public'::regnamespace ORDER BY p.proname`,
  eventTriggers:`SELECT e.evtname AS name,e.evtevent AS event,e.evtenabled AS enabled,n.nspname AS function_schema,p.proname AS function
    FROM pg_event_trigger e JOIN pg_proc p ON p.oid=e.evtfoid JOIN pg_namespace n ON n.oid=p.pronamespace ORDER BY e.evtname`,
  extensions:`SELECT e.extname AS name,e.extversion AS version,n.nspname AS schema FROM pg_extension e JOIN pg_namespace n ON n.oid=e.extnamespace ORDER BY e.extname`,
};

export async function collectSecurity(db) {
  const result={};
  for(const [name,sql] of Object.entries(securityQueries)) {
    const params=['roles','schemaPrivileges','forecast','tablePrivileges'].includes(name)?[apiNames]:[];
    result[name]=(await db.query(sql,params)).rows;
  }
  return result;
}

export function assessSecurity(baseline, security, {dataApiDisabledByOwner=false} = {}) {
  const blockers=[];
  const actor=security.roles.find(role=>role.role===security.identity[0]?.current_role);
  const actorCanCreate=security.schemaPrivileges.some(row=>row.role===actor?.role&&row.create);
  if(baseline.migrationReadiness!=='PRECHECKS_PASS_EXECUTION_NOT_AUTHORIZED') blockers.push('TARGET_BASELINE_REQUIRES_REVIEW');
  if(security.objects.some(object=>!object.extension_owned)) blockers.push('PUBLIC_SCHEMA_HAS_NON_EXTENSION_OBJECTS');
  if(security.schemaPrivileges.some(row=>['anon','authenticated'].includes(row.role)&&row.schema==='public'&&row.create)) blockers.push('API_ROLE_CAN_CREATE_PUBLIC_OBJECTS');
  if(security.forecast.some(row=>['anon','authenticated','service_role'].includes(row.role)&&['r','S'].includes(row.kind))) blockers.push('CREATOR_DEFAULTS_GRANT_FUTURE_APPLICATION_OBJECTS_TO_API_ROLES');
  if(security.forecast.some(row=>['anon','authenticated','service_role'].includes(row.role)&&row.kind==='f'&&row.privilege_type==='EXECUTE')) blockers.push('FUTURE_FUNCTION_EXECUTION_GRANTS_REQUIRE_REVIEW');
  if(security.tablePrivileges.some(row=>['anon','authenticated'].includes(row.role)&&row.allowed)) blockers.push('EXISTING_PUBLIC_TABLE_API_GRANTS_REQUIRE_REVIEW');
  if(dataApiDisabledByOwner!==true) blockers.push('DATA_API_CONTROL_PLANE_STATUS_NOT_VERIFIED');
  blockers.push('DEDICATED_RUNTIME_ROLE_AND_HYPERDRIVE_ORIGIN_NOT_VERIFIED');
  return {productionWritesReady:false,blockers:[...new Set(blockers)],
    migrationCredentialSuitableForRuntime:!!actor&&!actorCanCreate&&![actor.rolsuper,actor.rolcreatedb,actor.rolcreaterole,actor.rolreplication,actor.rolbypassrls].some(Boolean),
    dataApiStatus:dataApiDisabledByOwner===true?'OWNER_CONFIRMED_OFF; platform API not queried':'NOT_VERIFIED: SQL settings are hints; platform settings may override them',
    limitations:'No DDL, role changes, API-key requests, control-plane access, runtime login or production writes were tested.'};
}

async function main() {
  if(process.argv[2]==='--prepare') { console.log(privateRun('security','launch05c')); return; }
  const directory=path.resolve(process.argv[2]??'');
  if(!directory.startsWith(taskRoot+path.sep)||!fs.existsSync(directory)||fs.realpathSync(directory)!==directory) throw Error('Unexpected private report directory.');
  let input,config,db,result,raw='',stage='private input';
  const observed={};
  try {
    for await(const chunk of process.stdin) { raw+=chunk; if(raw.length>16384)throw Error('Input limit exceeded.'); }
    input=JSON.parse(raw); raw=''; stage='target fields and CA validation';
    observed.inputChecks={hostnameFormat:/^[a-z0-9-]+\.pooler\.supabase\.com$/i.test(input.host??''),projectFormat:/^[a-z0-9]{20}$/.test(input.project??''),
      usernameProjectMatch:typeof input.user==='string'&&/^[a-zA-Z0-9_-]+\.[a-z0-9]{20}$/.test(input.user)&&input.user.endsWith('.'+input.project),
      databaseAndPort:input.database==='postgres'&&input.port===5432,passwordProvided:typeof input.password==='string'&&input.password.length>0};
    config=validateTarget(input); config.application_name='recon-launch05c-readonly';
    stage='TLS connection';
    db=new pg.Client(config); await db.connect();
    observed.transport={encrypted:db.connection.stream.encrypted===true,authorized:db.connection.stream.authorized===true};
    if(db.connection.stream.encrypted!==true||db.connection.stream.authorized!==true) throw Error('Verified TLS required.');
    stage='read-only target identity';
    await db.query('BEGIN READ ONLY ISOLATION LEVEL REPEATABLE READ');
    const identity=(await db.query(securityQueries.identity)).rows[0];
    observed.identity=identity;
    if(identity.database!=='postgres'||identity.read_only!=='on'||identity.current_role!==input.user.slice(0,input.user.lastIndexOf('.'))) throw Error('Target identity mismatch.');
    stage='baseline catalogs';
    const baseline=await inspectDatabase(db);
    stage='security catalogs';
    const security=await collectSecurity(db);
    result={status:'READ_ONLY_PREFLIGHT_COMPLETE',checkedAt:new Date().toISOString(),tlsCertificateVerified:true,tlsProtocol:db.connection.stream.getProtocol(),
      ownerSuppliedProjectAndRoleMatched:true,targetFingerprint:sha256([input.host,input.project,input.user,input.database].join('|')),
      baseline,security,assessment:assessSecurity(baseline,security),databaseWrites:0,credentialsPersisted:false};
    stage='finish read-only transaction'; await db.query('ROLLBACK');
  } catch(error) {
    result={status:'PREFLIGHT_CHECK_FAILED',stage,...observed,errorCode:/^[A-Z0-9_]+$/.test(error.code??'')?error.code:'CHECK_FAILED',databaseWrites:0,credentialsLogged:false,
      location:error.stack?.split('\n').find(line=>line.trim().startsWith('at '))};
    process.exitCode=1;
  } finally {
    await db?.end().catch(()=>{}); raw=''; if(input) input.password=''; if(config) config.password='';
  }
  writeReport(directory,'preflight-result.json',result);
  console.log(JSON.stringify({status:result.status,report:path.join(directory,'preflight-result.json'),version:result.baseline?.identity?.version,productionWritesReady:result.assessment?.productionWritesReady}));
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  main().catch(()=>{console.error('Read-only preflight stopped safely. No credential details logged.');process.exitCode=1;});
}
