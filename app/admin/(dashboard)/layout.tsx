import { redirect } from "next/navigation";
import { auth, signOut } from "../../../lib/auth";
import AdminNav from "./AdminNav";
import styles from "./layout.module.css";

export default async function AdminDashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  if (!session?.user) {
    redirect("/admin/login");
  }

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
        <AdminNav />
      </aside>

      <div className={styles.workspace}>
        <header className={styles.topbar}>
          <div>
            <p className={styles.topbarEyebrow}>Signed in as</p>
            <h2>{session.user.name ?? "Admin"}</h2>
            <span>{session.user.email}</span>
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
