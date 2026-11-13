-- Run as recon_migrator in a pinned transaction after all twelve migrations.
-- Exact RECON allowlist only. Do not replace with ALL TABLES/FUNCTIONS IN SCHEMA.
DO $$
DECLARE name text; obj record;
  tables text[] := ARRAY['AdminUser','Account','Session','User','VerificationToken','Brand','VehicleCategory','Car','CarImage','CarFeature','HeroSlide','SiteSetting','Media','SellCarLead','RequirementLead','AuctionSheetRequest','NewsletterSubscriber','Department','Employee','EmployeePublicProfile','EmployeeVerificationIdentity','EmployeePublicationApproval','EmployeeAuditEvent','_prisma_migrations'];
  guards text[] := ARRAY['recon_employee_guard','recon_employee_profile_guard','recon_employee_identity_guard','recon_employee_approval_guard','recon_employee_audit_guard'];
  enums text[] := ARRAY['AdminRole','VehicleCategoryType','CarBodyType','FuelType','TransmissionType','CarCondition','StockType','CarFeatureType','CarSaleStatus','SiteSettingType','LeadStatus','PaymentStatus','AuctionSheetStatus','EmployeeEmploymentStatus','EmployeeProfileState','EmployeePublicationScope','EmployeeApprovalStatus','EmployeeAuditEventType'];
BEGIN
  IF current_setting('recon.hardening_target', true) IS DISTINCT FROM current_database()
    OR current_user <> 'recon_migrator' THEN RAISE EXCEPTION 'Expected pinned RECON owner'; END IF;
  FOREACH name IN ARRAY tables LOOP
    SELECT c.relowner,c.relrowsecurity,c.relforcerowsecurity INTO STRICT obj FROM pg_class c
      WHERE c.relnamespace='public'::regnamespace AND c.relname=name AND c.relkind='r';
    IF obj.relowner <> current_user::regrole OR obj.relrowsecurity OR obj.relforcerowsecurity THEN
      RAISE EXCEPTION 'Unexpected table ownership or RLS; policy review required';
    END IF;
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM PUBLIC,anon,authenticated,service_role,authenticator,recon_runtime',name);
  END LOOP;
  FOREACH name IN ARRAY ARRAY['recon_employee_code_seq','recon_employee_official_code_seq'] LOOP
    SELECT relowner INTO STRICT obj FROM pg_class WHERE relnamespace='public'::regnamespace AND relname=name AND relkind='S';
    IF obj.relowner <> current_user::regrole THEN RAISE EXCEPTION 'Unexpected sequence owner'; END IF;
    EXECUTE format('REVOKE ALL ON SEQUENCE public.%I FROM PUBLIC,anon,authenticated,service_role,authenticator,recon_runtime',name);
  END LOOP;
  FOREACH name IN ARRAY guards LOOP
    SELECT proowner INTO STRICT obj FROM pg_proc WHERE pronamespace='public'::regnamespace AND proname=name AND pronargs=0;
    IF obj.proowner <> current_user::regrole THEN RAISE EXCEPTION 'Unexpected guard owner'; END IF;
    EXECUTE format('REVOKE ALL ON FUNCTION public.%I() FROM PUBLIC,anon,authenticated,service_role,authenticator,recon_runtime',name);
  END LOOP;
  FOREACH name IN ARRAY enums LOOP
    SELECT t.typname,t.typowner INTO STRICT obj FROM pg_type t WHERE t.typnamespace='public'::regnamespace AND t.typtype='e' AND t.typname=name;
    IF obj.typowner <> current_user::regrole THEN RAISE EXCEPTION 'Unexpected application enum owner'; END IF;
    EXECUTE format('REVOKE ALL ON TYPE public.%I FROM PUBLIC,anon,authenticated,service_role,authenticator,recon_runtime',obj.typname);
    EXECUTE format('GRANT USAGE ON TYPE public.%I TO recon_runtime',obj.typname);
  END LOOP;
END $$;
GRANT SELECT,INSERT,UPDATE,DELETE ON public."AdminUser",public."Brand",public."VehicleCategory",public."Car",public."HeroSlide",public."SellCarLead",public."RequirementLead",public."AuctionSheetRequest",public."NewsletterSubscriber" TO recon_runtime;
GRANT SELECT,INSERT,DELETE ON public."CarImage",public."CarFeature",public."Media" TO recon_runtime;
GRANT SELECT,INSERT,UPDATE ON public."SiteSetting",public."Department",public."Employee",public."EmployeePublicProfile",public."EmployeeVerificationIdentity",public."EmployeePublicationApproval" TO recon_runtime;
GRANT SELECT,INSERT ON public."EmployeeAuditEvent" TO recon_runtime;
GRANT USAGE,SELECT ON SEQUENCE public.recon_employee_official_code_seq TO recon_runtime;
