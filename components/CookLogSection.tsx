"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Camera, Star, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog, type ConfirmDialogHandle } from "@/components/ui/ConfirmDialog";
import { StarRating } from "@/components/ui/StarRating";
import { useToast } from "@/components/ui/Toast";
import { StepImageThumb } from "@/components/StepImageThumb";
import { useCookLog } from "@/lib/useCookLog";
import { formatDate } from "@/lib/formatDate";
import { MAX_UPLOAD_BYTES } from "@/lib/uploadLimits";

type CookLog = {
  id: string;
  userId: string;
  cookedAt: string;
  rating: number | null;
  notes: string | null;
  photoFilename: string | null;
  user: { name: string };
};

type CookLogPatch = Partial<Pick<CookLog, "rating" | "notes" | "photoFilename">>;

export function CookLogSection({
  recipeId,
  currentUserId,
  initialLogs,
}: {
  recipeId: string;
  currentUserId: string;
  initialLogs: CookLog[];
}) {
  const [logs, setLogs] = useState(initialLogs);
  const [marking, setMarking] = useState(false);
  const dialogRef = useRef<ConfirmDialogHandle>(null);
  const cookLog = useCookLog(recipeId);
  const reduceMotion = useReducedMotion();

  async function markCooked() {
    setMarking(true);
    const log = await cookLog.markCooked<CookLog>();
    setMarking(false);
    if (log) setLogs((prev) => [log, ...prev]);
  }

  function applyPatch(id: string, patch: CookLogPatch) {
    setLogs((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  async function patchLog(id: string, patch: Pick<CookLogPatch, "rating" | "notes">) {
    const previous = logs;
    applyPatch(id, patch);
    if (!(await cookLog.patchCookLog(id, patch))) setLogs(previous);
  }

  async function removeLog(id: string) {
    const confirmed = await dialogRef.current?.open();
    if (!confirmed) return;
    const previous = logs;
    setLogs((prev) => prev.filter((l) => l.id !== id));
    if (!(await cookLog.deleteCookLog(id))) setLogs(previous);
  }

  async function uploadPhoto(id: string, file: File): Promise<void> {
    const updated = await cookLog.uploadPhoto<CookLog>(id, file);
    if (updated) applyPatch(id, { photoFilename: updated.photoFilename });
  }

  async function removePhoto(id: string, previousFilename: string) {
    applyPatch(id, { photoFilename: null });
    if (!(await cookLog.removePhoto(id))) applyPatch(id, { photoFilename: previousFilename });
  }

  // height 0 → auto pushes the rest of the list down smoothly; overflow is clipped only while it
  // grows, otherwise the stars' negative margin and focus rings would be cut off
  const itemMotion = reduceMotion
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, height: 0, y: -8, overflow: "hidden" },
        animate: { opacity: 1, height: "auto", y: 0, transitionEnd: { overflow: "visible" } },
        exit: { opacity: 0, height: 0, overflow: "hidden" },
      };

  return (
    <section className="mt-10 border-t border-border pt-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="section-title">
          Storico{" "}
          {logs.length > 0 && (
            <span key={logs.length} className="value-pulse inline-block text-muted-foreground">
              · cucinata {logs.length} volte
            </span>
          )}
        </h2>
        <Button type="button" size="sm" onClick={markCooked} disabled={marking}>
          {marking ? "Aggiornamento..." : "Segna come cucinata"}
        </Button>
      </div>

      {logs.length === 0 && <EmptyState title="Non ancora cucinata" />}
      {/* always mounted, so the very first entry animates in too */}
      <ul className="-mt-3 divide-y divide-border">
        <AnimatePresence initial={false}>
          {logs.map((log) => (
            <motion.li
              key={log.id}
              layout={reduceMotion ? false : "position"}
              {...itemMotion}
              transition={{ duration: 0.25, ease: "easeOut" }}
            >
              <CookLogItem
                log={log}
                isOwn={log.userId === currentUserId}
                onPatch={(patch) => patchLog(log.id, patch)}
                onRemove={() => removeLog(log.id)}
                onUploadPhoto={(file) => uploadPhoto(log.id, file)}
                onRemovePhoto={(filename) => removePhoto(log.id, filename)}
              />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <ConfirmDialog
        ref={dialogRef}
        title="Rimuovere questa voce dallo storico?"
        confirmLabel="Rimuovi"
      />
    </section>
  );
}

function CookLogItem({
  log,
  isOwn,
  onPatch,
  onRemove,
  onUploadPhoto,
  onRemovePhoto,
}: {
  log: CookLog;
  isOwn: boolean;
  onPatch: (patch: Pick<CookLogPatch, "rating" | "notes">) => void;
  onRemove: () => void;
  onUploadPhoto: (file: File) => Promise<void>;
  onRemovePhoto: (filename: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const toast = useToast();
  const photoAlt = `Foto della cottura del ${formatDate(log.cookedAt)}`;

  async function handleFile(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_UPLOAD_BYTES) {
      toast.error(`Immagine troppo grande (max ${MAX_UPLOAD_BYTES / 1024 / 1024}MB)`);
      return;
    }
    setUploading(true);
    await onUploadPhoto(file);
    setUploading(false);
  }

  return (
    <div className="py-3">
      <div className="flex flex-wrap items-center gap-x-4">
        <span className="text-sm font-medium text-muted-foreground">
          {formatDate(log.cookedAt)} · {log.user.name}
        </span>
        {isOwn ? (
          <StarRating value={log.rating} onChange={(rating) => onPatch({ rating })} />
        ) : (
          log.rating !== null && (
            <p className="flex items-center gap-0.5 text-primary" aria-label={`${log.rating} stelle su 5`}>
              {Array.from({ length: log.rating }, (_, i) => (
                <Star key={i} className="h-4 w-4" fill="currentColor" aria-hidden="true" />
              ))}
            </p>
          )
        )}
        {isOwn && (
          <div className="ml-auto flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-label={log.photoFilename ? "Cambia foto" : "Aggiungi foto"}
              className="px-2"
            >
              <Camera className={`h-4 w-4 ${uploading ? "animate-pulse" : ""}`} aria-hidden="true" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                void handleFile(e.target.files?.[0]);
                e.target.value = ""; // allow re-picking the same file
              }}
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              aria-label="Rimuovi voce"
              className="px-2 hover:text-destructive"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        )}
      </div>

      {log.photoFilename && (
        <div className="relative mt-2 inline-block">
          <StepImageThumb filename={log.photoFilename} alt={photoAlt} className="h-24 w-24" />
          {isOwn && (
            <button
              type="button"
              onClick={() => onRemovePhoto(log.photoFilename!)}
              aria-label="Rimuovi foto"
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-scrim text-white backdrop-blur-sm hover:brightness-125 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          )}
        </div>
      )}

      {isOwn ? (
        <textarea
          placeholder="Note (opzionale)"
          aria-label="Note"
          defaultValue={log.notes ?? ""}
          onBlur={(e) => {
            const notes = e.target.value.trim() || null;
            if (notes !== log.notes) onPatch({ notes });
          }}
          rows={1}
          maxLength={2000}
          // borderless until hovered/focused: a full input box on every entry is visual noise
          className="-mx-2 mt-1 block w-[calc(100%+1rem)] resize-none rounded-md border border-transparent bg-transparent px-2 py-1.5 text-sm text-foreground transition-[border-color,background-color,box-shadow] duration-200 [field-sizing:content] placeholder:text-muted-foreground hover:border-border focus-visible:border-primary focus-visible:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        />
      ) : (
        log.notes && <p className="mt-2 whitespace-pre-wrap text-sm">{log.notes}</p>
      )}
    </div>
  );
}
