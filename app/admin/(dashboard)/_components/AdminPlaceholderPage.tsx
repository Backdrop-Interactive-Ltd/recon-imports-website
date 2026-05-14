import styles from "./AdminPlaceholderPage.module.css";

type AdminPlaceholderPageProps = {
  title: string;
  eyebrow: string;
  description: string;
};

export default function AdminPlaceholderPage({ title, eyebrow, description }: AdminPlaceholderPageProps) {
  return (
    <section className={styles.page}>
      <div className={styles.header}>
        <p>{eyebrow}</p>
        <h1>{title}</h1>
        <span>{description}</span>
      </div>
      <div className={styles.panel}>
        <strong>CRUD coming next</strong>
        <p>This protected admin route is ready for the future management interface.</p>
      </div>
    </section>
  );
}
