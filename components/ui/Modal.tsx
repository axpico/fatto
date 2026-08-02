"use client";

import { forwardRef, useImperativeHandle, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

export type ModalHandle = { open: () => void; close: () => void };

type Variant = "center" | "sheet" | "image";

type Props = {
  variant?: Variant;
  title?: string;
  onCancel?: () => void;
  children: ReactNode;
  className?: string;
};

const variantClasses: Record<Variant, string> = {
  // dialog:modal centers itself natively via UA `margin: auto`, but Tailwind's preflight zeroes
  // margin on every element — inset-0 + m-auto restores it explicitly so utilities (which win over
  // preflight regardless of specificity) put it back in the middle of the viewport
  center: "fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-sm rounded-xl",
  sheet: "fixed inset-x-0 bottom-0 top-auto m-0 max-h-[85vh] w-full overflow-y-auto rounded-t-xl sm:inset-auto sm:bottom-6 sm:max-w-lg sm:rounded-xl",
  image: "fixed inset-0 m-auto h-fit w-[calc(100%-2rem)] max-w-2xl border-none bg-transparent p-0 shadow-none",
};

export const Modal = forwardRef<ModalHandle, Props>(
  ({ variant = "center", title, onCancel, children, className }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = title ? "modal-title" : undefined;

    // chiusura "manuale" (bottone X, click sul backdrop): a differenza di Escape non genera un
    // evento nativo cancel, quindi chiudiamo esplicitamente e replichiamo lo stesso onCancel
    function close() {
      dialogRef.current?.close();
      onCancel?.();
    }

    useImperativeHandle(ref, () => ({
      open: () => dialogRef.current?.showModal(),
      close: () => dialogRef.current?.close(),
    }));

    const closeButton = (
      <button
        type="button"
        onClick={close}
        aria-label="Chiudi"
        className={
          variant === "image"
            ? "absolute right-2 top-2 flex min-h-11 min-w-11 items-center justify-center rounded-full bg-black/50 text-white hover:bg-black/70"
            : "-mr-2 flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-surface-secondary hover:text-foreground"
        }
      >
        <X className="h-5 w-5" aria-hidden="true" />
      </button>
    );

    return (
      <dialog
        ref={dialogRef}
        onCancel={onCancel}
        onClick={(e) => {
          // click sul backdrop nativo: target è il <dialog> stesso solo quando il click non ha
          // colpito nessun discendente (il contenuto reale)
          if (e.target === dialogRef.current) close();
        }}
        aria-labelledby={titleId}
        className={`dialog-surface border border-border bg-surface p-5 text-foreground shadow-md backdrop:bg-black/40 ${variantClasses[variant]} ${className ?? ""}`}
      >
        {variant === "image" ? (
          closeButton
        ) : (
          <div className="sticky -top-5 -mx-5 -mt-5 z-10 mb-3 border-b border-border bg-surface">
            {variant === "sheet" && (
              <div className="flex justify-center pt-2 sm:hidden">
                <span className="h-1 w-10 rounded-full bg-border" aria-hidden="true" />
              </div>
            )}
            <div className="flex items-center justify-between gap-3 px-5 py-3">
              {title ? (
                <p id={titleId} className="font-display text-lg font-semibold">
                  {title}
                </p>
              ) : (
                <span />
              )}
              {closeButton}
            </div>
          </div>
        )}

        {children}
      </dialog>
    );
  },
);
Modal.displayName = "Modal";
