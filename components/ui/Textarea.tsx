import { forwardRef, type TextareaHTMLAttributes } from "react";
import { inputClasses } from "@/components/ui/Input";

type Props = TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, Props>(
  ({ label, id, className, ...props }, ref) => {
    const textarea = (
      <textarea ref={ref} id={id} className={[inputClasses, className].filter(Boolean).join(" ")} {...props} />
    );
    if (!label) return textarea;
    return (
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-medium">
          {label}
        </label>
        {textarea}
      </div>
    );
  },
);
Textarea.displayName = "Textarea";
