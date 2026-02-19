import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import {
  getCertBySlug,
  getDomainBySlug,
  getAllDomainParams,
} from '@/lib/seo-data';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SeoJsonLd } from '@/components/seo/SeoJsonLd';
import { DomainNav } from '@/components/seo/DomainNav';
import { routing } from '@/i18n/routing';

/* ---------- Static params ---------- */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getAllDomainParams().map((p) => ({ locale, ...p }))
  );
}

/* ---------- Metadata ---------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; cert: string; domain: string }>;
}): Promise<Metadata> {
  const { locale, cert: certSlug, domain: domainSlug } = await params;
  const domain = getDomainBySlug(certSlug, domainSlug);
  const cert = getCertBySlug(certSlug);
  if (!domain || !cert) return {};

  const baseUrl = 'https://examflow.pro';
  return {
    title: domain.metaTitle,
    description: domain.metaDescription,
    alternates: {
      canonical: `${baseUrl}/${locale}/${cert.slug}/${domain.slug}`,
    },
    openGraph: {
      title: domain.metaTitle,
      description: domain.metaDescription,
    },
  };
}

/* ---------- Page ---------- */
export default async function DomainPage({
  params,
}: {
  params: Promise<{ locale: string; cert: string; domain: string }>;
}) {
  const { locale, cert: certSlug, domain: domainSlug } = await params;
  setRequestLocale(locale);

  const cert = getCertBySlug(certSlug);
  const domain = getDomainBySlug(certSlug, domainSlug);
  if (!cert || !domain) notFound();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: domain.metaTitle,
    description: domain.metaDescription,
    author: { '@type': 'Organization', name: 'ExamFlow' },
  };

  return (
    <>
      <SeoJsonLd data={structuredData} />

      <Breadcrumbs
        items={[
          { label: 'Home', href: `/${locale}` },
          { label: cert.abbreviation, href: `/${locale}/${cert.slug}` },
          { label: `Domain ${domain.domainNumber}: ${domain.name}` },
        ]}
      />

      {/* Hero */}
      <section className="seo-hero">
        <h1>
          {cert.abbreviation} Domain {domain.domainNumber}: {domain.name}
        </h1>
        <p>{domain.metaDescription}</p>

        <div
          className="seo-card"
          style={{
            marginTop: '1.25rem',
            display: 'inline-flex',
            gap: '2rem',
            flexWrap: 'wrap',
          }}
        >
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Exam Weight
            </span>
            <p
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#8b5cf6',
                margin: 0,
              }}
            >
              {domain.examWeight}
            </p>
          </div>
          <div>
            <span
              style={{
                fontSize: '0.75rem',
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
              }}
            >
              Domain
            </span>
            <p
              style={{
                fontSize: '1.5rem',
                fontWeight: 700,
                color: '#fff',
                margin: 0,
              }}
            >
              {domain.domainNumber} of {cert.domains.length}
            </p>
          </div>
        </div>
      </section>

      {/* Key Topics */}
      <section className="seo-section">
        <h2>What You&apos;ll Learn</h2>
        <div className="seo-topic-chips">
          {domain.keyTopics.map((topic) => (
            <span key={topic} className="seo-topic-chip">
              {topic}
            </span>
          ))}
        </div>
      </section>

      {/* Key Concepts — placeholder for content */}
      <section className="seo-section">
        <h2>Key Concepts</h2>
        <p>
          {cert.abbreviation} Domain {domain.domainNumber} — {domain.name} —
          accounts for <strong>{domain.examWeight}</strong> of the exam.
          Mastering this domain requires understanding the core topics and their
          practical applications in real-world security scenarios.
        </p>
        {domain.keyTopics.slice(0, 3).map((topic) => (
          <div key={topic}>
            <h3>{topic}</h3>
            <p>
              This topic covers the essential principles and frameworks related
              to {topic.toLowerCase()} as they apply to the {cert.abbreviation}{' '}
              certification exam. Understanding this area is critical for both
              the exam and professional practice.
            </p>
          </div>
        ))}
      </section>

      {/* Study Tips */}
      <section className="seo-section">
        <h2>Study Tips for Domain {domain.domainNumber}</h2>
        <ul>
          <li>
            Focus on understanding concepts rather than memorizing facts — the{' '}
            {cert.abbreviation} exam tests application of knowledge.
          </li>
          <li>
            Practice with domain-specific questions to identify weak areas
            early.
          </li>
          <li>
            Use spaced repetition to retain key terms and frameworks over time.
          </li>
          <li>
            Relate each topic to real-world scenarios you&apos;ve encountered in
            your career.
          </li>
          <li>
            Review official study materials alongside practice exams for
            comprehensive coverage.
          </li>
        </ul>
      </section>

      {/* CTA */}
      <div className="seo-cta-banner">
        <p>
          Practice {cert.abbreviation} Domain {domain.domainNumber} questions
        </p>
        <Link href={`/${locale}/${cert.slug}/practice-questions`}>
          Start Free Practice →
        </Link>
      </div>

      {/* Prev / Next */}
      <DomainNav locale={locale} cert={cert} currentDomain={domain} />
    </>
  );
}
