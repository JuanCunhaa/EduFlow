/**
 * Email unsubscribe endpoint — GDPR-compliant one-click unsubscribe.
 * Implements: docs/specs/8 email/email-drip-sequences.md
 */

import { NextResponse } from 'next/server';
import { withPublicRoute } from '@/lib/api-middleware';
import { unsubscribeEmail } from '@/services/email-drip-service';

// GET /api/email/unsubscribe?email=... — one-click unsubscribe from drip sequences
export const GET = withPublicRoute(async (req) => {
  const url = new URL(req.url);
  const email = url.searchParams.get('email');

  if (!email) {
    throw Object.assign(new Error('email query parameter required'), {
      status: 400,
    });
  }

  const count = await unsubscribeEmail(email);

  // Return a simple HTML page for the user
  return new NextResponse(
    `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Unsubscribed</title></head>
<body style="font-family: -apple-system, sans-serif; background: #0a0a14; color: #e0e0e0; display: flex; justify-content: center; align-items: center; min-height: 100vh; margin: 0;">
    <div style="text-align: center; max-width: 400px; padding: 2rem;">
        <h1 style="color: #a78bfa;">✓ Unsubscribed</h1>
        <p>You have been unsubscribed from ${count} active email sequence${count !== 1 ? 's' : ''}.</p>
        <p style="opacity: 0.5; font-size: 0.875rem;">You will no longer receive drip emails from ExamFlow.</p>
        <a href="https://examflow.pro" style="color: #a78bfa;">← Back to ExamFlow</a>
    </div>
</body>
</html>`,
    { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
});
