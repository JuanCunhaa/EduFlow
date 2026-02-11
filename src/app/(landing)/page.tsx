'use client';

import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
    Shield,
    Brain,
    Target,
    BarChart3,
    Zap,
    ArrowRight,
    ChevronRight,
    Layers,
    TrendingUp,
    Crosshair,
    Clock,
    Star,
    CheckCircle2,
    XCircle,
} from 'lucide-react';
import Link from 'next/link';

// ── Animation Helpers ────────────────────────────

const fadeUp = {
    hidden: { opacity: 0, y: 24 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] as [number, number, number, number] } },
};

const fadeIn = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
};

const staggerContainer = {
    hidden: {},
    visible: { transition: { staggerChildren: 0.1 } },
};

function AnimatedSection({ children, className = '', id }: { children: React.ReactNode; className?: string; id?: string }) {
    const ref = useRef<HTMLDivElement>(null);
    const inView = useInView(ref, { once: true, margin: '-60px' });
    return (
        <motion.section
            ref={ref}
            id={id}
            initial="hidden"
            animate={inView ? 'visible' : 'hidden'}
            variants={staggerContainer}
            className={className}
        >
            {children}
        </motion.section>
    );
}

// ── Data ─────────────────────────────────────────

const TESTIMONIALS = [
    {
        name: 'Sarah Mitchell',
        role: 'CISSP Candidate',
        quote: 'I passed on my first attempt. The weak-area detection forced me to study what I was actually bad at, not what felt comfortable.',
    },
    {
        name: 'Daniel Ortega',
        role: 'Security Analyst at Deloitte',
        quote: 'The adaptive practice exams were closer to the real thing than any book or bootcamp I tried. My domain scores tracked exactly to the real exam.',
    },
    {
        name: 'Priya Chakraborty',
        role: 'CC Certified',
        quote: 'Improved my retention dramatically before finals. The spaced review mode surfaced questions right when I was about to forget them.',
    },
    {
        name: 'Marcus Johnson',
        role: 'IT Manager preparing for SSCP',
        quote: 'Being able to see exactly which domains I was weak in changed how I allocated my study time. Went from 55% to 82% in three weeks.',
    },
    {
        name: 'Ana Ferreira',
        role: 'GRC Consultant',
        quote: 'Clean interface, no distractions, just focused practice. This is what studying should feel like in 2026.',
    },
    {
        name: 'James Thornton',
        role: 'CISSP Certified',
        quote: 'The real_mix exam mode simulated actual test conditions better than anything else. I felt calm walking into the testing center because I had already seen that pressure.',
    },
];

const BENEFITS = [
    {
        icon: Brain,
        title: 'Learn faster',
        description: 'Adaptive algorithms surface the right questions at the right time, eliminating wasted repetition on material you already know.',
    },
    {
        icon: Crosshair,
        title: 'Find your blind spots',
        description: 'Domain-level performance tracking identifies exactly where your knowledge breaks down — before the exam does.',
    },
    {
        icon: Clock,
        title: 'Retain knowledge longer',
        description: 'Spaced review schedules questions based on memory decay curves, reinforcing concepts right before you forget them.',
    },
    {
        icon: TrendingUp,
        title: 'Build exam confidence',
        description: 'Track your scores over time. Watch your weak domains become strong ones. Walk into the exam knowing you are ready.',
    },
];

const STEPS = [
    {
        number: '01',
        title: 'Choose what to study',
        description: 'Select your certification and configure domain focus, difficulty, and question count.',
    },
    {
        number: '02',
        title: 'Practice intelligently',
        description: 'Our engine adapts to your performance — targeting weak areas, avoiding repeats, and mixing difficulty levels.',
    },
    {
        number: '03',
        title: 'Track your mastery',
        description: 'See per-domain accuracy, streak progress, and score trends. Know when you are ready.',
    },
];

const PROBLEMS = [
    { icon: XCircle, text: 'Rereading notes passively' },
    { icon: XCircle, text: 'No idea what you don\'t know' },
    { icon: XCircle, text: 'Random question order' },
    { icon: XCircle, text: 'No feedback loop' },
    { icon: XCircle, text: 'Guessing your readiness' },
];

const SOLUTIONS = [
    { icon: CheckCircle2, text: 'Active recall with adaptive practice' },
    { icon: CheckCircle2, text: 'Domain-level weakness detection' },
    { icon: CheckCircle2, text: 'Intelligent question selection' },
    { icon: CheckCircle2, text: 'Instant scored feedback per domain' },
    { icon: CheckCircle2, text: 'Measurable progress over time' },
];

const DEPTH_FEATURES = [
    {
        icon: Layers,
        title: 'Intelligent Question Engine',
        description: 'Six exam modes — from practice to spaced review. The engine weighs recency, accuracy, and domain coverage to build the optimal question set for each session.',
    },
    {
        icon: Target,
        title: 'Mastery Tracking',
        description: 'Per-question attempt history with memory-decay modeling. Every answer updates your performance summary atomically — no stale data, no guessing.',
    },
    {
        icon: BarChart3,
        title: 'Adaptive Difficulty',
        description: 'Real-mix mode mirrors actual exam distributions. Weak-domain mode concentrates 70% of questions on your lowest-scoring areas. You study what matters.',
    },
    {
        icon: Zap,
        title: 'Performance Analytics',
        description: 'Domain accuracy breakdowns, score history, streak tracking, and daily goals. Everything you need to make data-driven study decisions.',
    },
];

// ── Components ───────────────────────────────────

export default function LandingPage() {
    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
            {/* Ambient background glows */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 left-1/3 h-[800px] w-[800px] rounded-full bg-primary/[0.04] blur-[150px]" />
                <div className="absolute top-1/2 -right-40 h-[600px] w-[600px] rounded-full bg-primary/[0.03] blur-[120px]" />
                <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-primary/[0.02] blur-[100px]" />
            </div>

            {/* Navigation */}
            <Nav />

            {/* Sections */}
            <Hero />
            <SocialProof />
            <ProblemSolution />
            <Benefits />
            <HowItWorks />
            <ProductDepth />
            <FinalCTA />
            <Footer />
        </div>
    );
}

// ── Nav ──────────────────────────────────────────

function Nav() {
    return (
        <motion.nav
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="fixed top-0 z-50 w-full"
        >
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
                <Link href="/" className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-border/60 bg-card/40 backdrop-blur-md">
                        <Shield className="h-4.5 w-4.5 text-primary" />
                    </div>
                    <span className="text-lg font-semibold tracking-tight">ExamFlow</span>
                </Link>
                <div className="flex items-center gap-3">
                    <Link
                        href="/login"
                        className="hidden sm:inline-flex text-sm font-medium text-muted-foreground hover:text-foreground transition-colors px-4 py-2"
                    >
                        Sign in
                    </Link>
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
                    >
                        Get started
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}

// ── 1. Hero ──────────────────────────────────────

function Hero() {
    return (
        <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
            <div className="mx-auto max-w-4xl px-6 text-center">
                {/* Badge */}
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md"
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    Built for serious certification prep
                </motion.div>

                {/* Headline */}
                <motion.h1
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.1 }}
                    className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-[1.08]"
                >
                    Study smarter.
                    <br />
                    <span className="gradient-text">Perform higher.</span>
                </motion.h1>

                {/* Subheadline */}
                <motion.p
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.2 }}
                    className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed"
                >
                    An adaptive study engine that identifies your weak areas, eliminates wasted
                    repetition, and builds the confidence you need to pass.
                </motion.p>

                {/* CTAs */}
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.3 }}
                    className="mt-10 flex flex-col sm:flex-row items-center justify-center gap-4"
                >
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-7 py-3.5 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] shadow-lg shadow-primary/20"
                    >
                        Start studying for free
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a
                        href="#how-it-works"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/30 px-7 py-3.5 text-sm font-medium text-muted-foreground backdrop-blur-sm transition-all hover:border-border hover:text-foreground"
                    >
                        See how it works
                        <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                </motion.div>

                {/* Hero visual placeholder */}
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.5 }}
                    className="relative mx-auto mt-16 max-w-3xl"
                >
                    <div className="aspect-[16/9] rounded-2xl border border-border/40 bg-card/30 backdrop-blur-sm overflow-hidden">
                        {/* Simulated dashboard preview */}
                        <div className="h-full w-full p-6 sm:p-8">
                            {/* Top bar */}
                            <div className="flex items-center gap-3 mb-6">
                                <div className="h-3 w-3 rounded-full bg-red-500/60" />
                                <div className="h-3 w-3 rounded-full bg-yellow-500/60" />
                                <div className="h-3 w-3 rounded-full bg-green-500/60" />
                                <div className="ml-4 h-4 w-48 rounded bg-muted/40" />
                            </div>
                            {/* Mock content grid */}
                            <div className="grid grid-cols-3 gap-4 mb-6">
                                {[82, 67, 91].map((score, i) => (
                                    <div key={i} className="rounded-xl border border-border/30 bg-background/40 p-4">
                                        <div className="h-2.5 w-16 rounded bg-muted/50 mb-3" />
                                        <div className="text-2xl font-bold tracking-tight text-foreground/80">{score}%</div>
                                        <div className="mt-2 h-1.5 w-full rounded-full bg-muted/30">
                                            <div
                                                className="h-full rounded-full bg-primary/60"
                                                style={{ width: `${score}%` }}
                                            />
                                        </div>
                                    </div>
                                ))}
                            </div>
                            {/* Mock chart area */}
                            <div className="flex items-end gap-1.5 h-20">
                                {[40, 55, 48, 62, 58, 72, 68, 78, 74, 85, 82, 88].map((h, i) => (
                                    <div
                                        key={i}
                                        className="flex-1 rounded-t bg-primary/30"
                                        style={{ height: `${h}%` }}
                                    />
                                ))}
                            </div>
                        </div>
                    </div>
                    {/* Glow behind dashboard */}
                    <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/[0.06] blur-2xl" />
                </motion.div>
            </div>
        </section>
    );
}

// ── 2. Social Proof ──────────────────────────────

function SocialProof() {
    return (
        <AnimatedSection className="py-20 sm:py-28">
            <div className="mx-auto max-w-6xl px-6">
                <motion.p variants={fadeIn} className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground/60 mb-12">
                    Trusted by certification candidates worldwide
                </motion.p>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {TESTIMONIALS.map((t, i) => (
                        <motion.div
                            key={i}
                            variants={fadeUp}
                            className="group card-premium rounded-2xl p-6"
                        >
                            <div className="flex items-center gap-1.5 mb-4">
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <Star key={j} className="h-3.5 w-3.5 fill-primary/80 text-primary/80" />
                                ))}
                            </div>
                            <p className="text-sm leading-relaxed text-foreground/80 mb-5">
                                &ldquo;{t.quote}&rdquo;
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    {t.name.split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{t.name}</p>
                                    <p className="text-xs text-muted-foreground">{t.role}</p>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
}

// ── 3. Problem → Solution ────────────────────────

function ProblemSolution() {
    return (
        <AnimatedSection className="py-20 sm:py-28">
            <div className="mx-auto max-w-5xl px-6">
                <motion.div variants={fadeUp} className="text-center mb-14">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Traditional study is broken
                    </h2>
                    <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                        Most people study harder when they should study smarter. Here is the difference.
                    </p>
                </motion.div>

                <div className="grid gap-6 sm:grid-cols-2">
                    {/* Problem side */}
                    <motion.div variants={fadeUp} className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-8">
                        <p className="text-xs font-semibold uppercase tracking-widest text-destructive/70 mb-6">
                            Without ExamFlow
                        </p>
                        <div className="space-y-4">
                            {PROBLEMS.map((p, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <p.icon className="mt-0.5 h-4 w-4 shrink-0 text-destructive/60" />
                                    <span className="text-sm text-foreground/70">{p.text}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    {/* Solution side */}
                    <motion.div variants={fadeUp} className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-8">
                        <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-6">
                            With ExamFlow
                        </p>
                        <div className="space-y-4">
                            {SOLUTIONS.map((s, i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <s.icon className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
                                    <span className="text-sm text-foreground/90">{s.text}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </AnimatedSection>
    );
}

// ── 4. Benefits ──────────────────────────────────

function Benefits() {
    return (
        <AnimatedSection className="py-20 sm:py-28">
            <div className="mx-auto max-w-5xl px-6">
                <motion.div variants={fadeUp} className="text-center mb-14">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Everything changes when studying has direction
                    </h2>
                    <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                        Stop burning hours on material you already know. Focus on the gaps that matter.
                    </p>
                </motion.div>

                <div className="grid gap-5 sm:grid-cols-2">
                    {BENEFITS.map((b, i) => (
                        <motion.div
                            key={i}
                            variants={fadeUp}
                            className="card-premium rounded-2xl p-7"
                        >
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                <b.icon className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground mb-2">{b.title}</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">{b.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
}

// ── 5. How It Works ──────────────────────────────

function HowItWorks() {
    return (
        <AnimatedSection className="py-20 sm:py-28" id="how-it-works">
            <div className="mx-auto max-w-4xl px-6">
                <motion.div variants={fadeUp} className="text-center mb-14">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Three steps. Zero friction.
                    </h2>
                    <p className="mt-4 text-muted-foreground max-w-lg mx-auto">
                        Get from signup to meaningful practice in under two minutes.
                    </p>
                </motion.div>

                <div className="relative">
                    {/* Connecting line */}
                    <div className="absolute left-[28px] top-0 bottom-0 w-px bg-border/40 hidden sm:block" />

                    <div className="space-y-10">
                        {STEPS.map((s, i) => (
                            <motion.div key={i} variants={fadeUp} className="relative flex gap-6 items-start">
                                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card text-xl font-bold text-primary font-mono">
                                    {s.number}
                                </div>
                                <div className="pt-2">
                                    <h3 className="text-lg font-semibold text-foreground mb-1.5">{s.title}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{s.description}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </div>
        </AnimatedSection>
    );
}

// ── 6. Product Depth ─────────────────────────────

function ProductDepth() {
    return (
        <AnimatedSection className="py-20 sm:py-28">
            <div className="mx-auto max-w-5xl px-6">
                <motion.div variants={fadeUp} className="text-center mb-14">
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/60 mb-3">
                        Under the hood
                    </p>
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                        Engineered for mastery, not memorization
                    </h2>
                    <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
                        This is not a flashcard app. It is a performance engine built on real learning science.
                    </p>
                </motion.div>

                <div className="grid gap-5 sm:grid-cols-2">
                    {DEPTH_FEATURES.map((f, i) => (
                        <motion.div
                            key={i}
                            variants={fadeUp}
                            className="glass-panel rounded-2xl p-7"
                        >
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-background/60">
                                <f.icon className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">{f.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
}

// ── 7. Final CTA ─────────────────────────────────

function FinalCTA() {
    return (
        <AnimatedSection className="py-24 sm:py-32">
            <div className="mx-auto max-w-3xl px-6 text-center">
                <motion.h2
                    variants={fadeUp}
                    className="text-3xl font-bold tracking-tight sm:text-5xl leading-[1.15]"
                >
                    Stop guessing your progress.
                    <br />
                    <span className="gradient-text">Start measuring it.</span>
                </motion.h2>
                <motion.p
                    variants={fadeUp}
                    className="mt-6 text-muted-foreground text-lg max-w-md mx-auto"
                >
                    Join thousands of certification candidates studying with precision.
                </motion.p>
                <motion.div variants={fadeUp} className="mt-10">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] shadow-lg shadow-primary/20"
                    >
                        Create your free account
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </motion.div>
            </div>
        </AnimatedSection>
    );
}

// ── 8. Footer ────────────────────────────────────

function Footer() {
    return (
        <footer className="border-t border-border/40">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-8">
                <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-primary/60" />
                    <span className="text-sm text-muted-foreground">ExamFlow</span>
                </div>
                <p className="text-xs text-muted-foreground/60">
                    &copy; {new Date().getFullYear()} ExamFlow. All rights reserved.
                </p>
            </div>
        </footer>
    );
}
