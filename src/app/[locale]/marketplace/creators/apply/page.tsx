'use client';

import { useState, type FormEvent } from 'react';
import { Shell } from '@/components/layout/Shell';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from '@/i18n/navigation';

const CERT_OPTIONS = [
  'CISSP',
  'CC',
  'SSCP',
  'CCSP',
  'CGRC',
  'Security+',
  'Other',
];
const EXPERIENCE_OPTIONS = ['1-3', '3-5', '5-10', '10+'] as const;

export default function CreatorApplyPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // Form state
  const [fullName, setFullName] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');
  const [certificationsHeld, setCertificationsHeld] = useState<string[]>([]);
  const [yearsExperience, setYearsExperience] =
    useState<(typeof EXPERIENCE_OPTIONS)[number]>('1-3');
  const [writingSample, setWritingSample] = useState('');
  const [bio, setBio] = useState('');
  const [agreedToTos, setAgreedToTos] = useState(false);

  const toggleCert = (cert: string) => {
    setCertificationsHeld((prev) =>
      prev.includes(cert) ? prev.filter((c) => c !== cert) : [...prev, cert]
    );
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/creators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          linkedinUrl,
          certificationsHeld,
          yearsExperience,
          writingSample,
          bio,
          agreedToTos,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit application');
      }

      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
          <p className="text-muted">Please log in to apply as a creator.</p>
        </div>
      </Shell>
    );
  }

  if (success) {
    return (
      <Shell>
        <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
          <div className="text-5xl">🎉</div>
          <h1 className="text-2xl font-bold">Application Submitted!</h1>
          <p className="text-muted max-w-md">
            We&apos;ll review your application within 72 hours and notify you by
            email.
          </p>
          <button
            onClick={() => router.push('/marketplace')}
            className="btn btn-primary mt-4"
          >
            Back to Marketplace
          </button>
        </div>
      </Shell>
    );
  }

  const steps = [
    // Step 0: Personal Info
    <div key="info" className="space-y-4">
      <h2 className="text-xl font-semibold">Personal Information</h2>
      <div>
        <label className="label" htmlFor="fullName">
          Full Legal Name *
        </label>
        <input
          id="fullName"
          type="text"
          className="input"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="linkedinUrl">
          LinkedIn Profile URL *
        </label>
        <input
          id="linkedinUrl"
          type="url"
          className="input"
          value={linkedinUrl}
          onChange={(e) => setLinkedinUrl(e.target.value)}
          placeholder="https://linkedin.com/in/..."
          required
        />
      </div>
      <div>
        <label className="label">Certifications Held *</label>
        <div className="mt-1 flex flex-wrap gap-2">
          {CERT_OPTIONS.map((cert) => (
            <button
              key={cert}
              type="button"
              onClick={() => toggleCert(cert)}
              className={`rounded-md border px-3 py-1.5 text-sm transition-colors ${
                certificationsHeld.includes(cert)
                  ? 'bg-primary border-primary text-white'
                  : 'border-border hover:border-primary'
              }`}
            >
              {cert}
            </button>
          ))}
        </div>
      </div>
      <div>
        <label className="label" htmlFor="yearsExperience">
          Years of Experience *
        </label>
        <select
          id="yearsExperience"
          className="input"
          value={yearsExperience}
          onChange={(e) =>
            setYearsExperience(
              e.target.value as (typeof EXPERIENCE_OPTIONS)[number]
            )
          }
        >
          {EXPERIENCE_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt} years
            </option>
          ))}
        </select>
      </div>
    </div>,

    // Step 1: Writing Sample
    <div key="writing" className="space-y-4">
      <h2 className="text-xl font-semibold">Writing Sample</h2>
      <p className="text-muted text-sm">
        Write 2-3 sample exam questions in any format. Include the question
        stem, 4 options, the correct answer, and a brief explanation.
      </p>
      <div>
        <label className="label" htmlFor="writingSample">
          Sample Questions *
        </label>
        <textarea
          id="writingSample"
          className="input min-h-[200px]"
          value={writingSample}
          onChange={(e) => setWritingSample(e.target.value)}
          placeholder={
            'Q1: Which of the following best describes...\nA) ...\nB) ...\nC) ...\nD) ...\n\nCorrect: B\nExplanation: ...'
          }
          required
        />
      </div>
      <div>
        <label className="label" htmlFor="bio">
          Public Bio *
        </label>
        <textarea
          id="bio"
          className="input min-h-[100px]"
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          placeholder="Tell potential buyers about your expertise..."
          required
        />
      </div>
    </div>,

    // Step 2: Terms
    <div key="terms" className="space-y-4">
      <h2 className="text-xl font-semibold">Creator Terms</h2>
      <div className="bg-surface border-border space-y-2 rounded-lg border p-4 text-sm">
        <p>By becoming a creator, you agree to:</p>
        <ul className="text-muted list-disc space-y-1 pl-5">
          <li>Only publish original content you created</li>
          <li>
            Not copy questions from official exam dumps or copyrighted sources
          </li>
          <li>Maintain accuracy in all questions and explanations</li>
          <li>Respond to revision requests within 14 days</li>
          <li>
            ExamFlow retains the right to remove content that violates policies
          </li>
        </ul>
      </div>
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={agreedToTos}
          onChange={(e) => setAgreedToTos(e.target.checked)}
          className="mt-1"
        />
        <span className="text-sm">
          I have read and agree to the Creator Terms of Service *
        </span>
      </label>
    </div>,
  ];

  const canProceed = () => {
    if (step === 0)
      return fullName && linkedinUrl && certificationsHeld.length > 0;
    if (step === 1) return writingSample.length >= 50 && bio.length >= 20;
    return agreedToTos;
  };

  return (
    <Shell>
      <div className="mx-auto max-w-2xl py-8">
        <h1 className="mb-2 text-2xl font-bold">Become a Creator</h1>
        <p className="text-muted mb-6">
          Share your expertise by publishing question packs on the ExamFlow
          marketplace.
        </p>

        {/* Progress */}
        <div className="mb-8 flex gap-2">
          {['Info', 'Writing', 'Terms'].map((label, i) => (
            <div key={label} className="flex-1">
              <div
                className={`h-1 rounded-full ${i <= step ? 'bg-primary' : 'bg-border'}`}
              />
              <span
                className={`mt-1 block text-xs ${i <= step ? 'text-foreground' : 'text-muted'}`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          {steps[step]}

          {error && <p className="mt-4 text-sm text-red-500">{error}</p>}

          <div className="mt-6 flex gap-3">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep(step - 1)}
                className="btn btn-ghost"
              >
                Back
              </button>
            )}
            {step < 2 ? (
              <button
                type="button"
                onClick={() => setStep(step + 1)}
                disabled={!canProceed()}
                className="btn btn-primary ml-auto"
              >
                Continue
              </button>
            ) : (
              <button
                type="submit"
                disabled={!canProceed() || loading}
                className="btn btn-primary ml-auto"
              >
                {loading ? 'Submitting…' : 'Submit Application'}
              </button>
            )}
          </div>
        </form>
      </div>
    </Shell>
  );
}
