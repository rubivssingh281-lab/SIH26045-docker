import { cn } from "@/lib/utils";

export function Badge({ className, tone = "default", ...props }: React.HTMLAttributes<HTMLSpanElement> & { tone?: "default" | "success" | "gold" | "danger" | "navy" }) {
  const tones = {
    default: "bg-mist text-navy",
    success: "bg-[#E4F5EF] text-forest",
    gold: "bg-[#FFF0D3] text-[#624000]",
    danger: "bg-[#FFE4E1] text-[#93000A]",
    navy: "bg-[#E7EDF5] text-navy"
  };
  return <span className={cn("inline-flex rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide", tones[tone], className)} {...props} />;
}