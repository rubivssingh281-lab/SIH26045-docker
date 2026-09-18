import { cn } from "@/lib/utils";

export const Textarea = ({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea className={cn("min-h-32 w-full rounded-control border border-line bg-white px-3 py-3 text-sm outline-none placeholder:text-ink/40 focus:border-emerald focus:ring-2 focus:ring-emerald/10", className)} {...props} />
);