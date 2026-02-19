/**
 * Hook for handling paywall errors from API responses.
 * Intercepts PAYWALL_REQUIRED errors and opens the upgrade modal.
 */

'use client';

import { useState, useCallback } from 'react';
import type { PaywallFeature } from '@/types';

interface PaywallState {
  isOpen: boolean;
  feature: PaywallFeature | null;
  currentUsage?: number;
  limit?: number;
}

interface UsePaywallReturn {
  /** Current paywall state */
  paywall: PaywallState;
  /** Handle an API error — returns true if it was a paywall error */
  handlePaywallError: (error: unknown) => boolean;
  /** Manually trigger the paywall modal */
  showPaywall: (
    feature: PaywallFeature,
    currentUsage?: number,
    limit?: number
  ) => void;
  /** Close the paywall modal */
  closePaywall: () => void;
}

export function usePaywall(): UsePaywallReturn {
  const [paywall, setPaywall] = useState<PaywallState>({
    isOpen: false,
    feature: null,
  });

  const handlePaywallError = useCallback((error: unknown): boolean => {
    // Check if the error has paywall structure
    if (error && typeof error === 'object' && 'code' in error) {
      const apiError = error as {
        code?: string;
        details?: Record<string, unknown>;
      };
      if (apiError.code === 'PAYWALL_REQUIRED' && apiError.details) {
        setPaywall({
          isOpen: true,
          feature: apiError.details.feature as PaywallFeature,
          currentUsage: apiError.details.currentUsage as number | undefined,
          limit: apiError.details.limit as number | undefined,
        });
        return true;
      }
    }

    // Also check for Error objects with specific message patterns
    if (error instanceof Error) {
      try {
        // Some fetchers embed the response body in the message
        const body = JSON.parse(error.message);
        if (body?.code === 'PAYWALL_REQUIRED') {
          setPaywall({
            isOpen: true,
            feature: body.details?.feature as PaywallFeature,
            currentUsage: body.details?.currentUsage as number | undefined,
            limit: body.details?.limit as number | undefined,
          });
          return true;
        }
      } catch {
        // Not JSON, not a paywall error
      }
    }

    return false;
  }, []);

  const showPaywall = useCallback(
    (feature: PaywallFeature, currentUsage?: number, limit?: number) => {
      setPaywall({ isOpen: true, feature, currentUsage, limit });
    },
    []
  );

  const closePaywall = useCallback(() => {
    setPaywall({ isOpen: false, feature: null });
  }, []);

  return { paywall, handlePaywallError, showPaywall, closePaywall };
}
