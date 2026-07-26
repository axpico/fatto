import { forwardRef, type SelectHTMLAttributes } from "react";
import { inputClasses } from "@/components/ui/Input";

type Props = SelectHTMLAttributes<HTMLSelectElement> & { label?: string };

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, id, className, children, ...props }, ref) => {
    const select = (
      <select ref={ref} id={id} className={[inputClasses, "w-full", className].filter(Boolean).join(" ")} {...props}>
        {children}
      </select>
    );
    if (!label) return select;
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
        </label>
        {select}
      </div>
    );
  },
);
Select.displayName = "Select";
