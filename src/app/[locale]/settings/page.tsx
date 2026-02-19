'use client';

import { Shell } from '@/components/layout/Shell';
import { useTranslations } from 'next-intl';
import { BillingSettings } from '@/components/ui/BillingSettings';
import { Settings } from 'lucide-react';

export default function SettingsPage() {
  const t = useTranslations('billing');

  return (
    <Shell>
      <div className="mx-auto max-w-2xl space-y-8">
        <div className="flex items-center gap-3">
          <div className="bg-primary/10 flex h-10 w-10 items-center justify-center rounded-xl">
            <Settings className="text-primary h-5 w-5" />
          </div>
          <div>
            <h1 className="text-foreground text-xl font-bold">
              {t('settings.title')}
            </h1>
            <p className="text-muted-foreground text-sm">
              {t('settings.subtitle')}
            </p>
          </div>
        </div>

        {/* Billing & Subscription */}
        <BillingSettings />
      </div>
    </Shell>
  );
}
