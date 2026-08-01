import type { LucideIcon } from "lucide-react";

type Size = "sm" | "lg";

const wrapClasses: Record<Size, string> = {
  sm: "mb-3 flex items-center gap-2",
  lg: "mb-5 flex items-start gap-3",
};
const iconWrapClasses: Record<Size, string> = {
  sm: "flex h-9 w-9 items-center justify-center rounded-lg bg-accent text-primary",
  lg: "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent text-primary",
};
const iconGlyphClasses: Record<Size, string> = {
  sm: "h-4 w-4",
  lg: "h-5 w-5",
};
const titleClasses: Record<Size, string> = {
  sm: "font-medium text-foreground",
  lg: "font-display text-xl font-semibold text-foreground",
};
const descriptionClasses: Record<Size, string> = {
  sm: "text-sm text-muted-foreground",
  lg: "mt-1 text-sm leading-6 text-muted-foreground",
};

// Icona + titolo + sottotitolo ripetuto identico su Home/Search/Import: un solo posto da cui cambiare tono/spaziatura.
export function SectionIntro({
  icon: Icon,
  title,
  description,
  size = "sm",
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  size?: Size;
}) {
  return (
    <div className={wrapClasses[size]}>
      <span className={iconWrapClasses[size]}>
        <Icon className={iconGlyphClasses[size]} aria-hidden="true" />
      </span>
      <div>
        <h2 className={titleClasses[size]}>{title}</h2>
        <p className={descriptionClasses[size]}>{description}</p>
      </div>
    </div>
  );
}
