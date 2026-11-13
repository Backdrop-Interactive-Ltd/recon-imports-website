import Image from "next/image";
import type { Achievement, LeaderMessage } from "./content";
import styles from "./page.module.css";

export function AchievementsSection({ items }: { items: Achievement[] }) {
  const published = items.filter((item) => item.verified);
  if (!published.length) return null;
  return (
    <section className={styles.section} aria-labelledby="achievements-heading">
      <p className={styles.eyebrow}>Milestones that matter</p>
      <h2 id="achievements-heading">Our journey, in numbers.</h2>
      <dl className={styles.statistics}>
        {published.map((item) => (
          <div className={styles.statistic} key={item.id}>
            <dt>{item.label}</dt><dd>{item.value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

export function LeadershipSection({ items }: { items: LeaderMessage[] }) {
  const published = items.filter((item) => item.verified);
  if (!published.length) return null;
  return (
    <section className={styles.section} aria-labelledby="leadership-heading">
      <p className={styles.eyebrow}>The people behind the purpose</p>
      <h2 id="leadership-heading">A message from our leadership.</h2>
      <div className={styles.leadershipGrid}>
        {published.map((item) => (
          <article className={styles.leader} key={item.id}>
            {item.portrait ? <div className={styles.portrait}>
              <Image src={item.portrait.src} alt={item.portrait.alt} fill sizes="(max-width: 700px) 90vw, 40vw" />
            </div> : null}
            <h3>{item.name}</h3><p className={styles.designation}>{item.designation}</p>
            <blockquote><p>{item.message}</p></blockquote>
          </article>
        ))}
      </div>
    </section>
  );
}
