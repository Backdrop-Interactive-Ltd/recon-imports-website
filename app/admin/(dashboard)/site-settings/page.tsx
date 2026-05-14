import AdminPlaceholderPage from "../_components/AdminPlaceholderPage";

export const metadata = {
  title: "Site Settings | Recon Imports Admin",
};

export default function AdminSiteSettingsPage() {
  return (
    <AdminPlaceholderPage
      description="Manage contact details, social links, footer content, theme values, and global website settings here later."
      eyebrow="Settings"
      title="Site Settings"
    />
  );
}
