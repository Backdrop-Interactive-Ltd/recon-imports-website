import { Prisma } from "../generated/prisma/client";
import { prisma } from "../prisma";
import { isVerificationKey, isEmployeeCode } from "./identifiers";

export type PublicEmployee = {
  employeeCode: string; publicName: string; designation: string; departmentName: string | null;
  biography: string | null; experienceSummary: string | null; officialPhone: string | null;
  officialEmail: string | null; isFeatured: boolean; portrait: null; checkedAt: Date;
};
export class EmployeePublicQueryError extends Error {
  constructor() { super("Employee information is temporarily unavailable."); this.name = "EmployeePublicQueryError"; }
}

async function read<T>(query: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SET LOCAL TIME ZONE 'UTC'`;
    return query(tx);
  });
}

const publicColumns = Prisma.sql`
  e."employeeCode", p."publicName", p."designation", p."departmentName", p."biography", p."experienceSummary",
  CASE WHEN a."publishPhone" THEN p."officialPhone" ELSE NULL END AS "officialPhone",
  CASE WHEN a."publishEmail" THEN p."officialEmail" ELSE NULL END AS "officialEmail",
  p."isFeatured", NULL::text AS "portrait", CURRENT_TIMESTAMP AS "checkedAt"`;

// One statement checks live employment, exact frozen revision, scope, consent and epoch.
// Never wrap these queries in unstable_cache/use cache/ISR or a stale-positive fallback.
const publicEligibility = Prisma.sql`
  e."employmentStatus" = 'ACTIVE' AND e."archivedAt" IS NULL AND e."personalDataErasedAt" IS NULL
  AND a."employmentEpoch" = e."publicationEpoch" AND a."status" = 'APPROVED' AND a."isPublished"
  AND a."withdrawnAt" IS NULL AND a."evidenceErasedAt" IS NULL
  AND a."consentReference" IS NOT NULL AND a."consentRecordedAt" <= CURRENT_TIMESTAMP
  AND (a."consentExpiresAt" IS NULL OR a."consentExpiresAt" > CURRENT_TIMESTAMP)
  AND p."state" = 'SUBMITTED' AND p."erasedAt" IS NULL`;

export async function getPublicEmployeeDirectory(input: { search?: string; departmentId?: string; page?: number; pageSize?: number } = {}): Promise<PublicEmployee[]> {
  const search = (input.search ?? "").trim().slice(0, 120);
  const page = Number.isSafeInteger(input.page) ? Math.max(1, Math.min(input.page!, 10000)) : 1;
  const pageSize = Number.isSafeInteger(input.pageSize) ? Math.max(1, Math.min(input.pageSize!, 50)) : 12;
  try {
    return await read(tx => tx.$queryRaw<PublicEmployee[]>(Prisma.sql`
      SELECT ${publicColumns}
      FROM "EmployeePublicationApproval" a
      JOIN "EmployeePublicProfile" p ON p."employeeId"=a."employeeId" AND p."revision"=a."profileRevision"
      JOIN "Employee" e ON e."id"=a."employeeId"
      WHERE a."scope"='DIRECTORY' AND ${publicEligibility}
      ${search ? Prisma.sql`AND (p."publicName" ILIKE ${`%${search}%`} OR p."designation" ILIKE ${`%${search}%`})` : Prisma.empty}
      ${input.departmentId ? Prisma.sql`AND p."departmentId"=${input.departmentId.slice(0, 128)}` : Prisma.empty}
      ORDER BY p."isFeatured" DESC, p."displayOrder", e."employeeCode"
      LIMIT ${pageSize} OFFSET ${(page - 1) * pageSize}`));
  } catch { throw new EmployeePublicQueryError(); }
}

export async function getEmployeeVerification(publicKey: string): Promise<(PublicEmployee & { active: true }) | null> {
  if (!isVerificationKey(publicKey)) return null;
  try {
    const rows = await read(tx => tx.$queryRaw<PublicEmployee[]>(Prisma.sql`
      SELECT ${publicColumns}
      FROM "EmployeeVerificationIdentity" i
      JOIN "Employee" e ON e."id"=i."employeeId"
      JOIN "EmployeePublicationApproval" a ON a."employeeId"=e."id" AND a."scope"='VERIFICATION'
      JOIN "EmployeePublicProfile" p ON p."employeeId"=a."employeeId" AND p."revision"=a."profileRevision"
      WHERE i."publicKey"=${publicKey} AND i."retiredAt" IS NULL AND ${publicEligibility}
      LIMIT 1`));
    return rows[0] ? { ...rows[0], active: true } : null;
  } catch { throw new EmployeePublicQueryError(); }
}

export const getPublicTeamMembers = getPublicEmployeeDirectory;
export type PublicEmployeeProfileResult = { state: "ACTIVE"; profile: PublicEmployee } | { state: "RESIGNED" | "UNAVAILABLE" | "NOT_FOUND" };

export async function getPublicEmployeeProfile(employeeCode: string): Promise<PublicEmployeeProfileResult> {
  if (!isEmployeeCode(employeeCode)) return { state: "NOT_FOUND" };
  try {
    // A single statement/snapshot returns only an eligible whitelist DTO, never a private revision.
    const rows = await read(tx => tx.$queryRaw<{ state: string; profile: PublicEmployee | null }[]>(Prisma.sql`
      SELECT CASE WHEN e."personalDataErasedAt" IS NOT NULL THEN 'UNAVAILABLE'
        WHEN e."employmentStatus"='FORMER' THEN 'RESIGNED'
        WHEN eligible.profile IS NOT NULL THEN 'ACTIVE' ELSE 'UNAVAILABLE' END AS state,
        eligible.profile
      FROM "Employee" e
      LEFT JOIN LATERAL (
        SELECT row_to_json(visible) AS profile FROM (
          SELECT ${publicColumns} FROM "EmployeePublicationApproval" a
          JOIN "EmployeePublicProfile" p ON p."employeeId"=a."employeeId" AND p."revision"=a."profileRevision"
          WHERE a."employeeId"=e."id" AND a."scope"='VERIFICATION' AND ${publicEligibility} LIMIT 1
        ) visible
      ) eligible ON true WHERE e."employeeCode"=${employeeCode} LIMIT 1`));
    const row = rows[0];
    if (!row) return { state: "NOT_FOUND" };
    if (row.state === "ACTIVE" && row.profile) return { state: "ACTIVE", profile: { ...row.profile, checkedAt: new Date(row.profile.checkedAt) } };
    return { state: row.state === "RESIGNED" ? "RESIGNED" : "UNAVAILABLE" };
  } catch { throw new EmployeePublicQueryError(); }
}
