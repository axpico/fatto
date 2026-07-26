import { forwardRef, type InputHTMLAttributes } from "react";

// niente "w-full" qui: molti usi (IngredientRows, StepRows, ShoppingListEditor, ...) affiancano una
// larghezza fissa (w-16/w-20) concatenando questa stringa — se "w-full" fosse già dentro, le due
// classi di larghezza finirebbero entrambe sull'elemento e vincerebbe quella che capita per ultima
// nel CSS compilato, non quella scritta per ultima nel markup (bug reale, risolto qui alla radice)
export const inputClasses =
  "rounded-lg border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

type Props = InputHTMLAttributes<HTMLInputElement> & { label?: string };

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, id, className, ...props }, ref) => {
    const input = (
      <input ref={ref} id={id} className={[inputClasses, "w-full", className].filter(Boolean).join(" ")} {...props} />
    );
    if (!label) return input;
    return (
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-medium">
          {label}
        </label>
        {input}
      </div>
    );
  },
);
Input.displayName = "Input";
