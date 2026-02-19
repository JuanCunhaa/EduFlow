/**
 * Pricing page — /[locale]/pricing
 * 3-column tier comparison with billing toggle and FAQ.
 * Full i18n. Dark-themed. Responsive.
 */

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { Link } from '@/i18n/navigation';
import { useAuth } from '@/hooks/useAuth';
import { usePlan } from '@/hooks/usePlan';
import {
  Check,
  X,
  Crown,
  Users,
  Zap,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';

type BillingInterval = 'monthly' | 'annual';

export default function PricingPage() {
  const t = useTranslations('pricing');
  const bt = useTranslations('billing');
  const { user } = useAuth();
  const { plan: currentPlan, isPro } = usePlan();
  const router = useRouter();
  const [interval, setInterval] = useState<BillingInterval>('annual');
  const [loadingPrice, setLoadingPrice] = useState<string | null>(null);
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const handleCheckout = async (priceEnvKey: string) => {
    if (!user) {
      router.push('/login');
      return;
    }

    const priceId =
      priceEnvKey === 'monthly'
        ? process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_MONTHLY
        : process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO_ANNUAL;

    if (!priceId) return;

    setLoadingPrice(priceEnvKey);

    try {
      const res = await fetch('/api/billing/create-checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ priceId }),
      });

      const data = await res.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error('Checkout failed:', data.error);
      }
    } catch (err) {
      console.error('Checkout error:', err);
    } finally {
      setLoadingPrice(null);
    }
  };

  const faqKeys = [
    'cancel',
    'trialEnd',
    'switchPlan',
    'refunds',
    'paymentMethods',
  ] as const;

  return (
    <div className="bg-background min-h-screen">
      {/* Header */}
      <header className="border-border/50 bg-background/80 border-b backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
          <Link
            href={user ? '/dashboard' : '/'}
            className="flex items-center gap-3"
          >
            <img
              src="/images/logo.png"
              alt="ExamFlow"
              width={36}
              height={36}
              className="h-9 w-9 rounded-xl"
            />
            <span className="text-foreground text-sm font-bold tracking-tight">
              ExamFlow
            </span>
          </Link>
          <div className="flex items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="text-muted-foreground hover:text-foreground flex items-center gap-2 text-sm transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('backToDashboard')}
              </Link>
            ) : (
              <Link
                href="/login"
                className="bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg px-4 py-2 text-sm font-medium transition-colors"
              >
                {t('signIn')}
              </Link>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-16">
        {/* Title */}
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-foreground text-3xl font-bold tracking-tight sm:text-4xl">
            {t('title')}
          </h1>
          <p className="text-muted-foreground mt-3 text-lg">{t('subtitle')}</p>
        </div>

        {/* Billing Toggle */}
        <div className="mt-10 flex items-center justify-center gap-3">
          <span
            className={cn(
              'text-sm font-medium transition-colors',
              interval === 'monthly'
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {t('toggle.monthly')}
          </span>
          <button
            onClick={() =>
              setInterval(interval === 'monthly' ? 'annual' : 'monthly')
            }
            className="bg-muted hover:bg-muted/80 relative h-7 w-14 rounded-full transition-colors"
            role="switch"
            aria-checked={interval === 'annual'}
            aria-label={t('toggle.label')}
          >
            <div
              className={cn(
                'bg-primary absolute top-0.5 h-6 w-6 rounded-full shadow-md transition-transform duration-300',
                interval === 'annual' ? 'translate-x-7' : 'translate-x-0.5'
              )}
            />
          </button>
          <span
            className={cn(
              'text-sm font-medium transition-colors',
              interval === 'annual'
                ? 'text-foreground'
                : 'text-muted-foreground'
            )}
          >
            {t('toggle.annual')}
          </span>
          {interval === 'annual' && (
            <span className="rounded-full border border-green-500/20 bg-green-500/10 px-2.5 py-1 text-xs font-semibold text-green-400">
              {t('toggle.save')}
            </span>
          )}
        </div>

        {/* Tier Cards */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {/* Free Tier */}
          <TierCard
            name={t('tier.free.name')}
            icon={<Shield className="h-5 w-5" />}
            price="$0"
            period={t('tier.free.period')}
            description={t('tier.free.description')}
            features={[
              t('tier.free.f1'),
              t('tier.free.f2'),
              t('tier.free.f3'),
              t('tier.free.f4'),
              t('tier.free.f5'),
            ]}
            cta={
              user
                ? currentPlan === 'free'
                  ? { label: t('tier.free.currentPlan'), disabled: true }
                  : undefined
                : {
                    label: t('tier.free.cta'),
                    onClick: () => router.push('/login'),
                  }
            }
          />

          {/* Pro Tier (highlighted) */}
          <TierCard
            name={t('tier.pro.name')}
            icon={<Crown className="h-5 w-5" />}
            price={interval === 'monthly' ? '$29' : '$16.58'}
            originalPrice={interval === 'annual' ? '$29' : undefined}
            period={
              interval === 'monthly'
                ? t('tier.pro.perMonth')
                : t('tier.pro.perMonthAnnual')
            }
            description={t('tier.pro.description')}
            badge={t('tier.pro.badge')}
            highlighted
            features={[
              t('tier.pro.f1'),
              t('tier.pro.f2'),
              t('tier.pro.f3'),
              t('tier.pro.f4'),
              t('tier.pro.f5'),
              t('tier.pro.f6'),
              t('tier.pro.f7'),
              t('tier.pro.f8'),
              t('tier.pro.f9'),
              t('tier.pro.f10'),
            ]}
            cta={
              isPro
                ? { label: t('tier.pro.currentPlan'), disabled: true }
                : {
                    label: loadingPrice
                      ? t('tier.pro.loading')
                      : t('tier.pro.cta'),
                    onClick: () => handleCheckout(interval),
                    loading: loadingPrice !== null,
                  }
            }
          />

          {/* Team Tier */}
          <TierCard
            name={t('tier.team.name')}
            icon={<Users className="h-5 w-5" />}
            price="$49"
            period={t('tier.team.perUser')}
            description={t('tier.team.description')}
            badge={t('tier.team.badge')}
            features={[
              t('tier.team.f1'),
              t('tier.team.f2'),
              t('tier.team.f3'),
              t('tier.team.f4'),
            ]}
            cta={{
              label: t('tier.team.cta'),
              onClick: () =>
                (window.location.href =
                  'mailto:team@examflow.app?subject=ExamFlow Team Plan'),
            }}
          />
        </div>

        {/* FAQ */}
        <div className="mx-auto mt-20 max-w-2xl">
          <h2 className="text-foreground mb-8 text-center text-2xl font-bold">
            {t('faq.title')}
          </h2>
          <div className="space-y-2">
            {faqKeys.map((key, index) => (
              <div
                key={key}
                className="border-border bg-card/50 rounded-xl border"
              >
                <button
                  onClick={() =>
                    setExpandedFaq(expandedFaq === index ? null : index)
                  }
                  className="text-foreground flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium"
                  aria-expanded={expandedFaq === index}
                >
                  {t(`faq.${key}.q`)}
                  {expandedFaq === index ? (
                    <ChevronUp className="text-muted-foreground h-4 w-4" />
                  ) : (
                    <ChevronDown className="text-muted-foreground h-4 w-4" />
                  )}
                </button>
                {expandedFaq === index && (
                  <div className="border-border text-muted-foreground border-t px-5 pt-3 pb-4 text-sm">
                    {t(`faq.${key}.a`)}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-border/50 border-t py-8">
        <div className="text-muted-foreground mx-auto max-w-7xl px-6 text-center text-xs">
          <Shield className="mx-auto mb-2 h-4 w-4" />
          {t('footer.secure')}
        </div>
      </footer>
    </div>
  );
}

// ── TierCard Component ─────────────────────────────

interface TierCardProps {
  name: string;
  icon: React.ReactNode;
  price: string;
  originalPrice?: string;
  period: string;
  description: string;
  badge?: string;
  highlighted?: boolean;
  features: string[];
  cta?: {
    label: string;
    onClick?: () => void;
    disabled?: boolean;
    loading?: boolean;
  };
}

function TierCard({
  name,
  icon,
  price,
  originalPrice,
  period,
  description,
  badge,
  highlighted,
  features,
  cta,
}: TierCardProps) {
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-2xl border p-6 transition-all duration-300',
        highlighted
          ? 'border-primary/50 bg-card shadow-primary/5 ring-primary/20 shadow-xl ring-1'
          : 'border-border bg-card/50 hover:border-border/80'
      )}
    >
      {/* Badge */}
      {badge && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
              highlighted
                ? 'bg-primary text-primary-foreground shadow-primary/30 shadow-lg'
                : 'bg-muted text-muted-foreground'
            )}
          >
            <Zap className="h-3 w-3" />
            {badge}
          </span>
        </div>
      )}

      {/* Header */}
      <div className="mb-6 flex items-center gap-2">
        <div
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-xl',
            highlighted
              ? 'bg-primary/10 text-primary'
              : 'bg-muted/50 text-muted-foreground'
          )}
        >
          {icon}
        </div>
        <h3 className="text-foreground text-lg font-bold">{name}</h3>
      </div>

      {/* Price */}
      <div className="mb-2">
        <div className="flex items-baseline gap-2">
          {originalPrice && (
            <span className="text-muted-foreground text-lg line-through">
              {originalPrice}
            </span>
          )}
          <span className="text-foreground text-4xl font-bold tracking-tight">
            {price}
          </span>
        </div>
        <span className="text-muted-foreground text-sm">{period}</span>
      </div>

      {/* Description */}
      <p className="text-muted-foreground mb-6 text-sm">{description}</p>

      {/* CTA */}
      {cta && (
        <button
          onClick={cta.onClick}
          disabled={cta.disabled || cta.loading}
          className={cn(
            'mb-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200',
            highlighted
              ? 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-primary/20 disabled:bg-primary/50 hover:shadow-lg'
              : 'bg-muted text-foreground hover:bg-muted/80 disabled:opacity-50',
            (cta.disabled || cta.loading) && 'cursor-not-allowed opacity-60'
          )}
        >
          {cta.loading ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : null}
          {cta.label}
        </button>
      )}

      {/* Features */}
      <ul className="flex-1 space-y-3">
        {features.map((feature, i) => (
          <li key={i} className="flex items-start gap-3 text-sm">
            <Check
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0',
                highlighted ? 'text-primary' : 'text-muted-foreground'
              )}
            />
            <span className="text-muted-foreground">{feature}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
