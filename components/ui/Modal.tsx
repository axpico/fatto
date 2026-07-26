"use client";

import { forwardRef, useImperativeHandle, useRef, type ReactNode } from "react";

export type ModalHandle = { open: () => void; close: () => void };

type Variant = "center" | "sheet";

type Props = {
  variant?: Variant;
  title?: string;
  onCancel?: () => void;
  children: ReactNode;
};

const variantClasses: Record<Variant, string> = {
  center: "max-w-sm w-[calc(100%-2rem)] rounded-xl",
  sheet: "fixed inset-x-0 bottom-0 top-auto m-0 w-full max-h-[85vh] rounded-t-xl overflow-y-auto",
};

export const Modal = forwardRef<ModalHandle, Props>(
  ({ variant = "center", title, onCancel, children }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const titleId = title ? "modal-title" : undefined;

    useImperativeHandle(ref, () => ({
      open: () => dialogRef.current?.showModal(),
      close: () => dialogRef.current?.close(),
    }));

    return (
      <dialog
        ref={dialogRef}
        onCancel={onCancel}
        aria-labelledby={titleId}
        className={`border border-border bg-surface p-5 text-foreground shadow-sm backdrop:bg-black/40 ${variantClasses[variant]}`}
      >
        {title && (
          <p id={titleId} className="mb-3 font-medium">
            {title}
          </p>
        )}
        {children}
      </dialog>
    );
  },
);
Modal.displayName = "Modal";
