import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, UsersRound } from "lucide-react";
import Footer from "../components/Footer";
import PublicLogoImage from "../components/PublicLogoImage";
import { getSiteSettings } from "../../lib/siteSettings";
import { createPublicMetadata } from "../../lib/seo";
import { getPublicTeamMembers } from "../../lib/employees/publicQueries";
import styles from "./page.module.css";

// Recheck publication/consent on every request; never statically cache the roster.
export const dynamic = "force-dynamic";
export const revalidate = 0;
export const metadata = createPublicMetadata({
  title: "Our Team | Recon Imports",
  description: "Meet the people behind Recon Imports. Different minds, one drive.",
  path: "/team",
});
const pageSize = 24;

export default async function TeamPage({ searchParams }: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const query = await searchParams;
  const requested = typeof query.page === "string" ? Number(query.page) : 1;
  const page = Number.isSafeInteger(requested) && requested > 0 && requested <= 10000 ? requested : 1;
  const settings = await getSiteSettings();
  let members: Awaited<ReturnType<typeof getPublicTeamMembers>> = [];
  let unavailable = false;
  try { members = await getPublicTeamMembers({ page, pageSize }); }
  catch { unavailable = true; }

  return <div className={styles.page}>
    <a href="#team-content" className={styles.skip}>Skip to team</a>
    <header className={styles.header}>
      <Link href="/" aria-label="Recon Imports home" className={styles.logo}>
        <PublicLogoImage src={settings.websiteLogo || "/recon-logo.webp"} alt={`${settings.siteName} logo`} width={170} height={54} sizes="170px" priority />
      </Link>
      <nav aria-label="Team page navigation" className={styles.nav}>
        <Link href="/">Home</Link><Link href="/about-us">Our story</Link><Link href="/team" aria-current="page">Our team</Link>
      </nav>
      <Link href="/send-requirements" className={styles.headerCta}>Let’s talk <ArrowUpRight size={17} aria-hidden="true" /></Link>
    </header>

    <main id="team-content" tabIndex={-1}>
      <section className={styles.hero} aria-labelledby="team-heading">
        <div className={styles.heroTop}><p className={styles.eyebrow}><span /> RECON IMPORTS / THE PEOPLE</p><span className={styles.heroNote}>BEYOND AUTOMOTIVE</span></div>
        <h1 id="team-heading">DIFFERENT<br /><span className={styles.outline}>MINDS.</span><br /><span className={styles.lastLine}>ONE DRIVE<span className={styles.dot}>.</span></span></h1>
        <div className={styles.orbit} aria-hidden="true"><ArrowUpRight strokeWidth={1} /></div>
        <div className={styles.heroBottom}><p>The people behind the perspective.<br />Meet the team at RECON IMPORTS.</p><a href="#the-team" className={styles.discover}>Meet our people <ArrowDown size={18} aria-hidden="true" /></a></div>
      </section>

      <section id="the-team" className={styles.roster} aria-labelledby="roster-heading">
        <div className={styles.sectionHeading}><div><p className={styles.eyebrow}>PEOPLE / PASSION / PERSPECTIVE</p><h2 id="roster-heading">Our people.<br /><span>Our driving force.</span></h2></div><p>Individual perspectives.<br />A shared road ahead.</p></div>
        {unavailable ? <div className={styles.empty} role="status"><UsersRound aria-hidden="true" /><h3>A brief pause.</h3><p>Our team information is temporarily unavailable. Please try again shortly.</p></div>
          : members.length ? <div className={styles.grid}>{members.map((member, index) => <article className={styles.card} key={member.employeeCode}>
            <div className={styles.portrait}>
              {member.portrait ? <Image src={member.portrait} alt={`${member.publicName}, ${member.designation}`} fill sizes="(max-width: 540px) 92vw, (max-width: 900px) 45vw, 30vw" unoptimized />
                : <div className={styles.noPhoto}><UsersRound size={54} strokeWidth={1} aria-hidden="true" /><span>RECON IMPORTS</span></div>}
              <span className={styles.cardIndex} aria-hidden="true">{String((page - 1) * pageSize + index + 1).padStart(2, "0")}</span>
            </div>
            <div className={styles.cardCaption}><h3><Link href={`/team/${encodeURIComponent(member.employeeCode)}`}>{member.publicName}</Link></h3><p>{member.designation}</p><span className={styles.cardMark} aria-hidden="true"><ArrowUpRight size={24} /></span></div>
          </article>)}</div>
          : <div className={styles.empty}><UsersRound aria-hidden="true" /><h3>{page > 1 ? "You’ve reached the end." : "Meet our people, soon."}</h3><p>{page > 1 ? "Explore the previous page to meet our team." : "Our team profiles will appear here as they become available."}</p></div>}
        {!unavailable && (page > 1 || members.length === pageSize) && <nav className={styles.pagination} aria-label="Team pages">{page > 1 && <Link href={page === 2 ? "/team#the-team" : `/team?page=${page - 1}#the-team`}>? Previous</Link>}<span>Page {page}</span>{members.length === pageSize && page < 10000 && <Link href={`/team?page=${page + 1}#the-team`}>Next ?</Link>}</nav>}
      </section>

      <section className={styles.cta}><p className={styles.eyebrow}>LET’S START A CONVERSATION</p><div><h2>Your next car.<br /><span>A fresh perspective.</span></h2><Link href="/send-requirements">Talk to RECON <ArrowUpRight size={24} aria-hidden="true" /></Link></div></section>
    </main>
    <Footer settings={settings} />
  </div>;
}
