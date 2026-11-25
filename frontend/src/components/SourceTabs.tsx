import type { SourceMode } from "../types";

interface SourceTabsProps {
  mode: SourceMode;
  disabled: boolean;
  onChange: (mode: SourceMode) => void;
}

const TABS: { mode: SourceMode; label: string }[] = [
  { mode: "file", label: "Audio file" },
  { mode: "youtube", label: "YouTube link" },
];

export function SourceTabs({ mode, disabled, onChange }: SourceTabsProps) {
  return (
    <div className="flex gap-1 rounded-lg bg-zinc-900 p-1" role="tablist">
      {TABS.map((tab) => {
        const active = tab.mode === mode;
        return (
          <button
            key={tab.mode}
            role="tab"
            aria-selected={active}
            disabled={disabled}
            onClick={() => onChange(tab.mode)}
            className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
              active ? "bg-zinc-700 text-zinc-100" : "text-zinc-400 hover:text-zinc-200"
            } ${disabled ? "cursor-not-allowed" : ""}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
