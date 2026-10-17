"use client";

import { useMemo, useState } from "react";
import type { GraphData, GraphNode } from "@/types";
import { useLanguage } from "@/components/providers/language-provider";
import { cn } from "@/lib/utils";

const TYPE_COLOR: Record<string, string> = {
  Jurisdiction: "#0E4B3D",
  FormulationCategory: "#1F9D6B",
  IPType: "#2563EB",
  Statute: "#7C3AED",
  Concept: "#0E7490",
  Obligation: "#B45309",
  Treaty: "#BE185D",
};

function colorFor(type: string) {
  return TYPE_COLOR[type] ?? "#64748B";
}

export function KnowledgeGraphView({ data, height = 520 }: { data: GraphData; height?: number }) {
  const { t } = useLanguage();
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [hover, setHover] = useState<string | null>(null);

  const W = 880;
  const H = height;
  const cx = W / 2;
  const cy = H / 2;
  const R = Math.min(W, H) / 2 - 120;

  const { positioned, edges, types } = useMemo(() => {
    const nodes = [...data.nodes].sort((a, b) => a.type.localeCompare(b.type) || a.label.localeCompare(b.label));
    const n = Math.max(1, nodes.length);
    const pos = new Map<string, { x: number; y: number; node: GraphNode; angle: number }>();
    nodes.forEach((node, i) => {
      const angle = (i / n) * Math.PI * 2 - Math.PI / 2;
      pos.set(node.id, { x: cx + R * Math.cos(angle), y: cy + R * Math.sin(angle), node, angle });
    });
    const es = data.edges.filter(e => pos.has(e.source) && pos.has(e.target));
    const ts = Array.from(new Set(nodes.map(n2 => n2.type)));
    return { positioned: pos, edges: es, types: ts };
  }, [data, cx, cy, R]);

  const neighborIds = useMemo(() => {
    if (!hover && !selected) return null;
    const id = hover ?? selected?.id;
    const set = new Set<string>([id!]);
    edges.forEach(e => {
      if (e.source === id) set.add(e.target);
      if (e.target === id) set.add(e.source);
    });
    return set;
  }, [hover, selected, edges]);

  const isActive = (id: string) => !neighborIds || neighborIds.has(id);

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
      <div className="overflow-x-auto rounded-card border border-line bg-[#FBFCFE]">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 560 }} role="img" aria-label={t("reasoning.graph", "Knowledge graph")}>
          {edges.map((e, i) => {
            const a = positioned.get(e.source)!;
            const b = positioned.get(e.target)!;
            const active = isActive(e.source) && isActive(e.target);
            return (
              <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y}
                stroke={active ? "#94A3B8" : "#E2E8F0"} strokeWidth={active ? 1.2 : 0.6}
                opacity={active ? 0.9 : 0.4} />
            );
          })}
          {Array.from(positioned.values()).map(({ x, y, node, angle }) => {
            const active = isActive(node.id);
            const right = Math.cos(angle) >= 0;
            return (
              <g key={node.id} className="cursor-pointer" opacity={active ? 1 : 0.3}
                onMouseEnter={() => setHover(node.id)} onMouseLeave={() => setHover(null)}
                onClick={() => setSelected(node)}>
                <title>{`${t(node.label)} — ${node.citation ? t(node.citation) : t(node.type)}`}</title>
                <circle cx={x} cy={y} r={selected?.id === node.id ? 9 : 6} fill={colorFor(node.type)}
                  stroke="#fff" strokeWidth={1.5} />
                <text x={right ? x + 10 : x - 10} y={y + 3} textAnchor={right ? "start" : "end"}
                  className="fill-ink" style={{ fontSize: 10, fontWeight: 600 }}>
                  {t(node.label).length > 26 ? t(node.label).slice(0, 25) + "…" : t(node.label)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      <div className="space-y-4">
        <div className="rounded-card border border-line bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">{t("graph.legend", "Legend")}</p>
          <ul className="mt-2 space-y-1.5">
            {types.map(tType => (
              <li key={tType} className="flex items-center gap-2 text-xs text-ink/70">
                <span className="inline-block h-3 w-3 rounded-full" style={{ background: colorFor(tType) }} /> {t(tType)}
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-card border border-line bg-white p-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">{t("graph.node_details", "Node details")}</p>
          {selected ? (
            <div className="mt-2">
              <p className="text-sm font-bold text-navy">{t(selected.label)}</p>
              <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: colorFor(selected.type) }}>{t(selected.type)}</span>
              {selected.summary && <p className="mt-2 text-xs leading-5 text-ink/70">{t(selected.summary)}</p>}
              {selected.citation && <p className="mt-2 text-xs text-ink/55"><span className="font-semibold">{t("graph.source", "Source")}:</span> {t(selected.citation)}</p>}
              {selected.url?.startsWith("http") && <a href={selected.url} target="_blank" rel="noopener noreferrer" className="mt-1 inline-block text-xs font-bold text-gold hover:underline">{t("graph.open_official", "Open official source")}</a>}
            </div>
          ) : (
            <p className="mt-2 text-xs text-ink/50">{t("graph.hover_hint", "Hover to highlight links; click a node to see its source citation.")}</p>
          )}
        </div>
      </div>
    </div>
  );
}
