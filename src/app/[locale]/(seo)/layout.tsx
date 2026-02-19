import Link from 'next/link';
import type { Metadata } from 'next';
import { getTranslations, setRequestLocale } from 'next-intl/server';
import { CERTS } from '@/lib/seo-data';
import './seo.css';

export async function generateMetadata({
    params,
}: {
    params: Promise<{ locale: string }>;
}): Promise<Metadata> {
    const { locale } = await params;
    const t = await getTranslations({ locale, namespace: 'metadata' });
    const baseUrl = 'https://examflow.pro';

    return {
        metadataBase: new URL(baseUrl),
        title: {
            template: '%s | ExamFlow',
            default: t('title'),
        },
        description: t('description'),
        openGraph: {
            type: 'website',
            locale: locale === 'pt-BR' ? 'pt_BR' : 'en_US',
            siteName: 'ExamFlow',
        },
        twitter: { card: 'summary_large_image' },
        alternates: {
            canonical: `${baseUrl}/${locale}`,
            languages: { en: `${baseUrl}/en`, 'pt-BR': `${baseUrl}/pt-BR` },
        },
        robots: { index: true, follow: true },
    };
}

export default async function SeoLayout({
    children,
    params,
}: {
    children: React.ReactNode;
    params: Promise<{ locale: string }>;
}) {
    const { locale } = await params;
    setRequestLocale(locale);

    return (
        <div className="seo-shell">
            {/* ---- Nav ---- */}
            <header className="seo-nav">
                <div className="seo-nav__inner">
                    <Link href={`/${locale}`} className="seo-nav__logo">
                        ExamFlow
                    </Link>

                    <nav className="seo-nav__links" aria-label="Certification navigation">
                        {CERTS.slice(0, 3).map((cert) => (
                            <Link key={cert.slug} href={`/${locale}/${cert.slug}`} className="seo-nav__link">
                                {cert.abbreviation}
                            </Link>
                        ))}
                    </nav>

                    <Link href={`/${locale}/login`} className="seo-nav__cta">
                        Get Started Free
                    </Link>
                </div>
            </header>

            {/* ---- Content ---- */}
            <main className="seo-main">{children}</main>

            {/* ---- Footer ---- */}
            <footer className="seo-footer">
                <div className="seo-footer__inner">
                    <div className="seo-footer__col">
                        <h4>Certifications</h4>
                        <ul>
                            {CERTS.map((cert) => (
                                <li key={cert.slug}>
                                    <Link href={`/${locale}/${cert.slug}`}>{cert.abbreviation} Practice</Link>
                                </li>
                            ))}
                        </ul>
                    </div>
                    <div className="seo-footer__col">
                        <h4>Resources</h4>
                        <ul>
                            <li><Link href={`/${locale}/cissp/practice-questions`}>Free Practice Questions</Link></li>
                            <li><Link href={`/${locale}/cissp/domain-1-security-and-risk-management`}>Study Guides</Link></li>
                        </ul>
                    </div>
                    <div className="seo-footer__col">
                        <h4>Company</h4>
                        <ul>
                            <li><Link href={`/${locale}/login`}>Login</Link></li>
                        </ul>
                    </div>
                </div>
                <div className="seo-footer__bottom">
                    <p>© {new Date().getFullYear()} ExamFlow. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
