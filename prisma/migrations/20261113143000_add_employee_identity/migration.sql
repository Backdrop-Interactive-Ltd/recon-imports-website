-- CreateEnum
CREATE TYPE "EmployeeEmploymentStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'FORMER');

-- CreateEnum
CREATE TYPE "EmployeeProfileState" AS ENUM ('DRAFT', 'SUBMITTED', 'ERASED');

-- CreateEnum
CREATE TYPE "EmployeePublicationScope" AS ENUM ('DIRECTORY', 'VERIFICATION');

-- CreateEnum
CREATE TYPE "EmployeeApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'WITHDRAWN');

-- CreateEnum
CREATE TYPE "EmployeeAuditEventType" AS ENUM ('CREATED', 'DRAFT_SAVED', 'REVISION_SUBMITTED', 'APPROVAL_REQUESTED', 'REVISION_APPROVED', 'REVISION_REJECTED', 'PROFILE_PUBLISHED', 'PROFILE_UNPUBLISHED', 'APPROVAL_WITHDRAWN', 'CONSENT_WITHDRAWN', 'STATUS_CHANGED', 'DEPARTMENT_CHANGED', 'IDENTITY_ISSUED', 'IDENTITY_RETIRED', 'ARCHIVED', 'RESTORED', 'PERSONAL_DATA_ERASED');

-- CreateTable
CREATE TABLE "Department" (
    "id" TEXT NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Employee" (
    "id" TEXT NOT NULL,
    "employeeCode" VARCHAR(32) NOT NULL,
    "internalName" VARCHAR(160),
    "departmentId" TEXT,
    "employmentStatus" "EmployeeEmploymentStatus" NOT NULL DEFAULT 'INACTIVE',
    "statusChangedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMPTZ(3),
    "personalDataErasedAt" TIMESTAMPTZ(3),
    "version" INTEGER NOT NULL DEFAULT 1,
    "revisionCounter" INTEGER NOT NULL DEFAULT 0,
    "publicationEpoch" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Employee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePublicProfile" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "revision" INTEGER NOT NULL,
    "state" "EmployeeProfileState" NOT NULL DEFAULT 'DRAFT',
    "version" INTEGER NOT NULL DEFAULT 1,
    "publicName" VARCHAR(160),
    "designation" VARCHAR(160),
    "biography" VARCHAR(2000),
    "experienceSummary" VARCHAR(500),
    "departmentId" TEXT,
    "departmentName" VARCHAR(120),
    "portraitStorageKey" VARCHAR(300),
    "portraitStorageVersion" VARCHAR(100),
    "officialPhone" VARCHAR(40),
    "officialEmail" VARCHAR(254),
    "displayOrder" INTEGER NOT NULL DEFAULT 0,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "submittedById" TEXT,
    "submittedBySnapshot" VARCHAR(180),
    "submittedAt" TIMESTAMPTZ(3),
    "erasedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EmployeePublicProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeVerificationIdentity" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "publicKey" VARCHAR(32) NOT NULL,
    "issuedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "retiredAt" TIMESTAMPTZ(3),

    CONSTRAINT "EmployeeVerificationIdentity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeePublicationApproval" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "profileRevision" INTEGER NOT NULL,
    "employmentEpoch" INTEGER NOT NULL,
    "scope" "EmployeePublicationScope" NOT NULL,
    "status" "EmployeeApprovalStatus" NOT NULL DEFAULT 'PENDING',
    "isPublished" BOOLEAN NOT NULL DEFAULT false,
    "publishedAt" TIMESTAMPTZ(3),
    "withdrawnAt" TIMESTAMPTZ(3),
    "publishPortrait" BOOLEAN NOT NULL DEFAULT false,
    "publishPhone" BOOLEAN NOT NULL DEFAULT false,
    "publishEmail" BOOLEAN NOT NULL DEFAULT false,
    "consentReference" VARCHAR(200),
    "consentPolicyVersion" VARCHAR(40),
    "consentRecordedAt" TIMESTAMPTZ(3),
    "consentExpiresAt" TIMESTAMPTZ(3),
    "evidenceErasedAt" TIMESTAMPTZ(3),
    "decidedById" TEXT,
    "decidedBySnapshot" VARCHAR(180),
    "decidedAt" TIMESTAMPTZ(3),
    "selfApproved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "EmployeePublicationApproval_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmployeeAuditEvent" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "actorAdminId" TEXT,
    "actorSnapshot" VARCHAR(180) NOT NULL,
    "actorRole" "AdminRole" NOT NULL,
    "eventType" "EmployeeAuditEventType" NOT NULL,
    "profileRevision" INTEGER,
    "recordVersion" INTEGER NOT NULL,
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "summary" VARCHAR(240) NOT NULL,
    "correlationId" VARCHAR(100) NOT NULL,
    "isSelfApproval" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmployeeAuditEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Department_slug_key" ON "Department"("slug");

-- CreateIndex
CREATE INDEX "Department_isActive_displayOrder_id_idx" ON "Department"("isActive", "displayOrder", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Employee_employeeCode_key" ON "Employee"("employeeCode");

-- CreateIndex
CREATE INDEX "Employee_departmentId_employmentStatus_archivedAt_id_idx" ON "Employee"("departmentId", "employmentStatus", "archivedAt", "id");

-- CreateIndex
CREATE INDEX "Employee_employmentStatus_archivedAt_id_idx" ON "Employee"("employmentStatus", "archivedAt", "id");

-- CreateIndex
CREATE INDEX "EmployeePublicProfile_employeeId_state_idx" ON "EmployeePublicProfile"("employeeId", "state");

-- CreateIndex
CREATE INDEX "EmployeePublicProfile_departmentId_displayOrder_id_idx" ON "EmployeePublicProfile"("departmentId", "displayOrder", "id");

-- CreateIndex
CREATE INDEX "EmployeePublicProfile_createdById_idx" ON "EmployeePublicProfile"("createdById");

-- CreateIndex
CREATE INDEX "EmployeePublicProfile_submittedById_idx" ON "EmployeePublicProfile"("submittedById");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeePublicProfile_employeeId_revision_key" ON "EmployeePublicProfile"("employeeId", "revision");

-- CreateIndex
CREATE UNIQUE INDEX "EmployeeVerificationIdentity_publicKey_key" ON "EmployeeVerificationIdentity"("publicKey");

-- CreateIndex
CREATE INDEX "EmployeeVerificationIdentity_employeeId_issuedAt_idx" ON "EmployeeVerificationIdentity"("employeeId", "issuedAt");

-- CreateIndex
CREATE INDEX "EmployeePublicationApproval_employeeId_scope_createdAt_idx" ON "EmployeePublicationApproval"("employeeId", "scope", "createdAt");

-- CreateIndex
CREATE INDEX "EmployeePublicationApproval_scope_status_isPublished_employ_idx" ON "EmployeePublicationApproval"("scope", "status", "isPublished", "employeeId");

-- CreateIndex
CREATE INDEX "EmployeePublicationApproval_consentReference_idx" ON "EmployeePublicationApproval"("consentReference");

-- CreateIndex
CREATE INDEX "EmployeePublicationApproval_decidedById_idx" ON "EmployeePublicationApproval"("decidedById");

-- CreateIndex
CREATE INDEX "EmployeeAuditEvent_employeeId_createdAt_id_idx" ON "EmployeeAuditEvent"("employeeId", "createdAt", "id");

-- CreateIndex
CREATE INDEX "EmployeeAuditEvent_actorAdminId_createdAt_idx" ON "EmployeeAuditEvent"("actorAdminId", "createdAt");

-- AddForeignKey
ALTER TABLE "Employee" ADD CONSTRAINT "Employee_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmployeePublicProfile" ADD CONSTRAINT "EmployeePublicProfile_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmployeePublicProfile" ADD CONSTRAINT "EmployeePublicProfile_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "Department"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmployeePublicProfile" ADD CONSTRAINT "EmployeePublicProfile_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmployeePublicProfile" ADD CONSTRAINT "EmployeePublicProfile_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmployeeVerificationIdentity" ADD CONSTRAINT "EmployeeVerificationIdentity_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmployeePublicationApproval" ADD CONSTRAINT "EmployeePublicationApproval_employeeId_profileRevision_fkey" FOREIGN KEY ("employeeId", "profileRevision") REFERENCES "EmployeePublicProfile"("employeeId", "revision") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmployeePublicationApproval" ADD CONSTRAINT "EmployeePublicationApproval_decidedById_fkey" FOREIGN KEY ("decidedById") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmployeeAuditEvent" ADD CONSTRAINT "EmployeeAuditEvent_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "Employee"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "EmployeeAuditEvent" ADD CONSTRAINT "EmployeeAuditEvent_actorAdminId_fkey" FOREIGN KEY ("actorAdminId") REFERENCES "AdminUser"("id") ON DELETE SET NULL ON UPDATE RESTRICT;

-- Reviewed PostgreSQL safeguards. Only new employee-domain objects are changed.
CREATE SEQUENCE recon_employee_code_seq AS bigint START WITH 1 INCREMENT BY 1 NO CYCLE;
CREATE UNIQUE INDEX department_name_ci ON "Department" (lower(btrim("name")));
CREATE UNIQUE INDEX employee_one_draft ON "EmployeePublicProfile" ("employeeId") WHERE "state" = 'DRAFT';
CREATE UNIQUE INDEX employee_one_live_identity ON "EmployeeVerificationIdentity" ("employeeId") WHERE "retiredAt" IS NULL;
CREATE UNIQUE INDEX employee_one_published_scope ON "EmployeePublicationApproval" ("employeeId", "scope") WHERE "isPublished";

ALTER TABLE "Department" ADD CONSTRAINT department_valid CHECK (
  "version" > 0 AND length(btrim("name")) > 0 AND "slug" ~ '^[a-z0-9]+(-[a-z0-9]+)*$');
ALTER TABLE "Employee" ADD CONSTRAINT employee_valid CHECK (
  "employeeCode" ~ '^RCI-[0-9]{4,}$' AND "version" > 0 AND "revisionCounter" >= 0 AND "publicationEpoch" > 0
  AND ("personalDataErasedAt" IS NULL OR ("archivedAt" IS NOT NULL AND "internalName" IS NULL AND "departmentId" IS NULL)));
ALTER TABLE "EmployeePublicProfile" ADD CONSTRAINT employee_profile_valid CHECK (
  "revision" > 0 AND "version" > 0
  AND ("state" <> 'DRAFT' OR ("submittedAt" IS NULL AND "submittedBySnapshot" IS NULL AND "erasedAt" IS NULL))
  AND ("state" <> 'SUBMITTED' OR ("submittedAt" IS NOT NULL AND "submittedBySnapshot" IS NOT NULL
    AND "erasedAt" IS NULL AND length(btrim(coalesce("publicName",''))) > 0 AND length(btrim(coalesce("designation",''))) > 0))
  AND (("state" = 'ERASED') = ("erasedAt" IS NOT NULL))
  AND ("state" <> 'ERASED' OR ("publicName" IS NULL AND "designation" IS NULL AND "biography" IS NULL
    AND "experienceSummary" IS NULL AND "departmentId" IS NULL AND "departmentName" IS NULL
    AND "portraitStorageKey" IS NULL AND "portraitStorageVersion" IS NULL AND "officialPhone" IS NULL AND "officialEmail" IS NULL
    AND NOT "isFeatured" AND "displayOrder" = 0))
  AND (("portraitStorageKey" IS NULL) = ("portraitStorageVersion" IS NULL)));
ALTER TABLE "EmployeeVerificationIdentity" ADD CONSTRAINT employee_identity_valid CHECK (
  "publicKey" ~ '^[0-9a-f]{32}$' AND ("retiredAt" IS NULL OR "retiredAt" >= "issuedAt"));
ALTER TABLE "EmployeePublicationApproval" ADD CONSTRAINT employee_approval_valid CHECK (
  "profileRevision" > 0 AND "employmentEpoch" > 0
  AND (("status" = 'WITHDRAWN') = ("withdrawnAt" IS NOT NULL))
  AND ("status" NOT IN ('APPROVED','REJECTED') OR ("decidedAt" IS NOT NULL AND "decidedBySnapshot" IS NOT NULL))
  AND ("status" <> 'PENDING' OR ("decidedAt" IS NULL AND "decidedById" IS NULL AND "decidedBySnapshot" IS NULL AND NOT "selfApproved"))
  AND (NOT "isPublished" OR ("status" = 'APPROVED' AND "withdrawnAt" IS NULL AND "decidedAt" IS NOT NULL
    AND "decidedBySnapshot" IS NOT NULL AND "publishedAt" IS NOT NULL AND "evidenceErasedAt" IS NULL))
  AND ("evidenceErasedAt" IS NOT NULL OR (length(btrim(coalesce("consentReference",''))) > 0
    AND length(btrim(coalesce("consentPolicyVersion",''))) > 0 AND "consentRecordedAt" IS NOT NULL))
  AND ("consentExpiresAt" IS NULL OR "consentExpiresAt" > "consentRecordedAt")
  AND ("evidenceErasedAt" IS NULL OR ("status" = 'WITHDRAWN' AND "consentReference" IS NULL
    AND "consentPolicyVersion" IS NULL AND "consentRecordedAt" IS NULL AND "consentExpiresAt" IS NULL)));
ALTER TABLE "EmployeeAuditEvent" ADD CONSTRAINT employee_audit_valid CHECK (
  "recordVersion" > 0 AND ("profileRevision" IS NULL OR "profileRevision" > 0)
  AND length("actorSnapshot") > 0 AND length("summary") > 0 AND length("correlationId") > 0);

CREATE FUNCTION recon_employee_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Employee identity ledger cannot be deleted'; END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."employeeCode" IS DISTINCT FROM OLD."employeeCode"
    OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt" THEN RAISE EXCEPTION 'Employee identity is immutable'; END IF;
  IF OLD."personalDataErasedAt" IS NOT NULL AND NEW."personalDataErasedAt" IS DISTINCT FROM OLD."personalDataErasedAt"
    THEN RAISE EXCEPTION 'Personal-data erasure is terminal'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER employee_guard BEFORE UPDATE OR DELETE ON "Employee" FOR EACH ROW EXECUTE FUNCTION recon_employee_guard();

CREATE FUNCTION recon_employee_profile_guard() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE erased boolean;
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Profile revision ledger cannot be deleted'; END IF;
  IF TG_OP = 'INSERT' THEN
    IF NEW."state" <> 'DRAFT' THEN RAISE EXCEPTION 'New revisions must start as drafts'; END IF;
    RETURN NEW;
  END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."employeeId" IS DISTINCT FROM OLD."employeeId"
    OR NEW."revision" IS DISTINCT FROM OLD."revision" OR NEW."createdAt" IS DISTINCT FROM OLD."createdAt"
    THEN RAISE EXCEPTION 'Profile revision identity is immutable'; END IF;
  IF NEW IS NOT DISTINCT FROM OLD THEN RETURN NEW; END IF;
  -- Permit only referential SET NULL cleanup; never change the retained snapshots.
  IF pg_trigger_depth() > 1 AND (to_jsonb(NEW) - 'createdById' - 'submittedById') = (to_jsonb(OLD) - 'createdById' - 'submittedById')
    AND (NEW."createdById" IS NOT DISTINCT FROM OLD."createdById" OR NEW."createdById" IS NULL)
    AND (NEW."submittedById" IS NOT DISTINCT FROM OLD."submittedById" OR NEW."submittedById" IS NULL) THEN RETURN NEW; END IF;
  IF NEW."state" = 'ERASED' AND OLD."state" <> 'ERASED' THEN
    SELECT "personalDataErasedAt" IS NOT NULL INTO erased FROM "Employee" WHERE "id" = NEW."employeeId";
    IF erased THEN RETURN NEW; END IF;
    RAISE EXCEPTION 'Erasure requires the parent erasure transaction';
  END IF;
  IF OLD."state" <> 'DRAFT' THEN RAISE EXCEPTION 'Submitted and erased revisions are immutable'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER employee_profile_guard BEFORE INSERT OR UPDATE OR DELETE ON "EmployeePublicProfile" FOR EACH ROW EXECUTE FUNCTION recon_employee_profile_guard();

CREATE FUNCTION recon_employee_identity_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'Verification identity ledger cannot be deleted'; END IF;
  IF NEW."id" IS DISTINCT FROM OLD."id" OR NEW."employeeId" IS DISTINCT FROM OLD."employeeId"
    OR NEW."publicKey" IS DISTINCT FROM OLD."publicKey" OR NEW."issuedAt" IS DISTINCT FROM OLD."issuedAt"
    THEN RAISE EXCEPTION 'Verification identity is immutable'; END IF;
  IF OLD."retiredAt" IS NOT NULL AND NEW."retiredAt" IS DISTINCT FROM OLD."retiredAt"
    THEN RAISE EXCEPTION 'Identity retirement is terminal'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER employee_identity_guard BEFORE UPDATE OR DELETE ON "EmployeeVerificationIdentity" FOR EACH ROW EXECUTE FUNCTION recon_employee_identity_guard();

CREATE FUNCTION recon_employee_approval_guard() RETURNS trigger LANGUAGE plpgsql AS $$
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
  IF NEW."status" = 'APPROVED' AND (p."state" <> 'SUBMITTED' OR p."erasedAt" IS NOT NULL OR e."personalDataErasedAt" IS NOT NULL OR e."publicationEpoch" <> NEW."employmentEpoch")
    THEN RAISE EXCEPTION 'Approval references an ineligible or stale revision'; END IF;
  IF NEW."isPublished" THEN
    IF e."employmentStatus" <> 'ACTIVE' OR e."archivedAt" IS NOT NULL OR e."personalDataErasedAt" IS NOT NULL
      OR e."publicationEpoch" <> NEW."employmentEpoch" OR NEW."consentRecordedAt" > CURRENT_TIMESTAMP
      OR (NEW."consentExpiresAt" IS NOT NULL AND NEW."consentExpiresAt" <= CURRENT_TIMESTAMP)
      THEN RAISE EXCEPTION 'Publication is not currently eligible'; END IF;
    IF NEW."scope" = 'VERIFICATION' AND NOT EXISTS(SELECT 1 FROM "EmployeeVerificationIdentity" WHERE "employeeId"=NEW."employeeId" AND "retiredAt" IS NULL)
      THEN RAISE EXCEPTION 'Verification publication requires a live identity'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER employee_approval_guard BEFORE INSERT OR UPDATE OR DELETE ON "EmployeePublicationApproval" FOR EACH ROW EXECUTE FUNCTION recon_employee_approval_guard();

CREATE FUNCTION recon_employee_audit_guard() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='UPDATE' AND pg_trigger_depth()>1 AND OLD."actorAdminId" IS NOT NULL AND NEW."actorAdminId" IS NULL
    AND (to_jsonb(NEW)-'actorAdminId')=(to_jsonb(OLD)-'actorAdminId') THEN RETURN NEW; END IF;
  RAISE EXCEPTION 'Employee audit history is append-only';
END $$;
CREATE TRIGGER employee_audit_guard BEFORE UPDATE OR DELETE ON "EmployeeAuditEvent" FOR EACH ROW EXECUTE FUNCTION recon_employee_audit_guard();
REVOKE UPDATE, DELETE ON "EmployeeAuditEvent" FROM PUBLIC;
