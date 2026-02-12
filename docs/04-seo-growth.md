# 04 — SEO Growth Engine

---

## Problem Statement

ExamFlow has zero organic acquisition. No SEO pages, no blog, no content marketing, no indexed pages beyond the landing page. The only acquisition channel is direct traffic. Every competitor (Boson, Pocket Prep, Official ISC2) ranks for "CISSP practice questions" — ExamFlow does not.

In certification prep, SEO is the #1 acquisition channel. Candidates Google "CISSP practice questions Domain 1" before they ask Reddit. Owning these search terms is owning the top of the funnel.

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Indexed pages | 20 by Day 60, 50 by Day 90 |
| Organic visits/month | 500 by Day 60, 2,000 by Day 90 |
| Organic signup conversion | 5%+ of organic visitors |
| Domain authority (Ahrefs) | 15+ by Day 90 |
| Ranking keywords | 50+ keywords in top 100 by Day 90 |

---

## MVP Scope (2 weeks)

### 1. SEO Page Template

Server-rendered Next.js pages at `/resources/[slug]`. No auth required. Fully public.

**Page structure:**
- H1: Target keyword ("CISSP Practice Questions — Domain 1: Security and Risk Management")
- 3-5 free sample questions with explanations (static, no interactivity needed)
- Domain overview (200-300 words of educational content)
- CTA: "Practice 500+ Domain 1 questions on ExamFlow →" (links to signup)
- Internal links to other domain pages
- Schema markup: `FAQPage` structured data for Google rich results

### 2. Initial Page Set (20 pages)

| Page | Target Keyword |
|------|---------------|
| `/resources/cissp-practice-questions` | CISSP practice questions |
| `/resources/cissp-domain-1-questions` | CISSP domain 1 practice questions |
| `/resources/cissp-domain-2-questions` | ... through domain 8 |
| `/resources/cissp-study-guide` | CISSP study guide 2026 |
| `/resources/cissp-exam-tips` | CISSP exam tips |
| `/resources/cissp-vs-cc` | CISSP vs CC certification |
| `/resources/cc-practice-questions` | CC certification practice questions |
| `/resources/sscp-practice-questions` | SSCP practice questions |
| `/resources/ccsp-practice-questions` | CCSP practice questions |
| `/resources/cgrc-practice-questions` | CGRC practice questions |
| `/resources/cissp-study-plan-3-months` | CISSP study plan 3 months |
| `/resources/cissp-pass-rate` | CISSP pass rate 2026 |

### 3. Technical SEO

- Add `sitemap.xml` generation (Next.js built-in)
- Add `robots.txt` allowing crawling of `/resources/*`
- Add OpenGraph + Twitter Card meta tags per page
- Add canonical URLs
- Ensure pages are fully server-rendered (no client-side data fetching for content)

### 4. Internal Linking

- Landing page links to top resource pages
- Each resource page links to 3-5 related pages
- Footer: links to all resource categories
- Dashboard: "Learn more about Domain X" links to resource page

---

## Phase 2 Scope (6–8 weeks)

1. **Blog** — `/blog/[slug]` with 2 posts/week. Topics: "How I Passed CISSP in 3 Months", "CISSP Domain 1 Breakdown", "CC vs CISSP: Which Should You Get First?". Mix of SEO-targeted and thought leadership.
2. **Free quiz pages** — `/quiz/cissp-domain-1` — 10-question interactive quiz, no signup required. Email capture at end: "Want your full results? Enter your email." Bridge between SEO content and product.
3. **Programmatic SEO** — Auto-generate pages for every domain × difficulty combination: "/resources/cissp-domain-3-hard-questions". 40+ pages from templates.
4. **Backlink strategy** — Guest posts on cybersecurity blogs. Contribute to r/cissp wiki. Create shareable infographics (CISSP domain breakdown, study timeline).
5. **YouTube SEO** — Short explainer videos (3-5 min) for each domain. Embed in resource pages. YouTube is the #2 search engine.
6. **Google Search Console monitoring** — Track impressions, clicks, CTR, average position weekly. Optimize titles/descriptions for low-CTR high-impression pages.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|------|----------|------------|
| SEO takes 3-6 months to show results | 🟡 Medium | Start immediately. Parallelize with paid acquisition (Reddit ads) for short-term traffic. SEO is a long-term investment. |
| Content quality too low for Google ranking | 🟡 Medium | Write genuinely useful content. Include real sample questions with real explanations. Google rewards depth. |
| ISC2 trademark issues in page titles | 🟡 Medium | Use "CISSP" as a descriptive term (fair use for certification prep). Avoid implying ISC2 endorsement. Add disclaimer: "ExamFlow is not affiliated with ISC2." |
| Cannibalization (multiple pages targeting same keyword) | 🟢 Low | Keyword map upfront. One primary page per keyword. Use canonical tags. |
| Engineering time vs. content writing time | 🟡 Medium | Template is engineering (1 week). Content writing is ongoing non-engineering work. Outsource content writing if needed ($50-100/article). |
