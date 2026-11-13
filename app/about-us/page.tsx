import Image from "next/image";
import Link from "next/link";
import { ArrowDown, ArrowUpRight, Compass, Target } from "lucide-react";
import Footer from "../components/Footer";
import PublicLogoImage from "../components/PublicLogoImage";
import JsonLd from "../components/JsonLd";
import { getPhoneHref, getSiteSettings } from "../../lib/siteSettings";
import { createBreadcrumbJsonLd, createPublicMetadata } from "../../lib/seo";
import { AchievementsSection, LeadershipSection } from "./AboutSections";
import { achievements, leadershipMessages } from "./content";
import styles from "./page.module.css";

export const revalidate = 60;

export async function generateMetadata() {
  const settings = await getSiteSettings();
  return createPublicMetadata({
    title: "About Recon Imports | Beyond Automotive",
    description: "Get to know Recon Imports. Explore our purpose, our approach to Japanese vehicles, and our vision for the road ahead in Bangladesh.",
    path: "/about-us",
    image: settings.openGraphImage || "/hero-slide-1.webp",
  });
}

export default async function AboutPage() {
  const settings = await getSiteSettings();
  const phoneHref = getPhoneHref(settings.phoneNumber);
  const contactHref = phoneHref || (settings.email ? `mailto:${settings.email}` : "/send-requirements");

  return (
    <div className={styles.page}>
      <a className={styles.skipLink} href="#about-content">Skip to content</a>
      <JsonLd data={createBreadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "About Us", path: "/about-us" }])} />
      <header className={styles.header}>
        <Link className={styles.logo} href="/" aria-label="Recon Imports home">
          <PublicLogoImage src={settings.websiteLogo || "/recon-logo.webp"} alt={`${settings.siteName} logo`} width={178} height={55} sizes="178px" priority />
        </Link>
        <nav className={styles.nav} aria-label="About page navigation">
          <Link href="/">Home</Link><Link href="/brand-new">Brand New</Link>
          <Link href="/reconditioned">Reconditioned</Link><Link href="/pre-owned">Pre-Owned</Link>
          <Link href="/pre-order">Pre-Order</Link><Link href="/about-us" aria-current="page">About Us</Link>
        </nav>
        <a className={styles.headerContact} href={contactHref}>Let’s talk <ArrowUpRight size={16} aria-hidden="true" /></a>
      </header>
      <main id="about-content" tabIndex={-1}>
        <section className={styles.hero} aria-labelledby="about-heading">
          <div className={styles.heroImage}>
            <Image src="/hero-slide-1.webp" alt="" fill priority sizes="100vw" />
          </div>
          <div className={styles.heroContent}>
            <h1 id="about-heading" className={styles.heroLabel}>About RECON IMPORTS</h1>
            <p className={styles.heroTitle}>BEYOND<br /><span>AUTOMOTIVE.</span></p>
            <div className={styles.heroBottom}>
              <p>Japanese vehicles. A personal perspective.<br />Discover a different way to approach your next car in Bangladesh.</p>
              <a href="#our-journey" className={styles.discover}>Discover our story <ArrowDown size={18} aria-hidden="true" /></a>
            </div>
          </div>
          <span className={styles.heroIndex} aria-hidden="true">RECON / OUR STORY</span>
        </section>

        <section id="our-journey" className={`${styles.section} ${styles.journey}`} aria-labelledby="journey-heading">
          <figure className={styles.journeyFigure}>
            <div className={styles.journeyImage}><Image src="/hero-slide-2.webp" alt="Automotive detail from the Recon Imports website collection" fill sizes="(max-width: 760px) 90vw, 45vw" /></div>
            <figcaption>From our automotive image collection.</figcaption>
            <span className={styles.imageLabel} aria-hidden="true">A passion for the road ahead.</span>
          </figure>
          <div className={styles.journeyCopy}>
            <p className={styles.eyebrow}>01 / Our journey</p>
            <h2 id="journey-heading">It starts with a car.<br /><span>It’s about what comes next.</span></h2>
            <p className={styles.lead}>A car is part of everyday life. Choosing one deserves time, clarity, and a conversation.</p>
            <p>Recon Imports brings together Japanese vehicle listings and import support in Bangladesh. From brand new and reconditioned vehicles to pre-owned and pre-order options, our website is a starting point for finding a car that suits your needs.</p>
            <p>Explore the details, share your requirements, or ask about auction-sheet verification. Our purpose is simple: help you take the next step with a clearer picture.</p>
            <Link className={styles.textLink} href="/send-requirements">Tell us what you’re looking for <ArrowUpRight size={18} aria-hidden="true" /></Link>
          </div>
        </section>

        <section className={styles.purpose} aria-labelledby="purpose-heading">
          <div className={styles.section}>
            <div className={styles.purposeHeading}><p className={styles.eyebrow}>02 / What drives us</p><h2 id="purpose-heading">A clear purpose.<br />An open road.</h2></div>
            <div className={styles.purposeGrid}>
              <article className={styles.purposeCard}><Target size={32} strokeWidth={1.3} aria-hidden="true" /><span className={styles.cardIndex} aria-hidden="true">01</span><h3>Our mission</h3><p>To make choosing a Japanese vehicle more approachable through useful information, considered options, and conversations shaped around each customer’s requirements.</p></article>
              <article className={styles.purposeCard}><Compass size={32} strokeWidth={1.3} aria-hidden="true" /><span className={styles.cardIndex} aria-hidden="true">02</span><h3>Our vision</h3><p>To build a thoughtful automotive experience in Bangladesh, where clarity, care, and a lasting relationship matter as much as the vehicle itself.</p></article>
            </div>
          </div>
        </section>

        <AchievementsSection items={achievements} />
        <LeadershipSection items={leadershipMessages} />

        <section className={`${styles.section} ${styles.cta}`} aria-labelledby="cta-heading">
          <div><p className={styles.eyebrow}>Your next chapter</p><h2 id="cta-heading">Let’s find your<br /><span>way forward.</span></h2><p>Explore the cars. Ask the questions. Start a conversation.</p></div>
          <div className={styles.ctaActions}><Link className={styles.primaryButton} href="/reconditioned">Explore Our Cars <ArrowUpRight size={19} aria-hidden="true" /></Link><a className={styles.secondaryButton} href={contactHref}>Contact Us <ArrowUpRight size={19} aria-hidden="true" /></a></div>
        </section>
      </main>
      <Footer className={styles.footer} settings={settings} />
    </div>
  );
}
