import Link from 'next/link';

type CtaVariant = 'quiz' | 'signup' | 'study-plan';

/**
 * Inline CTA component for use inside SEO content pages.
 */
export function InlineCta({
    variant,
    certSlug,
    locale,
}: Readonly<{
    variant: CtaVariant;
    certSlug: string;
    locale: string;
}>) {
    const config = {
        quiz: {
            text: 'Practice these concepts with a free quiz',
            href: `/${locale}/${certSlug}/practice-questions`,
            icon: '💡',
        },
        signup: {
            text: 'Start practicing free — no credit card required',
            href: `/${locale}/login`,
            icon: '🚀',
        },
        'study-plan': {
            text: 'Get a personalized study plan for this cert',
            href: `/${locale}/login`,
            icon: '📋',
        },
    }[variant];

    return (
        <div className="seo-cta-banner" style={{ margin: '1.5rem 0' }}>
            <p>
                {config.icon} {config.text}
            </p>
            <Link href={config.href}>
                {variant === 'quiz' ? 'Start Free Quiz →' : variant === 'study-plan' ? 'Create Study Plan →' : 'Get Started Free →'}
            </Link>
        </div>
    );
}
