import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { getCertBySlug, getAllCertSlugs } from '@/lib/seo-data';
import { getQuizQuestions } from '@/lib/quiz-questions';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SeoJsonLd } from '@/components/seo/SeoJsonLd';
import { FreeQuiz } from '@/components/seo/FreeQuiz';
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
        title: `Free ${cert.abbreviation} Practice Questions`,
        description: `Test your ${cert.abbreviation} knowledge with free practice questions covering all ${cert.domains.length} domains. Get instant feedback and explanations.`,
        alternates: {
            canonical: `${baseUrl}/${locale}/${cert.slug}/practice-questions`,
        },
        openGraph: {
            title: `Free ${cert.abbreviation} Practice Questions`,
            description: `Test your ${cert.abbreviation} knowledge with free practice questions.`,
        },
    };
}

/* ---------- Page ---------- */
export default async function PracticeQuestionsPage({
    params,
}: {
    params: Promise<{ locale: string; cert: string }>;
}) {
    const { locale, cert: slug } = await params;
    setRequestLocale(locale);

    const cert = getCertBySlug(slug);
    if (!cert) notFound();

    const questions = getQuizQuestions(cert.slug);

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Quiz',
        name: `Free ${cert.abbreviation} Practice Questions`,
        about: { '@type': 'Thing', name: `${cert.name} Certification` },
        educationalLevel: 'Professional',
        assesses: 'Information Security',
    };

    return (
        <>
            <SeoJsonLd data={structuredData} />

            <Breadcrumbs
                items={[
                    { label: 'Home', href: `/${locale}` },
                    { label: cert.abbreviation, href: `/${locale}/${cert.slug}` },
                    { label: 'Practice Questions' },
                ]}
            />

            {/* Hero */}
            <section className="seo-hero">
                <h1>Free {cert.abbreviation} Practice Questions</h1>
                <p>
                    Test your knowledge with {questions.length} free {cert.abbreviation} practice questions
                    covering key domains. Get instant feedback and detailed explanations.
                </p>
            </section>

            {/* Quiz client island */}
            <FreeQuiz questions={questions} certAbbr={cert.abbreviation} locale={locale} />

            {/* Static section — SEO content */}
            <section className="seo-section">
                <h2>About These Questions</h2>
                <p>
                    These practice questions are designed to mirror the format and difficulty of the actual{' '}
                    {cert.abbreviation} certification exam. Each question comes with a detailed explanation
                    to help you understand the underlying concepts, not just memorize answers.
                </p>
                <p>
                    The questions cover key concepts across {cert.domains.length} domains, helping you identify
                    areas where you need additional study. For full practice exam simulations with adaptive
                    difficulty and performance analytics, create a free ExamFlow account.
                </p>
            </section>

            {/* Domain links */}
            <section className="seo-section">
                <h2>{cert.abbreviation} Exam Domains</h2>
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

            {/* Bottom CTA */}
            <div className="seo-cta-banner">
                <p>Want more? Get 500+ adaptive practice questions with analytics.</p>
                <Link href={`/${locale}/login`}>Create Free Account →</Link>
            </div>
        </>
    );
}
