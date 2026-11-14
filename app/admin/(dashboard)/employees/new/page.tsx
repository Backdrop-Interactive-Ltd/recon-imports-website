import Link from "next/link";
import { requireAdminPagePermission } from "../../../../../lib/adminAuthorization";
import { getEmployeeDepartmentOptions } from "../../../../../lib/employees/adminQueries";
import { CreateEmployeeForm } from "../EmployeeForms";
import styles from "../page.module.css";
export const metadata = { title: "Add Team Member | Recon Imports Admin" };
export const dynamic = "force-dynamic";
export default async function NewEmployeePage() {
  await requireAdminPagePermission("employees.draft.create");
  const departments = await getEmployeeDepartmentOptions();
  return <section className={styles.page}><div className={styles.panel}><Link href="/admin/employees">Team Members</Link><p className={styles.eyebrow}>Website CMS / New profile</p><h1>Add team member</h1><p>Start with a name. We will assign the permanent employee ID, then you can add designation, experience and contact details.</p><CreateEmployeeForm departments={departments} /><p className={styles.muted}>This creates a team profile, not an Admin login. Photos, public team pages and QR downloads will be added in a later phase.</p></div></section>;
}
