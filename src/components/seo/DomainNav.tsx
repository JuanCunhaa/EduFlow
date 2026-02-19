import Link from 'next/link';
import type { CertSeoData, DomainSeoData } from '@/lib/seo-data';

/**
 * Previous / Next domain navigation at the bottom of domain pages.
 */
export function DomainNav({
    locale,
    cert,
    currentDomain,
}: Readonly<{
    locale: string;
    cert: CertSeoData;
    currentDomain: DomainSeoData;
}>) {
    const idx = cert.domains.findIndex((d) => d.slug === currentDomain.slug);
    const prev = idx > 0 ? cert.domains[idx - 1] : null;
    const next = idx < cert.domains.length - 1 ? cert.domains[idx + 1] : null;

    return (
        <nav className="seo-domain-nav">
            {prev ? (
                <Link href={`/${locale}/${cert.slug}/${prev.slug}`}>
                    ← Domain {prev.domainNumber}: {prev.name}
                </Link>
            ) : (
                <Link href={`/${locale}/${cert.slug}`}>← All {cert.abbreviation} Domains</Link>
            )}
            {next ? (
                <Link href={`/${locale}/${cert.slug}/${next.slug}`}>
                    Domain {next.domainNumber}: {next.name} →
                </Link>
            ) : (
                <Link href={`/${locale}/${cert.slug}`}>All {cert.abbreviation} Domains →</Link>
            )}
        </nav>
    );
}
