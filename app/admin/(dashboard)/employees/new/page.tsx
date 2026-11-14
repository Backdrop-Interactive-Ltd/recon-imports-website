import Link from "next/link";
import { requireAdminPagePermission } from "../../../../../lib/adminAuthorization";
import { getEmployeeDepartmentOptions } from "../../../../../lib/employees/adminQueries";
import { CreateEmployeeForm } from "../EmployeeForms";
import styles from "../page.module.css";
export const metadata = { title: "Create Employee | Recon Imports Admin" };
export const dynamic = "force-dynamic";
export default async function NewEmployeePage() {
  await requireAdminPagePermission("employees.draft.create");
  const departments = await getEmployeeDepartmentOptions();
  return <section className={styles.page}><div className={styles.panel}><Link href="/admin/employees">Back to employees</Link><h1>Create employee</h1><p>Internal identity and public profile are separate. No password or Admin account is created.</p><CreateEmployeeForm departments={departments} /></div></section>;
}
