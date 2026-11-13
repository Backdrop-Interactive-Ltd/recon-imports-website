import { signOut } from "../../../lib/auth";
import { requireAdminPagePermission } from "../../../lib/adminAuthorization";
import AdminNav from "./AdminNav";
import styles from "./layout.module.css";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const admin = await requireAdminPagePermission("dashboard.access");

  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.brandBlock}>
          <span className={styles.brandMark}>RI</span>
          <div>
            <p>Recon Imports</p>
            <strong>Admin Panel</strong>
          </div>
        </div>
        <AdminNav role={admin.role} />
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.topbarEyebrow}>Signed in as</p>
            <h2>{admin.name}</h2>
            <span>{admin.email}</span>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/admin/login" });
            }}
          >
            <button className={styles.logoutButton} type="submit">
              Logout
            </button>
          </form>
        </header>
        <main className={styles.content}>{children}</main>
      </div>
    </div>
  );
}
