"use client";

import { type ReactNode, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), iframe, [tabindex]:not([tabindex="-1"]):not([data-kl-sentinel])';

type DialogProps = {
  labelledBy: string;
  describedBy?: string;
  onClose: () => void;
  children: ReactNode;
  size?: "md" | "sm";
  role?: "dialog" | "alertdialog";
  closeLabel?: string;
  initialFocus?: "close" | "first";
};

// One overlay layer, one surface: no duplicated backdrops or blurred poster copies behind the dialog.
export default function Dialog({
  labelledBy,
  describedBy,
  onClose,
  children,
  size = "md",
  role = "dialog",
  closeLabel = "Закрыть",
  initialFocus = "close",
}: DialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const { body, documentElement } = document;
    const previousOverflow = body.style.overflow;
    const previousPadding = body.style.paddingRight;
    const scrollbarWidth = window.innerWidth - documentElement.clientWidth;

    body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      body.style.paddingRight = `${scrollbarWidth}px`;
    }

    if (initialFocus === "first") {
      dialogRef.current?.querySelector<HTMLElement>(FOCUSABLE)?.focus();
    } else {
      closeRef.current?.focus();
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
        return;
      }

      if (event.key !== "Tab" || !dialogRef.current) {
        return;
      }

      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(
        (element) => element.offsetParent !== null || element === document.activeElement,
      );

      if (focusable.length === 0) {
        event.preventDefault();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }

    // Tabbing out of an embedded trailer iframe bypasses keydown; pull focus back into the dialog.
    function handleFocusIn(event: FocusEvent) {
      const dialog = dialogRef.current;
      const target = event.target as Node | null;

      if (dialog && target && !dialog.contains(target)) {
        closeRef.current?.focus({ preventScroll: true });
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("focusin", handleFocusIn);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("focusin", handleFocusIn);
      body.style.overflow = previousOverflow;
      body.style.paddingRight = previousPadding;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [initialFocus]);

  return createPortal(
    <div
      className="kl-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={dialogRef}
        className={size === "sm" ? "kl-dialog kl-dialog--sm" : "kl-dialog"}
        role={role}
        aria-modal="true"
        aria-labelledby={labelledBy}
        aria-describedby={describedBy}
      >
        <button
          ref={closeRef}
          type="button"
          className="kl-btn kl-btn--icon kl-btn--sm kl-dialog-close"
          onClick={onClose}
          aria-label={closeLabel}
        >
          <X size={18} aria-hidden="true" />
        </button>
        <div className="kl-dialog-scroll">{children}</div>
        {/* Focus sentinel: leaving the last control (or an iframe) wraps to the close button. */}
        <span tabIndex={0} data-kl-sentinel="" className="kl-sr-only" onFocus={() => closeRef.current?.focus()} />
      </div>
    </div>,
    document.body,
  );
}
