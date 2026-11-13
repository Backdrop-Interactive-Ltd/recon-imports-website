export type PublicationEligibility = {
  employmentStatus: string; archivedAt: Date | null; personalDataErasedAt: Date | null;
  publicationEpoch: number; employmentEpoch: number; state: string; erasedAt: Date | null;
  status: string; isPublished: boolean; withdrawnAt: Date | null; evidenceErasedAt: Date | null;
  consentRecordedAt: Date | null; consentExpiresAt: Date | null;
};

// Pure helper for internal previews/tests; SQL public queries enforce equivalent predicates.
export function isPublicationEligible(value: PublicationEligibility, now = new Date()): boolean {
  return value.employmentStatus === "ACTIVE" && !value.archivedAt && !value.personalDataErasedAt
    && value.publicationEpoch === value.employmentEpoch && value.state === "SUBMITTED" && !value.erasedAt
    && value.status === "APPROVED" && value.isPublished && !value.withdrawnAt && !value.evidenceErasedAt
    && !!value.consentRecordedAt && value.consentRecordedAt <= now
    && (!value.consentExpiresAt || value.consentExpiresAt > now);
}
