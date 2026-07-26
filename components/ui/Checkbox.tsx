import { forwardRef, type InputHTMLAttributes } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & { label?: string };

export const Checkbox = forwardRef<HTMLInputElement, Props>(
  ({ label, id, className, ...props }, ref) => {
    const input = (
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className={[
          "h-4 w-4 rounded border-border accent-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...props}
      />
    );
    if (!label) return input;
    return (
      <label htmlFor={id} className="flex items-center gap-2 text-sm text-foreground">
        {input}
        {label}
      </label>
    );
  },
);
Checkbox.displayName = "Checkbox";
