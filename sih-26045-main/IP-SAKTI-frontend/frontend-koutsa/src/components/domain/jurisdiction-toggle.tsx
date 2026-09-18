"use client";

import type { Jurisdiction } from "@/types";
import { cn } from "@/lib/utils";

export function JurisdictionToggle({ value, onChange }: { value: Jurisdiction; onChange: (value: Jurisdiction) => void }) {
  return (
    <div className="inline-flex rounded-control border border-line bg-white p-1" role="group" aria-label="Jurisdiction">
      {(["INDIA"] as const).map(item => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn("rounded-[6px] px-4 py-2 text-xs font-bold transition", value === item ? "bg-forest text-white" : "text-navy hover:bg-mist")}
        >
          {item === "INDIA" ? "India" : "International"}
        </button>
      ))}
    </div>
  );
}