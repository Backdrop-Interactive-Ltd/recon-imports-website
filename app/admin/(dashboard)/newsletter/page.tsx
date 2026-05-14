import AdminPlaceholderPage from "../_components/AdminPlaceholderPage";

export const metadata = {
  title: "Newsletter | Recon Imports Admin",
};

export default function AdminNewsletterPage() {
  return (
    <AdminPlaceholderPage
      description="Manage newsletter subscribers and active subscription status here later."
      eyebrow="Audience"
      title="Newsletter Subscribers"
    />
  );
}
