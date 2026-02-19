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
        title: `${cert.abbreviation} Exam Format Explained — ${cert.examDetails.format}`,
        description: `Everything you need to know about the ${cert.abbreviation} exam format: ${cert.examDetails.format}, ${cert.examDetails.questions} questions in ${cert.examDetails.duration}. Passing score, prerequisites, and tips.`,
        alternates: {
            canonical: `${baseUrl}/${locale}/${cert.slug}/exam-format`,
        },
    };
}

/* ---------- Page ---------- */
export default async function ExamFormatPage({
    params,
}: {
    params: Promise<{ locale: string; cert: string }>;
}) {
    const { locale, cert: slug } = await params;
    setRequestLocale(locale);

    const cert = getCertBySlug(slug);
    if (!cert) notFound();

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: [
            {
                '@type': 'Question',
                name: `How many questions are on the ${cert.abbreviation} exam?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `The ${cert.abbreviation} exam has ${cert.examDetails.questions} questions. The exam duration is ${cert.examDetails.duration} with a passing score of ${cert.examDetails.passingScore}.`,
                },
            },
            {
                '@type': 'Question',
                name: `What format is the ${cert.abbreviation} exam?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `The ${cert.abbreviation} exam uses ${cert.examDetails.format}. ${cert.examDetails.format === 'Computerized Adaptive Testing' ? 'The difficulty adjusts based on your performance — correct answers lead to harder questions.' : 'All candidates receive the same set of questions in a fixed order.'}`,
                },
            },
            {
                '@type': 'Question',
                name: `What is the ${cert.abbreviation} passing score?`,
                acceptedAnswer: {
                    '@type': 'Answer',
                    text: `The passing score for ${cert.abbreviation} is ${cert.examDetails.passingScore}. The exam costs ${cert.examDetails.cost}.`,
                },
            },
        ],
    };

    const isCAT = cert.examDetails.format === 'Computerized Adaptive Testing';

    return (
        <>
            <SeoJsonLd data={structuredData} />
            <Breadcrumbs
                items={[
                    { label: 'Home', href: `/${locale}` },
                    { label: cert.abbreviation, href: `/${locale}/${cert.slug}` },
                    { label: 'Exam Format' },
                ]}
            />

            <section className="seo-hero">
                <h1>{cert.abbreviation} Exam Format Explained</h1>
                <p>
                    Everything you need to know about the {cert.abbreviation} exam structure,
                    format, and what to expect on test day.
                </p>
            </section>

            {/* Key facts */}
            <section className="seo-card">
                <h2>Exam Details at a Glance</h2>
                <dl className="seo-exam-grid">
                    <div><dt>Duration</dt><dd>{cert.examDetails.duration}</dd></div>
                    <div><dt>Questions</dt><dd>{cert.examDetails.questions}</dd></div>
                    <div><dt>Format</dt><dd>{cert.examDetails.format}</dd></div>
                    <div><dt>Passing Score</dt><dd>{cert.examDetails.passingScore}</dd></div>
                    <div><dt>Cost</dt><dd>{cert.examDetails.cost}</dd></div>
                    <div><dt>Prerequisites</dt><dd>{cert.examDetails.prerequisites}</dd></div>
                </dl>
            </section>

            {/* Format explanation */}
            <section className="seo-section">
                <h2>How {cert.examDetails.format} Works</h2>
                <div className="seo-card" style={{ padding: '1.5rem' }}>
                    {isCAT ? (
                        <>
                            <p style={{ lineHeight: 1.7 }}>
                                The {cert.abbreviation} exam uses <strong>Computerized Adaptive Testing (CAT)</strong>.
                                Unlike traditional linear exams, CAT dynamically adjusts the difficulty of questions based on
                                your performance throughout the exam.
                            </p>
                            <p style={{ lineHeight: 1.7 }}>
                                When you answer a question correctly, the next question will be harder. When you answer
                                incorrectly, the next question will be easier. The exam engine uses this pattern to efficiently
                                determine your true competency level with fewer questions.
                            </p>
                            <p style={{ lineHeight: 1.7 }}>
                                You may be asked between {cert.examDetails.questions} questions. The exam ends when the engine
                                has enough confidence in your pass/fail determination, or when you reach the maximum question count.
                            </p>
                        </>
                    ) : (
                        <>
                            <p style={{ lineHeight: 1.7 }}>
                                The {cert.abbreviation} exam uses a <strong>linear format</strong>. All candidates receive the
                                same number of questions ({cert.examDetails.questions}) in a fixed sequence. This means you can
                                review and change your answers before submitting.
                            </p>
                            <p style={{ lineHeight: 1.7 }}>
                                Time management is critical — you have {cert.examDetails.duration} to answer all{' '}
                                {cert.examDetails.questions} questions, so pace yourself accordingly.
                            </p>
                        </>
                    )}
                </div>
            </section>

            {/* Domain weights */}
            <section className="seo-section">
                <h2>Domain Weights</h2>
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

            {/* Test day tips */}
            <section className="seo-section">
                <h2>Test Day Tips</h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.25rem' }}>
                    <div className="seo-card">
                        <h3 style={{ margin: '0 0 0.5rem' }}>⏱️ Time Management</h3>
                        <p style={{ margin: 0 }}>
                            {isCAT
                                ? 'In CAT, don\'t rush — each question matters. You can finish in 100 questions if you answer accurately.'
                                : `Budget ${Math.round(parseInt(cert.examDetails.duration) * 60 / parseInt(cert.examDetails.questions))} minutes per question. Mark difficult ones and come back.`
                            }
                        </p>
                    </div>
                    <div className="seo-card">
                        <h3 style={{ margin: '0 0 0.5rem' }}>🎯 First Question Strategy</h3>
                        <p style={{ margin: 0 }}>
                            Read each question stem carefully. Eliminate obviously wrong answers first, then choose the BEST answer — not just a correct one.
                        </p>
                    </div>
                    <div className="seo-card">
                        <h3 style={{ margin: '0 0 0.5rem' }}>🧘 Stay Calm</h3>
                        <p style={{ margin: 0 }}>
                            {isCAT
                                ? 'Getting harder questions is a GOOD sign in CAT — it means you\'re performing well.'
                                : 'Take the optional break if available. A clear mind performs better on the remaining questions.'
                            }
                        </p>
                    </div>
                </div>
            </section>

            <div className="seo-cta-banner">
                <p>Practice the real {cert.abbreviation} exam format</p>
                <Link href={`/${locale}/${cert.slug}/practice-questions`}>
                    Try Free Practice Questions →
                </Link>
            </div>
        </>
    );
}
