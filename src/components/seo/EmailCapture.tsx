'use client';

import { useState, useCallback, type FormEvent } from 'react';

/**
 * GDPR-safe email capture form.
 * Stores lead in Firestore via /api/leads.
 */
export function EmailCapture({
  certSlug,
  source,
}: Readonly<{
  certSlug: string;
  source: string;
}>) {
  const [email, setEmail] = useState('');
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<
    'idle' | 'loading' | 'success' | 'error'
  >('idle');

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!email || status === 'loading') return;

      setStatus('loading');
      try {
        const res = await fetch('/api/leads', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, certSlug, source, consent }),
        });
        setStatus(res.ok ? 'success' : 'error');
      } catch {
        setStatus('error');
      }
    },
    [email, certSlug, source, consent, status]
  );

  if (status === 'success') {
    return (
      <div className="seo-email-success">
        ✓ Thanks! Check your email for your free study resources.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="seo-email-capture">
        <input
          type="email"
          placeholder="your@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          aria-label="Email address"
        />
        <button type="submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Sending…' : 'Get Free Study Plan'}
        </button>
      </div>
      <label className="seo-email-consent">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
        />
        <span>
          Send me weekly study tips and product updates. Unsubscribe anytime.
        </span>
      </label>
      {status === 'error' && (
        <p
          style={{
            color: '#ef4444',
            fontSize: '0.82rem',
            marginTop: '0.35rem',
          }}
        >
          Something went wrong. Please try again.
        </p>
      )}
    </form>
  );
}
