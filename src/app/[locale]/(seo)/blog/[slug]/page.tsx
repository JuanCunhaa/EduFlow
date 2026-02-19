import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { setRequestLocale } from 'next-intl/server';
import { routing } from '@/i18n/routing';
import { Breadcrumbs } from '@/components/seo/Breadcrumbs';
import { SeoJsonLd } from '@/components/seo/SeoJsonLd';
import { BLOG_POSTS, getBlogPost } from '@/lib/seo-content';
import { EmailCapture } from '@/components/seo/EmailCapture';

/* ---------- Static params ---------- */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    BLOG_POSTS.map((post) => ({ locale, slug: post.slug }))
  );
}

/* ---------- Metadata ---------- */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const post = getBlogPost(slug);
  if (!post) return {};

  const baseUrl = 'https://examflow.pro';
  return {
    title: post.metaTitle,
    description: post.excerpt,
    alternates: {
      canonical: `${baseUrl}/${locale}/blog/${post.slug}`,
    },
    openGraph: {
      title: post.metaTitle,
      description: post.excerpt,
      type: 'article',
      publishedTime: post.publishedAt,
    },
  };
}

/* ---------- Page ---------- */
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const post = getBlogPost(slug);
  if (!post) notFound();

  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: post.title,
    description: post.excerpt,
    datePublished: post.publishedAt,
    author: { '@type': 'Organization', name: 'ExamFlow' },
    publisher: { '@type': 'Organization', name: 'ExamFlow' },
  };

  return (
    <>
      <SeoJsonLd data={structuredData} />
      <Breadcrumbs
        items={[
          { label: 'Home', href: `/${locale}` },
          { label: 'Blog', href: `/${locale}/blog` },
          { label: post.title },
        ]}
      />

      <article className="seo-section" style={{ maxWidth: '720px' }}>
        <header style={{ marginBottom: '2rem' }}>
          <span
            style={{
              fontSize: '0.75rem',
              opacity: 0.6,
              textTransform: 'uppercase',
            }}
          >
            {post.category} · {post.readTime} · {post.publishedAt}
          </span>
          <h1 style={{ marginTop: '0.75rem' }}>{post.title}</h1>
          <p style={{ fontSize: '1.125rem', opacity: 0.75 }}>{post.excerpt}</p>
        </header>

        {/* Render content sections */}
        {post.sections.map((section, i) => (
          <section
            key={i}
            className="seo-card"
            style={{ marginBottom: '1.5rem' }}
          >
            <h2>{section.heading}</h2>
            {section.paragraphs.map((p, j) => (
              <p key={j} style={{ lineHeight: 1.7, marginBottom: '1rem' }}>
                {p}
              </p>
            ))}
          </section>
        ))}

        {/* Related cert CTA */}
        {post.relatedCert && (
          <div className="seo-cta-banner">
            <p>Ready to practice for {post.relatedCert.toUpperCase()}?</p>
            <Link href={`/${locale}/${post.relatedCert}/practice-questions`}>
              Try Free Practice Questions →
            </Link>
          </div>
        )}
      </article>

      {/* Email capture */}
      <EmailCapture
        source="blog-post"
        certSlug={post.relatedCert ?? 'general'}
      />
    </>
  );
}
