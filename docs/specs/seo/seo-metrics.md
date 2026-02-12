# SEO Metrics & Measurement

> Status: DRAFT
> Date: 2026-02-12
> Role: Head of Growth
> Dependency: `seo-strategy.md`, `seo-content-calendar-90d.md`

---

## 1. KPI Framework

### 1.1 North Star Metric

**Organic signups per month** — the single number that proves SEO is driving business value.

### 1.2 Leading & Lagging Indicators

| KPI | Type | Day 30 Target | Day 60 Target | Day 90 Target |
|-----|------|--------------|--------------|--------------|
| Indexed pages | Leading | 40-60 | 70-90 | 90-120 |
| Organic sessions/month | Lagging | 200-500 | 1K-2.5K | 2K-5K |
| Organic signups/month | Lagging | 10-25 | 40-80 | 100-250 |
| Avg. position (money keywords) | Leading | 50-80 | 20-50 | 10-30 |
| Click-through rate (CTR) | Leading | 1-2% | 2-4% | 3-6% |
| Pages published | Leading | 40-45 | 62-67 | 80-90 |
| Referring domains | Leading | 0 | 5-10 | 10-20 |
| Bounce rate (SEO pages) | Quality | <70% | <65% | <60% |
| Time on page (SEO pages) | Quality | >1.5 min | >2 min | >2.5 min |

### 1.3 Conversion Funnel Metrics

```
Impressions → Clicks → Page Views → Engagement → Signup → Active User
   (GSC)      (GSC)    (Analytics)   (scroll/quiz)  (Auth)   (Product)
```

| Funnel Stage | Metric | Tool | Target |
|-------------|--------|------|--------|
| Discovery | Impressions | GSC | 50K/mo by Day 90 |
| Click | Organic clicks | GSC | 2K-5K/mo by Day 90 |
| Engage | Pages/session | GA4 / Vercel | >1.5 |
| Convert (micro) | Quiz completion | Custom event | 30% of practice page visitors |
| Convert (macro) | Signup | Firebase Auth events | 5-10% of organic visitors |
| Retain | 7-day return | Firebase | 20% of organic signups |

---

## 2. Measurement Tools

### 2.1 Free Tools (Day 1)

| Tool | Purpose | Setup Time | Cost |
|------|---------|-----------|------|
| **Google Search Console** | Indexing, queries, CTR, avg. position, crawl errors | 30 min | Free |
| **Vercel Analytics** | Page views, Web Vitals, visitor geography | Already included | Free (Hobby) |
| **Google Rich Results Test** | Validate structured data per page | 0 (on-demand) | Free |
| **PageSpeed Insights** | Core Web Vitals audit per page | 0 (on-demand) | Free |

### 2.2 Free Tools (Day 7-14)

| Tool | Purpose | Setup Time | Cost |
|------|---------|-----------|------|
| **Google Analytics 4** | Sessions, conversions, user behavior, events | 1 hour | Free |
| **Google Tag Manager** | Event tracking without code deploys | 1 hour | Free |
| **Bing Webmaster Tools** | Bing indexing + additional crawl data | 15 min | Free |

### 2.3 Optional Paid Tools (Day 60+, only if organic grows)

| Tool | Purpose | When to Add | Cost |
|------|---------|-------------|------|
| **Ahrefs Webmaster Tools** | Backlink monitoring, keyword tracking | Day 60 | Free (limited) |
| **Ubersuggest** | Keyword research, competitor analysis | Day 30 | $29/mo |
| **Screaming Frog** | Technical SEO audits (free up to 500 URLs) | Day 30 | Free |

**Rule: Don't pay for SEO tools until organic traffic exceeds 1,000 sessions/month.**

---

## 3. Google Search Console — What to Monitor

### 3.1 Weekly Check (15 min)

| Report | What to Look For | Action |
|--------|------------------|--------|
| Performance → Queries | New queries appearing, top queries | Note which content is ranking |
| Performance → Pages | Which pages get impressions/clicks | Double down on pages gaining traction |
| Indexing → Pages | Pages not indexed (crawled/not indexed, discovered/not crawled) | Fix issues: thin content, noindex errors |
| Experience → Core Web Vitals | Any URLs with poor CWV | Fix LCP/CLS issues immediately |
| Sitemaps | Sitemap status, submitted vs indexed count | Re-submit if ratio is low |

### 3.2 Monthly Deep Dive (1 hour)

| Analysis | How | Outcome |
|----------|-----|---------|
| Keyword gap analysis | Export GSC queries → find queries with high impressions + low CTR | Improve titles & descriptions for those queries |
| Content gap analysis | Compare published pages vs queries Google shows you for | Write new content for queries you appear for but don't have dedicated pages |
| CTR optimization | Find pages with position <10 but CTR <3% | A/B test title tags, add FAQ schema for rich snippets |
| Cannibalization check | Find queries where 2+ pages rank | Consolidate or differentiate content |
| Position tracking | Track money keywords (CISSP practice, CC study guide, etc.) | Celebrate wins, investigate drops |

### 3.3 Key GSC Filters

```
# Money keywords performance
Queries containing: "cissp practice", "cissp study", "cc practice"
Filter: Last 28 days, compare to previous period

# New page indexing
Pages: Filter by new cert hub/domain URLs
Check: Indexed status, first impression date

# Mobile vs Desktop
Devices: Compare mobile vs desktop CTR
Action: If mobile CTR is much lower, check mobile UX
```

---

## 4. Custom Event Tracking

### 4.1 Events to Track (via GA4 / GTM)

| Event Name | Trigger | Parameters | Purpose |
|------------|---------|------------|---------|
| `seo_page_view` | Any SEO page loads | `page_type`, `cert`, `domain`, `locale` | Segment SEO traffic |
| `quiz_start` | User clicks first answer on practice page | `cert` | Top of quiz funnel |
| `quiz_complete` | User finishes all 10 questions | `cert`, `score`, `time_spent` | Quiz conversion rate |
| `quiz_signup_prompt` | Post-quiz CTA shown | `cert`, `score` | Signup prompt impressions |
| `email_capture_submit` | User enters email in capture form | `cert`, `source` (footer, inline, modal) | Lead gen tracking |
| `cta_click` | Any CTA button clicked | `cta_type`, `page_type`, `cert` | CTA effectiveness |
| `signup_from_seo` | User creates account with `utm_source=seo` or referrer=organic | `cert`, `landing_page` | Attribution |
| `scroll_depth` | User scrolls 25%, 50%, 75%, 100% | `page_type`, `depth` | Content engagement |
| `time_on_page_30s` | User stays >30 seconds | `page_type` | Quality signal |
| `domain_nav_click` | User clicks prev/next domain | `from_domain`, `to_domain` | Internal navigation |

### 4.2 UTM Strategy for Internal Links

```
# From blog to practice questions
/en/cissp/practice-questions/?utm_source=blog&utm_medium=inline_cta&utm_campaign=cissp_study_plan

# From comparison to signup
/en/login/?utm_source=seo&utm_medium=comparison&utm_campaign=boson_vs_examflow

# From email capture to signup
/en/login/?utm_source=email&utm_medium=lead_magnet&utm_campaign=free_quiz
```

### 4.3 GA4 Conversion Goals

| Goal | Event | Value |
|------|-------|-------|
| Signup | `signup_from_seo` | Primary conversion |
| Quiz completion | `quiz_complete` | Micro-conversion |
| Email capture | `email_capture_submit` | Micro-conversion |
| Study plan page visit | `seo_page_view` where `page_type=study-plan` | Engagement |

---

## 5. Reporting Cadence

### 5.1 Weekly Report (5 min — automated)

Create a simple spreadsheet or Notion table that auto-fills from GSC API:

| Metric | This Week | Last Week | Δ |
|--------|-----------|-----------|---|
| Organic clicks | | | |
| Impressions | | | |
| Avg. position | | | |
| Pages indexed | | | |
| Signups from organic | | | |

### 5.2 Monthly Report (30 min — manual)

| Section | Content |
|---------|---------|
| Executive summary | 3 bullets: wins, challenges, next priorities |
| Traffic | Organic sessions trend, top 10 queries, top 10 pages |
| Indexing | Total indexed, new pages indexed, crawl errors |
| Rankings | Money keyword positions (table), movements |
| Conversions | Signups from organic, quiz completions, email captures |
| Content | Pages published this month, word count, content gaps identified |
| Technical | Core Web Vitals status, structured data errors, mobile usability |
| Next month plan | Top 5 priorities |

### 5.3 Quarterly Review (2 hours — strategic)

| Analysis | Questions to Answer |
|----------|---------------------|
| ROI | Hours invested vs signups generated. Cost per organic signup. |
| Channel comparison | Organic vs direct vs referral — which grows fastest? |
| Content type analysis | Which template (hub, domain, blog, comparison) drives most signups? |
| Keyword portfolio | Are money keywords moving? What new opportunities emerged? |
| Technical debt | Any crawl issues, slow pages, structured data errors? |
| Competitive movement | Did competitors launch similar content? New entrants? |
| Strategy adjustment | What to double down on? What to stop doing? |

---

## 6. Dashboards

### 6.1 Google Looker Studio Dashboard (Free)

Connect GSC + GA4 to Looker Studio for automated visualization:

**Dashboard panels:**
1. Organic traffic trend (line chart, 90 days)
2. Top 20 queries (table: query, impressions, clicks, CTR, position)
3. Top 20 pages (table: URL, clicks, impressions, avg position)
4. Indexing status (donut chart: indexed vs not indexed)
5. Core Web Vitals (bar chart: good vs needs improvement vs poor)
6. Conversion funnel (funnel: impressions → clicks → signups)
7. Country breakdown (geo map)
8. Device split (pie chart: mobile vs desktop)

**Setup time:** 2-3 hours. **Updates:** Automatic.

### 6.2 Lightweight Alternative: Spreadsheet

If Looker Studio feels heavy, a Google Sheet with weekly manual entry works:

```
| Week | Organic Clicks | Impressions | Avg Pos | Pages Indexed | Signups |
|------|---------------|-------------|---------|---------------|---------|
| W1   |               |             |         |               |         |
| W2   |               |             |         |               |         |
| ...  |               |             |         |               |         |
```

5 minutes per week. Charts auto-generate from the data.

---

## 7. Alerts & Thresholds

### 7.1 Automated Alerts (Google Search Console Email)

GSC sends email alerts automatically for:
- Manual actions (penalty)
- Security issues
- Crawl errors spike
- Mobile usability issues

**Action:** Ensure GSC email notifications are ON.

### 7.2 Manual Threshold Alerts

| Condition | Threshold | Action |
|-----------|-----------|--------|
| Indexed pages drop >10% in a week | <90% of previous week | Check for deindexation, noindex errors, sitemap issues |
| Avg position for money keyword increases by >10 positions | Position jump >10 | Investigate: content update? competitor? algorithm update? |
| Organic clicks drop >20% week-over-week | <80% of previous week | Check GSC for errors, verify pages are accessible |
| Core Web Vitals fail | Any metric in "poor" | Fix immediately — affects ranking |
| Quiz completion rate drops below 20% | <20% | Improve quiz UX, check for bugs |
| Organic signup rate drops below 3% | <3% of organic visitors | Improve CTAs, test new copy |

---

## 8. SEO Health Score

A simple composite score to track overall SEO health weekly:

| Component | Weight | Score (0-100) | How to Calculate |
|-----------|--------|---------------|------------------|
| Technical SEO | 25% | | robots.txt + sitemap + structured data + CWV all passing |
| Indexing | 25% | | % of submitted pages that are indexed |
| Content velocity | 20% | | Pages published this week vs target |
| Rankings | 15% | | % of money keywords in top 30 |
| Conversions | 15% | | Organic signups vs target |

**Formula:** `Health = (Tech×0.25) + (Index×0.25) + (Velocity×0.20) + (Rankings×0.15) + (Conversions×0.15)`

**Targets:**
- Day 30: Health ≥ 50
- Day 60: Health ≥ 65
- Day 90: Health ≥ 75

---

## 9. Attribution Model

### 9.1 First-Touch Attribution (Recommended for Day 1)

For an early-stage product, **first-touch attribution** is simplest and most accurate:

- **How:** When a user signs up, record their first landing page and referral source
- **Implementation:** Store `utm_source`, `utm_medium`, `utm_campaign`, and `document.referrer` in a cookie or `localStorage` on first visit. Pass to signup event.
- **Why first-touch:** You need to know which *content* brought the user in. Last-touch would over-credit the `/login` page.

### 9.2 Attribution Data to Store

```typescript
interface AttributionData {
  firstLandingPage: string;     // "/en/cissp/domain-1-security-and-risk-management"
  firstReferrer: string;        // "google.com" or "direct"
  utmSource?: string;           // "seo" | "blog" | "email"
  utmMedium?: string;           // "organic" | "inline_cta" | "comparison"
  utmCampaign?: string;         // "cissp_hub" | "free_quiz"
  firstVisitDate: string;       // ISO date
  signupDate?: string;          // ISO date (filled on conversion)
  touchpoints: number;          // How many sessions before signup
}
```

Store in Firestore under `users/{uid}/attribution` — lightweight, queryable, free.

---

## 10. Competitive Monitoring

### 10.1 Monthly Competitor Check (30 min)

Track these competitors' organic presence monthly:

| Competitor | What to Track | How |
|------------|---------------|-----|
| Boson ExSim | New pages, blog posts, keyword targeting | Google `site:bosonexam.com` |
| Pocket Prep | SEO changes, new content | Google `site:pocketprep.com cissp` |
| CCCure | Content updates, new features | Google `site:cccure.education` |
| Cybrary | Blog topics overlapping with yours | Google `site:cybrary.it cissp` |
| CertMaster | New cert coverage, pricing changes | `site:isc2.org certmaster` |

### 10.2 What Competitors Can't Copy

Even if competitors match your content, your moat is:
1. **Product integration:** Content pages lead to free quiz → signup → adaptive practice
2. **Data-driven content:** As user base grows, add "X% of users found Domain 1 hardest" — unique data
3. **Programmatic scale:** 33 domain pages + 5 certs = coverage breadth
4. **Speed of iteration:** Solo founder can ship daily, enterprises move quarterly
