import Link from "next/link";
import { requireAdminPagePermission } from "../../../../lib/adminAuthorization";
import { listEmployeesForAdmin } from "../../../../lib/employees/adminQueries";
import styles from "./page.module.css";

export const metadata = { title: "Employees | Recon Imports Admin" };
export const dynamic = "force-dynamic";
const statuses = ["ALL", "ACTIVE", "INACTIVE", "RESIGNED", "ARCHIVED"];
export default async function EmployeesPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  await requireAdminPagePermission("employees.records.read");
  const params = await searchParams;
  const raw = typeof params.page === "string" ? Number(params.page) : 1;
  const page = Number.isSafeInteger(raw) && raw >= 1 && raw <= 10000 ? raw : 1;
  const status = typeof params.status === "string" && statuses.includes(params.status) ? params.status : "ALL";
  const search = typeof params.q === "string" ? params.q.trim().slice(0, 120) : "";
  const employees = await listEmployeesForAdmin({ status, search, page, pageSize: 20 });
  const href = (value: number) => `/admin/employees?${new URLSearchParams({ status, q: search, page: String(value) })}`;
  return <section className={styles.page}>
    <header className={`${styles.panel} ${styles.row}`}><div><p className={styles.eyebrow}>People / private workspace</p><h1>Employees</h1><p>Manage employee drafts and lifecycle without exposing private records publicly.</p></div><Link className={styles.button} href="/admin/employees/new">Create employee</Link></header>
    <div className={styles.panel}>
      <form className={styles.filters} action="/admin/employees" method="get"><label>Employee code<input name="q" defaultValue={search} maxLength={120} /></label><label>Status<select name="status" defaultValue={status}>{statuses.map(s => <option key={s}>{s}</option>)}</select></label><button type="submit">Filter employees</button></form>
      <p>Archived includes resigned employees. Active and inactive filters exclude archived records.</p>
      <div className={styles.tableWrap}><table><caption>Employee records — page {page}</caption><thead><tr><th scope="col">Employee code</th><th scope="col">Internal name</th><th scope="col">Employment</th><th scope="col">Record</th></tr></thead><tbody>{employees.map(e => <tr key={e.id}><td><Link href={`/admin/employees/${encodeURIComponent(e.employeeCode)}`}>{e.employeeCode}</Link></td><td>{e.internalName ?? "Not supplied"}</td><td>{e.employmentStatus}</td><td>{e.personalDataErasedAt ? "Personal data erased" : e.archivedAt ? "Archived" : "Current"}</td></tr>)}</tbody></table></div>
      {!employees.length && <p>No employees match these filters.</p>}
      <nav className={styles.pagination} aria-label="Employee list pages">{page > 1 && <Link href={href(page - 1)}>Previous page</Link>}<span>Page {page}</span>{employees.length === 20 && page < 10000 && <Link href={href(page + 1)}>Next page</Link>}</nav>
    </div>
  </section>;
}
