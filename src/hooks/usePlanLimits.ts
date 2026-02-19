/**
 * Client-side plan limits hook.
 * Derives all feature limits from the current plan.
 * Components use this to show/hide/disable UI elements.
 *
 * NOTE: Client gating is cosmetic only. Server enforces via withPlan/checkPlanLimit.
 */

'use client';

import { usePlan } from '@/hooks/usePlan';
import type { ExamMode, PaywallFeature } from '@/types';
import {
  FREE_MAX_EXAMS_PER_DAY,
  FREE_MAX_QUESTIONS_PER_EXAM,
  PRO_MAX_QUESTIONS_PER_EXAM,
  FREE_MAX_PERSONAL_QUESTIONS,
  FREE_MAX_STUDIES,
  FREE_MAX_MARKETPLACE_IMPORTS,
  FREE_HEATMAP_DAYS,
  HEATMAP_ROLLING_DAYS,
  FREE_EXAM_MODES,
  ALL_EXAM_MODES,
} from '@/lib/constants';

interface PlanLimits {
  /** Max exams per day */
  maxExamsPerDay: number;
  /** Max questions per exam */
  maxQuestionsPerExam: number;
  /** Max personal questions total */
  maxPersonalQuestions: number;
  /** Max studies */
  maxStudies: number;
  /** Max marketplace imports */
  maxMarketplaceImports: number;
  /** Heatmap days */
  heatmapDays: number;
  /** Allowed exam modes */
  allowedModes: readonly string[];
  /** Whether a specific mode is allowed */
  isModeAllowed: (mode: ExamMode) => boolean;
  /** Whether analytics is available */
  canUseAnalytics: boolean;
  /** Whether CSV export is available */
  canExport: boolean;
  /** Whether notes are available */
  canUseNotes: boolean;
  /** Whether bulk import is available */
  canBulkImport: boolean;
  /** Whether the user is on the free plan */
  isFree: boolean;
  /** Check if a feature is available */
  isFeatureAvailable: (feature: PaywallFeature) => boolean;
}

export function usePlanLimits(): PlanLimits {
  const { plan } = usePlan();
  const isFree = plan === 'free';

  const isModeAllowed = (mode: ExamMode): boolean => {
    if (!isFree) return true;
    return (FREE_EXAM_MODES as readonly string[]).includes(mode);
  };

  const isFeatureAvailable = (feature: PaywallFeature): boolean => {
    if (!isFree) return true;
    switch (feature) {
      case 'analytics':
      case 'csv_export':
      case 'bulk_import':
      case 'question_notes':
      case 'advanced_exam_modes':
        return false;
      default:
        return true; // Metered features need usage check
    }
  };

  return {
    maxExamsPerDay: isFree ? FREE_MAX_EXAMS_PER_DAY : Infinity,
    maxQuestionsPerExam: isFree
      ? FREE_MAX_QUESTIONS_PER_EXAM
      : PRO_MAX_QUESTIONS_PER_EXAM,
    maxPersonalQuestions: isFree ? FREE_MAX_PERSONAL_QUESTIONS : Infinity,
    maxStudies: isFree ? FREE_MAX_STUDIES : Infinity,
    maxMarketplaceImports: isFree ? FREE_MAX_MARKETPLACE_IMPORTS : Infinity,
    heatmapDays: isFree ? FREE_HEATMAP_DAYS : HEATMAP_ROLLING_DAYS,
    allowedModes: isFree ? FREE_EXAM_MODES : ALL_EXAM_MODES,
    isModeAllowed,
    canUseAnalytics: !isFree,
    canExport: !isFree,
    canUseNotes: !isFree,
    canBulkImport: !isFree,
    isFree,
    isFeatureAvailable,
  };
}
