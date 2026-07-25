import { forwardRef, type InputHTMLAttributes } from "react";

export const inputClasses =
  "w-full rounded-lg border border-border bg-surface px-3 py-2 text-base text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary";

type Props = InputHTMLAttributes<HTMLInputElement> & { label?: string };

export const Input = forwardRef<HTMLInputElement, Props>(
  ({ label, id, className, ...props }, ref) => {
    const input = (
      <input ref={ref} id={id} className={[inputClasses, className].filter(Boolean).join(" ")} {...props} />
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
