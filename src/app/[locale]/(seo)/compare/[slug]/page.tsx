import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SeoJsonLd } from '@/components/seo/SeoJsonLd';
import { COMPARISONS, getComparison } from '@/lib/seo-content';

/* ---------- Static params ---------- */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    COMPARISONS.map((c) => ({ locale, slug: c.slug }))
  );
}

/* ---------- Metadata ---------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const comp = getComparison(slug);
  if (!comp) return {};

  const baseUrl = 'https://examflow.pro';
  return {
    title: comp.metaTitle,
    description: comp.metaDescription,
    alternates: {
      canonical: `${baseUrl}/${locale}/compare/${comp.slug}`,
    },
  };
}

/* ---------- Page ---------- */
export default async function ComparisonPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const comp = getComparison(slug);
  if (!comp) notFound();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: comp.title,
    description: comp.metaDescription,
    author: { '@type': 'Organization', name: 'ExamFlow' },
  };

  return (
    <>
      <SeoJsonLd data={structuredData} />
      <Breadcrumbs
        items={[
          { label: 'Home', href: `/${locale}` },
          { label: 'Comparisons', href: `/${locale}/compare` },
          { label: comp.title },
        ]}
      />

      <section className="seo-hero">
        <h1>{comp.title}</h1>
        <p>{comp.metaDescription}</p>
      </section>

      {/* Comparison table */}
      <section className="seo-card" style={{ overflowX: 'auto' }}>
        <h2>Feature Comparison</h2>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '0.9rem',
          }}
        >
          <thead>
            <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
              <th style={{ textAlign: 'left', padding: '0.75rem' }}>Feature</th>
              {comp.products.map((p) => (
                <th
                  key={p.name}
                  style={{ textAlign: 'center', padding: '0.75rem' }}
                >
                  {p.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comp.features.map((feature, i) => (
              <tr
                key={i}
                style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}
              >
                <td style={{ padding: '0.75rem', fontWeight: 500 }}>
                  {feature.name}
                </td>
                {feature.values.map((val, j) => (
                  <td
                    key={j}
                    style={{ textAlign: 'center', padding: '0.75rem' }}
                  >
                    {val === true ? '✅' : val === false ? '❌' : val}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* Verdict sections */}
      {comp.sections.map((section, i) => (
        <section key={i} className="seo-card" style={{ marginTop: '1.5rem' }}>
          <h2>{section.heading}</h2>
          {section.paragraphs.map((p, j) => (
            <p key={j} style={{ lineHeight: 1.7, marginBottom: '1rem' }}>
              {p}
            </p>
          ))}
        </section>
      ))}

      {/* CTA */}
      <div className="seo-cta-banner">
        <p>See how ExamFlow compares — try it free</p>
        <Link href={`/${locale}/login`}>Get Started Free →</Link>
      </div>
    </>
  );
}
