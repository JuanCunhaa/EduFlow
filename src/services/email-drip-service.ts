/**
 * Email drip engine — sequence management, sending, and unsubscribe.
 * Implements: docs/specs/8 email/email-drip-sequences.md
 *
 * Uses Resend API for transactional email delivery.
 * Set RESEND_API_KEY env variable to enable sending.
 */

import { getAdminDb } from '@/lib/firebase/admin';
import type {
  DripSequenceId,
  DripEnrollment,
  DripSequence,
  DripStep,
} from '@/types';

// ── Sequence Definitions ────────────────────────

const SEQUENCES: DripSequence[] = [
  {
    id: 'welcome',
    name: 'Welcome Sequence',
    trigger: 'signup',
    steps: [
      {
        delayDays: 0,
        templateId: 'welcome-1',
        subject: 'Welcome to ExamFlow — Start Your Certification Journey',
      },
      {
        delayDays: 2,
        templateId: 'welcome-2',
        subject: 'Your personalized study plan is ready',
      },
      {
        delayDays: 5,
        templateId: 'welcome-3',
        subject: '3 tips to boost your practice exam scores',
      },
      {
        delayDays: 10,
        templateId: 'welcome-4',
        subject: 'How are you progressing? Check your readiness score',
      },
    ],
  },
  {
    id: 're_engagement',
    name: 'Re-engagement Sequence',
    trigger: 'inactivity',
    steps: [
      {
        delayDays: 7,
        templateId: 'reengage-1',
        subject: "We miss you — here's what you left off on",
        condition: 'not_active_7d',
      },
      {
        delayDays: 14,
        templateId: 'reengage-2',
        subject: 'Your certification goal is waiting',
        condition: 'not_active_7d',
      },
    ],
  },
  {
    id: 'cert_tips',
    name: 'Certification Tips',
    trigger: 'email_capture',
    steps: [
      {
        delayDays: 0,
        templateId: 'tips-1',
        subject: 'Free study resources for your certification',
      },
      {
        delayDays: 3,
        templateId: 'tips-2',
        subject: '5 mistakes to avoid on exam day',
      },
      {
        delayDays: 7,
        templateId: 'tips-3',
        subject: 'How to use adaptive practice exams effectively',
      },
    ],
  },
  {
    id: 'upgrade_nudge',
    name: 'Upgrade Nudge',
    trigger: 'manual',
    steps: [
      {
        delayDays: 0,
        templateId: 'upgrade-1',
        subject: 'Unlock advanced features with ExamFlow Pro',
        condition: 'free_plan',
      },
      {
        delayDays: 5,
        templateId: 'upgrade-2',
        subject: 'Your practice results suggest you need more questions',
        condition: 'free_plan',
      },
    ],
  },
];

/** Get a sequence by ID */
export function getSequence(id: DripSequenceId): DripSequence | undefined {
  return SEQUENCES.find((s) => s.id === id);
}

/** Get all sequences */
export function getAllSequences(): DripSequence[] {
  return SEQUENCES;
}

// ── Enrollment ──────────────────────────────────

/** Enroll an email/user into a drip sequence */
export async function enrollInSequence(
  email: string,
  uid: string | null,
  sequenceId: DripSequenceId
): Promise<string> {
  const sequence = getSequence(sequenceId);
  if (!sequence) throw new Error(`Unknown sequence: ${sequenceId}`);

  const db = getAdminDb();

  // Check for existing active enrollment
  const existing = await db
    .collection('drip_enrollments')
    .where('email', '==', email)
    .where('sequenceId', '==', sequenceId)
    .where('status', '==', 'active')
    .limit(1)
    .get();

  if (!existing.empty) {
    return existing.docs[0].id; // Already enrolled
  }

  const firstStep = sequence.steps[0];
  const nextSendAt = Date.now() + firstStep.delayDays * 24 * 60 * 60 * 1000;

  const ref = await db.collection('drip_enrollments').add({
    email,
    uid,
    sequenceId,
    currentStep: 0,
    status: 'active',
    nextSendAt,
    startedAt: Date.now(),
    completedAt: null,
  });

  return ref.id;
}

// ── Sending ────────────────────────────────────

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = 'ExamFlow <hello@examflow.pro>';

/** Send an email via Resend API */
async function sendEmail(
  to: string,
  subject: string,
  html: string
): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn('[drip] RESEND_API_KEY not configured — email not sent');
    return false;
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
    });
    return res.ok;
  } catch (error) {
    console.error('[drip] Failed to send email:', error);
    return false;
  }
}

/** Process due enrollments — called by cron or API */
export async function processDueEnrollments(): Promise<{
  processed: number;
  sent: number;
}> {
  const db = getAdminDb();
  const now = Date.now();

  const dueSnap = await db
    .collection('drip_enrollments')
    .where('status', '==', 'active')
    .where('nextSendAt', '<=', now)
    .limit(100)
    .get();

  let sent = 0;

  for (const doc of dueSnap.docs) {
    const enrollment = doc.data() as Omit<DripEnrollment, 'id'>;
    const sequence = getSequence(enrollment.sequenceId);
    if (!sequence) continue;

    const step: DripStep | undefined = sequence.steps[enrollment.currentStep];
    if (!step) {
      // Sequence complete
      await doc.ref.update({ status: 'completed', completedAt: Date.now() });
      continue;
    }

    // Send the email
    const html = buildEmailHtml(step.templateId, enrollment.email);
    const success = await sendEmail(enrollment.email, step.subject, html);

    if (success) {
      sent++;
      const nextStep = enrollment.currentStep + 1;

      if (nextStep >= sequence.steps.length) {
        await doc.ref.update({
          status: 'completed',
          completedAt: Date.now(),
          currentStep: nextStep,
        });
      } else {
        const nextDelay = sequence.steps[nextStep].delayDays;
        await doc.ref.update({
          currentStep: nextStep,
          nextSendAt: Date.now() + nextDelay * 24 * 60 * 60 * 1000,
        });
      }
    }
  }

  return { processed: dueSnap.size, sent };
}

/** Build email HTML from template ID — simple template engine */
function buildEmailHtml(templateId: string, email: string): string {
  const unsubUrl = `https://examflow.pro/api/email/unsubscribe?email=${encodeURIComponent(email)}`;

  return `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #e0e0e0; background: #0a0a14; padding: 2rem;">
    <div style="max-width: 560px; margin: 0 auto;">
        <h2 style="color: #a78bfa;">ExamFlow</h2>
        <p>Template: ${templateId}</p>
        <hr style="border-color: rgba(255,255,255,0.1);" />
        <p style="font-size: 0.75rem; opacity: 0.5;">
            <a href="${unsubUrl}" style="color: #a78bfa;">Unsubscribe</a> · ExamFlow
        </p>
    </div>
</body>
</html>`;
}

// ── Unsubscribe ─────────────────────────────────

/** Unsubscribe an email from all active drip sequences */
export async function unsubscribeEmail(email: string): Promise<number> {
  const db = getAdminDb();
  const snap = await db
    .collection('drip_enrollments')
    .where('email', '==', email)
    .where('status', '==', 'active')
    .get();

  const batch = db.batch();
  for (const doc of snap.docs) {
    batch.update(doc.ref, { status: 'unsubscribed', completedAt: Date.now() });
  }
  await batch.commit();

  return snap.size;
}
