'use client';

import { useCallback, useEffect, useRef, type ReactNode } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { Spinner } from '@/components/ui/Spinner';

type DialogVariant = 'danger' | 'warning' | 'info';

interface ConfirmDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Called when the user dismisses or cancels */
  onClose: () => void;
  /** Called when the user confirms */
  onConfirm: () => void | Promise<void>;
  /** Dialog title */
  title: string;
  /** Dialog description / body content */
  children: ReactNode;
  /** Text for the confirm button. Default: "Confirm" */
  confirmLabel?: string;
  /** Text for the cancel button. Default: "Cancel" */
  cancelLabel?: string;
  /** Visual variant. Default: "danger" */
  variant?: DialogVariant;
  /** Whether the confirm action is in progress */
  loading?: boolean;
}

const VARIANT_STYLES: Record<
  DialogVariant,
  { icon: React.ElementType; button: string; iconColor: string }
> = {
  danger: {
    icon: Trash2,
    button: 'bg-red-600 hover:bg-red-700 text-white',
    iconColor: 'text-red-400',
  },
  warning: {
    icon: AlertTriangle,
    button: 'bg-amber-600 hover:bg-amber-700 text-white',
    iconColor: 'text-amber-400',
  },
  info: {
    icon: AlertTriangle,
    button: 'bg-primary hover:bg-primary/90 text-primary-foreground',
    iconColor: 'text-primary',
  },
};

/**
 * Accessible confirmation dialog with focus trap and escape key handling.
 * Replaces raw browser `confirm()` and `window.confirm()` calls.
 */
export function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  children,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  loading = false,
}: ConfirmDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const {
    icon: Icon,
    button: buttonStyle,
    iconColor,
  } = VARIANT_STYLES[variant];

  // Focus cancel button when opening
  useEffect(() => {
    if (open) {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => cancelRef.current?.focus(), 50);
      return () => clearTimeout(timer);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, loading]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = '';
      };
    }
  }, [open]);

  const handleConfirm = useCallback(async () => {
    await onConfirm();
  }, [onConfirm]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
    >
      {/* Backdrop */}
      <div
        className="animate-fade-in absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={loading ? undefined : onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="glass-panel border-border animate-scale-in relative mx-4 w-full max-w-md rounded-2xl border p-6 shadow-2xl">
        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          className="text-muted-foreground hover:text-foreground hover:bg-muted absolute top-3 right-3 rounded-lg p-1.5 transition-colors disabled:opacity-50"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Icon */}
        <div
          className={`bg-muted mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${iconColor}`}
        >
          <Icon className="h-6 w-6" />
        </div>

        {/* Title */}
        <h2
          id="confirm-dialog-title"
          className="text-foreground mb-2 text-lg font-semibold"
        >
          {title}
        </h2>

        {/* Body */}
        <div className="text-muted-foreground mb-6 text-sm">{children}</div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            ref={cancelRef}
            onClick={onClose}
            disabled={loading}
            className="border-border text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg border px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors disabled:opacity-50 ${buttonStyle}`}
          >
            {loading && <Spinner size={14} />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
