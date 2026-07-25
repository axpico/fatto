import { forwardRef, type SelectHTMLAttributes } from "react";
import { inputClasses } from "@/components/ui/Input";

type Props = SelectHTMLAttributes<HTMLSelectElement> & { label?: string };

export const Select = forwardRef<HTMLSelectElement, Props>(
  ({ label, id, className, children, ...props }, ref) => {
    const select = (
      <select ref={ref} id={id} className={[inputClasses, className].filter(Boolean).join(" ")} {...props}>
        {children}
      </select>
    );
    if (!label) return select;
    return (
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-medium">
          {label}
        </label>
        {select}
      </div>
    );
  },
);
Select.displayName = "Select";
