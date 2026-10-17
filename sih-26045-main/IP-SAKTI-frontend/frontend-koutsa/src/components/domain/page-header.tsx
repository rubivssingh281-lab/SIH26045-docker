import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-3.5 sm:mb-6 flex flex-col gap-2.5 sm:gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && <p className="eyebrow mb-1 sm:mb-2 text-[10px] sm:text-[11px]">{eyebrow}</p>}
        <h1 className="serif text-2xl sm:text-3xl md:text-[42px] leading-tight text-forest break-words">{title}</h1>
        {description && <p className="mt-1 sm:mt-2 max-w-3xl text-xs sm:text-sm md:text-base leading-relaxed text-ink/65 line-clamp-2 sm:line-clamp-none">{description}</p>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2 shrink-0">{action}</div>}
    </div>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <div className="mb-2 sm:mb-4 flex flex-wrap items-center gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-semibold text-ink/55">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1 sm:gap-1.5">
          {item.href ? <Link href={item.href} className="hover:text-forest transition-colors">{item.label}</Link> : <span className="text-ink">{item.label}</span>}
          {index < items.length - 1 && <ChevronRight size={12} className="text-ink/40" />}
        </span>
      ))}
    </div>
  );
}