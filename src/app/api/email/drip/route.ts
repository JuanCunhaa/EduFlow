/**
 * Email drip API — enrollment, processing, and unsubscribe.
 * Implements: docs/specs/8 email/email-drip-sequences.md
 */

import { withAuth, withPublicRoute } from '@/lib/api-middleware';
import {
  enrollInSequence,
  processDueEnrollments,
} from '@/services/email-drip-service';
import type { DripSequenceId } from '@/types';

// POST /api/email/drip — enroll user in a drip sequence
export const POST = withAuth(async (req, { user }) => {
  const body = await req.json();
  const { sequenceId, email } = body;

  const validSequences: DripSequenceId[] = [
    'welcome',
    're_engagement',
    'cert_tips',
    'upgrade_nudge',
  ];
  if (!validSequences.includes(sequenceId)) {
    throw Object.assign(
      new Error(`sequenceId must be one of: ${validSequences.join(', ')}`),
      { status: 400 }
    );
  }

  const enrollmentEmail = email || user.email;
  if (!enrollmentEmail) {
    throw Object.assign(new Error('Email address required'), { status: 400 });
  }

  const enrollmentId = await enrollInSequence(
    enrollmentEmail,
    user.uid,
    sequenceId
  );
  return { enrollmentId };
});

// GET /api/email/drip — trigger processing of due enrollments (cron-callable)
export const GET = withPublicRoute(async (req) => {
  // Verify cron secret to prevent unauthorized triggering
  const url = new URL(req.url);
  const secret = url.searchParams.get('secret');
  const expectedSecret = process.env.CRON_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    throw Object.assign(new Error('Unauthorized'), { status: 401 });
  }

  const result = await processDueEnrollments();
  return result;
});
