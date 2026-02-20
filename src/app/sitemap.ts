import { MetadataRoute } from 'next';
import { CERTS } from '@/lib/seo-data';

const BASE_URL = 'https://examflow.pro';
const LOCALES = ['en', 'pt-BR'] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  // Landing pages + high-value public pages per locale
  const landingPages: MetadataRoute.Sitemap = LOCALES.flatMap((locale) => [
    {
      url: `${BASE_URL}/${locale}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 1,
      alternates: {
        languages: { en: `${BASE_URL}/en`, 'pt-BR': `${BASE_URL}/pt-BR` },
      },
    },
    {
      url: `${BASE_URL}/${locale}/pricing`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.95,
    },
    {
      url: `${BASE_URL}/${locale}/marketplace`,
      lastModified: now,
      changeFrequency: 'daily' as const,
      priority: 0.85,
    },
  ]);

  // Cert hub pages per locale
  const certHubPages: MetadataRoute.Sitemap = CERTS.flatMap((cert) =>
    LOCALES.map((locale) => ({
      url: `${BASE_URL}/${locale}/${cert.slug}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    }))
  );

  // Domain pages (EN only initially)
  const domainPages: MetadataRoute.Sitemap = CERTS.flatMap((cert) =>
    cert.domains.map((domain) => ({
      url: `${BASE_URL}/en/${cert.slug}/${domain.slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    }))
  );

  // Practice question pages (EN only)
  const practicePages: MetadataRoute.Sitemap = CERTS.map((cert) => ({
    url: `${BASE_URL}/en/${cert.slug}/practice-questions`,
    lastModified: now,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  return [...landingPages, ...certHubPages, ...domainPages, ...practicePages];
}
