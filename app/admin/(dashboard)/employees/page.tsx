import Link from "next/link";
import { requireAdminPagePermission } from "../../../../lib/adminAuthorization";
import { listEmployeesForAdmin } from "../../../../lib/employees/adminQueries";
import styles from "./page.module.css";

export const metadata = { title: "Team Members | Recon Imports Admin" };
export const dynamic = "force-dynamic";
const statuses = ["ALL", "ACTIVE", "INACTIVE", "RESIGNED", "ARCHIVED"];
const labels: Record<string, string> = { ALL: "All members", ACTIVE: "Current members", INACTIVE: "Not activated", RESIGNED: "Resigned", ARCHIVED: "Archived" };
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
    <header className={`${styles.panel} ${styles.row}`}><div><p className={styles.eyebrow}>Website CMS</p><h1>Team Members</h1><p>Add a profile, save your changes and send approved information for publication.</p></div><Link className={styles.button} href="/admin/employees/new">Add team member</Link></header>
    <div className={styles.panel}>
      <form className={styles.filters} action="/admin/employees" method="get"><label>Find by employee ID<input name="q" defaultValue={search} maxLength={120} placeholder="e.g. RI-EMP-101" /></label><label>Member status<select name="status" defaultValue={status}>{statuses.map(s => <option key={s} value={s}>{labels[s]}</option>)}</select></label><button type="submit">Find members</button><Link href="/admin/employees">Clear filters</Link></form>
      <div className={styles.tableWrap}><table><caption>Team members — page {page}</caption><thead><tr><th scope="col">Name</th><th scope="col">Permanent employee ID</th><th scope="col">Member status</th><th scope="col">Profile</th></tr></thead><tbody>{employees.map(e => <tr key={e.id}><td>{e.internalName ?? "Name not supplied"}</td><td>{e.employeeCode}</td><td>{e.personalDataErasedAt ? "Details removed" : e.archivedAt ? "Archived" : labels[e.employmentStatus]}</td><td><Link aria-label={`Edit profile ${e.employeeCode}`} href={`/admin/employees/${encodeURIComponent(e.employeeCode)}`}>Edit profile</Link></td></tr>)}</tbody></table></div>
      {!employees.length && <div className={styles.empty}><h2>No team members to show</h2><p>Try another ID or filter. To start a new profile, choose Add team member.</p></div>}
      <nav className={styles.pagination} aria-label="Employee list pages">{page > 1 && <Link href={href(page - 1)}>Previous page</Link>}<span>Page {page}</span>{employees.length === 20 && page < 10000 && <Link href={href(page + 1)}>Next page</Link>}</nav>
    </div>
  </section>;
}
