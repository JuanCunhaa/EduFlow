'use client';

import { useRef } from 'react';
import { useTranslations } from 'next-intl';
import { motion, useInView } from 'framer-motion';
import {
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
    Sun,
    Moon,
} from 'lucide-react';
import { Link } from '@/i18n/navigation';
import { LanguageSelector } from '@/components/ui/LanguageSelector';
import { useTheme } from '@/components/ui/ThemeProvider';

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

// ── Icon maps (no translatable text) ─────────────

const BENEFIT_ICONS = [Brain, Crosshair, Clock, TrendingUp];
const DEPTH_ICONS = [Layers, Target, BarChart3, Zap];
const TESTIMONIAL_KEYS = ['sarah', 'daniel', 'priya', 'marcus', 'ana', 'james'] as const;

// ── Components ───────────────────────────────────

export default function LandingPage() {
    return (
        <div className="relative min-h-screen bg-background text-foreground overflow-x-hidden">
            {/* Ambient background glows */}
            <div className="pointer-events-none fixed inset-0 overflow-hidden">
                <div className="absolute -top-40 left-1/3 h-[800px] w-[800px] rounded-full bg-primary/[0.04] dark:bg-primary/[0.04] blur-[150px]" />
                <div className="absolute top-1/2 -right-40 h-[600px] w-[600px] rounded-full bg-primary/[0.03] dark:bg-primary/[0.03] blur-[120px]" />
                <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-primary/[0.02] dark:bg-primary/[0.02] blur-[100px]" />
            </div>

            <Nav />
            <Hero />
            <SocialProof />
            <ProblemSolution />
            <Benefits />
            <HowItWorks />
            <ProductDepth />
            <Pricing />
            <FinalCTA />
            <Footer />
        </div>
    );
}

// ── Nav ──────────────────────────────────────────

function Nav() {
    const t = useTranslations('landing.nav');
    const { resolvedTheme, setTheme } = useTheme();
    return (
        <motion.nav
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="fixed top-0 z-50 w-full"
        >
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
                <Link href="/" className="flex items-center gap-2.5">
                    <img src="/images/logo.png" alt="ExamFlow" width={36} height={36} className="h-9 w-9 rounded-lg" />
                    <span className="text-lg font-semibold tracking-tight">{t('brand')}</span>
                </Link>
                <div className="flex items-center gap-3">
                    <a
                        href="#pricing"
                        className="hidden sm:inline-flex text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                    >
                        Pricing
                    </a>
                    <button
                        type="button"
                        onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-border/60 bg-card/40 backdrop-blur-md text-muted-foreground transition-colors hover:text-foreground"
                        aria-label="Toggle theme"
                    >
                        {resolvedTheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>
                    <LanguageSelector />
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98]"
                    >
                        {t('getStarted')}
                        <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                </div>
            </div>
        </motion.nav>
    );
}

// ── 1. Hero ──────────────────────────────────────

function Hero() {
    const t = useTranslations('landing.hero');
    return (
        <section className="relative pt-32 pb-20 sm:pt-40 sm:pb-28">
            <div className="mx-auto max-w-4xl px-6 text-center">
                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    className="mb-8 inline-flex items-center gap-2 rounded-full border border-border/60 bg-card/40 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-md"
                >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    {t('badge')}
                </motion.div>

                <motion.h1
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.1 }}
                    className="text-4xl font-bold tracking-tight sm:text-6xl lg:text-7xl leading-[1.08]"
                >
                    {t('titleLine1')}
                    <br />
                    <span className="gradient-text">{t('titleLine2')}</span>
                </motion.h1>

                <motion.p
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.2 }}
                    className="mx-auto mt-6 max-w-xl text-lg text-muted-foreground leading-relaxed"
                >
                    {t('description')}
                </motion.p>

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
                        {t('cta')}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                    <a
                        href="#how-it-works"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border/60 bg-card/30 px-7 py-3.5 text-sm font-medium text-muted-foreground backdrop-blur-sm transition-all hover:border-border hover:text-foreground"
                    >
                        {t('secondary')}
                        <ChevronRight className="h-3.5 w-3.5" />
                    </a>
                </motion.div>

                <motion.div
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    transition={{ delay: 0.5 }}
                    className="relative mx-auto mt-16 max-w-4xl"
                >
                    <DashboardPreview />
                    <div className="absolute -inset-4 -z-10 rounded-3xl bg-primary/[0.06] blur-2xl" />
                </motion.div>
            </div>
        </section>
    );
}

// ── 2. Social Proof ──────────────────────────────

function SocialProof() {
    const t = useTranslations('landing');
    return (
        <AnimatedSection className="py-20 sm:py-28">
            <div className="mx-auto max-w-6xl px-6">
                <motion.p variants={fadeIn} className="text-center text-sm font-medium uppercase tracking-widest text-muted-foreground/60 mb-12">
                    {t('socialProof.heading')}
                </motion.p>
                <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                    {TESTIMONIAL_KEYS.map((key, i) => (
                        <motion.div key={i} variants={fadeUp} className="group card-premium rounded-2xl p-6">
                            <div className="flex items-center gap-1.5 mb-4">
                                {Array.from({ length: 5 }).map((_, j) => (
                                    <Star key={j} className="h-3.5 w-3.5 fill-primary/80 text-primary/80" />
                                ))}
                            </div>
                            <p className="text-sm leading-relaxed text-foreground/80 mb-5">
                                &ldquo;{t(`testimonials.${key}.quote`)}&rdquo;
                            </p>
                            <div className="flex items-center gap-3">
                                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                                    {(t(`testimonials.${key}.name`) as string).split(' ').map(n => n[0]).join('')}
                                </div>
                                <div>
                                    <p className="text-sm font-medium text-foreground">{t(`testimonials.${key}.name`)}</p>
                                    <p className="text-xs text-muted-foreground">{t(`testimonials.${key}.role`)}</p>
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
    const t = useTranslations('landing.problem');
    return (
        <AnimatedSection className="py-20 sm:py-28">
            <div className="mx-auto max-w-5xl px-6">
                <motion.div variants={fadeUp} className="text-center mb-14">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('heading')}</h2>
                    <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{t('subheading')}</p>
                </motion.div>

                <div className="grid gap-6 sm:grid-cols-2">
                    <motion.div variants={fadeUp} className="rounded-2xl border border-destructive/20 bg-destructive/[0.03] p-8">
                        <p className="text-xs font-semibold uppercase tracking-widest text-destructive/70 mb-6">
                            {t('without')}
                        </p>
                        <div className="space-y-4">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive/60" />
                                    <span className="text-sm text-foreground/70">{t(`oldWays.${i}`)}</span>
                                </div>
                            ))}
                        </div>
                    </motion.div>

                    <motion.div variants={fadeUp} className="rounded-2xl border border-primary/20 bg-primary/[0.03] p-8">
                        <p className="text-xs font-semibold uppercase tracking-widest text-primary/70 mb-6">
                            {t('with')}
                        </p>
                        <div className="space-y-4">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <div key={i} className="flex items-start gap-3">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary/80" />
                                    <span className="text-sm text-foreground/90">{t(`newWays.${i}`)}</span>
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
    const t = useTranslations('landing.benefits');
    return (
        <AnimatedSection className="py-20 sm:py-28">
            <div className="mx-auto max-w-5xl px-6">
                <motion.div variants={fadeUp} className="text-center mb-14">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('heading')}</h2>
                    <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{t('subheading')}</p>
                </motion.div>

                <div className="grid gap-5 sm:grid-cols-2">
                    {BENEFIT_ICONS.map((Icon, i) => (
                        <motion.div key={i} variants={fadeUp} className="card-premium rounded-2xl p-7">
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                                <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground mb-2">{t(`items.${i}.title`)}</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">{t(`items.${i}.description`)}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
}

// ── 5. How It Works ──────────────────────────────

function HowItWorks() {
    const t = useTranslations('landing.howItWorks');
    return (
        <AnimatedSection className="py-20 sm:py-28" id="how-it-works">
            <div className="mx-auto max-w-4xl px-6">
                <motion.div variants={fadeUp} className="text-center mb-14">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('heading')}</h2>
                    <p className="mt-4 text-muted-foreground max-w-lg mx-auto">{t('subheading')}</p>
                </motion.div>

                <div className="relative">
                    <div className="absolute left-[28px] top-0 bottom-0 w-px bg-border/40 hidden sm:block" />
                    <div className="space-y-10">
                        {['01', '02', '03'].map((num, i) => (
                            <motion.div key={i} variants={fadeUp} className="relative flex gap-6 items-start">
                                <div className="relative z-10 flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-border/60 bg-card text-xl font-bold text-primary font-mono">
                                    {num}
                                </div>
                                <div className="pt-2">
                                    <h3 className="text-lg font-semibold text-foreground mb-1.5">{t(`steps.${i}.title`)}</h3>
                                    <p className="text-sm text-muted-foreground leading-relaxed max-w-md">{t(`steps.${i}.description`)}</p>
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
    const t = useTranslations('landing.depth');
    return (
        <AnimatedSection className="py-20 sm:py-28">
            <div className="mx-auto max-w-5xl px-6">
                <motion.div variants={fadeUp} className="text-center mb-14">
                    <p className="text-xs font-semibold uppercase tracking-widest text-primary/60 mb-3">
                        {t('heading')}
                    </p>
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('subheading')}</h2>
                    <p className="mt-4 text-muted-foreground max-w-xl mx-auto">{t('description')}</p>
                </motion.div>

                <div className="grid gap-5 sm:grid-cols-2">
                    {DEPTH_ICONS.map((Icon, i) => (
                        <motion.div key={i} variants={fadeUp} className="glass-panel rounded-2xl p-7">
                            <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-border/40 bg-background/60">
                                <Icon className="h-5 w-5 text-primary" />
                            </div>
                            <h3 className="text-base font-semibold text-foreground mb-2">{t(`features.${i}.title`)}</h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">{t(`features.${i}.description`)}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </AnimatedSection>
    );
}

// ── 7. Pricing ───────────────────────────────────

const FREE_FEATURES = ['f1', 'f2', 'f3', 'f4', 'f5'] as const;
const PRO_FEATURES = ['f1', 'f2', 'f3', 'f4', 'f5', 'f6', 'f7', 'f8', 'f9', 'f10'] as const;
const TEAM_FEATURES = ['f1', 'f2', 'f3', 'f4'] as const;

function Pricing() {
    const t = useTranslations('pricing');

    return (
        <AnimatedSection id="pricing" className="py-24 sm:py-32">
            <div className="mx-auto max-w-6xl px-6">
                <motion.div variants={fadeUp} className="text-center mb-14">
                    <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">{t('title')}</h2>
                    <p className="mt-4 text-muted-foreground text-lg max-w-md mx-auto">{t('subtitle')}</p>
                </motion.div>

                <div className="grid gap-6 md:grid-cols-3 items-start">
                    {/* Free */}
                    <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8 backdrop-blur-sm">
                        <h3 className="text-lg font-semibold">{t('tier.free.name')}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{t('tier.free.description')}</p>
                        <div className="mt-4 flex items-baseline gap-1">
                            <span className="text-4xl font-bold">$0</span>
                            <span className="text-muted-foreground text-sm">/ {t('tier.free.period')}</span>
                        </div>
                        <Link
                            href="/login"
                            className="mt-6 flex w-full items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold transition-all hover:bg-accent/30"
                        >
                            {t('tier.free.cta')}
                        </Link>
                        <ul className="mt-8 space-y-3">
                            {FREE_FEATURES.map((key) => (
                                <li key={key} className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                    <span className="text-sm text-muted-foreground">{t(`tier.free.${key}`)}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Pro — highlighted */}
                    <motion.div variants={fadeUp} className="relative rounded-2xl border-2 border-primary/30 bg-card/50 p-6 sm:p-8 backdrop-blur-sm shadow-lg shadow-primary/5">
                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
                            {t('tier.pro.badge')}
                        </div>
                        <h3 className="text-lg font-semibold">{t('tier.pro.name')}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{t('tier.pro.description')}</p>
                        <div className="mt-4 flex items-baseline gap-1">
                            <span className="text-4xl font-bold">$29</span>
                            <span className="text-muted-foreground text-sm">{t('tier.pro.perMonth')}</span>
                        </div>
                        <Link
                            href="/login"
                            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground transition-all hover:brightness-110 shadow-md shadow-primary/20"
                        >
                            {t('tier.pro.cta')}
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                        <ul className="mt-8 space-y-3">
                            {PRO_FEATURES.map((key) => (
                                <li key={key} className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                                    <span className="text-sm text-foreground">{t(`tier.pro.${key}`)}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>

                    {/* Team */}
                    <motion.div variants={fadeUp} className="rounded-2xl border border-border bg-card/50 p-6 sm:p-8 backdrop-blur-sm">
                        <div className="mb-1 inline-block rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                            {t('tier.team.badge')}
                        </div>
                        <h3 className="text-lg font-semibold">{t('tier.team.name')}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{t('tier.team.description')}</p>
                        <div className="mt-4 flex items-baseline gap-1">
                            <span className="text-4xl font-bold">$49</span>
                            <span className="text-muted-foreground text-sm">{t('tier.team.perUser')}</span>
                        </div>
                        <button
                            disabled
                            className="mt-6 flex w-full items-center justify-center rounded-xl border border-border bg-card px-6 py-3 text-sm font-semibold text-muted-foreground opacity-60 cursor-not-allowed"
                        >
                            {t('tier.team.cta')}
                        </button>
                        <ul className="mt-8 space-y-3">
                            {TEAM_FEATURES.map((key) => (
                                <li key={key} className="flex items-start gap-2">
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                    <span className="text-sm text-muted-foreground">{t(`tier.team.${key}`)}</span>
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                </div>

                {/* Footer */}
                <motion.p variants={fadeIn} className="mt-10 text-center text-xs text-muted-foreground">
                    {t('footer.secure')}
                </motion.p>
            </div>
        </AnimatedSection>
    );
}

// ── 8. Final CTA ─────────────────────────────────

function FinalCTA() {
    const t = useTranslations('landing.cta');
    return (
        <AnimatedSection className="py-24 sm:py-32">
            <div className="mx-auto max-w-3xl px-6 text-center">
                <motion.h2
                    variants={fadeUp}
                    className="text-3xl font-bold tracking-tight sm:text-5xl leading-[1.15]"
                >
                    {t('line1')}
                    <br />
                    <span className="gradient-text">{t('line2')}</span>
                </motion.h2>
                <motion.p variants={fadeUp} className="mt-6 text-muted-foreground text-lg max-w-md mx-auto">
                    {t('subheading')}
                </motion.p>
                <motion.div variants={fadeUp} className="mt-10">
                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 text-base font-semibold text-primary-foreground transition-all hover:brightness-110 active:scale-[0.98] shadow-lg shadow-primary/20"
                    >
                        {t('button')}
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </motion.div>
            </div>
        </AnimatedSection>
    );
}

// ── Dashboard Preview (Hero) ─────────────────────

const MOCK_DOMAINS = [
    { key: 'domain1', pct: 88 },
    { key: 'domain2', pct: 74 },
    { key: 'domain3', pct: 82 },
    { key: 'domain4', pct: 65 },
    { key: 'domain5', pct: 91 },
];

const MOCK_SCORES = [62, 71, 68, 75, 82, 78, 85, 80, 88, 91];

const MOCK_BADGES: Array<{ emoji: string; key: string }> = [
    { emoji: '🏆', key: 'badge1' },
    { emoji: '🔥', key: 'badge2' },
    { emoji: '⚡', key: 'badge3' },
    { emoji: '💎', key: 'badge4' },
    { emoji: '🎯', key: 'badge5' },
];

function DashboardPreview() {
    const t = useTranslations('landing.hero.preview');
    return (
        <div className="rounded-2xl border border-border/40 bg-card/20 backdrop-blur-sm overflow-hidden shadow-2xl shadow-black/20">
            {/* Title bar */}
            <div className="flex items-center gap-2.5 border-b border-border/30 px-5 py-3">
                <div className="h-2.5 w-2.5 rounded-full bg-red-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-yellow-500/50" />
                <div className="h-2.5 w-2.5 rounded-full bg-green-500/50" />
                <div className="ml-3 flex items-center gap-2">
                    <img src="/images/logo.png" alt="ExamFlow" width={14} height={14} className="h-3.5 w-3.5 rounded-sm" />
                    <span className="text-[11px] font-medium text-muted-foreground/60">ExamFlow — {t('examTitle')}</span>
                </div>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
                {/* Top stats row */}
                <div className="grid grid-cols-3 gap-3">
                    {/* Readiness */}
                    <div className="rounded-xl border border-border/30 bg-background/30 p-3 sm:p-4 text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground/70 mb-1.5">{t('readiness')}</p>
                        <div className="flex items-baseline justify-center gap-1.5">
                            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">78%</span>
                            <TrendingUp className="h-3.5 w-3.5 text-emerald-600/60 dark:text-emerald-400/60" />
                        </div>
                        <div className="mt-2.5 h-1 rounded-full bg-muted/30">
                            <div className="h-full rounded-full bg-gradient-to-r from-emerald-600/50 to-emerald-500/80 dark:from-emerald-500/50 dark:to-emerald-400/80" style={{ width: '78%' }} />
                        </div>
                    </div>

                    {/* Streak */}
                    <div className="rounded-xl border border-border/30 bg-background/30 p-3 sm:p-4 text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground/70 mb-1.5">{t('streak')}</p>
                        <div className="flex items-baseline justify-center gap-1.5">
                            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-amber-600 dark:text-amber-400">12</span>
                            <span className="text-[10px] sm:text-xs text-amber-600/60 dark:text-amber-400/60 font-medium">{t('streakDays')}</span>
                        </div>
                        <div className="mt-2.5 flex gap-0.5">
                            {Array.from({ length: 7 }).map((_, i) => (
                                <div key={i} className="h-1 flex-1 rounded-full bg-amber-500/50 dark:bg-amber-400/50" />
                            ))}
                        </div>
                    </div>

                    {/* Avg Score */}
                    <div className="rounded-xl border border-border/30 bg-background/30 p-3 sm:p-4 text-center">
                        <p className="text-[10px] sm:text-xs text-muted-foreground/70 mb-1.5">{t('avgScore')}</p>
                        <div className="flex items-baseline justify-center">
                            <span className="text-2xl sm:text-3xl font-bold tracking-tight text-primary">82%</span>
                        </div>
                        <div className="mt-2.5 h-1 rounded-full bg-muted/30">
                            <div className="h-full rounded-full bg-primary/60" style={{ width: '82%' }} />
                        </div>
                    </div>
                </div>

                {/* Bottom two-col: domains + score chart + badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Domain mastery — left */}
                    <div className="rounded-xl border border-border/30 bg-background/30 p-3 sm:p-4 flex flex-col">
                        <p className="text-[10px] sm:text-xs font-medium text-muted-foreground/70 mb-3">{t('domainMastery')}</p>
                        <div className="flex flex-col justify-between flex-1">
                            {MOCK_DOMAINS.map((d) => (
                                <div key={d.key} className="flex items-center gap-2">
                                    <span className="w-[120px] sm:w-[150px] truncate text-[10px] sm:text-[11px] text-foreground/60">{t(d.key)}</span>
                                    <div className="flex-1 h-1.5 rounded-full bg-muted/30">
                                        <div
                                            className={`h-full rounded-full transition-all ${
                                                d.pct >= 80 ? 'bg-emerald-500/60' : d.pct >= 65 ? 'bg-primary/50' : 'bg-amber-500/50'
                                            }`}
                                            style={{ width: `${d.pct}%` }}
                                        />
                                    </div>
                                    <span className={`text-[10px] font-mono font-medium min-w-[28px] text-right ${
                                        d.pct >= 80 ? 'text-emerald-600/70 dark:text-emerald-400/70' : d.pct >= 65 ? 'text-foreground/50' : 'text-amber-600/70 dark:text-amber-400/70'
                                    }`}>{d.pct}%</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right column — score trend + badges */}
                    <div className="space-y-3">
                        {/* Score trend mini chart */}
                        <div className="rounded-xl border border-border/30 bg-background/30 p-3 sm:p-4">
                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground/70 mb-3">{t('recentScores')}</p>
                            <div className="flex items-end gap-1.5 h-16">
                                {MOCK_SCORES.map((s, i) => (
                                    <div
                                        key={i}
                                        className={`group relative flex-1 rounded-t cursor-default transition-all hover:brightness-125 ${
                                            s >= 80 ? 'bg-emerald-500/50' : s >= 70 ? 'bg-primary/40' : 'bg-amber-500/40'
                                        }`}
                                        style={{ height: `${s}%` }}
                                    >
                                        <span className="pointer-events-none absolute -top-5 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-md bg-popover border border-border px-1.5 py-0.5 text-[10px] font-mono font-medium text-popover-foreground shadow-md opacity-0 transition-opacity group-hover:opacity-100">
                                            {s}%
                                        </span>
                                    </div>
                                ))}
                            </div>
                            <div className="flex justify-between mt-1.5 border-t border-border/20 pt-1">
                                <span className="text-[9px] text-muted-foreground/50 font-mono">62%</span>
                                <span className="text-[9px] text-muted-foreground/50">→</span>
                                <span className="text-[9px] text-emerald-600/60 dark:text-emerald-400/60 font-mono font-medium">91%</span>
                            </div>
                        </div>

                        {/* Badges with tooltips */}
                        <div className="rounded-xl border border-border/30 bg-background/30 p-3 sm:p-4">
                            <p className="text-[10px] sm:text-xs font-medium text-muted-foreground/70 mb-4">{t('badges')}</p>
                            <div className="flex flex-row justify-between">
                                {MOCK_BADGES.map((b) => (
                                    <div
                                        key={b.key}
                                        className="group relative flex flex-1 flex-col items-center gap-1.5"
                                    >
                                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/[0.08] border border-primary/10 text-sm cursor-default transition-all group-hover:bg-primary/[0.15] group-hover:scale-110">
                                            {b.emoji}
                                        </div>
                                        <span className="text-[9px] font-medium text-muted-foreground/50 opacity-0 transition-opacity group-hover:opacity-100 whitespace-nowrap">
                                            {t(b.key)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── 8. Footer ────────────────────────────────────

function Footer() {
    const t = useTranslations('landing.footer');
    return (
        <footer className="border-t border-border/40">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-8">
                <div className="flex items-center gap-2">
                    <img src="/images/logo.png" alt="ExamFlow" width={16} height={16} className="h-4 w-4 rounded-sm" />
                    <span className="text-sm text-muted-foreground">{t('brand')}</span>
                </div>
                <p className="text-xs text-muted-foreground/60">
                    {t('copyright', { year: new Date().getFullYear() })}
                </p>
            </div>
        </footer>
    );
}
