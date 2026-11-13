import { requireAdminPagePermission } from "../../../../lib/adminAuthorization";
import { getAdminSiteSettings } from "../../../../lib/siteSettings";
import SiteSettingsForm from "./SiteSettingsForm";
import styles from "./page.module.css";

export const metadata = {
  title: "Site Settings | Recon Imports Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminSiteSettingsPage() {
  await requireAdminPagePermission("settings.manage");
  let settings;
  try { settings = await getAdminSiteSettings(); }
  catch {
    return <section className={styles.settingsPage} role="alert"><h1>Site Settings unavailable</h1><p>Saved settings could not be loaded. Check the database connection and reload this page. Editing is disabled; your saved settings have not been changed.</p><a href="/admin/site-settings">Reload settings</a></section>;
  }

  return (
    <section className={styles.settingsPage}>
      <div className={styles.header}>
        <div>
          <p>Settings</p>
          <h1>Site Settings</h1>
          <span>Manage global website content, contact details, branding, SEO, and theme values.</span>
        </div>
      </div>

      <div className={styles.summaryGrid}>
        <div>
          <span>Site Name</span>
          <strong>{settings.siteName}</strong>
        </div>
        <div>
          <span>Phone</span>
          <strong>{settings.phoneNumber || "Not set"}</strong>
        </div>
        <div>
          <span>Logo</span>
          <strong>{settings.websiteLogo ? "Configured" : "Fallback"}</strong>
        </div>
      </div>

      <section className={styles.formPanel}>
        <div className={styles.panelHeader}>
          <p>Global CMS</p>
          <h2>Editable website settings</h2>
        </div>
        <SiteSettingsForm settings={settings} />
      </section>
    </section>
  );
}
