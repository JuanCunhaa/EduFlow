# Creator Tools — Dashboard & Authoring

> Status: DRAFT
> Date: 2026-02-12
> Role: Product + Marketplace GM
> Depends on: `creator-marketplace.md`, `creator-incentives-revenue-share.md`
> Related: `moderation-review.md`, `marketplace-economy.md`

---

## 1. Creator Dashboard Overview

The creator dashboard is the creator's command center. Everything they need to write, manage, price, and track their content lives here.

**Route:** `/marketplace/creator/dashboard`

**Access:** Only verified creators (creator account with `status: 'approved'`)

```
Creator Dashboard
─────────────────────────────────────────────────────────────

┌────────────────────┐ ┌────────────────────┐ ┌──────────────────┐
│  Welcome, Jane     │ │  ✅ Verified       │ │  Tier: Standard  │
│  CISSP, CCSP       │ │  🏆 Top Creator    │ │  70/30 split     │
└────────────────────┘ └────────────────────┘ └──────────────────┘

Navigation:
  📦 My Packs          — create, edit, manage packs
  📊 Analytics         — sales, revenue, ratings
  💰 Earnings          — payouts, revenue share
  ⭐ Reviews           — buyer feedback, responses
  ⚙️ Settings          — profile, payout, notifications
```

---

## 2. Pack Management

### 2.1 My Packs — List View

```
My Packs                                    [+ Create New Pack]
─────────────────────────────────────────────────────────────

┌──────────────────────────────────────────────────────────────┐
│ 📦 CISSP Domain 1 Deep Dive                                  │
│ ● Published  ·  75 Q  ·  $9.99  ·  42 sales  ·  ★ 4.6     │
│ Last updated: 3 days ago                                     │
│ [Edit] [View Analytics] [View on Marketplace]                │
├──────────────────────────────────────────────────────────────┤
│ 📦 CISSP Full Practice Exam                                  │
│ ● Published  ·  150 Q  ·  $19.99  ·  18 sales  ·  ★ 4.8   │
│ Last updated: 1 week ago                                     │
│ [Edit] [View Analytics] [View on Marketplace]                │
├──────────────────────────────────────────────────────────────┤
│ 📦 CCSP Domain 2 — Cloud Concepts                            │
│ ○ In Review  ·  50 Q  ·  $7.99  ·  Submitted 1 day ago     │
│ [View Status]                                                │
├──────────────────────────────────────────────────────────────┤
│ 📦 CISSP Domain 3 — Architecture (Draft)                     │
│ ○ Draft  ·  28 Q  ·  Not priced yet                         │
│ [Continue Editing]                                           │
├──────────────────────────────────────────────────────────────┤
│ 📦 CC Quick Assessment                                       │
│ ⚠️ Revision Needed  ·  40 Q  ·  $4.99                       │
│ "2 questions need corrections — see notes"                   │
│ [View Notes & Fix]                                           │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Create / Edit Pack — Metadata

```
Create New Pack
─────────────────────────────────────────────────────────────

Certification *
  [CISSP ▼]  (only certs the creator is verified for)

Title *
  [CISSP Domain 1: Security & Risk Management Deep Dive     ]
  Max 80 characters

Description *
  ┌──────────────────────────────────────────────────────────┐
  │ 75 expert-written practice questions covering every      │
  │ objective in Domain 1. Includes scenario-based questions,│
  │ detailed explanations, and a mix of difficulties.        │
  └──────────────────────────────────────────────────────────┘
  Min 100 characters

Domains *
  ☑ D1: Security and Risk Management
  ☐ D2: Asset Security
  ☐ D3: Security Architecture and Engineering
  ... (domain list from cert definition)

Pricing
  ○ Free
  ● Paid  [$9.99  USD]  (min $2.99, max $49.99)

Tags (comma-separated)
  [domain-1, risk-management, governance, BCP-DRP          ]

Accent Color
  [🎨 #10b981]

[Save as Draft]   [Next: Add Questions →]
```

---

## 3. Question Authoring

### 3.1 Single Question Editor

```
Add Question                                    Q #14 of 75
─────────────────────────────────────────────────────────────

Domain *
  [D1: Security and Risk Management ▼]

Difficulty *
  ○ Easy   ● Medium   ○ Hard

Question Text *
  ┌──────────────────────────────────────────────────────────┐
  │ Which risk analysis method uses ALE, SLE, and ARO to    │
  │ quantify risk in monetary terms?                        │
  └──────────────────────────────────────────────────────────┘

Options *                                    Correct
  A: [Qualitative risk analysis              ] ○
  B: [Quantitative risk analysis             ] ●
  C: [Bow-tie analysis                       ] ○
  D: [Failure mode and effects analysis      ] ○
  [+ Add Option E]

Explanation — Short *
  ┌──────────────────────────────────────────────────────────┐
  │ Quantitative risk analysis uses formulas like ALE =     │
  │ SLE × ARO to express risk in monetary values, enabling  │
  │ cost-benefit analysis for security controls.            │
  └──────────────────────────────────────────────────────────┘

Why Others Wrong *
  A: [Qualitative analysis uses subjective ratings          ]
     [(high/medium/low), not monetary values.               ]
  C: [Bow-tie analysis visualizes risk pathways but         ]
     [doesn't calculate monetary impact.                    ]
  D: [FMEA identifies failure modes in systems but          ]
     [doesn't use ALE/SLE/ARO formulas.                     ]

Tags (optional)
  [risk-analysis, ALE, quantitative                        ]

☐ Mark as sample question (visible to non-purchasers)

[Save & Add Another]   [Save & Return to Pack]
```

### 3.2 Question Quality Indicators

Real-time feedback while the creator writes:

```
Quality Check:
  ✅ Question has 4 options
  ✅ Correct answer marked
  ✅ Explanation provided (87 chars)
  ⚠️ "Why others wrong" missing for option D — add it for better quality
  ✅ Domain assigned
  ✅ Difficulty set
```

These are advisory, not blocking. The submission-time automated checks enforce hard requirements.

### 3.3 Bulk CSV Import

For creators who prefer to author in spreadsheets:

```
Import Questions from CSV                    [Download Template]
─────────────────────────────────────────────────────────────

Drag & drop a CSV file or [Browse Files]

CSV Format:
  domain_id, difficulty, question_text, option_a, option_b, 
  option_c, option_d, correct_option, explanation_short, 
  why_a_wrong, why_b_wrong, why_c_wrong, why_d_wrong, tags

Preview (first 3 rows):
┌──────────────────────────────────────────────────────────────┐
│ #  Domain  Diff    Question                   Options  Valid │
│ 1  d1      medium  Which risk analysis...     4        ✅   │
│ 2  d1      hard    An organization wants...   4        ✅   │
│ 3  d2      easy    Data classification...     4        ⚠️   │
│    ↳ Warning: explanation_short is empty                     │
└──────────────────────────────────────────────────────────────┘

Total: 48 questions   Valid: 47   Warnings: 1   Errors: 0

[Import 48 Questions]   [Cancel]
```

### 3.4 Question List / Management

```
Pack: CISSP Domain 1 Deep Dive — Questions (75)
─────────────────────────────────────────────────────────────

Filter: [All Domains ▼] [All Difficulties ▼] [Search...     ]
Sort:   [Order Added ▼]

┌──────────────────────────────────────────────────────────────┐
│  #  Domain  Diff    Question Preview              Sample  ⋮ │
│──────────────────────────────────────────────────────────────│
│  1  D1      Med     Which risk analysis method...   ☆     ✎ │
│  2  D1      Easy    The primary purpose of a...     ★     ✎ │
│  3  D1      Hard    An organization is evaluati...  ☆     ✎ │
│  4  D1      Med     What is the first step in...    ☆     ✎ │
│  ...                                                         │
│  75 D1      Hard    A CISO needs to justify...      ★     ✎ │
└──────────────────────────────────────────────────────────────┘

★ = Sample question (3 of 5 max selected)

Bulk Actions: ☐ Select all
  [Delete Selected]  [Change Domain]  [Change Difficulty]
```

---

## 4. Pack Submission Flow

### 4.1 Pre-Submit Validation

When the creator clicks "Submit for Review," the system runs automated checks:

```
Submission Checklist
─────────────────────────────────────────────────────────────

Pack: CISSP Domain 1 Deep Dive

  ✅ Title: "CISSP Domain 1: Security & Risk Mgmt Deep Dive" (52 chars)
  ✅ Description: 154 characters
  ✅ Questions: 75 (minimum 15 required)
  ✅ Sample questions: 3 marked (minimum 3 required)
  ✅ All questions have explanations
  ✅ Difficulty distribution: 18% easy · 52% medium · 30% hard
  ✅ Pricing: $9.99 (within $2.99–$49.99 range)
  ⏳ Running plagiarism check...
  ✅ Plagiarism check: Passed (0 matches above 80%)

  All checks passed. Ready to submit.

  ☑ I certify that this content is original and has been
    expert-verified for accuracy. I agree to the Creator
    Content Policy (v2.1).

  [Submit for Review →]

  After submission, your pack enters the review queue.
  Expected review time: 48-72 hours.
  You'll receive an email when a decision is made.
```

### 4.2 Submission Status Tracking

```
Pack Status: CISSP Domain 1 Deep Dive
─────────────────────────────────────────────────────────────

  ● Draft               ✅ Completed
  ● Submitted            ✅ Feb 10, 2026 at 3:14 PM
  ● In Review            🔄 Started Feb 11, 2026 at 9:00 AM
  ○ Decision             ⏳ Pending
  ○ Published            —

  Estimated decision: Within 24 hours
  Current queue position: #3

  You'll receive an email when the review is complete.
  You can continue editing other packs while waiting.
```

---

## 5. Creator Analytics

### 5.1 Pack-Level Analytics

```
Analytics: CISSP Domain 1 Deep Dive
─────────────────────────────────────────────────────────────

Overview (Last 30 days)
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ Sales     │ │ Revenue   │ │ Your Share│ │ Rating    │
│   42      │ │ $419.58   │ │ $293.71   │ │ ★ 4.6    │
│ +15% ↑   │ │ +15% ↑   │ │ +15% ↑   │ │ (42 rev) │
└───────────┘ └───────────┘ └───────────┘ └───────────┘

Sales Over Time (bar chart)
  Jan: ███████████████ 28
  Feb: ██████████████████ 35 (projected)

Buyer Behavior
  ┌──────────────────────────────────────────────────────────┐
  │ Average exam score using your questions: 68%             │
  │ Questions most often answered wrong:                     │
  │   Q#51 (42% correct) — consider improving explanation?  │
  │   Q#23 (48% correct) — difficult, but well-received     │
  │   Q#7 (52% correct) — check for ambiguity              │
  │                                                          │
  │ Completion rate: 83% of importers used all questions    │
  │ Average rating for D1 coverage: 4.7 / 5                │
  └──────────────────────────────────────────────────────────┘

Refund Rate: 4.8% (2 refunds out of 42 sales) ✅ Healthy
```

### 5.2 Portfolio Analytics

```
Creator Analytics — All Packs
─────────────────────────────────────────────────────────────

Lifetime
┌───────────┐ ┌───────────┐ ┌───────────┐ ┌───────────┐
│ Packs     │ │ Questions │ │ Total Rev │ │ Avg Rating│
│   8       │ │  1,240    │ │ $3,215.50 │ │ ★ 4.6    │
└───────────┘ └───────────┘ └───────────┘ └───────────┘

Top Performers
  1. CISSP Full Practice Exam         $1,200 · 60 sales · ★ 4.8
  2. CISSP D1 Deep Dive                 $900 · 42 sales · ★ 4.6
  3. CC Full Assessment                 $500 · 35 sales · ★ 4.4

Revenue Tier Progress
  Standard (70/30) → Silver (75/25)
  $3,215 / $5,000 ████████████████░░░░ 64%

Growth Tips:                                          [Dismiss]
  💡 Your D1 pack has 42 sales. Creators who 
     publish a D2 companion pack see 30% more 
     total sales. Consider creating one!
```

### 5.3 Analytics Data Sources

| Metric | Source | Update Frequency |
|--------|--------|-----------------|
| Sales count | `purchases` collection query by `creatorId` | Real-time (on purchase webhook) |
| Revenue (gross + creator share) | Aggregated from `purchases` | Real-time |
| Average rating | `pack_reviews` collection average by `packId` | On new review |
| Buyer exam performance | Aggregated from `exams` where question source matches pack | Nightly batch job |
| Question difficulty stats | Performance data from exams using pack questions | Nightly batch job |
| Refund rate | `purchases` with status `refunded` / total | Real-time |

**Privacy note:** Creators see aggregate stats only. No individual buyer data (no names, emails, or specific exam results).

---

## 6. Review Management

### 6.1 Review Inbox

```
Reviews — All Packs                          Filter: [All ▼]
─────────────────────────────────────────────────────────────

New Reviews (3)
┌──────────────────────────────────────────────────────────────┐
│ ★★★★★  "Best D1 questions I've found."                       │
│ — Mike T. · CISSP D1 Deep Dive · 3 days ago                  │
│ [Respond]                                                    │
├──────────────────────────────────────────────────────────────┤
│ ★★★☆☆  "Some questions feel outdated for the 2025 exam."    │
│ — Sarah L. · CISSP Full Practice · 5 days ago                │
│ [Respond]  ← Actionable — consider updating!                │
├──────────────────────────────────────────────────────────────┤
│ ★★★★☆  "Good overall, a few typos in explanations."         │
│ — Alex P. · CC Full Assessment · 1 week ago                  │
│ [Respond]                                                    │
└──────────────────────────────────────────────────────────────┘
```

### 6.2 Creator Responses

Creators can respond once per review:

```
Responding to Mike T.'s review on CISSP D1 Deep Dive:
─────────────────────────────────────────────────────────────

★★★★★  "Best D1 questions I've found. The explanations really
help understand the concepts, not just memorize answers."
— Mike T. · Verified Purchase · 3 days ago

Your Response:
┌──────────────────────────────────────────────────────────┐
│ Thank you, Mike! I focused on making each explanation a  │
│ mini-lesson. Glad it's working for your study plan.     │
│ Good luck on the exam!                                  │
└──────────────────────────────────────────────────────────┘

⚠️ Response guidelines:
   • Be professional and constructive
   • Address specific concerns raised in the review
   • Don't offer refunds or discounts in public responses
   • Reports of factual errors should be followed by an update

[Post Response]
```

---

## 7. Creator Settings

### 7.1 Profile Settings

```
Creator Profile Settings
─────────────────────────────────────────────────────────────

Display Name
  [Jane Smith                                               ]

Public Bio
  ┌──────────────────────────────────────────────────────────┐
  │ Senior Security Architect with 12 years in enterprise   │
  │ cybersecurity. CISSP and CCSP certified. I write        │
  │ questions the way the real exam challenges you.         │
  └──────────────────────────────────────────────────────────┘

Profile Photo
  [Upload Photo]  Current: jane-smith.jpg

LinkedIn URL
  [https://linkedin.com/in/janesmith                        ]

Certifications (verified — cannot edit, contact support)
  ✅ CISSP (verified Feb 1, 2026)
  ✅ CCSP (verified Feb 1, 2026)

[Save Profile]
```

### 7.2 Payout Settings

```
Payout Settings
─────────────────────────────────────────────────────────────

Stripe Connected Account
  Status: ✅ Active (acct_1234...5678)
  Charges: ✅ Enabled
  Payouts: ✅ Enabled
  Country: 🇺🇸 United States
  Default Currency: USD

  [Manage in Stripe Dashboard →]
  (opens Stripe Express dashboard — update bank, view transfers)

Payout Schedule (managed in Stripe):
  Current: Daily automatic payouts

Revenue Tier: Standard (70/30)
  Lifetime Revenue: $3,215.50
  Next Tier: Silver (75/25) at $5,000 — $1,784.50 to go
```

### 7.3 Notification Preferences

```
Notification Settings
─────────────────────────────────────────────────────────────

Email Notifications:
  ☑ New sale / purchase
  ☑ New review on my packs
  ☑ Pack review decision (approved/revision/rejected)
  ☑ Revenue milestone reached
  ☐ Weekly sales summary
  ☐ Marketing tips and creator resources

In-App Notifications:
  ☑ All of the above
  ☑ System announcements (policy changes, new features)

[Save Preferences]
```

---

## 8. Creator Onboarding Experience

### 8.1 First-Time Creator Flow

After verification approval, the creator sees a guided onboarding:

```
Step 1 of 4: Welcome to the Creator Program! 🎉
─────────────────────────────────────────────────────────────

You're verified! Here's how to publish your first question pack:

  1. Set up your payout → Connect your Stripe account
  2. Complete your profile → Bio, photo, certifications
  3. Create your first pack → Metadata + questions
  4. Submit for review → Our team reviews within 72 hours

Pro Tips:
  ✓ Start with a focused pack (15-30 questions on one domain)
  ✓ Write detailed explanations — buyers rate them highest
  ✓ Use all difficulty levels for a well-rounded pack
  ✓ Free first pack? Great way to build your reputation

[Get Started →]
```

### 8.2 Payout Setup Gate

Creators can create and submit free packs without setting up payouts. For paid packs, Stripe Connect onboarding is required before the pack can be published:

```
Ready to Publish!
─────────────────────────────────────────────────────────────

Your pack "CISSP D4 — Network Security" has been approved! ✅

⚠️ This is a paid pack ($9.99). To publish, please set up
   your payout account first.

[Set Up Stripe Payouts →]

Or: [Change to Free Pack]  (this will remove the price)
```

---

## 9. Content Versioning

### 9.1 Pack Versions

Every time a creator updates a published pack (adds questions, edits content), the pack version increments:

```typescript
interface PackVersion {
    version: number;              // auto-increment
    changeType: 'questions_added' | 'questions_edited' | 'metadata_updated';
    questionsDelta: number;       // +5 (added) or 0 (edits only)
    changelog: string;            // creator's description of changes
    createdAt: Timestamp;
}
```

### 9.2 Change Tracking for Buyers

```
Pack Update Notification (in-app + email)
─────────────────────────────────────────────────────────────

📦 "CISSP Domain 1 Deep Dive" has been updated! (v3)

Changes:
  + 12 new questions added (75 → 87 total)
  ✎ 2 explanations improved
  ✎ 1 question's correct answer fixed

Creator note: "Added 12 scenario-based questions covering
   the 2025 exam objectives update. Fixed a typo in Q#51."

[Import Updates →]  [View Changelog]  [Dismiss]
```

---

## 10. Creator Communication

### 10.1 Platform-to-Creator Messages

| Event | Channel | Template |
|-------|---------|---------|
| Application approved | Email + in-app | "Welcome to the creator program! Here's how to get started." |
| Application rejected | Email | "We couldn't verify your credentials at this time. Here's why..." |
| Pack approved | Email + in-app | "Your pack is approved! Click to publish." |
| Pack needs revision | Email + in-app | "Your pack needs some changes. Here's what to fix..." |
| First sale | Email + in-app | "🎉 You made your first sale! $X.XX earned." |
| Revenue milestone | Email + in-app | "You've earned $X,XXX! You're now a [Tier] creator." |
| Strike issued | Email | "A moderation action has been taken on your account." |
| Policy update | Email | "Our content policy has been updated. Please review by [date]." |

### 10.2 Creator-to-Platform

Creators can contact platform support via:
- **In-app help widget** (generic support)
- **Appeal form** (for strikes and rejections)
- **Email: creators@examflow.app** (general inquiries)

There is no direct creator-to-buyer messaging. All communication goes through reviews (public) or support (private).

---

## 11. Implementation — Creator Dashboard Routes

| Route | Page | Access |
|-------|------|--------|
| `/marketplace/creators/apply` | Application form | Any authenticated user |
| `/marketplace/creators/{slug}` | Public creator profile | Public |
| `/marketplace/creator/dashboard` | Creator home | Verified creators only |
| `/marketplace/creator/packs` | Pack list | Verified creators only |
| `/marketplace/creator/packs/new` | Create pack | Verified creators only |
| `/marketplace/creator/packs/{id}/edit` | Edit pack + questions | Pack owner only |
| `/marketplace/creator/packs/{id}/questions` | Question list for pack | Pack owner only |
| `/marketplace/creator/packs/{id}/questions/new` | Add question | Pack owner only |
| `/marketplace/creator/packs/{id}/questions/import` | CSV bulk import | Pack owner only |
| `/marketplace/creator/packs/{id}/submit` | Submission flow | Pack owner only |
| `/marketplace/creator/packs/{id}/analytics` | Pack analytics | Pack owner only |
| `/marketplace/creator/analytics` | Portfolio analytics | Verified creators only |
| `/marketplace/creator/earnings` | Earnings dashboard | Verified creators only |
| `/marketplace/creator/reviews` | Review inbox | Verified creators only |
| `/marketplace/creator/settings` | Profile + payout settings | Verified creators only |

### API Routes — New

| Route | Method | Guard | Purpose |
|-------|--------|-------|---------|
| `/api/marketplace/creators/apply` | POST | withAuth | Submit creator application |
| `/api/marketplace/creators/{uid}` | GET | public | Get creator public profile |
| `/api/marketplace/creators/me` | GET | withCreator | Get own creator profile |
| `/api/marketplace/packs` | POST | withCreator | Create new pack |
| `/api/marketplace/packs/{id}` | PUT | withCreator + owner | Update pack metadata |
| `/api/marketplace/packs/{id}/questions` | POST | withCreator + owner | Add question(s) |
| `/api/marketplace/packs/{id}/questions/{qid}` | PUT | withCreator + owner | Edit question |
| `/api/marketplace/packs/{id}/questions/{qid}` | DELETE | withCreator + owner | Delete question |
| `/api/marketplace/packs/{id}/questions/import` | POST | withCreator + owner | Bulk CSV import |
| `/api/marketplace/packs/{id}/submit` | POST | withCreator + owner | Submit for review |
| `/api/marketplace/packs/{id}/publish` | POST | withCreator + owner | Publish approved pack |
| `/api/marketplace/packs/{id}/checkout` | POST | withAuth | Initiate purchase |
| `/api/marketplace/packs/{id}/reviews` | GET | public | List reviews |
| `/api/marketplace/packs/{id}/reviews` | POST | withAuth + purchaser | Write review |
| `/api/marketplace/packs/{id}/reviews/{rid}/respond` | POST | withCreator + owner | Creator response |
| `/api/marketplace/creator/analytics` | GET | withCreator | Creator analytics |
| `/api/marketplace/creator/earnings` | GET | withCreator | Earnings data |

### New Middleware

```
withCreator: Extends withAuth. Verifies user has an approved
creator account. Returns 403 if not a creator.

withCreator + owner: Additionally checks that the
authenticated creator owns the specific pack being modified.
```
