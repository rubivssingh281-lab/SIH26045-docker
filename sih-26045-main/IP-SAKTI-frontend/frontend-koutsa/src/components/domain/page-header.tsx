import Link from "next/link";
import { ChevronRight } from "lucide-react";

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="mb-7 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
      <div>
        {eyebrow && <p className="eyebrow mb-2">{eyebrow}</p>}
        <h1 className="serif text-4xl leading-tight text-forest md:text-[48px]">{title}</h1>
        {description && <p className="mt-2 max-w-3xl text-base leading-7 text-ink/65">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function Breadcrumb({ items }: { items: Array<{ label: string; href?: string }> }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-1.5 text-xs font-semibold text-ink/55">
      {items.map((item, index) => (
        <span key={`${item.label}-${index}`} className="flex items-center gap-1.5">
          {item.href ? <Link href={item.href} className="hover:text-forest">{item.label}</Link> : <span className="text-ink">{item.label}</span>}
          {index < items.length - 1 && <ChevronRight size={13} />}
        </span>
      ))}
    </div>
  );
}