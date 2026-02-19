import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getCertBySlug, getAllCertSlugs } from '@/lib/seo-data';
import { getStudyPlanData } from '@/lib/seo-content';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SeoJsonLd } from '@/components/seo/SeoJsonLd';
import { EmailCapture } from '@/components/seo/EmailCapture';
import { routing } from '@/i18n/routing';

/* ---------- Static params ---------- */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    getAllCertSlugs().map((cert) => ({ locale, cert }))
  );
}

/* ---------- Metadata ---------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; cert: string }>;
}): Promise<Metadata> {
  const { locale, cert: slug } = await params;
  const cert = getCertBySlug(slug);
  if (!cert) return {};

  const baseUrl = 'https://examflow.pro';
  return {
    title: `${cert.abbreviation} Study Plan — Week-by-Week Guide 2026`,
    description: `Complete ${cert.abbreviation} study plan with weekly milestones, domain priorities, and exam readiness checkpoints. Pass ${cert.abbreviation} on your first attempt.`,
    alternates: {
      canonical: `${baseUrl}/${locale}/${cert.slug}/study-plan`,
    },
  };
}

/* ---------- Page ---------- */
export default async function StudyPlanPage({
  params,
}: {
  params: Promise<{ locale: string; cert: string }>;
}) {
  const { locale, cert: slug } = await params;
  setRequestLocale(locale);

  const cert = getCertBySlug(slug);
  if (!cert) notFound();

  const plan = getStudyPlanData(slug);

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: `${cert.abbreviation} Study Plan`,
    description: `A structured study plan to pass the ${cert.abbreviation} certification exam.`,
    step: plan.weeks.map((week, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: week.title,
      text: week.focus,
    })),
  };

  return (
    <>
      <SeoJsonLd data={structuredData} />
      <Breadcrumbs
        items={[
          { label: 'Home', href: `/${locale}` },
          { label: cert.abbreviation, href: `/${locale}/${cert.slug}` },
          { label: 'Study Plan' },
        ]}
      />

      <section className="seo-hero">
        <h1>{cert.abbreviation} Study Plan — Week-by-Week Guide</h1>
        <p>
          A structured {plan.totalWeeks}-week study plan to pass the{' '}
          {cert.abbreviation} certification. Includes weekly milestones, domain
          priorities, and readiness checkpoints.
        </p>
      </section>

      {/* Overview */}
      <section className="seo-card">
        <h2>Plan Overview</h2>
        <dl className="seo-exam-grid">
          <div>
            <dt>Duration</dt>
            <dd>{plan.totalWeeks} weeks</dd>
          </div>
          <div>
            <dt>Hours/Week</dt>
            <dd>{plan.hoursPerWeek}</dd>
          </div>
          <div>
            <dt>Total Hours</dt>
            <dd>{plan.totalWeeks * plan.hoursPerWeek}</dd>
          </div>
          <div>
            <dt>Domains</dt>
            <dd>{cert.domains.length}</dd>
          </div>
        </dl>
      </section>

      {/* Weekly breakdown */}
      <section className="seo-section">
        <h2>Weekly Breakdown</h2>
        <div className="seo-domain-list">
          {plan.weeks.map((week, i) => (
            <div key={i} className="seo-card" style={{ padding: '1.5rem' }}>
              <h3 style={{ margin: '0 0 0.75rem' }}>{week.title}</h3>
              <p style={{ margin: '0 0 0.75rem', opacity: 0.7 }}>
                {week.focus}
              </p>
              <ul style={{ margin: 0, paddingLeft: '1.25rem' }}>
                {week.tasks.map((task, j) => (
                  <li key={j} style={{ marginBottom: '0.25rem' }}>
                    {task}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Tips */}
      <section className="seo-section">
        <h2>Study Tips</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
            gap: '1.25rem',
          }}
        >
          {plan.tips.map((tip, i) => (
            <div key={i} className="seo-card">
              <h3 style={{ margin: '0 0 0.5rem' }}>{tip.title}</h3>
              <p style={{ margin: 0 }}>{tip.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <div className="seo-cta-banner">
        <p>Start practicing for {cert.abbreviation} with free adaptive exams</p>
        <Link href={`/${locale}/${cert.slug}/practice-questions`}>
          Try Free Practice Questions →
        </Link>
      </div>

      <EmailCapture source="cert-hub" certSlug={cert.slug} />
    </>
  );
}
