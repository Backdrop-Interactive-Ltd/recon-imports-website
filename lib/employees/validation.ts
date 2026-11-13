import { z } from "zod";

export const employeeIdSchema = z.string().trim().min(1).max(128);
export const versionSchema = z.number().int().positive();
const optionalText = (length: number) => z.string().trim().max(length).nullable().optional();
export const employeeCreateSchema = z.object({
  internalName: optionalText(160), departmentId: employeeIdSchema.nullable().optional(),
}).strict();
export const departmentSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  displayOrder: z.number().int().min(0).max(100000).default(0),
  isActive: z.boolean().default(true),
}).strict();
export const draftSchema = z.object({
  publicName: optionalText(160), designation: optionalText(160), biography: optionalText(2000),
  experienceSummary: optionalText(500), departmentId: employeeIdSchema.nullable().optional(),
  portraitStorageKey: optionalText(300), portraitStorageVersion: optionalText(100),
  officialPhone: z.string().trim().max(40).regex(/^[+\d\s().-]*$/).nullable().optional(),
  officialEmail: z.string().trim().email().max(254).nullable().optional(),
  displayOrder: z.number().int().min(0).max(100000).optional(), isFeatured: z.boolean().optional(),
}).strict();
export const employeeVersionSchema = z.object({ employeeId: employeeIdSchema, expectedVersion: versionSchema }).strict();
export const revisionSchema = employeeVersionSchema.extend({ revision: versionSchema });
export const approvalRequestSchema = revisionSchema.extend({
  scope: z.enum(["DIRECTORY", "VERIFICATION"]),
  consentReference: z.string().trim().min(1).max(200), consentPolicyVersion: z.string().trim().min(1).max(40),
  consentRecordedAt: z.coerce.date(), consentExpiresAt: z.coerce.date().nullable().optional(),
  publishPortrait: z.boolean().default(false), publishPhone: z.boolean().default(false), publishEmail: z.boolean().default(false),
});
export const approvalActionSchema = employeeVersionSchema.extend({ approvalId: employeeIdSchema });
