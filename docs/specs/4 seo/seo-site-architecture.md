# SEO Site Architecture

> Status: DRAFT
> Date: 2026-02-12
> Role: Technical SEO Lead
> Stack: Next.js 16 + next-intl (en, pt-BR) + Vercel
> Dependency: `seo-strategy.md`

---

## 1. URL Hierarchy

### 1.1 Complete URL Map

```
examflow.com
├── /en/                                        ← Landing page (SSR)
│   ├── /en/cissp/                              ← CISSP certification hub
│   │   ├── /en/cissp/domain-1-security-and-risk-management/
│   │   ├── /en/cissp/domain-2-asset-security/
│   │   ├── /en/cissp/domain-3-security-architecture-and-engineering/
│   │   ├── /en/cissp/domain-4-communication-and-network-security/
│   │   ├── /en/cissp/domain-5-identity-and-access-management/
│   │   ├── /en/cissp/domain-6-security-assessment-and-testing/
│   │   ├── /en/cissp/domain-7-security-operations/
│   │   ├── /en/cissp/domain-8-software-development-security/
│   │   ├── /en/cissp/practice-questions/       ← Free quiz lead magnet
│   │   ├── /en/cissp/study-plan/               ← Study plan guide
│   │   └── /en/cissp/exam-format/              ← CAT format explainer
│   │
│   ├── /en/cc/                                 ← CC certification hub
│   │   ├── /en/cc/domain-1-security-principles/
│   │   ├── /en/cc/domain-2-business-continuity/
│   │   ├── /en/cc/domain-3-access-controls/
│   │   ├── /en/cc/domain-4-network-security/
│   │   ├── /en/cc/domain-5-security-operations/
│   │   ├── /en/cc/practice-questions/
│   │   └── /en/cc/study-plan/
│   │
│   ├── /en/sscp/                               ← SSCP certification hub
│   │   ├── /en/sscp/domain-[1-7]-*/
│   │   ├── /en/sscp/practice-questions/
│   │   └── /en/sscp/study-plan/
│   │
│   ├── /en/ccsp/                               ← CCSP certification hub
│   │   ├── /en/ccsp/domain-[1-6]-*/
│   │   ├── /en/ccsp/practice-questions/
│   │   └── /en/ccsp/study-plan/
│   │
│   ├── /en/cgrc/                               ← CGRC certification hub
│   │   ├── /en/cgrc/domain-[1-7]-*/
│   │   ├── /en/cgrc/practice-questions/
│   │   └── /en/cgrc/study-plan/
│   │
│   ├── /en/compare/                            ← Comparison hub
│   │   ├── /en/compare/boson-vs-examflow/
│   │   ├── /en/compare/pocket-prep-vs-examflow/
│   │   ├── /en/compare/cccure-vs-examflow/
│   │   ├── /en/compare/best-cissp-practice-exams/
│   │   ├── /en/compare/cissp-vs-sscp/
│   │   └── /en/compare/cc-vs-cissp/
│   │
│   ├── /en/blog/                               ← Blog index
│   │   ├── /en/blog/cissp-study-plan-3-months/
│   │   ├── /en/blog/how-to-pass-cissp-first-time/
│   │   ├── /en/blog/cissp-cat-exam-tips/
│   │   └── ... (see content calendar)
│   │
│   ├── /en/exam-modes/                         ← Exam mode explainers
│   │   ├── /en/exam-modes/practice/
│   │   ├── /en/exam-modes/weak-domains/
│   │   ├── /en/exam-modes/spaced-review/
│   │   └── /en/exam-modes/real-mix/
│   │
│   ├── /en/login/                              ← Login page
│   ├── /en/dashboard/                          ← (Auth-gated, noindex)
│   ├── /en/exams/                              ← (Auth-gated, noindex)
│   ├── /en/questions/                          ← (Auth-gated, noindex)
│   ├── /en/analytics/                          ← (Auth-gated, noindex)
│   ├── /en/marketplace/                        ← (Auth-gated, noindex)
│   └── /en/study/                              ← (Auth-gated, noindex)
│
└── /pt-BR/                                     ← Portuguese mirror (priority pages only)
    ├── /pt-BR/cissp/
    ├── /pt-BR/cc/
    └── /pt-BR/blog/  (top 5 posts only)
```

### 1.2 Page Count

| Category | EN Pages | PT-BR Pages | Total |
|----------|----------|-------------|-------|
| Cert hub pages | 5 | 5 | 10 |
| Domain pages | 33 | 0 (later) | 33 |
| Practice question pages | 5 | 2 | 7 |
| Study plan guides | 5 | 2 | 7 |
| Exam format pages | 1 (CISSP CAT) | 0 | 1 |
| Comparison pages | 6 | 0 | 6 |
| Blog posts (90 days) | 15 | 5 | 20 |
| Exam mode explainers | 4 | 0 | 4 |
| Landing page | 1 | 1 | 2 |
| **Total** | **75** | **15** | **90** |

---

## 2. Next.js Route Structure

### 2.1 New App Router Directories

```
src/app/[locale]/
├── (landing)/                      ← EXISTING (needs SSR fix)
│   ├── layout.tsx
│   └── page.tsx
├── (seo)/                          ← NEW: public SEO pages group
│   ├── layout.tsx                  ← Shared layout: nav, footer, no sidebar
│   ├── [cert]/                     ← Dynamic: cissp, cc, sscp, ccsp, cgrc
│   │   ├── page.tsx               ← Cert hub
│   │   ├── [domain]/              ← Dynamic: domain-1-security-and-risk-management
│   │   │   └── page.tsx           ← Domain deep-dive
│   │   ├── practice-questions/
│   │   │   └── page.tsx           ← Free quiz page
│   │   ├── study-plan/
│   │   │   └── page.tsx           ← Study plan guide
│   │   └── exam-format/
│   │       └── page.tsx           ← Exam format explainer (CISSP only has CAT)
│   ├── compare/
│   │   ├── page.tsx               ← Comparison index
│   │   └── [slug]/
│   │       └── page.tsx           ← Individual comparison
│   ├── blog/
│   │   ├── page.tsx               ← Blog index
│   │   └── [slug]/
│   │       └── page.tsx           ← Blog post
│   └── exam-modes/
│       ├── page.tsx               ← Exam modes overview
│       └── [mode]/
│           └── page.tsx           ← Individual mode explainer
├── login/
├── dashboard/
├── exams/
├── ...
```

### 2.2 Route Group `(seo)` — Design Decisions

**Why a route group?**
- Shares a public layout (nav + footer, no sidebar/header from app shell)
- No auth middleware — all pages public
- Separate from `(landing)` which has its own design
- Does NOT add `(seo)` to the URL — it's a Next.js organizational group

**Layout:**
```
(seo)/layout.tsx
├── <SeoNav />           ← Simple nav: logo, cert links, "Get Started" CTA
├── {children}           ← Page content (SSR)
├── <SeoFooter />        ← Links to all cert hubs, blog, comparisons
└── <EmailCaptureBanner /> ← Sticky bottom bar (client component island)
```

### 2.3 `generateStaticParams` for Programmatic Pages

Cert hub and domain pages use `generateStaticParams` to pre-build at deployment:

```typescript
// src/app/[locale]/(seo)/[cert]/page.tsx
export function generateStaticParams() {
  return [
    { cert: 'cissp' },
    { cert: 'cc' },
    { cert: 'sscp' },
    { cert: 'ccsp' },
    { cert: 'cgrc' },
  ];
}

// src/app/[locale]/(seo)/[cert]/[domain]/page.tsx
export function generateStaticParams() {
  return CERT_DOMAINS.flatMap(cert =>
    cert.domains.map(domain => ({
      cert: cert.slug,
      domain: domain.slug,  // "domain-1-security-and-risk-management"
    }))
  );
}
```

All programmatic pages are **statically generated at build time** — zero runtime cost, instant TTFB.

---

## 3. Middleware Updates

### 3.1 Public Path Configuration

Update `src/proxy.ts` to allow SEO pages through without auth:

```typescript
const PUBLIC_PATHS = [
  '/login',
  '/api/auth/verify',
  // SEO pages
  '/cissp', '/cc', '/sscp', '/ccsp', '/cgrc',
  '/compare',
  '/blog',
  '/exam-modes',
];
const PUBLIC_EXACT = ['/'];
```

Or simpler: make the `(seo)` route group's layout check its own auth — since it doesn't require auth, no middleware change is needed if the middleware only blocks paths that don't match `PUBLIC_PATHS`.

**Recommended approach:** Add a broader prefix check. Any path that matches a known cert slug or content section should pass through.

---

## 4. Technical SEO Infrastructure

### 4.1 `robots.ts`

```typescript
// src/app/robots.ts
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
          '/api/',
          '/login/',
        ],
      },
    ],
    sitemap: 'https://examflow.com/sitemap.xml',
  };
}
```

### 4.2 `sitemap.ts`

```typescript
// src/app/sitemap.ts
import { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://examflow.com';
  const locales = ['en', 'pt-BR'];
  const now = new Date();

  const pages: MetadataRoute.Sitemap = [];

  // Landing pages
  for (const locale of locales) {
    pages.push({
      url: `${baseUrl}/${locale}`,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1.0,
      alternates: {
        languages: {
          en: `${baseUrl}/en`,
          'pt-BR': `${baseUrl}/pt-BR`,
        },
      },
    });
  }

  // Cert hubs
  for (const cert of CERTS) {
    for (const locale of locales) {
      pages.push({
        url: `${baseUrl}/${locale}/${cert.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.9,
      });
    }
    // Domain pages (EN only initially)
    for (const domain of cert.domains) {
      pages.push({
        url: `${baseUrl}/en/${cert.slug}/${domain.slug}`,
        lastModified: now,
        changeFrequency: 'monthly',
        priority: 0.7,
      });
    }
  }

  // Blog posts, comparison pages, etc.
  // ... dynamically from content files

  return pages;
}
```

### 4.3 Metadata Template

Global metadata configuration in `src/app/[locale]/layout.tsx`:

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: 'metadata' });
  const baseUrl = 'https://examflow.com';

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
      images: [{ url: '/images/og-default.png', width: 1200, height: 630 }],
    },
    twitter: {
      card: 'summary_large_image',
    },
    alternates: {
      canonical: `${baseUrl}/${locale}`,
      languages: {
        en: `${baseUrl}/en`,
        'pt-BR': `${baseUrl}/pt-BR`,
      },
    },
    robots: {
      index: true,
      follow: true,
    },
  };
}
```

**Auth-gated pages override with `noindex`:**

```typescript
// src/app/[locale]/dashboard/layout.tsx (and other auth pages)
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};
```

### 4.4 Structured Data (JSON-LD)

#### Organization (Global — in root layout)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "ExamFlow",
  "url": "https://examflow.com",
  "logo": "https://examflow.com/images/logo.png",
  "description": "Practice exam platform for ISC2 cybersecurity certifications"
}
```

#### SoftwareApplication (Landing page)

```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "ExamFlow",
  "applicationCategory": "EducationalApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "USD"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "reviewCount": "150"
  }
}
```

*(Note: aggregateRating requires real reviews. Omit until genuine reviews exist.)*

#### Course (Per Cert Hub)

```json
{
  "@context": "https://schema.org",
  "@type": "Course",
  "name": "CISSP Practice Exam Preparation",
  "description": "Comprehensive practice questions covering all 8 CISSP domains",
  "provider": {
    "@type": "Organization",
    "name": "ExamFlow"
  },
  "hasCourseInstance": {
    "@type": "CourseInstance",
    "courseMode": "online",
    "courseWorkload": "PT100H"
  }
}
```

#### FAQPage (Per Cert Hub — Free Rich Snippets)

```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How many domains does the CISSP exam cover?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "The CISSP exam covers 8 domains: Security and Risk Management, Asset Security, ..."
      }
    }
  ]
}
```

#### BreadcrumbList (All SEO Pages)

```json
{
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  "itemListElement": [
    { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://examflow.com/en/" },
    { "@type": "ListItem", "position": 2, "name": "CISSP", "item": "https://examflow.com/en/cissp/" },
    { "@type": "ListItem", "position": 3, "name": "Domain 1: Security and Risk Management" }
  ]
}
```

---

## 5. Cert & Domain Slug Registry

### 5.1 Source of Truth

Create `src/lib/seo-data.ts` as the canonical registry for all SEO slugs, mapping to Firestore cert/domain IDs:

```typescript
interface CertSeoData {
  slug: string;           // URL slug: "cissp"
  firestoreId: string;    // Firestore study ID
  name: string;           // Full name
  abbreviation: string;   // "CISSP"
  metaTitle: string;      // "CISSP Practice Questions & Study Guide"
  metaDescription: string;
  domains: DomainSeoData[];
  faqItems: Array<{ question: string; answer: string }>;
}

interface DomainSeoData {
  slug: string;           // "domain-1-security-and-risk-management"
  firestoreId: string;    // "d1"
  abbreviation: string;   // "SAM"
  name: string;           // "Security and Risk Management"
  domainNumber: number;   // 1
  metaTitle: string;
  metaDescription: string;
  examWeight?: string;    // "16%" (CISSP has published domain weights)
  keyTopics: string[];    // For content generation
}
```

### 5.2 Domain Slug Format

Pattern: `domain-{number}-{kebab-case-name}`

| Cert | Domain | Slug |
|------|--------|------|
| CISSP | Security and Risk Management | `domain-1-security-and-risk-management` |
| CISSP | Asset Security | `domain-2-asset-security` |
| CISSP | Security Architecture and Engineering | `domain-3-security-architecture-and-engineering` |
| CISSP | Communication and Network Security | `domain-4-communication-and-network-security` |
| CISSP | Identity and Access Management | `domain-5-identity-and-access-management` |
| CISSP | Security Assessment and Testing | `domain-6-security-assessment-and-testing` |
| CISSP | Security Operations | `domain-7-security-operations` |
| CISSP | Software Development Security | `domain-8-software-development-security` |
| CC | Security Principles | `domain-1-security-principles` |
| CC | Business Continuity, DR & IR | `domain-2-business-continuity` |
| CC | Access Controls Concepts | `domain-3-access-controls` |
| CC | Network Security | `domain-4-network-security` |
| CC | Security Operations | `domain-5-security-operations` |
| SSCP | Security Operations and Administration | `domain-1-security-operations-and-administration` |
| SSCP | Access Controls | `domain-2-access-controls` |
| SSCP | Risk Identification, Monitoring, and Analysis | `domain-3-risk-identification-monitoring-and-analysis` |
| SSCP | Incident Response and Recovery | `domain-4-incident-response-and-recovery` |
| SSCP | Cryptography | `domain-5-cryptography` |
| SSCP | Network and Communications Security | `domain-6-network-and-communications-security` |
| SSCP | Systems and Application Security | `domain-7-systems-and-application-security` |
| CCSP | Cloud Concepts, Architecture and Design | `domain-1-cloud-concepts-architecture-and-design` |
| CCSP | Cloud Data Security | `domain-2-cloud-data-security` |
| CCSP | Cloud Platform and Infrastructure Security | `domain-3-cloud-platform-and-infrastructure-security` |
| CCSP | Cloud Application Security | `domain-4-cloud-application-security` |
| CCSP | Cloud Security Operations | `domain-5-cloud-security-operations` |
| CCSP | Legal, Risk and Compliance | `domain-6-legal-risk-and-compliance` |
| CGRC | Information Security Risk Management Program | `domain-1-information-security-risk-management-program` |
| CGRC | Scope of the Information System | `domain-2-scope-of-the-information-system` |
| CGRC | Selection and Approval of Controls | `domain-3-selection-and-approval-of-controls` |
| CGRC | Implementation of Controls | `domain-4-implementation-of-controls` |
| CGRC | Assessment/Audit of Controls | `domain-5-assessment-audit-of-controls` |
| CGRC | Authorization/Approval of Information System | `domain-6-authorization-approval-of-information-system` |
| CGRC | Continuous Monitoring | `domain-7-continuous-monitoring` |

---

## 6. Internal Linking Architecture

### 6.1 Link Graph

```
Landing Page (/)
    ├──▶ CISSP Hub (/cissp/)
    │       ├──▶ Domain pages (/cissp/domain-1-*/)
    │       │       └──▶ Practice Questions (/cissp/practice-questions/) [CTA]
    │       │       └──▶ Sibling domains (prev/next)
    │       │       └──▶ Related blog posts
    │       ├──▶ Practice Questions (/cissp/practice-questions/)
    │       │       └──▶ Free quiz → Login → Dashboard
    │       ├──▶ Study Plan (/cissp/study-plan/)
    │       │       └──▶ Domain pages (for deep-dives)
    │       │       └──▶ Practice Questions [CTA]
    │       └──▶ Exam Format (/cissp/exam-format/)
    │
    ├──▶ CC Hub (/cc/) ... (same structure)
    ├──▶ SSCP Hub (/sscp/) ...
    ├──▶ CCSP Hub (/ccsp/) ...
    ├──▶ CGRC Hub (/cgrc/) ...
    │
    ├──▶ Comparisons (/compare/)
    │       ├──▶ Each comparison links to relevant cert hub
    │       └──▶ Each comparison has "Try ExamFlow free" CTA
    │
    ├──▶ Blog (/blog/)
    │       ├──▶ Each post links to cert hub + domain pages
    │       └──▶ Each post has inline & end-of-article CTAs
    │
    └──▶ Login (/login/) ◀── Every public page links here via CTA
```

### 6.2 Footer Link Blocks

Every SEO page footer includes:

```
Certifications          Resources             Company
──────────────         ──────────────        ──────────────
CISSP Practice         Study Plans           About
CC Practice            Exam Modes            Blog
SSCP Practice          Compare Tools         Login
CCSP Practice
CGRC Practice
```

### 6.3 Breadcrumbs (Server-Rendered + Structured Data)

| Page | Breadcrumb |
|------|-----------|
| Cert hub | Home > CISSP |
| Domain page | Home > CISSP > Domain 1: Security and Risk Management |
| Practice questions | Home > CISSP > Practice Questions |
| Blog post | Home > Blog > How to Pass CISSP |
| Comparison | Home > Compare > Boson vs ExamFlow |

Rendered as visible navigation + JSON-LD `BreadcrumbList`.

---

## 7. Performance Budget

### 7.1 Core Web Vitals Targets

| Metric | Target | Current (Landing) | Issue |
|--------|--------|--------------------|-------|
| LCP | <2.5s | Unknown (client-rendered) | Landing is `'use client'` |
| FID/INP | <200ms | Likely OK | Minimal interactivity on SEO pages |
| CLS | <0.1 | Unknown | Client-rendered animations may cause layout shift |
| TTFB | <200ms | <100ms (Vercel) | Static pages will be instant |

### 7.2 Page Size Budgets

| Page Type | HTML | JS | CSS | Total |
|-----------|------|----|-----|-------|
| Cert hub (SSG) | <50 KB | <100 KB | <30 KB | <180 KB |
| Domain page (SSG) | <40 KB | <80 KB | <30 KB | <150 KB |
| Blog post (SSG) | <60 KB | <80 KB | <30 KB | <170 KB |
| Practice questions (SSG + client islands) | <50 KB | <150 KB | <30 KB | <230 KB |

### 7.3 Image Optimization

- Use Next.js `<Image>` for all images
- Default format: WebP with AVIF fallback
- OG images: 1200×630, pre-generated or generated via `@vercel/og`
- Lazy-load below-the-fold images
- No hero images on programmatic pages (text-first, lightweight)

---

## 8. Content Storage

### 8.1 Option A: MDX Files in Repo (Recommended for Day 1)

```
content/
├── blog/
│   ├── cissp-study-plan-3-months.mdx
│   ├── how-to-pass-cissp-first-time.mdx
│   └── ...
├── comparisons/
│   ├── boson-vs-examflow.mdx
│   └── ...
└── cert-content/
    ├── cissp/
    │   ├── hub.mdx          ← Additional content for cert hub
    │   ├── study-plan.mdx
    │   └── exam-format.mdx
    └── ...
```

**Pros:** Free, version-controlled, deploy-on-commit, works with Next.js MDX plugin.
**Cons:** Needs deploy to publish. Founder must use Git.

### 8.2 Option B: Headless CMS (Future — Day 60+)

If content velocity requires non-technical contributors:
- Contentful (generous free tier)
- Sanity (free for solo developer)
- Payload CMS (self-hosted, free)

**Recommendation:** Start with MDX. Switch to CMS only if you hire a content writer who can't use Git.

---

## 9. Dynamic OG Images

### 9.1 `@vercel/og` Route

```
GET /api/og?title=CISSP+Practice+Questions&subtitle=Domain+1&cert=cissp
```

Generates a 1200×630 PNG with:
- ExamFlow logo
- Title text (large)
- Subtitle (smaller)
- Cert-specific accent color
- Clean, professional design

### 9.2 Per-Page OG Configuration

| Page Type | OG Image Strategy |
|-----------|-------------------|
| Landing | Static pre-made image (highest quality) |
| Cert hub | Dynamic: `?title=CISSP+Exam+Prep&cert=cissp` |
| Domain page | Dynamic: `?title=Domain+1&subtitle=Security+and+Risk+Management&cert=cissp` |
| Blog post | Dynamic: `?title={post.title}` |
| Comparison | Dynamic: `?title=Boson+vs+ExamFlow` |

---

## 10. Crawl Budget Optimization

| Rule | Implementation |
|------|----------------|
| Block auth pages from crawling | `robots.txt` disallow + `noindex` meta |
| Block API routes from crawling | `robots.txt` disallow `/api/` |
| Internal links use `<Link>` not `<a>` | Next.js `Link` component for all internal links |
| No orphan pages | Every page reachable from at least 2 other pages |
| Flat hierarchy | Max 3 clicks from homepage to any content page |
| 404 page returns 404 status | Ensure `not-found.tsx` returns proper status code |
| Redirect old URLs if changed | `next.config.ts` redirects for any URL changes |
| Avoid query parameter pages | No `?page=2` pagination (use `/page/2/` if needed) |
