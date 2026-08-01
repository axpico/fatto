"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Modal, type ModalHandle } from "@/components/ui/Modal";

export type ConfirmDialogHandle = { open: () => Promise<boolean> };

type Props = {
  title: string;
  description?: string;
  confirmLabel?: string;
  /** "destructive" (default) for delete/remove actions, "primary" for non-destructive confirmations (e.g. granting a permission). */
  confirmVariant?: "destructive" | "primary";
};

export const ConfirmDialog = forwardRef<ConfirmDialogHandle, Props>(
  ({ title, description, confirmLabel = "Conferma", confirmVariant = "destructive" }, ref) => {
    const modalRef = useRef<ModalHandle>(null);
    const resolveRef = useRef<((value: boolean) => void) | null>(null);

    useImperativeHandle(ref, () => ({
      open: () =>
        new Promise<boolean>((resolve) => {
          resolveRef.current = resolve;
          modalRef.current?.open();
        }),
    }));

    function close(result: boolean) {
      modalRef.current?.close();
      resolveRef.current?.(result);
      resolveRef.current = null;
    }

    return (
      <Modal ref={modalRef} title={title} onCancel={() => close(false)}>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <Button type="button" variant="secondary" size="sm" onClick={() => close(false)}>
            Annulla
          </Button>
          <Button type="button" variant={confirmVariant} size="sm" onClick={() => close(true)}>
            {confirmLabel}
          </Button>
        </div>
      </Modal>
    );
  },
);
ConfirmDialog.displayName = "ConfirmDialog";
