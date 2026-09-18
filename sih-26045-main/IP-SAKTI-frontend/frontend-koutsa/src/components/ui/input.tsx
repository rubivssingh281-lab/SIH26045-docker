import { forwardRef } from "react";
import { cn } from "@/lib/utils";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input ref={ref} className={cn("h-11 w-full rounded-control border border-line bg-white px-3 text-sm outline-none placeholder:text-ink/40 focus:border-emerald focus:ring-2 focus:ring-emerald/10", className)} {...props} />
  )
);
Input.displayName = "Input";
