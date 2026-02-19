/**
 * Feature flags service — beta program feature toggling.
 * Implements: docs/specs/7 beta/beta-feature-flags.md
 */

/** All known feature flags and their defaults */
const FLAG_REGISTRY: Record<
  string,
  { description: string; defaultEnabled: boolean }
> = {
  'analytics-dashboard': {
    description: 'Cross-user analytics dashboard with cohort comparison',
    defaultEnabled: false,
  },
  'adaptive-cat': {
    description: 'CAT-style adaptive exam engine (variable-length exams)',
    defaultEnabled: false,
  },
  'question-discussion': {
    description: 'Community discussion threads per question',
    defaultEnabled: false,
  },
  'study-streaks': {
    description: 'Daily study streak tracking with milestone badges',
    defaultEnabled: false,
  },
  'ai-explanations': {
    description: 'AI-generated extended explanations for wrong answers',
    defaultEnabled: false,
  },
};

/**
 * Check if a feature flag is enabled for a user.
 * Priority: user-level flag > global default.
 */
export function isFeatureEnabled(
  flagId: string,
  userBetaFlags?: string[]
): boolean {
  const flag = FLAG_REGISTRY[flagId];
  if (!flag) return false;

  // User-level opt-in takes priority
  if (userBetaFlags?.includes(flagId)) return true;

  return flag.defaultEnabled;
}

/** Get all flags with their status for a user */
export function getUserFlags(
  userBetaFlags?: string[]
): Array<{ id: string; description: string; enabled: boolean }> {
  return Object.entries(FLAG_REGISTRY).map(([id, flag]) => ({
    id,
    description: flag.description,
    enabled: userBetaFlags?.includes(id) ?? flag.defaultEnabled,
  }));
}

/** Get all registered flag IDs */
export function getAllFlagIds(): string[] {
  return Object.keys(FLAG_REGISTRY);
}
