"use client";

import { X } from "lucide-react";
import { inputClasses } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { ReorderableRows } from "@/components/ui/ReorderableRows";
import { UploadedImage } from "@/components/UploadedImage";

export type StepRow = {
  instruction: string;
  timerMinutes: number | null;
  optional: boolean;
  imageFilename: string | null;
  imageFile: File | null;
};

const stepImageInputClasses =
  "text-xs text-muted-foreground file:mr-2 file:rounded file:border-0 file:bg-surface-secondary file:px-2 file:py-1 file:text-xs";

export function StepRows({
  value,
  onChange,
}: {
  value: StepRow[];
  onChange: (rows: StepRow[]) => void;
}) {
  return (
    <ReorderableRows
      items={value}
      onChange={onChange}
      itemLabel="passaggio"
      addLabel="Aggiungi passaggio"
      onAdd={() => ({ instruction: "", timerMinutes: null, optional: false, imageFilename: null, imageFile: null })}
      renderFields={(row, index, update) => (
        <>
          <span className="pt-2 text-sm font-medium text-muted-foreground">{index + 1}.</span>
          <textarea
            placeholder="Descrivi il passaggio"
            aria-label="Passaggio"
            value={row.instruction}
            onChange={(e) => update({ instruction: e.target.value })}
            rows={2}
            className={`flex-1 ${inputClasses}`}
          />
          <input
            type="number"
            placeholder="Min"
            aria-label="Minuti timer"
            value={row.timerMinutes ?? ""}
            onChange={(e) => update({ timerMinutes: e.target.value ? Number(e.target.value) : null })}
            className={`w-16 ${inputClasses}`}
          />
        </>
      )}
      renderOptional={(row, _index, update) => (
        <div className="flex flex-wrap items-center gap-3">
          <Checkbox
            label="Facoltativo"
            checked={row.optional}
            onChange={(e) => update({ optional: e.target.checked })}
          />
          <div className="flex items-center gap-2">
            {row.imageFilename && !row.imageFile && (
              <UploadedImage filename={row.imageFilename} alt="" className="h-10 w-10 rounded object-cover" />
            )}
            <input
              type="file"
              accept="image/*"
              aria-label="Immagine passaggio"
              onChange={(e) => update({ imageFile: e.target.files?.[0] ?? null })}
              className={stepImageInputClasses}
            />
            {(row.imageFilename || row.imageFile) && (
              <button
                type="button"
                onClick={() => update({ imageFilename: null, imageFile: null })}
                aria-label="Rimuovi immagine passaggio"
                className="flex min-h-11 min-w-11 items-center justify-center text-muted-foreground hover:text-destructive"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            )}
          </div>
        </div>
      )}
    />
  );
}
