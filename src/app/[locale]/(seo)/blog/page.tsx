import type { Metadata } from 'next';
import Link from 'next/link';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SeoJsonLd } from '@/components/seo/SeoJsonLd';
import { BLOG_POSTS } from '@/lib/seo-content';

/* ---------- Static params ---------- */
export function generateStaticParams() {
    return routing.locales.map((locale) => ({ locale }));
}

/* ---------- Metadata ---------- */
export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const baseUrl = 'https://examflow.pro';
    return {
        title: 'Cybersecurity Certification Blog | ExamFlow',
        description:
            'Expert tips, study strategies, and certification insights to help you pass ISC2 and CompTIA exams on your first attempt.',
        alternates: {
            canonical: `${baseUrl}/${locale}/blog`,
            languages: {
                en: `${baseUrl}/en/blog`,
                'pt-BR': `${baseUrl}/pt-BR/blog`,
            },
        },
    };
}

/* ---------- Page ---------- */
export default async function BlogIndexPage({
    params,
}: {
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);

    const structuredData = {
        '@context': 'https://schema.org',
        '@type': 'Blog',
        name: 'ExamFlow Cybersecurity Blog',
        description: 'Expert tips and strategies for passing cybersecurity certifications.',
        publisher: { '@type': 'Organization', name: 'ExamFlow' },
    };

    return (
        <>
            <SeoJsonLd data={structuredData} />
            <Breadcrumbs items={[{ label: 'Home', href: `/${locale}` }, { label: 'Blog' }]} />

            <section className="seo-hero">
                <h1>Cybersecurity Certification Blog</h1>
                <p>
                    Expert strategies, study tips, and industry insights to help you pass your
                    certification exam with confidence.
                </p>
            </section>

            <section className="seo-section">
                <div className="seo-domain-list">
                    {BLOG_POSTS.map((post) => (
                        <Link
                            key={post.slug}
                            href={`/${locale}/blog/${post.slug}`}
                            className="seo-domain-item"
                            style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '0.5rem' }}
                        >
                            <span style={{ fontSize: '0.75rem', opacity: 0.6, textTransform: 'uppercase' }}>
                                {post.category} · {post.readTime}
                            </span>
                            <span className="seo-domain-item__name" style={{ fontSize: '1.1rem' }}>
                                {post.title}
                            </span>
                            <span style={{ fontSize: '0.875rem', opacity: 0.7 }}>
                                {post.excerpt}
                            </span>
                        </Link>
                    ))}
                </div>
            </section>
        </>
    );
}
