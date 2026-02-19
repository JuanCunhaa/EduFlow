import { MetadataRoute } from 'next';
import { CERTS } from '@/lib/seo-data';

const BASE_URL = 'https://examflow.pro';
const LOCALES = ['en', 'pt-BR'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [];

  // Landing pages
  for (const locale of LOCALES) {
    pages.push({
      url: `${BASE_URL}/${locale}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: { en: `${BASE_URL}/en`, 'pt-BR': `${BASE_URL}/pt-BR` },
      },
    });
  }

  // Cert hubs
  for (const cert of CERTS) {
    for (const locale of LOCALES) {
      pages.push({
        url: `${BASE_URL}/${locale}/${cert.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.9,
      });
    }

    // Domain pages (EN only initially)
    for (const domain of cert.domains) {
      pages.push({
        url: `${BASE_URL}/en/${cert.slug}/${domain.slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }

    // Practice question pages
    pages.push({
      url: `${BASE_URL}/en/${cert.slug}/practice-questions`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    });
  }

  return pages;
}
