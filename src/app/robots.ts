import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: [
          '/dashboard/',
          '/exams/',
          '/questions/',
          '/analytics/',
          '/study/',
          '/marketplace/',
          '/settings/',
          '/admin/',
          '/api/',
          '/login/',
        ],
      },
    ],
    sitemap: 'https://examflow.pro/sitemap.xml',
  };
}
