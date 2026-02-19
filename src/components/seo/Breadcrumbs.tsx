import Link from 'next/link';
import { SeoJsonLd } from './SeoJsonLd';

const BASE_URL = 'https://examflow.pro';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

/**
 * Visible breadcrumb navigation + JSON-LD BreadcrumbList schema.
 * Last item renders as plain text (current page).
 */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  const structuredData = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.label,
      ...(item.href ? { item: `${BASE_URL}${item.href}` } : {}),
    })),
  };

  return (
    <>
      <SeoJsonLd data={structuredData} />
      <nav aria-label="Breadcrumb" className="seo-breadcrumbs">
        <ol>
          {items.map((item, i) => (
            <li key={i}>
              {i > 0 && (
                <span className="seo-breadcrumbs__sep" aria-hidden="true">
                  ›
                </span>
              )}
              {item.href ? (
                <Link href={item.href}>{item.label}</Link>
              ) : (
                <span aria-current="page">{item.label}</span>
              )}
            </li>
          ))}
        </ol>
      </nav>
    </>
  );
}
