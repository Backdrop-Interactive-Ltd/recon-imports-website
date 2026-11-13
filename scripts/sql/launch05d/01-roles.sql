-- Run in a caller-owned transaction as the approved provisioning operator.
-- Caller must pin recon.hardening_target to the approved database name.
-- No passwords, LOGIN activation, provider-role/default changes or CASCADE.
DO $$
DECLARE r record; name text;
BEGIN
  IF current_setting('recon.hardening_target', true) IS DISTINCT FROM current_database() THEN
    RAISE EXCEPTION 'Hardening target is not explicitly pinned';
  END IF;
  FOREACH name IN ARRAY ARRAY['recon_migrator','recon_runtime'] LOOP
    IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname=name) THEN
      EXECUTE format('CREATE ROLE %I NOLOGIN NOINHERIT NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS',name);
    END IF;
    SELECT * INTO STRICT r FROM pg_roles WHERE rolname=name;
    IF r.rolsuper OR r.rolcreatedb OR r.rolcreaterole OR r.rolreplication OR r.rolbypassrls OR r.rolinherit
      OR EXISTS(SELECT 1 FROM pg_auth_members WHERE member=r.oid) THEN
      RAISE EXCEPTION 'Existing RECON role has unexpected powers or membership';
    END IF;
    IF name='recon_runtime' AND (
      EXISTS(SELECT 1 FROM pg_class WHERE relowner=r.oid)
      OR EXISTS(SELECT 1 FROM pg_proc WHERE proowner=r.oid)
      OR EXISTS(SELECT 1 FROM pg_namespace WHERE nspowner=r.oid)
      OR EXISTS(SELECT 1 FROM pg_database WHERE datdba=r.oid)) THEN
      RAISE EXCEPTION 'Runtime must not own database objects';
    END IF;
    IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
      CROSS JOIN LATERAL aclexplode(c.relacl) a WHERE a.grantee=r.oid
      AND n.nspname NOT IN ('public','pg_catalog','information_schema') AND n.nspname NOT LIKE 'pg_%') THEN
      RAISE EXCEPTION 'Existing RECON role has unexpected non-application grants';
    END IF;
    EXECUTE format('GRANT CONNECT ON DATABASE %I TO %I',current_database(),name);
  END LOOP;
  IF EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated','service_role','authenticator')
    AND has_schema_privilege(oid,'public','CREATE')) THEN
    RAISE EXCEPTION 'Untrusted public CREATE requires separately reviewed platform hardening';
  END IF;
  EXECUTE format('ALTER ROLE recon_migrator IN DATABASE %I SET search_path TO public,pg_catalog',current_database());
  EXECUTE format('ALTER ROLE recon_runtime IN DATABASE %I SET search_path TO pg_catalog,public',current_database());
END $$;
GRANT USAGE, CREATE ON SCHEMA public TO recon_migrator;
GRANT USAGE ON SCHEMA public TO recon_runtime;
REVOKE CREATE ON SCHEMA public FROM recon_runtime;
DO $$ BEGIN
  IF has_schema_privilege('recon_runtime','public','CREATE')
    OR has_database_privilege('recon_runtime',current_database(),'CREATE') THEN
    RAISE EXCEPTION 'Runtime inherits unexpected permanent DDL rights';
  END IF;
END $$;
