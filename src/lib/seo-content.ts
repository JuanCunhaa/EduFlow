/**
 * SEO content data — blog posts, study plans, comparisons, exam format data.
 * Supplements seo-data.ts (which handles cert/domain metadata).
 */

// ── Blog Posts ──────────────────────────────────

export interface BlogSection {
  heading: string;
  paragraphs: string[];
}

export interface BlogPost {
  slug: string;
  title: string;
  metaTitle: string;
  excerpt: string;
  category: string;
  readTime: string;
  publishedAt: string;
  relatedCert?: string;
  sections: BlogSection[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: 'cissp-study-strategy-2026',
    title: 'CISSP Study Strategy: How to Pass in 2026',
    metaTitle: 'CISSP Study Strategy 2026 — Step-by-Step Guide to Passing',
    excerpt:
      'A data-driven approach to CISSP preparation covering the 8 domains, CAT format, and optimal study schedule.',
    category: 'Study Guide',
    readTime: '12 min read',
    publishedAt: '2026-02-15',
    relatedCert: 'cissp',
    sections: [
      {
        heading: 'Understanding the CISSP CAT Format',
        paragraphs: [
          'The CISSP exam uses Computerized Adaptive Testing (CAT), which adjusts question difficulty based on your performance. This means the exam can range from 100 to 150 questions, and you have 3 hours to complete it.',
          'Unlike traditional linear exams, doing well on CAT actually means facing harder questions. If you feel like the questions are getting more difficult, that is a good sign — it means the algorithm believes you are performing above the passing threshold.',
        ],
      },
      {
        heading: 'The 8-Domain Study Approach',
        paragraphs: [
          'Instead of studying domains in order, prioritize by exam weight and your personal weakness. Domain 1 (Security and Risk Management) carries 16% of the exam weight — the highest — making it the most impactful domain to master.',
          'Start with a diagnostic exam covering all domains. Identify your weakest areas, then allocate study time proportionally. A candidate who is already strong in networking should spend less time on Domain 4 and more on whatever domains the diagnostic reveals as weak.',
        ],
      },
      {
        heading: 'Building Your Study Schedule',
        paragraphs: [
          'Most successful candidates study for 3 to 6 months, spending 2 to 3 hours per day. Structure your study time in cycles: learn a domain, practice questions, review mistakes, then move to the next domain.',
          'Reserve the final 2 to 3 weeks for full-length practice exams. Use adaptive practice mode to simulate the real CAT experience. Your readiness score should consistently be above 75% before scheduling your exam.',
        ],
      },
      {
        heading: 'Practice Questions: Quality Over Quantity',
        paragraphs: [
          'The official ISC2 CISSP questions are scenario-based and require you to think like a security manager, not a technician. When you practice, focus on understanding WHY an answer is correct, not just memorizing the correct option.',
          'Review every question you get wrong — and the ones you get right. Per-option explanations help you understand the reasoning behind each distractor, which strengthens your ability to eliminate wrong answers in novel scenarios.',
        ],
      },
    ],
  },
  {
    slug: 'cc-certification-guide-beginners',
    title: "ISC2 CC Certification: The Complete Beginner's Guide",
    metaTitle:
      'ISC2 CC Certification Guide 2026 — Free Entry-Level Cybersecurity Cert',
    excerpt:
      'Everything you need to know about the ISC2 Certified in Cybersecurity (CC) — the free, entry-level certification.',
    category: 'Certification Guide',
    readTime: '8 min read',
    publishedAt: '2026-02-10',
    relatedCert: 'cc',
    sections: [
      {
        heading: 'What is the ISC2 CC?',
        paragraphs: [
          'The Certified in Cybersecurity (CC) is ISC2\'s entry-level certification, launched as part of their "One Million Certified in Cybersecurity" initiative. It requires no prior work experience, making it the ideal starting point for anyone entering the cybersecurity field.',
          'The exam is completely free, and ISC2 provides free self-paced training material. This makes CC one of the most accessible cybersecurity certifications available.',
        ],
      },
      {
        heading: 'The 5 CC Domains',
        paragraphs: [
          'The CC exam covers 5 domains: Security Principles (26%), Business Continuity (10%), Access Controls (22%), Network Security (24%), and Security Operations (18%). The percentage indicates how much of the exam focuses on each domain.',
          'Security Principles and Network Security together account for half the exam, so mastering these two domains gives you the strongest foundation for passing.',
        ],
      },
      {
        heading: 'How to Prepare in 2 to 4 Weeks',
        paragraphs: [
          'Week 1: Complete the ISC2 free training for all 5 domains. Take detailed notes on concepts you do not already know.',
          'Week 2-3: Practice questions daily. Start with domain-focused practice to strengthen weak areas, then move to mixed practice exams. Aim for 50 to 100 questions per day.',
          'Week 4: Take full-length practice exams under timed conditions. Review every mistake. When you consistently score above 80%, you are ready to schedule your exam.',
        ],
      },
    ],
  },
  {
    slug: 'adaptive-practice-exams-explained',
    title: 'How Adaptive Practice Exams Help You Pass Faster',
    metaTitle:
      'Adaptive Practice Exams — Study Smarter for Cybersecurity Certs',
    excerpt:
      'Learn how adaptive exam technology targets your weak areas to accelerate your certification preparation.',
    category: 'Study Tips',
    readTime: '6 min read',
    publishedAt: '2026-02-05',
    sections: [
      {
        heading: 'The Problem with Random Practice',
        paragraphs: [
          'Traditional practice exams pull questions randomly from a question bank. This means you spend equal time on topics you already know and topics where you are weak. For a certification like CISSP with 8 domains, random practice can waste 30 to 50% of your study time.',
          'Adaptive practice solves this by analyzing your performance across domains and automatically focusing on your weakest areas. Every practice session is optimized for maximum learning.',
        ],
      },
      {
        heading: 'How Adaptive Mode Works',
        paragraphs: [
          'After your first few practice exams, the adaptive engine tracks your accuracy per domain. It then builds future practice sessions with a heavier focus on domains where your accuracy is below the target threshold.',
          'Combined with spaced repetition, which schedules question reviews at scientifically optimal intervals, adaptive practice can reduce the total study time needed to reach exam readiness by 20 to 40%.',
        ],
      },
      {
        heading: 'When to Switch from Adaptive to Full-Length',
        paragraphs: [
          'Use adaptive practice for the majority of your study period. When your readiness score rises above 70%, start mixing in full-length practice exams to build endurance and time management skills.',
          'The combination of targeted adaptive practice and realistic full-length simulations gives you both depth in weak areas and breadth across the entire exam blueprint.',
        ],
      },
    ],
  },
];

export function getBlogPost(slug: string): BlogPost | undefined {
  return BLOG_POSTS.find((p) => p.slug === slug);
}

// ── Study Plan Data ─────────────────────────────

export interface StudyWeek {
  title: string;
  focus: string;
  tasks: string[];
}

export interface StudyTip {
  title: string;
  description: string;
}

export interface StudyPlanData {
  totalWeeks: number;
  hoursPerWeek: number;
  weeks: StudyWeek[];
  tips: StudyTip[];
}

const CISSP_PLAN: StudyPlanData = {
  totalWeeks: 16,
  hoursPerWeek: 15,
  weeks: [
    {
      title: 'Week 1-2: Foundation',
      focus: 'Security and Risk Management (Domain 1)',
      tasks: [
        'Read official study guide chapters 1-4',
        'Complete Domain 1 practice questions (100+)',
        'Create flashcards for key terms',
      ],
    },
    {
      title: 'Week 3-4: Asset Security & Architecture',
      focus: 'Domains 2 & 3',
      tasks: [
        'Study data classification and security models',
        'Practice cryptography concepts',
        'Take domain-focused practice exams',
      ],
    },
    {
      title: 'Week 5-6: Networking & IAM',
      focus: 'Domains 4 & 5',
      tasks: [
        'Review OSI model and network protocols',
        'Study authentication and access control models',
        'Complete 200+ practice questions',
      ],
    },
    {
      title: 'Week 7-8: Assessment & Operations',
      focus: 'Domains 6 & 7',
      tasks: [
        'Study vulnerability assessment methodologies',
        'Review incident response and forensics',
        'Take a full-length diagnostic exam',
      ],
    },
    {
      title: 'Week 9-10: Development & Review',
      focus: 'Domain 8 + weak areas',
      tasks: [
        'Complete SDLC security topics',
        'Review diagnostic results and focus on weak domains',
        'Aim for 300+ questions this period',
      ],
    },
    {
      title: 'Week 11-12: Deep Dive',
      focus: 'Weakest 3 domains',
      tasks: [
        'Intensive practice on weak domains',
        'Review per-option explanations for missed questions',
        'Study cross-domain relationships',
      ],
    },
    {
      title: 'Week 13-14: Simulation',
      focus: 'Full-length practice exams',
      tasks: [
        'Take 4-6 full-length CAT-style practice exams',
        'Aim for 75%+ on each exam',
        'Review time management strategies',
      ],
    },
    {
      title: 'Week 15-16: Final Review',
      focus: 'Readiness confirmation',
      tasks: [
        'Final practice exam — target 80%+',
        'Light review of high-weight domains',
        'Rest day before the real exam',
      ],
    },
  ],
  tips: [
    {
      title: '🎯 Think Like a Manager',
      description:
        'CISSP tests managerial thinking, not technical implementation. When choosing between options, pick the one a CISO would choose.',
    },
    {
      title: '📖 Read the Stem Carefully',
      description:
        'CISSP questions are often wordy. Read the full question stem before looking at options. Identify what is actually being asked.',
    },
    {
      title: '🔄 Review Mistakes Daily',
      description:
        'After each practice session, review every wrong answer. Understanding WHY you chose incorrectly is more valuable than answering more questions.',
    },
    {
      title: '⏱️ Trust the Process',
      description:
        'If CAT questions feel hard, that is a good sign. The algorithm makes questions harder when you are performing above the passing threshold.',
    },
  ],
};

const CC_PLAN: StudyPlanData = {
  totalWeeks: 4,
  hoursPerWeek: 10,
  weeks: [
    {
      title: 'Week 1: Security Principles',
      focus: 'Domain 1 (26% of exam)',
      tasks: [
        'Complete ISC2 free training Module 1',
        'Study CIA triad, authentication, authorization',
        'Practice 50+ Domain 1 questions',
      ],
    },
    {
      title: 'Week 2: Access Controls & Network Security',
      focus: 'Domains 3 & 4 (46% combined)',
      tasks: [
        'Study access control models',
        'Review network fundamentals and threats',
        'Practice 100+ mixed domain questions',
      ],
    },
    {
      title: 'Week 3: BC/DR & Security Operations',
      focus: 'Domains 2 & 5',
      tasks: [
        'Study business continuity and disaster recovery',
        'Review security operations concepts',
        'Take domain-focused practice exams',
      ],
    },
    {
      title: 'Week 4: Full-Length Practice',
      focus: 'All 5 domains',
      tasks: [
        'Take 3-4 full-length practice exams',
        'Review all incorrect answers',
        'Schedule your exam when scoring 80%+',
      ],
    },
  ],
  tips: [
    {
      title: '📚 Use Free ISC2 Training',
      description:
        'ISC2 provides completely free self-paced training for CC. Start here before any paid resources.',
    },
    {
      title: '🎯 Focus on High-Weight Domains',
      description:
        'Security Principles (26%) and Network Security (24%) make up half the exam. Master these first.',
    },
    {
      title: '⚡ Practice Daily',
      description:
        'Even 30 minutes of daily practice questions is more effective than occasional marathon sessions.',
    },
  ],
};

const DEFAULT_PLAN: StudyPlanData = {
  totalWeeks: 8,
  hoursPerWeek: 12,
  weeks: [
    {
      title: 'Week 1-2: Foundation',
      focus: 'Core domains and concepts',
      tasks: [
        'Read official study material',
        'Take a diagnostic exam',
        'Identify weak domains',
      ],
    },
    {
      title: 'Week 3-4: Domain Deep Dive',
      focus: 'Highest-weight domains',
      tasks: [
        'Practice 200+ questions',
        'Review per-option explanations',
        'Create domain summaries',
      ],
    },
    {
      title: 'Week 5-6: Weak Areas',
      focus: 'Domains below 70% accuracy',
      tasks: [
        'Intensive practice on weak domains',
        'Study cross-domain topics',
        'Take domain-focused exams',
      ],
    },
    {
      title: 'Week 7-8: Simulation',
      focus: 'Full-length practice exams',
      tasks: [
        'Take 4+ full-length practice exams',
        'Review all mistakes',
        'Confirm readiness score above 75%',
      ],
    },
  ],
  tips: [
    {
      title: '📊 Track Your Progress',
      description:
        'Use readiness scores and domain accuracy to measure improvement objectively.',
    },
    {
      title: '🔄 Spaced Repetition',
      description:
        'Review previously studied material at intervals to strengthen long-term retention.',
    },
  ],
};

const STUDY_PLANS: Record<string, StudyPlanData> = {
  cissp: CISSP_PLAN,
  cc: CC_PLAN,
};

export function getStudyPlanData(certSlug: string): StudyPlanData {
  return STUDY_PLANS[certSlug] ?? DEFAULT_PLAN;
}

// ── Comparison Data ─────────────────────────────

export interface ComparisonProduct {
  name: string;
}

export interface ComparisonFeature {
  name: string;
  values: (boolean | string)[];
}

export interface ComparisonSection {
  heading: string;
  paragraphs: string[];
}

export interface ComparisonData {
  slug: string;
  title: string;
  metaTitle: string;
  metaDescription: string;
  products: ComparisonProduct[];
  features: ComparisonFeature[];
  sections: ComparisonSection[];
}

export const COMPARISONS: ComparisonData[] = [
  {
    slug: 'examflow-vs-boson',
    title: 'ExamFlow vs Boson ExSim — Which CISSP Practice Exam is Better?',
    metaTitle: 'ExamFlow vs Boson ExSim 2026 — CISSP Practice Exam Comparison',
    metaDescription:
      'Detailed comparison of ExamFlow and Boson ExSim for CISSP preparation. Features, pricing, question quality, and adaptive technology analyzed.',
    products: [{ name: 'ExamFlow' }, { name: 'Boson ExSim' }],
    features: [
      { name: 'Adaptive Practice (CAT Simulation)', values: [true, false] },
      { name: 'Spaced Repetition Engine', values: [true, false] },
      { name: 'Readiness Score Prediction', values: [true, false] },
      { name: 'Per-Option Explanations', values: [true, true] },
      { name: 'Domain Weakness Analysis', values: [true, true] },
      { name: 'Personalized Study Plan', values: [true, false] },
      { name: 'Mobile Friendly', values: [true, false] },
      { name: 'Free Tier', values: [true, false] },
      {
        name: 'Multiple Certifications',
        values: ['5 ISC2 + CompTIA', 'CISSP only'],
      },
      { name: 'Pricing', values: ['Free / $19.90/mo', '$99 one-time'] },
    ],
    sections: [
      {
        heading: 'Overall Verdict',
        paragraphs: [
          'Both platforms offer high-quality CISSP practice questions. Boson ExSim is a strong choice for candidates who prefer a one-time purchase and want desktop-only practice. ExamFlow is better suited for candidates who want adaptive technology, spaced repetition, and mobile access.',
          "ExamFlow's free tier lets you try the platform before committing, while Boson requires an upfront purchase. For serious CISSP candidates, ExamFlow's readiness prediction and study plan features provide more structured guidance.",
        ],
      },
    ],
  },
  {
    slug: 'examflow-vs-pocket-prep',
    title: 'ExamFlow vs Pocket Prep — Certification Practice Compared',
    metaTitle: 'ExamFlow vs Pocket Prep 2026 — Study App Comparison',
    metaDescription:
      'Compare ExamFlow and Pocket Prep for cybersecurity certification practice. Features, question depth, and adaptive technology reviewed.',
    products: [{ name: 'ExamFlow' }, { name: 'Pocket Prep' }],
    features: [
      { name: 'CAT-Style Adaptive Testing', values: [true, false] },
      { name: 'Spaced Repetition', values: [true, false] },
      { name: 'Readiness Score', values: [true, false] },
      { name: 'Per-Option Explanations', values: [true, true] },
      { name: 'Scenario-Based Questions', values: [true, 'Some'] },
      { name: 'Study Plan Generator', values: [true, false] },
      { name: 'Web App', values: [true, true] },
      { name: 'Free Practice Questions', values: [true, 'Limited'] },
      { name: 'Certifications Covered', values: ['ISC2 + CompTIA', '80+'] },
    ],
    sections: [
      {
        heading: 'Overall Verdict',
        paragraphs: [
          'Pocket Prep covers more certifications but with less depth per certification. ExamFlow is purpose-built for cybersecurity certifications, offering deeper features like CAT simulation, readiness prediction, and spaced repetition.',
          "If you're preparing specifically for ISC2 or CompTIA security certifications, ExamFlow's specialized approach provides better exam simulation. For other certifications, Pocket Prep's breadth is an advantage.",
        ],
      },
    ],
  },
  {
    slug: 'cissp-vs-security-plus',
    title: 'CISSP vs Security+ — Which Certification Should You Get?',
    metaTitle:
      'CISSP vs Security+ 2026 — Career Impact, Difficulty, and Salary Comparison',
    metaDescription:
      'Compare CISSP and CompTIA Security+ certifications. Experience requirements, exam difficulty, salary impact, and career paths analyzed.',
    products: [{ name: 'CISSP' }, { name: 'Security+' }],
    features: [
      {
        name: 'Experience Required',
        values: ['5 years', 'None (recommended 2 years)'],
      },
      { name: 'Exam Duration', values: ['3 hours', '90 minutes'] },
      { name: 'Questions', values: ['100-150 (CAT)', '90 (linear)'] },
      { name: 'Exam Cost', values: ['$749', '$404'] },
      { name: 'Average Salary Impact', values: ['+$25,000', '+$10,000'] },
      { name: 'Difficulty Level', values: ['Advanced', 'Entry-to-Mid'] },
      { name: 'Renewal Period', values: ['3 years', '3 years'] },
      {
        name: 'Focus',
        values: ['Management & Strategy', 'Technical & Hands-On'],
      },
    ],
    sections: [
      {
        heading: 'Which Should You Choose?',
        paragraphs: [
          'If you are early in your cybersecurity career (0-3 years experience), start with Security+. It validates foundational knowledge and is widely recognized by employers for junior and mid-level positions.',
          'If you have 5+ years of experience and want to move into management or senior security roles, CISSP is the gold standard. It is the most in-demand certification for security leadership positions.',
          'Many professionals get both: Security+ early in their career, then CISSP after gaining the required experience. The foundational knowledge from Security+ makes CISSP preparation smoother.',
        ],
      },
    ],
  },
];

export function getComparison(slug: string): ComparisonData | undefined {
  return COMPARISONS.find((c) => c.slug === slug);
}
