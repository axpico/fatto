import { forwardRef, type TextareaHTMLAttributes } from "react";
import { inputClasses } from "@/components/ui/Input";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, id, className, ...props }, ref) => {
    const textarea = (
      <textarea ref={ref} id={id} className={[inputClasses, "w-full", className].filter(Boolean).join(" ")} {...props} />
    );
    if (!label) return textarea;
    return (
      <div className="space-y-1.5">
        <label htmlFor={id} className="block text-sm font-medium text-foreground">
          {label}
        </label>
        {textarea}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
