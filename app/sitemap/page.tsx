import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { briefKeys, marketHref, title } from "@/lib/brief";
import { getBrief } from "@/lib/server/brief-repository";
import styles from "./sitemap.module.css";

export const metadata: Metadata = {
  title: "Review the briefs · Aim",
  robots: { index: false, follow: false },
};

const references = [
  {
    href: "/design",
    label: "Design system",
    description: "Components, palette, typography and motion.",
  },
  {
    href: "/wireframe",
    label: "Annotated wireframe",
    description: "The reading journey and the thinking behind it.",
  },
];

export default async function SitemapPage() {
  const briefs = await Promise.all(briefKeys.map(getBrief));
  return (
    <div className={styles.shell}>
      <header className={styles.header}>
        <Link href="/sitemap" className={styles.brand}>
          Aim
        </Link>
        <span className={styles.reviewLabel}>Submission review</span>
      </header>
      <main className={styles.scroll}>
        <div className={styles.content}>
          <div className={styles.intro}>
            <p className={styles.eyebrow}>Three briefs. Three readers.</p>
            <h1>Choose a reader’s perspective.</h1>
            <p>
              Each sample is a separate brief written for a different person.
              Open one to review the same reading experience with their
              reporting and business context.
            </p>
          </div>
          <nav
            aria-label="Sample reader experiences"
            className={styles.personas}
          >
            {briefs.map((brief, index) => (
              <Link
                key={brief.key}
                href={marketHref(brief.key)}
                className={styles.persona}
              >
                <span className={styles.cardTop}>
                  <span>0{index + 1}</span>
                  <ArrowUpRight size={20} aria-hidden="true" />
                </span>
                <h2>{brief.label}</h2>
                <p className={styles.reader}>{brief.reader}</p>
                <p className={styles.subject}>{title(brief)}</p>
                <span className={styles.open}>
                  Open brief <span aria-hidden="true">→</span>
                </span>
              </Link>
            ))}
          </nav>
          <p className={styles.note}>
            Personalisation is one shared preference profile saved in this
            browser. Switching review samples does not create a separate
            profile.
          </p>
          <section
            className={styles.referenceSection}
            aria-labelledby="references-title"
          >
            <h2 id="references-title">Design references</h2>
            <nav aria-label="Design reference pages" className={styles.pages}>
              {references.map((page) => (
                <Link
                  key={page.href}
                  href={page.href}
                  className={styles.pageLink}
                >
                  <span>
                    <strong>{page.label}</strong>
                    <span>{page.description}</span>
                  </span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </Link>
              ))}
            </nav>
          </section>
        </div>
      </main>
    </div>
  );
}
