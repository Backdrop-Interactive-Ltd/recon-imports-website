import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, UsersRound } from "lucide-react";
import Footer from "../../components/Footer";
import PublicLogoImage from "../../components/PublicLogoImage";
import { getPublicEmployeeProfile } from "../../../lib/employees/publicQueries";
import { getEmployeeProfilePath } from "../../../lib/employees/profileUrls";
import { isEmployeeCode } from "../../../lib/employees/identifiers";
import { getPhoneHref, getSiteSettings } from "../../../lib/siteSettings";
import { createPublicMetadata } from "../../../lib/seo";
import team from "../page.module.css";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function generateMetadata({ params }: { params: Promise<{ employeeCode: string }> }) {
  const { employeeCode } = await params;
  return { ...createPublicMetadata({ title: "Team Profile | Recon Imports", description: "Official team profile from Recon Imports.", path: isEmployeeCode(employeeCode) ? getEmployeeProfilePath(employeeCode) : "/team" }), robots: { index: false, follow: true } };
}
export default async function EmployeeProfilePage({ params }: { params: Promise<{ employeeCode: string }> }) {
  const { employeeCode } = await params;
  const settings = await getSiteSettings();
  let result: Awaited<ReturnType<typeof getPublicEmployeeProfile>> = { state: "UNAVAILABLE" };
  let failed = false;
  try { result = await getPublicEmployeeProfile(employeeCode); } catch { failed = true; }
  const profile = result.state === "ACTIVE" ? result.profile : null;
  return <div className={team.page}>
    <a href="#employee-content" className={team.skip}>Skip to profile</a>
    <header className={team.header}>
      <Link href="/" aria-label="Recon Imports home"><PublicLogoImage src={settings.websiteLogo || "/recon-logo.webp"} alt={`${settings.siteName} logo`} width={170} height={54} sizes="170px" priority /></Link>
      <nav className={team.nav} aria-label="Employee profile navigation"><Link href="/">Home</Link><Link href="/team">Our team</Link></nav>
    </header>
    <main id="employee-content" tabIndex={-1} className={styles.main}>
      <Link href="/team" className={styles.back}>Back to Our Team <ArrowUpRight size={17} aria-hidden="true" /></Link>
      {profile ? <>
        <p className={team.eyebrow}>RECON IMPORTS / OUR PEOPLE</p>
        <div className={styles.layout}>
          <div className={styles.portrait}>{profile.portrait ? <Image src={profile.portrait} alt={profile.publicName} fill sizes="(max-width: 760px) 90vw, 42vw" unoptimized priority /> : <div className={styles.placeholder}><UsersRound size={70} strokeWidth={1} aria-hidden="true" /><span>RECON IMPORTS</span></div>}</div>
          <div className={styles.copy}>
            <p className={styles.identity}>EMPLOYEE ID / {profile.employeeCode}</p>
            <h1>{profile.publicName}</h1><p className={styles.designation}>{profile.designation}</p>
            {profile.experienceSummary && <section><h2>Experience</h2><p>{profile.experienceSummary}</p></section>}
            {profile.biography && <section><h2>About</h2><p>{profile.biography}</p></section>}
            {(profile.officialPhone || profile.officialEmail) && <section><h2>Get in touch</h2><div className={styles.contacts}>
              {profile.officialPhone && <a href={getPhoneHref(profile.officialPhone)}>{profile.officialPhone}</a>}
              {profile.officialEmail && <a href={`mailto:${profile.officialEmail}`}>{profile.officialEmail}</a>}
            </div></section>}
          </div>
        </div>
      </> : <section className={styles.unavailable}><p className={team.eyebrow}>RECON IMPORTS / TEAM PROFILE</p><UsersRound size={48} aria-hidden="true" /><h1>Profile unavailable.</h1><p>{failed ? "We cannot load this profile right now. Please try again shortly." : "This profile is not currently available for public viewing."}</p><Link href="/team">Meet our team <ArrowUpRight size={18} aria-hidden="true" /></Link></section>}
    </main>
    <Footer settings={settings} />
  </div>;
}
