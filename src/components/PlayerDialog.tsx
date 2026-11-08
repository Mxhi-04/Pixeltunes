import { useLayoutEffect, useRef, type ReactNode } from 'react';

const focusable = 'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled)';

export function PlayerDialog({ label, opener, onClose, children }: {
  label: string;
  opener: HTMLElement | null;
  onClose: () => void;
  children: ReactNode;
}) {
  const dialog = useRef<HTMLDivElement>(null);
  const close = useRef(onClose);
  close.current = onClose;

  useLayoutEffect(() => {
    const previous = opener || document.activeElement;
    const root = dialog.current;
    root?.focus({ preventScroll: true });
    const recoverFocus = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      } else if (event.key === 'Tab' && !root?.contains(document.activeElement)) {
        root?.focus({ preventScroll: true });
      }
    };
    window.addEventListener('keydown', recoverFocus);

    return () => {
      window.removeEventListener('keydown', recoverFocus);
      queueMicrotask(() => {
        if (document.querySelector('[role="dialog"][aria-modal="true"]')) return;
        if (previous instanceof HTMLElement && previous !== document.body && previous.isConnected) {
          previous.focus({ preventScroll: true });
        } else {
          document.querySelector<HTMLElement>('[data-testid="main-play-btn"]')?.focus({ preventScroll: true });
        }
      });
    };
  }, [opener]);

  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-label={label}
      tabIndex={-1}
      className="absolute inset-0 z-50 outline-none"
      onKeyDown={(event) => {
        if (event.key !== 'Tab') return;
        const elements = Array.from(event.currentTarget.querySelectorAll<HTMLElement>(focusable))
          .filter((element) => element.getClientRects().length > 0);
        const first = elements[0];
        const last = elements[elements.length - 1];
        const active = document.activeElement;
        if (!first || !elements.some((element) => element === active) ||
          (event.shiftKey ? active === first : active === last)) {
          event.preventDefault();
          (event.shiftKey ? last : first)?.focus();
        }
      }}
    >
      {children}
    </div>
  );
}
