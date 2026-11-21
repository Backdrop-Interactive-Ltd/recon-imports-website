import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdminPagePermission } from "../../../../../../lib/adminAuthorization";
import { getEmployeeHistoryData } from "../../../../../../lib/employees/adminQueries";
import styles from "../../page.module.css";

export const metadata = { title: "Employee History | Recon Imports Admin" };
export const dynamic = "force-dynamic";
export const revalidate = 0;
export default async function EmployeeHistoryPage({ params, searchParams }: {
  params: Promise<{ employeeCode: string }>; searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  await requireAdminPagePermission("employees.restricted.read");
  const { employeeCode } = await params, query = await searchParams;
  const raw = typeof query.page === "string" ? Number(query.page) : 1;
  const page = Number.isSafeInteger(raw) && raw >= 1 && raw <= 10000 ? raw : 1;
  const data = await getEmployeeHistoryData(employeeCode, page);
  if (!data) notFound();
  const base = `/admin/employees/${encodeURIComponent(employeeCode)}`;
  const href = (value: number) => `${base}/history?page=${value}`;
  return <section className={styles.page}><div className={styles.panel}>
    <Link href={base}>Back to employee profile</Link><h1>Protected history</h1><p>{employeeCode} / page {page}</p>
    <ol className={styles.history}>{data.history.map(event => <li key={event.id}>
      <strong>{event.eventType}</strong> / {event.createdAt.toISOString().replace("T", " ").slice(0, 19)} UTC<br />
      Actor role: {event.actorRole}; record version: {event.recordVersion}{event.profileRevision !== null ? `; revision: ${event.profileRevision}` : ""}{event.isSelfApproval ? "; self-approval recorded" : ""}<br />
      Fields: {event.changedFields.join(", ") || "None"}
    </li>)}</ol>
    {!data.history.length && <p>No history events on this page.</p>}
    <nav className={styles.pagination} aria-label="History pages">{page > 1 && <Link href={href(page - 1)}>Newer events</Link>}<span>{data.historyCount} events retained</span>{page * 20 < data.historyCount && page < 10000 && <Link href={href(page + 1)}>Older events</Link>}</nav>
  </div></section>;
}
