import { useEffect, useRef } from 'react';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Provides accessibility features for modals:
 * - Body scroll lock
 * - Escape key to close
 * - Focus trap (Tab cycling)
 * - Auto-focus first interactive element
 *
 * Usage: call at the top of a conditionally-rendered modal component.
 * Attach the returned ref to the modal panel (inner content div).
 */
export function useModalA11y(onClose: () => void) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const container = containerRef.current;

    // Auto-focus first focusable element
    if (container) {
      const first = container.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
      setTimeout(() => first?.focus(), 50);
    }

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        onCloseRef.current();
        return;
      }

      if (e.key === 'Tab' && container) {
        const focusable =
          container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return containerRef;
}
