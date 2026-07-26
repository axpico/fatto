"use client";

import { useRef, type KeyboardEvent } from "react";
import { pillButtonClasses } from "@/components/ui/Badge";

export type Tab = { value: string; label: string };

type Props = {
  tabs: Tab[];
  value: string;
  onChange: (value: string) => void;
  "aria-label"?: string;
};

export function Tabs({ tabs, value, onChange, ...rest }: Props) {
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const idx = tabs.findIndex((t) => t.value === value);
    let nextIdx = idx;
    if (e.key === "ArrowRight") nextIdx = (idx + 1) % tabs.length;
    else if (e.key === "ArrowLeft") nextIdx = (idx - 1 + tabs.length) % tabs.length;
    else if (e.key === "Home") nextIdx = 0;
    else if (e.key === "End") nextIdx = tabs.length - 1;
    else return;
    e.preventDefault();
    onChange(tabs[nextIdx].value);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[nextIdx]?.focus();
  }

  return (
    <div ref={listRef} role="tablist" className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" onKeyDown={onKeyDown} {...rest}>
      {tabs.map((tab) => {
        const selected = tab.value === value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            id={`tab-${tab.value}`}
            aria-selected={selected}
            aria-controls={`panel-${tab.value}`}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.value)}
            className={pillButtonClasses(selected)}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
