import { forwardRef, type InputHTMLAttributes } from "react";

// niente "w-full" qui: molti usi (IngredientRows, StepRows, ServingsAdjuster, ...) affiancano una
// larghezza fissa (w-16/w-20) concatenando questa stringa — se "w-full" fosse già dentro, le due
// classi di larghezza finirebbero entrambe sull'elemento e vincerebbe quella che capita per ultima
// nel CSS compilato, non quella scritta per ultima nel markup (bug reale, risolto qui alla radice)
export const inputClasses =
  "min-h-10 rounded-md border border-border bg-surface px-3 py-2 text-base text-foreground shadow-sm transition-[border-color,box-shadow] duration-200 placeholder:text-muted-foreground focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:opacity-70";

type Props = InputHTMLAttributes<HTMLInputElement> & { label?: string };

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, id, className, ...props }, ref) => {
    const input = (
      <input ref={ref} id={id} className={[inputClasses, "w-full", className].filter(Boolean).join(" ")} {...props} />
    );
    if (!label) return input;
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
        </label>
        {input}
      </div>
    );
  },
);
Input.displayName = "Input";
