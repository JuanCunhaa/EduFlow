# Feedback Collection — Methods & Instruments

> Status: DRAFT
> Date: 2026-02-12
> Role: Customer Research + Product
> Dependency: `beta-program.md`

---

## 1. Feedback Layers

Collect feedback through multiple channels — no single channel captures everything.

| Layer | What It Captures | When | Effort for User |
|-------|-----------------|------|-----------------|
| **In-app analytics** | Behavior (what they do) | Continuous | Zero |
| **In-app micro-feedback** | Moment-of-use reactions | Per exam, per feature | 5 seconds |
| **Feedback channel** (Discord/Slack) | Organic complaints, praise, questions | Ongoing | Low (voluntary) |
| **Surveys** (2 total) | Structured sentiment + needs | Mid-beta, exit | 5 minutes each |
| **1:1 calls** (optional) | Deep insight, emotional context | Mid-beta | 15-30 minutes |

---

## 2. In-App Analytics (Passive — Zero User Effort)

Track these automatically. No surveys needed.

### 2.1 Engagement Metrics

| Metric | How to Measure | What It Tells You |
|--------|---------------|-------------------|
| DAU / WAU | `lastActiveAt` on UserProfile | Is the product sticky? |
| Session duration | Time between page load → last interaction | Are sessions meaningful or bounces? |
| Exams completed per user | Count `exams` collection per uid | Core loop engagement |
| Questions answered per session | Sum from exam data | Depth of practice |
| Exam modes used | Which `ExamMode` values appear in exam docs | Feature discovery |
| Drop-off mid-exam | Exams started but not completed | Friction or fatigue signal |
| Feature adoption | How many users tried: analytics, domain focus, notes, marketplace | Guides feature investment |

### 2.2 Outcome Metrics

| Metric | How to Measure | What It Tells You |
|--------|---------------|-------------------|
| Score trend (per user) | Avg score W1 vs W3 vs W5 | Is practice working? |
| Domain improvement | Per-domain score delta over time | Adaptive mode effectiveness |
| Weak-domain identification accuracy | Do users who use "weak domains" mode improve faster? | Core value prop validation |
| Time to first "passing" score (≥70%) | Timestamp of first exam ≥ 70% | Time-to-value |

---

## 3. In-App Micro-Feedback (5 Seconds)

### 3.1 Post-Exam Thumbs Up/Down

After every exam result screen, show:

```
┌────────────────────────────────────────┐
│  How was this practice session?        │
│                                        │
│     👍  Helpful    👎  Not helpful      │
│                                        │
│  (optional) What could be better?      │
│  [____________________________]        │
│                                        │
│  [Skip]                  [Submit]      │
└────────────────────────────────────────┘
```

**Rules:**
- Show on every 3rd exam (not every one — avoids survey fatigue)
- One tap to submit (thumbs = required, text = optional)
- Store in `users/{uid}/feedback/{examId}`
- Beta only — remove or reduce frequency post-launch

### 3.2 Feature-Specific Feedback

When a user tries a feature for the first time (e.g., "weak domains" mode, analytics page), show a subtle prompt after 30 seconds:

```
┌────────────────────────────────────────┐
│  First time using Domain Analytics?    │
│  Did this help you understand          │
│  where to focus?                       │
│                                        │
│  [Yes] [Somewhat] [No] [Dismiss]       │
└────────────────────────────────────────┘
```

Show once per feature per user. Never repeat.

### 3.3 Data Schema

```typescript
interface MicroFeedback {
    id: string;
    uid: string;
    type: 'post_exam' | 'feature_first_use';
    context: string;                       // examId or feature name
    rating: 'positive' | 'negative' | 'neutral';
    comment: string | null;
    createdAt: Timestamp;
}

// Path: users/{uid}/feedback/{feedbackId}
// OR centralized: feedback/{feedbackId} (easier to query across users)
```

---

## 4. Feedback Channel (Discord/Slack)

### 4.1 Channel Structure

```
#feedback         ← Primary: bugs, friction, requests
#wins             ← Celebrations: high scores, progress
#general          ← Casual chat, introductions
#feature-preview  ← Founder shares upcoming work
```

### 4.2 Founder Engagement Rules

| Rule | Why |
|------|-----|
| Reply to every #feedback message within 24 hours | Shows you care; prevents frustration buildup |
| Thank users for negative feedback | "Thanks for flagging this — this is exactly why we're doing the beta" |
| Never get defensive | They're doing you a favor by pointing out problems |
| Share what you shipped based on their feedback | "You mentioned X was confusing — I shipped a fix today" (builds trust) |
| Don't promise timelines for feature requests | "That's on our radar" is fine. "I'll ship it next week" is a trap. |
| Pin important announcements | Keep #general clean |

### 4.3 Structured Feedback Prompt (Weekly)

Post every Monday in #feedback:

```
📋 Weekly Feedback Round

This week I'd love to hear about:
1. What's the most frustrating thing about ExamFlow right now?
2. What's one thing you wish existed?
3. (optional) Anything else on your mind?

No wrong answers. Blunt feedback = best feedback.
```

---

## 5. Surveys (2 Total)

### 5.1 Mid-Beta Survey (End of Week 3)

**Delivery:** Email link to Google Form / Tally
**Incentive:** Required for "complete the program" reward
**Target response rate:** ≥ 80%
**Length:** 10 questions, ~5 minutes

```
Mid-Beta Survey — ExamFlow

1. How often are you using ExamFlow per week?
   ○ Daily
   ○ 3-5 times/week
   ○ 1-2 times/week
   ○ Less than once/week
   ○ I stopped using it

2. Which exam mode do you use most?
   ○ Practice (random questions)
   ○ Domain Focus
   ○ Weak Domains
   ○ Recent Misses
   ○ Spaced Review
   ○ Real Mix
   ○ I haven't tried different modes

3. On a scale of 1-10, how useful is ExamFlow for your cert prep?
   [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]

4. What's the best thing about ExamFlow? (free text)
   [_______________________________________________]

5. What's the worst thing about ExamFlow? (free text)
   [_______________________________________________]

6. Is there anything confusing about the UI? (free text)
   [_______________________________________________]

7. How does ExamFlow compare to other study tools you've used?
   (e.g., Boson, Pocket Prep, CCCure, official ISC2 materials)
   [_______________________________________________]

8. Would you recommend ExamFlow to a friend studying for the
   same cert?
   ○ Yes, definitely
   ○ Probably
   ○ Not sure
   ○ Probably not
   ○ No

9. On a scale of 0-10, how likely are you to recommend ExamFlow
   to a colleague? (NPS)
   [0] [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]

10. Anything else you want to tell me? (optional)
    [_______________________________________________]
```

### 5.2 Exit Survey (End of Week 5)

**Delivery:** Email link
**Incentive:** Required for post-beta Pro access
**Target response rate:** ≥ 85%
**Length:** 12 questions, ~5 minutes

```
Exit Survey — ExamFlow Beta

1. How many practice exams did you take during the beta?
   ○ 1-5
   ○ 6-15
   ○ 16-30
   ○ 31-50
   ○ 50+

2. Did your exam scores improve during the beta?
   ○ Yes, significantly (10%+ improvement)
   ○ Yes, somewhat (5-10% improvement)
   ○ About the same
   ○ They got worse
   ○ I don't know

3. Did ExamFlow accurately identify your weak domains?
   ○ Yes, very accurately
   ○ Somewhat
   ○ Not really
   ○ I didn't use that feature

4. Which feature was most valuable to you?
   ○ Adaptive weak-domain targeting
   ○ Practice exam variety / modes
   ○ Detailed explanations
   ○ Domain analytics
   ○ Exam history / progress tracking
   ○ Other: ___

5. Which feature was least valuable or needs the most work?
   [_______________________________________________]

6. If ExamFlow cost $29/month, would you pay for it?
   ○ Yes, without hesitation
   ○ Probably
   ○ Maybe — depends on improvements
   ○ Probably not
   ○ No

7. What price feels right for a tool like this? (monthly)
   ○ Free only
   ○ $10-15/month
   ○ $15-25/month
   ○ $25-35/month
   ○ $35-50/month

8. Have you taken or scheduled your certification exam?
   ○ Yes, I passed! 🎉
   ○ Yes, scheduled
   ○ Not yet, but planning to
   ○ Not planning to take it soon

9. NPS: On a scale of 0-10, how likely are you to recommend
   ExamFlow to a colleague?
   [0] [1] [2] [3] [4] [5] [6] [7] [8] [9] [10]

10. Would you be willing to provide a short testimonial?
    ○ Yes — email me
    ○ Yes — I'll write one now: [_______________]
    ○ No, thanks

11. Would you be open to a 5-minute video testimonial call?
    ○ Yes
    ○ Maybe later
    ○ No

12. Any final thoughts? What would make you a lifelong user?
    [_______________________________________________]
```

---

## 6. 1:1 Calls (Optional, High-Signal)

### 6.1 When to Do Them

- **Mid-beta:** Invite 5-8 users who are highly engaged OR who reported friction
- **Post-exit-survey:** Invite 3-5 users whose survey answers were especially insightful
- Schedule via Calendly or manual email

### 6.2 Call Script (15 Minutes)

```
1. (2 min) Thanks for joining. Quick reminder: there are no wrong
   answers, I genuinely want to hear what's not working.

2. (3 min) Walk me through a typical study session with ExamFlow.
   What do you do first? What mode do you use? How long?

3. (3 min) What's the most frustrating thing you've experienced?
   What almost made you stop using it?

4. (3 min) What surprised you? Anything unexpectedly useful?

5. (2 min) If you could change one thing, what would it be?

6. (2 min) Is there anything you wish ExamFlow did that it doesn't?

7. (bonus) If I asked you to describe ExamFlow to a friend in one
   sentence, what would you say?
```

### 6.3 Recording & Consent

- Always ask permission before recording: "Mind if I record this for my notes? It won't be shared."
- If yes: record (Zoom/Meet). If no: take manual notes.
- Never publish call recordings without explicit written consent.

---

## 7. Feedback Triage System

### 7.1 Categories

| Category | Response Time | Action |
|----------|--------------|--------|
| **Bug (critical)** — data loss, crashes, auth failure | Same day | Fix immediately |
| **Bug (minor)** — UI glitch, typo, visual issue | Within beta period | Batch fix weekly |
| **UX friction** — confusing flow, unclear UI | Within beta period | Redesign if ≥ 3 reports |
| **Feature request** — new capability | Log → backlog | Ship if quick win (<2 hrs); else defer |
| **Content issue** — wrong answer, bad explanation | Same day | Fix immediately (trust damage) |
| **Praise** — "this is great!" | Same day | Thank them; ask for testimonial |

### 7.2 Tracking

Simple spreadsheet or Notion board:

```
| Date | User | Category | Description | Status | Shipped? |
|------|------|----------|-------------|--------|----------|
```

Don't over-engineer tracking for 30-60 users. A spreadsheet is fine.

---

## 8. What Success Looks Like

| Signal | Green | Yellow | Red |
|--------|-------|--------|-----|
| Mid-beta NPS | ≥ 40 | 20-39 | < 20 |
| Exit NPS | ≥ 50 | 30-49 | < 30 |
| "Would you pay $29/mo?" Yes+Probably | ≥ 50% | 30-49% | < 30% |
| WAU during beta | ≥ 70% | 50-69% | < 50% |
| Score improvement reported | ≥ 60% say "yes" | 40-59% | < 40% |
| Testimonial volunteers | ≥ 10 | 5-9 | < 5 |
| Critical bugs | ≤ 3 during beta | 4-8 | > 8 |
