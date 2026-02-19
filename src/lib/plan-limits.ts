/**
 * Plan resolution and limit-checking engine.
 * Server-side source of truth for plan enforcement.
 */

import type {
  PlanTier,
  StripeSubStatus,
  PaywallFeature,
  UserProfile,
} from '@/types';
import { PaywallError } from '@/lib/errors';
import {
  FREE_MAX_EXAMS_PER_DAY,
  FREE_MAX_QUESTIONS_PER_EXAM,
  PRO_MAX_QUESTIONS_PER_EXAM,
  FREE_MAX_PERSONAL_QUESTIONS,
  FREE_MAX_STUDIES,
  FREE_MAX_MARKETPLACE_IMPORTS,
  FREE_EXAM_MODES,
} from '@/lib/constants';
import { getAdminDb } from '@/lib/firebase/admin';

// ── Plan Resolution ────────────────────────────────

/**
 * Resolves the user's effective plan considering subscription state.
 * This is the single authoritative function for determining access level.
 */
export function resolveEffectivePlan(
  profile: UserProfile | null,
  isAdmin = false
): PlanTier {
  // Admins always get Pro
  if (isAdmin) return 'pro';

  if (!profile) return 'free';

  const { plan, stripeSubscriptionStatus, planPeriodEnd } = profile;

  if (plan === 'team') return 'team';

  if (plan === 'pro') {
    const status = stripeSubscriptionStatus;

    // Active or trialing → Pro
    if (status === 'active' || status === 'trialing') return 'pro';

    // Past due → Pro (grace period, Stripe handles retry)
    if (status === 'past_due') return 'pro';

    // Canceled but still within paid period → Pro
    if (status === 'canceled' && planPeriodEnd && planPeriodEnd > Date.now())
      return 'pro';

    // Canceled and past period end → Free
    if (status === 'canceled' && planPeriodEnd && planPeriodEnd <= Date.now())
      return 'free';

    // Incomplete or unpaid → Free
    if (status === 'incomplete' || status === 'unpaid') return 'free';

    // No status but plan is pro (shouldn't happen, but be safe)
    return 'free';
  }

  return 'free';
}

/**
 * Checks if a plan meets the required level.
 * Plan hierarchy: team > pro > free
 */
export function meetsRequirement(
  current: PlanTier,
  required: PlanTier
): boolean {
  const hierarchy: Record<PlanTier, number> = { free: 0, pro: 1, team: 2 };
  return hierarchy[current] >= hierarchy[required];
}

// ── Limit Check Results ────────────────────────────

export interface PlanLimitCheck {
  feature: PaywallFeature;
  allowed: boolean;
  currentUsage?: number;
  limit?: number;
}

// ── Limit Checking Functions ───────────────────────

/**
 * Check a specific plan limit. Returns whether the action is allowed
 * and provides usage data for the client to display.
 */
export async function checkPlanLimit(
  uid: string,
  plan: PlanTier,
  feature: PaywallFeature,
  context?: Record<string, unknown>
): Promise<PlanLimitCheck> {
  // Pro and Team have no limits (except max question count)
  if (plan === 'pro' || plan === 'team') {
    return { feature, allowed: true };
  }

  switch (feature) {
    case 'daily_exam_limit':
      return checkDailyExamLimit(uid);

    case 'exam_question_limit': {
      const questionCount = (context?.questionCount as number) || 0;
      return {
        feature,
        allowed: questionCount <= FREE_MAX_QUESTIONS_PER_EXAM,
        currentUsage: questionCount,
        limit: FREE_MAX_QUESTIONS_PER_EXAM,
      };
    }

    case 'advanced_exam_modes': {
      const mode = context?.mode as string;
      return {
        feature,
        allowed: (FREE_EXAM_MODES as readonly string[]).includes(mode),
      };
    }

    case 'analytics':
    case 'csv_export':
    case 'bulk_import':
    case 'question_notes':
      return { feature, allowed: false };

    case 'marketplace_import_limit':
      return checkMarketplaceImportLimit(uid);

    case 'question_creation_limit':
      return checkQuestionCreationLimit(uid);

    case 'study_creation_limit':
      return checkStudyCreationLimit(uid);

    default:
      return { feature, allowed: true };
  }
}

/**
 * Enforce a plan limit — throws PaywallError if not allowed.
 */
export async function enforcePlanLimit(
  uid: string,
  plan: PlanTier,
  feature: PaywallFeature,
  context?: Record<string, unknown>
): Promise<void> {
  const check = await checkPlanLimit(uid, plan, feature, context);
  if (!check.allowed) {
    throw new PaywallError('pro', {
      feature: check.feature,
      currentUsage: check.currentUsage,
      limit: check.limit,
    });
  }
}

// ── Individual Limit Checks ────────────────────────

async function checkDailyExamLimit(uid: string): Promise<PlanLimitCheck> {
  const db = getAdminDb();
  const now = new Date();
  const startOfDay = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  );

  const examsSnap = await db
    .collection(`users/${uid}/exams`)
    .where('startedAt', '>=', startOfDay)
    .count()
    .get();

  const count = examsSnap.data().count;

  return {
    feature: 'daily_exam_limit',
    allowed: count < FREE_MAX_EXAMS_PER_DAY,
    currentUsage: count,
    limit: FREE_MAX_EXAMS_PER_DAY,
  };
}

async function checkMarketplaceImportLimit(
  uid: string
): Promise<PlanLimitCheck> {
  const db = getAdminDb();

  const studiesSnap = await db
    .collection(`users/${uid}/studies`)
    .where('_source.type', '==', 'marketplace')
    .count()
    .get();

  const count = studiesSnap.data().count;

  return {
    feature: 'marketplace_import_limit',
    allowed: count < FREE_MAX_MARKETPLACE_IMPORTS,
    currentUsage: count,
    limit: FREE_MAX_MARKETPLACE_IMPORTS,
  };
}

async function checkQuestionCreationLimit(
  uid: string
): Promise<PlanLimitCheck> {
  const db = getAdminDb();

  // Count all user questions across all studies
  const studiesSnap = await db.collection(`users/${uid}/studies`).get();
  let totalQuestions = 0;

  for (const studyDoc of studiesSnap.docs) {
    const questionsSnap = await db
      .collection(`users/${uid}/studies/${studyDoc.id}/questions`)
      .count()
      .get();
    totalQuestions += questionsSnap.data().count;
  }

  return {
    feature: 'question_creation_limit',
    allowed: totalQuestions < FREE_MAX_PERSONAL_QUESTIONS,
    currentUsage: totalQuestions,
    limit: FREE_MAX_PERSONAL_QUESTIONS,
  };
}

async function checkStudyCreationLimit(uid: string): Promise<PlanLimitCheck> {
  const db = getAdminDb();

  const studiesSnap = await db.collection(`users/${uid}/studies`).count().get();

  const count = studiesSnap.data().count;

  return {
    feature: 'study_creation_limit',
    allowed: count < FREE_MAX_STUDIES,
    currentUsage: count,
    limit: FREE_MAX_STUDIES,
  };
}

// ── Helper for max question count by plan ──────────

export function getMaxQuestionsPerExam(plan: PlanTier): number {
  return plan === 'free'
    ? FREE_MAX_QUESTIONS_PER_EXAM
    : PRO_MAX_QUESTIONS_PER_EXAM;
}
