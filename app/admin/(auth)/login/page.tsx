import { Suspense } from "react";
import AdminLoginForm from "./AdminLoginForm";
import styles from "./page.module.css";

export const metadata = {
  title: "Admin Login | Recon Imports",
};

export default function AdminLoginPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-label="Admin login">
        <div className={styles.header}>
          <p>Recon Imports Admin</p>
          <h1>Sign in</h1>
          <span>Use your admin credentials to continue.</span>
        </div>
        <Suspense fallback={<p className={styles.loading}>Loading login...</p>}>
          <AdminLoginForm />
        </Suspense>
      </section>
    </main>
  );
}
