"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Button } from "@/components/ui/Button";

export type ConfirmDialogHandle = { open: () => Promise<boolean> };

type Props = { title: string; description?: string; confirmLabel?: string };

export const ConfirmDialog = forwardRef<ConfirmDialogHandle, Props>(
  ({ title, description, confirmLabel = "Conferma" }, ref) => {
    const dialogRef = useRef<HTMLDialogElement>(null);
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    useImperativeHandle(ref, () => ({
      open: () =>
        new Promise<boolean>((resolve) => {
          resolveRef.current = resolve;
          dialogRef.current?.showModal();
        }),
    }));

    function close(result: boolean) {
      dialogRef.current?.close();
      resolveRef.current?.(result);
      resolveRef.current = null;
    }

    return (
      <dialog
        ref={dialogRef}
        onCancel={() => close(false)}
        className="rounded-xl border border-border bg-surface p-5 text-foreground shadow-sm backdrop:bg-black/40"
      >
        <p className="font-medium">{title}</p>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => close(false)}>
            Annulla
          </Button>
          <Button type="button" variant="destructive" size="sm" onClick={() => close(true)}>
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    );
  },
);
ConfirmDialog.displayName = "ConfirmDialog";
