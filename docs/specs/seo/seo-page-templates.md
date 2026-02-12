# SEO Page Templates

> Status: DRAFT
> Date: 2026-02-12
> Role: Technical SEO Lead + Content Designer
> Dependency: `seo-strategy.md`, `seo-site-architecture.md`

---

## 1. Template Inventory

| Template | Pages Using It | Rendering | Data Source |
|----------|---------------|-----------|-------------|
| Cert Hub | 5 | SSG | `seo-data.ts` + MDX |
| Domain Deep-Dive | 33 | SSG | `seo-data.ts` + MDX |
| Practice Questions (Lead Magnet) | 5 | SSG + Client Islands | `seo-data.ts` + Firestore sample |
| Study Plan Guide | 5 | SSG | MDX |
| Exam Format Explainer | 1-5 | SSG | MDX |
| Comparison Page | 6-10 | SSG | MDX |
| Blog Post | 15-20 | SSG | MDX |
| Blog Index | 1 | SSG | File-system scan |
| Comparison Index | 1 | SSG | File-system scan |
| Exam Modes Overview | 1 | SSG | MDX |
| Exam Mode Detail | 4 | SSG | MDX |

---

## 2. Cert Hub Template

**Route:** `/[locale]/(seo)/[cert]/page.tsx`
**URL example:** `/en/cissp/`
**Target keywords:** "CISSP practice exam", "CISSP study guide", "CISSP practice questions"

### 2.1 Content Wireframe

```
┌─────────────────────────────────────────────────────┐
│  Breadcrumb: Home > CISSP                           │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h1>CISSP Practice Questions & Study Guide</h1>   │
│  <p>Master all 8 CISSP domains with adaptive       │
│     practice exams, spaced repetition, and          │
│     performance analytics.</p>                      │
│                                                     │
│  [Try Free Practice Questions]  [Start Study Plan]  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>CISSP Exam Overview</h2>                       │
│  ┌───────────────────┐                              │
│  │ Exam details card │                              │
│  │ Duration: 3 hours │                              │
│  │ Questions: 100-150│                              │
│  │ Format: CAT       │                              │
│  │ Passing: 700/1000 │                              │
│  │ Cost: $749        │                              │
│  └───────────────────┘                              │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>CISSP Domains</h2>                             │
│                                                     │
│  ┌──────────────────────────────────────────────┐   │
│  │ Domain 1: Security & Risk Mgmt    ██████ 16% │   │
│  │ Brief description. [Study Domain →]          │   │
│  ├──────────────────────────────────────────────┤   │
│  │ Domain 2: Asset Security          ████ 10%   │   │
│  │ Brief description. [Study Domain →]          │   │
│  ├──────────────────────────────────────────────┤   │
│  │ ... (all 8 domains)                          │   │
│  └──────────────────────────────────────────────┘   │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>Why Practice with ExamFlow?</h2>               │
│  3-column grid:                                     │
│  • Adaptive exam engine     (icon + 3 sentences)    │
│  • Spaced repetition        (icon + 3 sentences)    │
│  • Performance analytics    (icon + 3 sentences)    │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>Frequently Asked Questions</h2>                │
│  5-8 FAQ accordion items (feeds FAQPage schema)     │
│  • How many domains does CISSP cover?               │
│  • How long should I study for CISSP?               │
│  • What is CAT format?                              │
│  • Is CISSP the hardest certification?              │
│  • What's the pass rate for CISSP?                  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>Related Resources</h2>                         │
│  • CISSP Study Plan (3-month guide)                 │
│  • CISSP Practice Questions (free sample)           │
│  • Blog posts tagged CISSP                          │
│  • Comparison: Boson vs ExamFlow for CISSP          │
│                                                     │
├─────────────────────────────────────────────────────┤
│  Email Capture CTA:                                 │
│  "Get a free 10-question CISSP mini-exam"           │
│  [email input] [Send Quiz]                          │
└─────────────────────────────────────────────────────┘
```

### 2.2 Metadata

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const cert = getCertBySlug(params.cert);
  return {
    title: cert.metaTitle,                         // "CISSP Practice Questions & Study Guide 2025"
    description: cert.metaDescription,             // "Free CISSP practice exam questions covering..."
    alternates: {
      canonical: `https://examflow.com/en/${cert.slug}`,
      languages: {
        en: `https://examflow.com/en/${cert.slug}`,
        'pt-BR': `https://examflow.com/pt-BR/${cert.slug}`,
      },
    },
    openGraph: {
      title: cert.metaTitle,
      description: cert.metaDescription,
      url: `https://examflow.com/en/${cert.slug}`,
      images: [`/api/og?title=${encodeURIComponent(cert.name)}&cert=${cert.slug}`],
    },
  };
}
```

### 2.3 Structured Data

```typescript
const structuredData = [
  {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: `${cert.abbreviation} Practice Exam Preparation`,
    description: cert.metaDescription,
    provider: { '@type': 'Organization', name: 'ExamFlow' },
    hasCourseInstance: {
      '@type': 'CourseInstance',
      courseMode: 'online',
    },
  },
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: cert.faqItems.map(faq => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: { '@type': 'Answer', text: faq.answer },
    })),
  },
  breadcrumbSchema(['Home', cert.abbreviation]),
];
```

### 2.4 Word Count Target

**1,200-2,000 words** per cert hub. Enough for topical authority without being filler.

---

## 3. Domain Deep-Dive Template

**Route:** `/[locale]/(seo)/[cert]/[domain]/page.tsx`
**URL example:** `/en/cissp/domain-1-security-and-risk-management/`
**Target keywords:** "CISSP domain 1", "security and risk management CISSP", "CISSP domain 1 topics"

### 3.1 Content Wireframe

```
┌─────────────────────────────────────────────────────┐
│  Breadcrumb: Home > CISSP > Domain 1: Security & RM │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h1>CISSP Domain 1: Security and Risk Management</h1>
│  <p>Domain 1 accounts for 16% of the CISSP exam.   │
│     Master risk management, security governance,    │
│     and compliance frameworks.</p>                  │
│                                                     │
│  ┌──────────────────────────────┐                   │
│  │ Exam Weight: 16%            │                   │
│  │ Questions: ~20-24 out of 150│                   │
│  │ Difficulty: Advanced        │                   │
│  └──────────────────────────────┘                   │
│                                                     │
│  [Practice Domain 1 Questions]                      │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>What You'll Learn</h2>                         │
│  Bulleted list of key topics:                       │
│  • Security governance principles                   │
│  • Risk management frameworks (NIST, ISO 27001)     │
│  • Security policies and procedures                 │
│  • Business continuity requirements                 │
│  • Personnel security                               │
│  • Threat modeling (STRIDE, DREAD, PASTA)            │
│  • Supply chain risk management                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>Key Concepts</h2>                              │
│  3-5 subsections (h3) explaining major topics:      │
│                                                     │
│  <h3>Security Governance</h3>                       │
│  300-500 words explaining governance principles,    │
│  frameworks, standards alignment.                   │
│                                                     │
│  <h3>Risk Assessment & Analysis</h3>                │
│  300-500 words on quantitative/qualitative risk,    │
│  ALE, ARO, SLE formulas, risk treatment options.    │
│                                                     │
│  <h3>Compliance & Legal Requirements</h3>           │
│  300-500 words on regulatory landscape,             │
│  GDPR, HIPAA, SOX and how they appear on the exam.  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>Sample Questions</h2>                          │
│  3 example questions (with answers and              │
│  explanations — shown after click/toggle):          │
│                                                     │
│  Q: An organization's risk appetite is BEST         │
│     defined by which of the following?              │
│  A) CEO  B) Board of Directors ✓  C) CISO  D) CRO  │
│  [Show Explanation ▼]                               │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>Study Tips for Domain 1</h2>                   │
│  5-7 actionable tips specific to this domain        │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Navigation:                                        │
│  [← All CISSP Domains]                              │
│  [← Domain 0: none / ← Previous Domain]            │
│  [Domain 2: Asset Security →]                       │
│                                                     │
│  Related:                                           │
│  • CISSP Study Plan                                 │
│  • CISSP Practice Questions                         │
│                                                     │
├─────────────────────────────────────────────────────┤
│  CTA: "Practice 150+ Domain 1 questions free"       │
│  [Start Practice Exam]                              │
└─────────────────────────────────────────────────────┘
```

### 3.2 Metadata

```typescript
export async function generateMetadata({ params }): Promise<Metadata> {
  const cert = getCertBySlug(params.cert);
  const domain = getDomainBySlug(params.cert, params.domain);
  return {
    title: `${cert.abbreviation} Domain ${domain.domainNumber}: ${domain.name}`,
    description: `Study guide for ${cert.abbreviation} Domain ${domain.domainNumber} – ${domain.name}. Key concepts, exam weight (${domain.examWeight}), sample questions, and study tips.`,
    alternates: {
      canonical: `https://examflow.com/en/${cert.slug}/${domain.slug}`,
    },
  };
}
```

### 3.3 Word Count Target

**1,500-2,500 words** per domain page. These are the long-tail workhorses.

---

## 4. Practice Questions Template (Lead Magnet)

**Route:** `/[locale]/(seo)/[cert]/practice-questions/page.tsx`
**URL example:** `/en/cissp/practice-questions/`
**Target keywords:** "free CISSP practice questions", "CISSP practice exam free"

### 4.1 Content Wireframe

```
┌─────────────────────────────────────────────────────┐
│  Breadcrumb: Home > CISSP > Practice Questions      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h1>Free CISSP Practice Questions</h1>             │
│  <p>Test your knowledge with {N} free CISSP         │
│     practice questions covering all 8 domains.</p>  │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌── Quiz Component (Client Island) ──────────┐    │
│  │                                              │    │
│  │  Question 1 of 10                            │    │
│  │                                              │    │
│  │  Which of the following BEST describes the   │    │
│  │  principle of least privilege?                │    │
│  │                                              │    │
│  │  ○ A) Grant all permissions by default        │    │
│  │  ○ B) Provide minimum access needed ← ✓      │    │
│  │  ○ C) Remove all access after 90 days         │    │
│  │  ○ D) Require MFA for all actions             │    │
│  │                                              │    │
│  │  [Check Answer]                              │    │
│  │                                              │    │
│  │  After Q10:                                  │    │
│  │  ┌─────────────────────────────────────┐     │    │
│  │  │ You scored 7/10!                    │     │    │
│  │  │                                     │     │    │
│  │  │ Get 500+ more questions and         │     │    │
│  │  │ personalized analytics.              │     │    │
│  │  │                                     │     │    │
│  │  │ [Create Free Account]               │     │    │
│  │  │ [See Full Explanations] ← gated     │     │    │
│  │  └─────────────────────────────────────┘     │    │
│  └──────────────────────────────────────────────┘    │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>About These Questions</h2>                     │
│  300 words on question quality, domain coverage,    │
│  how they mirror the real exam format.              │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>CISSP Exam Domains Covered</h2>                │
│  Link list to all 8 domain pages                    │
│                                                     │
├─────────────────────────────────────────────────────┤
│  CTA: "Sign up for more practice questions"         │
│  [email] [Get Started Free]                         │
└─────────────────────────────────────────────────────┘
```

### 4.2 Architecture Notes

- The quiz component is a **client island** (`'use client'`) embedded inside an SSR page
- Questions are **hardcoded in the page source** (not fetched from Firestore) — ensures SEO indexability and zero runtime cost
- The SSR shell contains all static content (h1, descriptions, domain links) for full indexation
- After quiz completion, prompt login/signup — this is the **conversion event**
- 10 questions per cert (curated from the question bank, non-random, high-quality)

### 4.3 Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "Quiz",
  "name": "Free CISSP Practice Questions",
  "about": {
    "@type": "Thing",
    "name": "CISSP Certification"
  },
  "educationalLevel": "Professional",
  "assesses": "Information Security"
}
```

### 4.4 Word Count Target

**500-800 words** of static content (excluding quiz interactive content).

---

## 5. Study Plan Guide Template

**Route:** `/[locale]/(seo)/[cert]/study-plan/page.tsx`
**URL example:** `/en/cissp/study-plan/`
**Target keywords:** "CISSP study plan", "how to study for CISSP", "CISSP study schedule"

### 5.1 Content Wireframe

```
┌─────────────────────────────────────────────────────┐
│  Breadcrumb: Home > CISSP > Study Plan              │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h1>CISSP Study Plan: 3-Month Guide</h1>           │
│  <p>A structured week-by-week study plan to pass    │
│     the CISSP exam on your first attempt.</p>       │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>Prerequisites</h2>                             │
│  Experience requirements, recommended background    │
│                                                     │
│  <h2>Week-by-Week Schedule</h2>                     │
│                                                     │
│  <h3>Weeks 1-2: Domain 1 & 2</h3>                  │
│  • Study materials, time allocation                 │
│  • Practice question targets                        │
│  • [Practice Domain 1] [Practice Domain 2]          │
│                                                     │
│  <h3>Weeks 3-4: Domain 3 & 4</h3>                  │
│  ... (continues for 12 weeks)                       │
│                                                     │
│  <h2>Study Resources</h2>                           │
│  • Official ISC2 study guide                        │
│  • ExamFlow practice exams                          │
│  • Recommended video courses (external links)       │
│                                                     │
│  <h2>Final Week: Exam Prep Tips</h2>                │
│  5-7 tips for the last week before the exam         │
│                                                     │
├─────────────────────────────────────────────────────┤
│  CTA: "Track your study progress with ExamFlow"     │
│  [Start Free Practice]                              │
└─────────────────────────────────────────────────────┘
```

### 5.2 Word Count Target

**2,000-3,000 words** — these are authoritative guide pages.

---

## 6. Comparison Page Template

**Route:** `/[locale]/(seo)/compare/[slug]/page.tsx`
**URL example:** `/en/compare/boson-vs-examflow/`
**Target keywords:** "Boson vs ExamFlow", "best CISSP practice exams", "CISSP practice exam comparison"

### 6.1 Content Wireframe

```
┌─────────────────────────────────────────────────────┐
│  Breadcrumb: Home > Compare > Boson vs ExamFlow     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h1>Boson vs ExamFlow: CISSP Practice Exam         │
│      Comparison (2025)</h1>                          │
│                                                     │
│  <p>An honest comparison of Boson ExSim-Max and     │
│     ExamFlow for CISSP exam preparation.</p>        │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>Quick Comparison</h2>                          │
│                                                     │
│  ┌──────────────┬──────────┬──────────────┐         │
│  │ Feature      │ Boson    │ ExamFlow     │         │
│  ├──────────────┼──────────┼──────────────┤         │
│  │ Price        │ $99      │ Free / $X/mo │         │
│  │ Questions    │ 750      │ 500+         │         │
│  │ Adaptive     │ No       │ Yes          │         │
│  │ Analytics    │ Basic    │ Advanced     │         │
│  │ Spaced Rep   │ No       │ Yes          │         │
│  │ Mobile       │ No       │ Yes (PWA)    │         │
│  │ Certs        │ CISSP    │ 5 ISC2       │         │
│  │ Free Tier    │ No       │ Yes          │         │
│  └──────────────┴──────────┴──────────────┘         │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>Detailed Comparison</h2>                       │
│                                                     │
│  <h3>Question Quality</h3>                          │
│  400-600 words comparing question styles,           │
│  difficulty, and alignment with exam objectives.    │
│                                                     │
│  <h3>Study Features</h3>                            │
│  400-600 words comparing practice modes,            │
│  analytics, and study aids.                         │
│                                                     │
│  <h3>Pricing & Value</h3>                           │
│  300-400 words on pricing models,                   │
│  free vs paid, total cost of ownership.             │
│                                                     │
│  <h3>Pros and Cons</h3>                             │
│  Side-by-side pros/cons lists                       │
│                                                     │
│  <h2>Who Should Choose Boson?</h2>                  │
│  2-3 use cases where competitor is better           │
│  (builds credibility — don't be dishonest)          │
│                                                     │
│  <h2>Who Should Choose ExamFlow?</h2>               │
│  3-4 use cases where ExamFlow wins                  │
│                                                     │
│  <h2>Verdict</h2>                                   │
│  Balanced summary, recommend ExamFlow for           │
│  budget-conscious or analytics-focused users.       │
│                                                     │
├─────────────────────────────────────────────────────┤
│  CTA: "Try ExamFlow free — no credit card required" │
│  [Start Free Practice]                              │
└─────────────────────────────────────────────────────┘
```

### 6.2 Credibility Guidelines

- **Be honest.** If a competitor is better in some area, say so.
- Don't fabricate claims. Only state verifiable facts.
- Update comparison data quarterly.
- Link to competitor's website (shows fairness to Google).
- Avoid SEO keyword stuffing in comparison text.

### 6.3 Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "Article",
  "headline": "Boson vs ExamFlow: CISSP Practice Exam Comparison",
  "author": { "@type": "Organization", "name": "ExamFlow" },
  "datePublished": "2025-01-15",
  "dateModified": "2025-01-15"
}
```

### 6.4 Word Count Target

**1,500-2,500 words** per comparison.

---

## 7. Blog Post Template

**Route:** `/[locale]/(seo)/blog/[slug]/page.tsx`
**URL example:** `/en/blog/cissp-study-plan-3-months/`
**Data source:** MDX files in `content/blog/`

### 7.1 Content Wireframe

```
┌─────────────────────────────────────────────────────┐
│  Breadcrumb: Home > Blog > Title                    │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h1>{Post Title}</h1>                              │
│  <time>Published: Jan 15, 2025</time>               │
│  <span>Reading time: 8 min</span>                   │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Table of Contents (auto-generated from h2/h3)      │
│  1. Introduction                                    │
│  2. Section A                                       │
│  3. Section B                                       │
│  ...                                                │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  {MDX content renders here}                         │
│                                                     │
│  Inline CTAs every ~500 words:                      │
│  [💡 Practice these concepts → Free Quiz]            │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h2>Related Articles</h2>                          │
│  3 related blog posts (auto-matched by tags)        │
│                                                     │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Author Card:                                       │
│  ExamFlow Team — ISC2 exam prep platform            │
│                                                     │
├─────────────────────────────────────────────────────┤
│  CTA: "Ready to practice? Start a free exam."       │
│  [Try Free Practice Questions]                      │
└─────────────────────────────────────────────────────┘
```

### 7.2 MDX Frontmatter Schema

```yaml
---
title: "How to Pass CISSP on Your First Attempt"
slug: "how-to-pass-cissp-first-time"
description: "Proven strategies to pass the CISSP exam..."
date: "2025-01-15"
updated: "2025-01-15"
tags: ["cissp", "study-tips"]
cert: "cissp"                         # Links to cert hub
readingTime: 8                        # Auto-calculated or manual
featured: true                        # Show on blog index hero
locale: "en"
---
```

### 7.3 Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "BlogPosting",
  "headline": "{title}",
  "description": "{description}",
  "author": { "@type": "Organization", "name": "ExamFlow" },
  "publisher": { "@type": "Organization", "name": "ExamFlow" },
  "datePublished": "{date}",
  "dateModified": "{updated}",
  "mainEntityOfPage": { "@type": "WebPage", "@id": "{url}" }
}
```

### 7.4 Word Count Target

**1,500-3,000 words** per blog post.

---

## 8. Exam Mode Explainer Template

**Route:** `/[locale]/(seo)/exam-modes/[mode]/page.tsx`
**URL example:** `/en/exam-modes/spaced-review/`
**Target keywords:** "spaced repetition for CISSP", "adaptive practice exam", "weak domain practice"

### 8.1 Content Wireframe

```
┌─────────────────────────────────────────────────────┐
│  Breadcrumb: Home > Exam Modes > Spaced Review      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  <h1>Spaced Review Mode: Never Forget What You      │
│      Learned</h1>                                   │
│                                                     │
│  <h2>How It Works</h2>                              │
│  • Algorithm explanation (simplified)               │
│  • Visual diagram of spaced repetition curve        │
│  • Benefits for long-term retention                 │
│                                                     │
│  <h2>Best For</h2>                                  │
│  • Students 2+ weeks into their study plan          │
│  • Maintaining knowledge across all domains         │
│  • Preventing knowledge decay before exam day       │
│                                                     │
│  <h2>How ExamFlow Implements This</h2>              │
│  • Algorithm details, queue prioritization          │
│  • Screenshot or mockup of the UI                   │
│  • Comparison to Anki-style SRS                     │
│                                                     │
├─────────────────────────────────────────────────────┤
│  CTA: "Try Spaced Review mode free"                 │
│  [Start Free Practice]                              │
└─────────────────────────────────────────────────────┘
```

### 8.2 Exam Modes to Document

| Mode Slug | Mode Name | Key Selling Point |
|-----------|-----------|-------------------|
| `practice` | Practice Mode | Full-length simulated exam |
| `weak-domains` | Weak Domain Mode | Targets your weakest areas |
| `spaced-review` | Spaced Review Mode | Spaced repetition algorithm |
| `real-mix` | Real Mix Mode | Mirrors actual exam distribution |

### 8.3 Word Count Target

**800-1,200 words** per mode page.

---

## 9. Shared Components

### 9.1 `<Breadcrumbs />`

```typescript
// src/components/seo/Breadcrumbs.tsx
interface BreadcrumbItem {
  label: string;
  href?: string;  // Last item has no href (current page)
}

// Renders both visible breadcrumbs and JSON-LD BreadcrumbList schema
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) { ... }
```

### 9.2 `<SeoJsonLd />`

```typescript
// src/components/seo/SeoJsonLd.tsx
// Renders <script type="application/ld+json"> in <head>
export function SeoJsonLd({ data }: { data: object | object[] }) {
  const jsonLd = Array.isArray(data) ? data : [data];
  return (
    <>
      {jsonLd.map((item, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(item) }}
        />
      ))}
    </>
  );
}
```

### 9.3 `<InlineCta />`

```typescript
// src/components/seo/InlineCta.tsx
// Rendered inside blog posts and domain pages
// Variants: "quiz" | "signup" | "study-plan"
export function InlineCta({ variant, certSlug }: Props) { ... }
```

### 9.4 `<EmailCapture />`

```typescript
// src/components/seo/EmailCapture.tsx ('use client')
// Used at bottom of cert hubs, blog posts, comparison pages
// Sends email to lightweight /api/leads endpoint (stores in Firestore)
export function EmailCapture({ certSlug, source }: Props) { ... }
```

### 9.5 `<DomainNav />`

```typescript
// src/components/seo/DomainNav.tsx
// Previous/next domain navigation for domain pages
export function DomainNav({ cert, currentDomain }: Props) { ... }
```

### 9.6 `<ComparisonTable />`

```typescript
// src/components/seo/ComparisonTable.tsx
// Structured feature comparison table
// Takes rows of { feature, competitor, examflow } data
export function ComparisonTable({ rows, competitorName }: Props) { ... }
```

---

## 10. Content Quality Checklist

Every page published must pass this checklist before deployment:

### 10.1 SEO Basics
- [ ] Unique `<title>` tag (50-60 characters)
- [ ] Unique `<meta name="description">` (150-160 characters)
- [ ] Single `<h1>` tag containing primary keyword
- [ ] Logical heading hierarchy (h1 > h2 > h3, no skips)
- [ ] Primary keyword appears in first 100 words
- [ ] Internal links to at least 3 other pages
- [ ] At least 1 external link (to ISC2, official sources)
- [ ] Canonical URL set
- [ ] OG tags and Twitter card configured

### 10.2 Content Quality
- [ ] No placeholder text or Lorem Ipsum
- [ ] Factually accurate (verified against ISC2 official sources)
- [ ] Grammar and spelling checked
- [ ] Reading level appropriate (aim for Flesch score 50-60)
- [ ] No duplicate content from other pages
- [ ] Word count meets template minimum

### 10.3 Technical
- [ ] Page renders with JavaScript disabled (SSG/SSR content visible)
- [ ] Images have `alt` text
- [ ] All links return 200 status
- [ ] Structured data validates in Google Rich Results Test
- [ ] Mobile-responsive layout
- [ ] Page loads in <3s on 3G connection

### 10.4 Conversion
- [ ] At least 1 CTA above the fold
- [ ] At least 1 CTA at end of content
- [ ] CTA leads to signup or practice questions
- [ ] Email capture placement (if applicable)
