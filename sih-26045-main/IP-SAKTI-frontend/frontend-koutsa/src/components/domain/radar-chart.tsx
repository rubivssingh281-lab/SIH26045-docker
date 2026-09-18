"use client";

import { useMemo } from "react";

export interface RadarSeries {
  label: string;
  color: string;
  values: number[]; // aligned to `axes`, each 0..max
}

interface RadarChartProps {
  axes: string[];
  series: RadarSeries[];
  max?: number;
  ticks?: number[];
  size?: number;
  showValues?: boolean;
}

export function RadarChart({
  axes,
  series,
  max = 1,
  ticks = [0.2, 0.4, 0.6, 0.8, 1.0],
  size = 380,
  showValues = true,
}: RadarChartProps) {
  const pad = 74;
  const W = size + pad * 2;
  const H = size + pad * 2;
  const cx = W / 2;
  const cy = H / 2;
  const R = size / 2;
  const N = Math.max(1, axes.length);

  const geom = useMemo(() => {
    const angleFor = (i: number) => (i / N) * Math.PI * 2 - Math.PI / 2;
    const point = (i: number, value: number) => {
      const r = (Math.max(0, Math.min(max, value)) / max) * R;
      const a = angleFor(i);
      return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a), a };
    };
    return { angleFor, point };
  }, [N, R, cx, cy, max]);

  const ringPoints = (t: number) =>
    axes.map((_, i) => geom.point(i, t * max)).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  const seriesPoints = (values: number[]) =>
    axes.map((_, i) => geom.point(i, values[i] ?? 0)).map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");

  return (
    <div className="w-full">
      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto w-full" style={{ maxWidth: W }} role="img" aria-label="Coverage radar chart">
          {/* concentric grid rings */}
          {ticks.map((t, i) => (
            <polygon key={i} points={ringPoints(t)} fill={i === ticks.length - 1 ? "#F8FAFC" : "none"}
              stroke="#D9E1EC" strokeWidth={0.8} />
          ))}
          {/* spokes + axis labels */}
          {axes.map((axis, i) => {
            const outer = geom.point(i, max);
            const lbl = geom.point(i, max * 1.16);
            const anchor = Math.abs(Math.cos(geom.angleFor(i))) < 0.3 ? "middle" : (Math.cos(geom.angleFor(i)) > 0 ? "start" : "end");
            return (
              <g key={axis}>
                <line x1={cx} y1={cy} x2={outer.x} y2={outer.y} stroke="#D9E1EC" strokeWidth={0.8} />
                <text x={lbl.x} y={lbl.y} textAnchor={anchor} dominantBaseline="middle"
                  className="fill-navy" style={{ fontSize: 12, fontWeight: 700 }}>{axis}</text>
              </g>
            );
          })}
          {/* radial tick value labels along the top spoke */}
          {ticks.map((t, i) => {
            const p = geom.point(0, t * max);
            return <text key={i} x={p.x + 4} y={p.y - 2} className="fill-ink/45" style={{ fontSize: 9 }}>{(t * max).toFixed(2)}</text>;
          })}
          {/* series polygons */}
          {series.map((s, si) => (
            <polygon key={si} points={seriesPoints(s.values)} fill={s.color} fillOpacity={0.12}
              stroke={s.color} strokeWidth={2} strokeLinejoin="round" />
          ))}
          {/* series vertices + optional value labels */}
          {series.map((s, si) =>
            axes.map((_, i) => {
              const p = geom.point(i, s.values[i] ?? 0);
              return (
                <g key={`${si}-${i}`}>
                  <circle cx={p.x} cy={p.y} r={2.6} fill={s.color} />
                  {showValues && series.length <= 4 && (
                    <text x={p.x} y={p.y - 6 - si * 10} textAnchor="middle" fill={s.color}
                      style={{ fontSize: 9, fontWeight: 700 }}>{(s.values[i] ?? 0).toFixed(2)}</text>
                  )}
                </g>
              );
            })
          )}
        </svg>
      </div>
      {/* legend */}
      <div className="mt-2 flex flex-wrap justify-center gap-x-5 gap-y-1.5">
        {series.map((s, i) => (
          <span key={i} className="flex items-center gap-1.5 text-xs font-semibold text-ink/70">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: s.color }} /> {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}
