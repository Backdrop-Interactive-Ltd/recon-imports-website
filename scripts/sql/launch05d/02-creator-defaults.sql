-- Run in a pinned transaction while authenticated as recon_migrator, before DDL.
-- These defaults affect this creator only; postgres/provider defaults stay intact.
DO $$ BEGIN
  IF current_setting('recon.hardening_target', true) IS DISTINCT FROM current_database()
    OR current_user <> 'recon_migrator' THEN
    RAISE EXCEPTION 'Expected the pinned RECON migration creator';
  END IF;
END $$;
-- A schema-only revoke cannot remove global PUBLIC defaults.
ALTER DEFAULT PRIVILEGES REVOKE ALL ON TABLES FROM PUBLIC,anon,authenticated,service_role,authenticator,recon_runtime;
ALTER DEFAULT PRIVILEGES REVOKE ALL ON SEQUENCES FROM PUBLIC,anon,authenticated,service_role,authenticator,recon_runtime;
ALTER DEFAULT PRIVILEGES REVOKE ALL ON FUNCTIONS FROM PUBLIC,anon,authenticated,service_role,authenticator,recon_runtime;
ALTER DEFAULT PRIVILEGES REVOKE ALL ON TYPES FROM PUBLIC,anon,authenticated,service_role,authenticator,recon_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM PUBLIC,anon,authenticated,service_role,authenticator,recon_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM PUBLIC,anon,authenticated,service_role,authenticator,recon_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM PUBLIC,anon,authenticated,service_role,authenticator,recon_runtime;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TYPES FROM PUBLIC,anon,authenticated,service_role,authenticator,recon_runtime;
