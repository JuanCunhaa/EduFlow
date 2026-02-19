import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getCertBySlug, getAllCertSlugs } from '@/lib/seo-data';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SeoJsonLd } from '@/components/seo/SeoJsonLd';
import { routing } from '@/i18n/routing';

/* ---------- Static params ---------- */
export function generateStaticParams() {
    return routing.locales.flatMap((locale) =>
        getAllCertSlugs().map((cert) => ({ locale, cert })),
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
        title: cert.metaTitle,
        description: cert.metaDescription,
        alternates: {
            canonical: `${baseUrl}/${locale}/${cert.slug}`,
            languages: {
                en: `${baseUrl}/en/${cert.slug}`,
                'pt-BR': `${baseUrl}/pt-BR/${cert.slug}`,
            },
        },
        openGraph: {
            title: cert.metaTitle,
            description: cert.metaDescription,
            url: `${baseUrl}/${locale}/${cert.slug}`,
        },
    };
}

/* ---------- Page ---------- */
export default async function CertHubPage({
    params,
}: {
    params: Promise<{ locale: string; cert: string }>;
}) {
    const { locale, cert: slug } = await params;
    setRequestLocale(locale);

    const cert = getCertBySlug(slug);
    if (!cert) notFound();

    /* ---- Structured data ---- */
    const structuredData = [
        {
            '@context': 'https://schema.org',
            '@type': 'Course',
            name: `${cert.abbreviation} Practice Exam Preparation`,
            description: cert.metaDescription,
            provider: { '@type': 'Organization', name: 'ExamFlow' },
            hasCourseInstance: {
                '@type': 'CourseInstance',
                courseMode: 'online',
            },
        },
        {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: cert.faqItems.map((faq) => ({
                '@type': 'Question',
                name: faq.question,
                acceptedAnswer: { '@type': 'Answer', text: faq.answer },
            })),
        },
    ];

    return (
        <>
            <SeoJsonLd data={structuredData} />

            {/* Breadcrumbs */}
            <Breadcrumbs
                items={[
                    { label: 'Home', href: `/${locale}` },
                    { label: cert.abbreviation },
                ]}
            />

            {/* Hero */}
            <section className="seo-hero">
                <h1>{cert.abbreviation} Practice Questions &amp; Study Guide</h1>
                <p>{cert.metaDescription}</p>
                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem', flexWrap: 'wrap' }}>
                    <Link href={`/${locale}/${cert.slug}/practice-questions`} className="seo-nav__cta">
                        Try Free Practice Questions
                    </Link>
                    <Link href={`/${locale}/login`} className="seo-nav__cta" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)' }}>
                        Start Study Plan
                    </Link>
                </div>
            </section>

            {/* Exam overview */}
            <section className="seo-card">
                <h2>{cert.abbreviation} Exam Overview</h2>
                <dl className="seo-exam-grid">
                    <div><dt>Duration</dt><dd>{cert.examDetails.duration}</dd></div>
                    <div><dt>Questions</dt><dd>{cert.examDetails.questions}</dd></div>
                    <div><dt>Format</dt><dd>{cert.examDetails.format}</dd></div>
                    <div><dt>Passing</dt><dd>{cert.examDetails.passingScore}</dd></div>
                    <div><dt>Cost</dt><dd>{cert.examDetails.cost}</dd></div>
                    <div><dt>Prerequisites</dt><dd>{cert.examDetails.prerequisites}</dd></div>
                </dl>
            </section>

            {/* Domains */}
            <section className="seo-section">
                <h2>{cert.abbreviation} Domains</h2>
                <div className="seo-domain-list">
                    {cert.domains.map((domain) => (
                        <Link
                            key={domain.slug}
                            href={`/${locale}/${cert.slug}/${domain.slug}`}
                            className="seo-domain-item"
                        >
                            <span className="seo-domain-item__number">D{domain.domainNumber}</span>
                            <span className="seo-domain-item__name">{domain.name}</span>
                            <span className="seo-domain-item__weight">{domain.examWeight}</span>
                        </Link>
                    ))}
                </div>
            </section>

            {/* Why ExamFlow */}
            <section className="seo-section">
                <h2>Why Practice with ExamFlow?</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    <div className="seo-card">
                        <h3 style={{ margin: '0 0 0.5rem' }}>🎯 Adaptive Engine</h3>
                        <p style={{ margin: 0 }}>
                            Practice exams that automatically target your weak domains. Focus your study time where it matters most.
                        </p>
                    </div>
                    <div className="seo-card">
                        <h3 style={{ margin: '0 0 0.5rem' }}>🔄 Spaced Repetition</h3>
                        <p style={{ margin: 0 }}>
                            SM-2 algorithm schedules reviews at optimal intervals so you never forget what you&apos;ve learned.
                        </p>
                    </div>
                    <div className="seo-card">
                        <h3 style={{ margin: '0 0 0.5rem' }}>📊 Performance Analytics</h3>
                        <p style={{ margin: 0 }}>
                            Readiness score, domain weakness analysis, and a personalized study plan to pass on your first attempt.
                        </p>
                    </div>
                </div>
            </section>

            {/* FAQ */}
            <section className="seo-section">
                <h2>Frequently Asked Questions</h2>
                <div className="seo-faq">
                    {cert.faqItems.map((faq, i) => (
                        <details key={i}>
                            <summary>{faq.question}</summary>
                            <p className="seo-faq__answer">{faq.answer}</p>
                        </details>
                    ))}
                </div>
            </section>

            {/* Bottom CTA */}
            <div className="seo-cta-banner">
                <p>Ready to start practicing for {cert.abbreviation}?</p>
                <Link href={`/${locale}/${cert.slug}/practice-questions`}>
                    Try Free Practice Questions →
                </Link>
            </div>
        </>
    );
}
