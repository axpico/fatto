"use client";

import { inputClasses } from "@/components/ui/Input";
import { Checkbox } from "@/components/ui/Checkbox";
import { ReorderableRows } from "@/components/ui/ReorderableRows";

export type StepRow = { instruction: string; timerMinutes: number | null; optional: boolean };

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
      onAdd={() => ({ instruction: "", timerMinutes: null, optional: false })}
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
        <Checkbox
          label="Facoltativo"
          checked={row.optional}
          onChange={(e) => update({ optional: e.target.checked })}
        />
      )}
    />
  );
}
