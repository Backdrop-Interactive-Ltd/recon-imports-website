-- A new sequence preserves the original ledger and its allocation history.
-- Bootstrap only: no runtime MAX/count allocation and no resetting existing sequences.
CREATE SEQUENCE recon_employee_official_code_seq AS bigint START WITH 101 INCREMENT BY 1 NO CYCLE;
DO $$
DECLARE old_value bigint; old_called boolean; high_water bigint := 100; issued numeric;
BEGIN
  IF EXISTS (SELECT 1 FROM "Employee" WHERE NOT ("employeeCode" ~ '^RCI-[0-9]{4,}$' OR "employeeCode" ~ '^RI-EMP-[1-9][0-9]*$')) THEN
    RAISE EXCEPTION 'Unknown employee code format; explicit compatibility review required';
  END IF;
  SELECT last_value, is_called INTO old_value, old_called FROM recon_employee_code_seq;
  SELECT substring("employeeCode" from '[0-9]+$')::numeric INTO issued FROM "Employee"
    ORDER BY substring("employeeCode" from '[0-9]+$')::numeric DESC LIMIT 1;
  IF issued >= 9223372036854775807 OR (old_called AND old_value >= 9223372036854775807) THEN
    RAISE EXCEPTION 'Employee allocation range exhausted; explicit compatibility review required';
  END IF;
  high_water := greatest(high_water, CASE WHEN old_called THEN old_value ELSE 0 END, coalesce(issued, 0)::bigint);
  IF high_water >= 101 THEN PERFORM setval('recon_employee_official_code_seq', high_water, true); END IF;
END $$;
ALTER TABLE "Employee" ADD COLUMN "reactivationApprovalIds" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Employee" DROP CONSTRAINT employee_valid;
ALTER TABLE "Employee" ADD CONSTRAINT employee_valid CHECK (
  ("employeeCode" ~ '^RCI-[0-9]{4,}$' OR
    CASE WHEN "employeeCode" ~ '^RI-EMP-[1-9][0-9]*$' THEN substring("employeeCode" from '[0-9]+$')::numeric >= 101 ELSE false END)
  AND "version" > 0 AND "revisionCounter" >= 0 AND "publicationEpoch" > 0
  AND ("personalDataErasedAt" IS NULL OR ("archivedAt" IS NOT NULL AND "internalName" IS NULL AND "departmentId" IS NULL)));
-- Frozen approvals may remain private in an older epoch. Publication still requires the current epoch.
-- Code-based profiles no longer need an opaque key; existing key records and guards remain intact.
CREATE OR REPLACE FUNCTION recon_employee_approval_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE e "Employee"; p "EmployeePublicProfile"; redaction boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Approval history cannot be deleted'; END IF;
  SELECT * INTO e FROM "Employee" WHERE "id" = NEW."employeeId" FOR SHARE;
  SELECT * INTO p FROM "EmployeePublicProfile" WHERE "employeeId" = NEW."employeeId" AND "revision" = NEW."profileRevision";
  IF TG_OP = 'INSERT' THEN
    IF NEW."status" <> 'PENDING' OR NEW."isPublished" THEN RAISE EXCEPTION 'Approval must begin pending and private'; END IF;
    IF p."state" <> 'SUBMITTED' OR p."erasedAt" IS NOT NULL THEN RAISE EXCEPTION 'Approval requires an exact submitted revision'; END IF;
  ELSE
    IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."employeeId" IS DISTINCT FROM OLD."employeeId"
      OR NEW."profileRevision" IS DISTINCT FROM OLD."profileRevision" OR NEW."scope" IS DISTINCT FROM OLD."scope"
      OR NEW."employmentEpoch" IS DISTINCT FROM OLD."employmentEpoch" OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
      THEN RAISE EXCEPTION 'Approval binding is immutable'; END IF;
    IF pg_trigger_depth() > 1 AND NEW."decidedById" IS NULL AND (to_jsonb(NEW)-'decidedById')=(to_jsonb(OLD)-'decidedById') THEN RETURN NEW; END IF;
    IF OLD."status" = 'WITHDRAWN' AND NEW."status" <> 'WITHDRAWN' THEN RAISE EXCEPTION 'Approval withdrawal is terminal'; END IF;
    IF OLD."status" <> 'PENDING' AND NEW."status" NOT IN (OLD."status", 'WITHDRAWN') THEN RAISE EXCEPTION 'Invalid approval transition'; END IF;
    redaction := e."personalDataErasedAt" IS NOT NULL AND NEW."evidenceErasedAt" IS NOT NULL AND NEW."status" = 'WITHDRAWN';
    IF NOT redaction AND ROW(NEW."consentReference",NEW."consentPolicyVersion",NEW."consentRecordedAt",NEW."consentExpiresAt",NEW."publishPortrait",NEW."publishPhone",NEW."publishEmail",NEW."evidenceErasedAt")
      IS DISTINCT FROM ROW(OLD."consentReference",OLD."consentPolicyVersion",OLD."consentRecordedAt",OLD."consentExpiresAt",OLD."publishPortrait",OLD."publishPhone",OLD."publishEmail",OLD."evidenceErasedAt")
      THEN RAISE EXCEPTION 'Consent and field approval snapshots are immutable'; END IF;
    IF OLD."status" <> 'PENDING' AND ROW(NEW."decidedAt",NEW."decidedById",NEW."decidedBySnapshot",NEW."selfApproved")
      IS DISTINCT FROM ROW(OLD."decidedAt",OLD."decidedById",OLD."decidedBySnapshot",OLD."selfApproved") THEN RAISE EXCEPTION 'Approval decision is immutable'; END IF;
    IF OLD."withdrawnAt" IS NOT NULL AND NEW."withdrawnAt" IS DISTINCT FROM OLD."withdrawnAt" THEN RAISE EXCEPTION 'Withdrawal timestamp is immutable'; END IF;
  END IF;
  IF NEW."status" = 'APPROVED' AND (p."state" <> 'SUBMITTED' OR p."erasedAt" IS NOT NULL OR e."personalDataErasedAt" IS NOT NULL OR (e."publicationEpoch" <> NEW."employmentEpoch" AND (NEW."isPublished" OR OLD."status" = 'PENDING')))
    THEN RAISE EXCEPTION 'Approval references an ineligible or stale revision'; END IF;
  IF NEW."isPublished" THEN
    IF e."employmentStatus" <> 'ACTIVE' OR e."archivedAt" IS NOT NULL OR e."personalDataErasedAt" IS NOT NULL
      OR e."publicationEpoch" <> NEW."employmentEpoch" OR NEW."consentRecordedAt" > CURRENT_TIMESTAMP
      OR (NEW."consentExpiresAt" IS NOT NULL AND NEW."consentExpiresAt" <= CURRENT_TIMESTAMP)
      THEN RAISE EXCEPTION 'Publication is not currently eligible'; END IF;
  END IF;
  RETURN NEW;
END $$;
