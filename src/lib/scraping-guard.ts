/**
 * Scraping Guard — request fingerprinting and anomaly detection middleware.
 *
 * Adds multi-layer protection against automated question scraping:
 * 1. Request fingerprinting via X-Request-ID + client metadata
 * 2. Burst detection (too many requests in short window)
 * 3. Suspicious header detection (missing/unusual User-Agent, Accept)
 * 4. Concurrent request tracking per user
 */

import { NextResponse } from 'next/server';
import { rateLimit } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

// ── Types ────────────────────────────────────────

interface ScrapingSignals {
  score: number; // 0–100, higher = more suspicious
  reasons: string[]; // human-readable flags
  fingerprint: string; // hashed request fingerprint
  blocked: boolean; // whether the request was denied
}

interface GuardOptions {
  /** Max requests per minute per user for this endpoint (default: 30) */
  maxRequestsPerMinute?: number;
  /** Max requests per hour per user for this endpoint (default: 200) */
  maxRequestsPerHour?: number;
  /** Suspicion score threshold to block (default: 70) */
  blockThreshold?: number;
  /** Endpoint category for logging (e.g., 'questions-list', 'exam-review') */
  category?: string;
}

// ── Fingerprint ──────────────────────────────────

function buildFingerprint(request: Request, uid: string): string {
  const ua = request.headers.get('user-agent') ?? 'unknown';
  const accept = request.headers.get('accept') ?? 'unknown';
  const lang = request.headers.get('accept-language') ?? 'unknown';
  const encoding = request.headers.get('accept-encoding') ?? 'unknown';

  // Simple hash — not cryptographic, just uniqueness
  const raw = `${uid}|${ua}|${accept}|${lang}|${encoding}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.codePointAt(i) ?? 0;
    hash = (hash << 5) - hash + char;
    hash = Math.trunc(hash); // Convert to 32-bit integer
  }
  return `fp_${Math.abs(hash).toString(36)}`;
}

// ── Anomaly Detection ────────────────────────────

function detectAnomalies(request: Request): {
  score: number;
  reasons: string[];
} {
  let score = 0;
  const reasons: string[] = [];

  const ua = request.headers.get('user-agent');
  const accept = request.headers.get('accept');
  const referer = request.headers.get('referer');

  // 1. Missing or suspicious User-Agent
  if (!ua || ua.length < 10) {
    score += 25;
    reasons.push('missing_or_short_user_agent');
  } else {
    const botPatterns =
      /bot|crawler|spider|scraper|curl|wget|httpie|python|node-fetch|axios|postman/i;
    if (botPatterns.test(ua)) {
      score += 30;
      reasons.push('bot_user_agent');
    }
  }

  // 2. Missing Accept header (browsers always send this)
  if (!accept || accept === '*/*') {
    score += 15;
    reasons.push('generic_accept_header');
  }

  // 3. Missing Referer (API calls from our app should have it)
  if (!referer) {
    score += 10;
    reasons.push('missing_referer');
  }

  // 4. Request ID tracking — legitimate clients should not forge this
  const requestId = request.headers.get('x-request-id');
  if (requestId && requestId.length > 64) {
    score += 10;
    reasons.push('suspicious_request_id_length');
  }

  return { score, reasons };
}

// ── Main Guard Function ──────────────────────────

/**
 * Evaluate a request for scraping signals. Returns signal data and optionally
 * blocks the request if the suspicion score exceeds the threshold.
 *
 * Detection layers:
 * 1. Header anomalies (UA, Accept, Referer, Request-ID)
 * 2. Per-minute and per-hour burst rate limits
 * 3. Sequential paging detection (cursor + high limit)
 * 4. Filter enumeration detection (many filter params)
 *
 * Usage in API routes:
 * ```ts
 * const guard = await checkScrapingSignals(request, user.uid, { category: 'questions-list' });
 * if (guard.blocked) {
 *     return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
 * }
 * ```
 */
export async function checkScrapingSignals(
  request: Request,
  uid: string,
  options: GuardOptions = {}
): Promise<ScrapingSignals> {
  const {
    maxRequestsPerMinute = 30,
    maxRequestsPerHour = 200,
    blockThreshold = 70,
    category = 'general',
  } = options;

  const url = new URL(request.url);
  const fingerprint = buildFingerprint(request, uid);
  const { score: anomalyScore, reasons } = detectAnomalies(request);

  let score = anomalyScore;

  // ── Sequential paging detection ──
  const cursor = url.searchParams.get('cursor');
  const limitParam = url.searchParams.get('limit');
  if (cursor && limitParam) {
    const limitVal = Number.parseInt(limitParam, 10);
    if (limitVal >= 100) {
      score += 15;
      reasons.push('high_limit_with_cursor');
    }
  }

  // ── Filter enumeration detection ──
  const filterKeys = Array.from(url.searchParams.keys());
  if (filterKeys.length >= 4) {
    score += 10;
    reasons.push('excessive_filter_params');
  }

  // ── Per-minute rate check ──
  const minuteKey = `scrape:${category}:${uid}:min`;
  const minuteAllowed = await rateLimit(
    minuteKey,
    maxRequestsPerMinute,
    60_000,
    true
  );
  if (!minuteAllowed) {
    score += 30;
    reasons.push('rate_limit_minute_exceeded');
  }

  // ── Per-hour rate check ──
  const hourKey = `scrape:${category}:${uid}:hr`;
  const hourAllowed = await rateLimit(
    hourKey,
    maxRequestsPerHour,
    3_600_000,
    true
  );
  if (!hourAllowed) {
    score += 25;
    reasons.push('rate_limit_hour_exceeded');
  }

  const blocked = score >= blockThreshold;

  // ── Log suspicious activity (structured, non-sensitive fields) ──
  if (score >= 30) {
    logger.warn('Scraping signal detected', {
      userId: uid,
      meta: {
        fingerprint,
        score,
        reasons,
        blocked,
        category,
        method: request.method,
        path: url.pathname,
        cursor: cursor ?? undefined,
        limit: limitParam ?? undefined,
        ip: request.headers.get('x-forwarded-for') ?? 'unknown',
        ua: request.headers.get('user-agent')?.substring(0, 120),
      },
    });
  }

  return { score, reasons, fingerprint, blocked };
}

// ── Convenience: creates a response header with fingerprint ──

/**
 * Add scraping guard response headers for monitoring.
 * Sets X-Request-Fingerprint for correlation in logging.
 */
export function addGuardHeaders(
  response: NextResponse,
  signals: ScrapingSignals
): NextResponse {
  response.headers.set('X-Request-Fingerprint', signals.fingerprint);
  return response;
}
