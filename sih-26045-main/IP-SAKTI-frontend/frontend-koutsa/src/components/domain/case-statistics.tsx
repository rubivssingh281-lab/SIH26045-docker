"use client";

import { BarChart3, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import type { CaseStatistics } from "@/hooks/queries/use-statistics";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useLanguage } from "@/components/providers/language-provider";

const chartColors = ["#123C32", "#176B5B", "#172A46", "#C58B2A"];

function MetricCard({
  label,
  value,
  helper,
  icon: Icon,
  loading,
  tone = "forest"
}: {
  label: string;
  value: number;
  helper: string;
  icon: typeof BarChart3;
  loading: boolean;
  tone?: "forest" | "emerald" | "navy" | "gold";
}) {
  const tones = {
    forest: "bg-[#E7F1ED] text-forest",
    emerald: "bg-[#E5F5F1] text-emerald",
    navy: "bg-[#E8EEF7] text-navy",
    gold: "bg-[#FFF1D9] text-gold"
  };

  return (
    <Card className="p-5 transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="eyebrow line-clamp-1">{label}</p>
          {loading ? <Skeleton className="mt-2 h-10 w-16" /> : <p className="serif mt-1 text-3xl text-forest">{value}</p>}
          <p className="mt-1 text-xs leading-5 text-ink/55 line-clamp-2">{helper}</p>
        </div>
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${tones[tone]}`}>
          <Icon size={19} strokeWidth={1.8} />
        </div>
      </div>
    </Card>
  );
}

export function CaseStatisticsCards({ statistics, isLoading }: { statistics: CaseStatistics; isLoading: boolean }) {
  const { t } = useLanguage();
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <MetricCard label={t("dashboard.cases_analyzed")} value={statistics.totalCasesAnalyzed} helper={t("dashboard.stat_analyzed_desc")} icon={BarChart3} loading={isLoading} tone="forest" />
      <MetricCard label={t("dashboard.pending")} value={statistics.pending} helper={t("dashboard.stat_pending_desc")} icon={Clock3} loading={isLoading} tone="navy" />
      <MetricCard label={t("dashboard.complete")} value={statistics.complete} helper={t("dashboard.stat_complete_desc")} icon={CheckCircle2} loading={isLoading} tone="emerald" />
      <MetricCard label={t("dashboard.escalated")} value={statistics.escalated} helper={t("dashboard.stat_escalated_desc")} icon={ShieldAlert} loading={isLoading} tone="gold" />
    </div>
  );
}

export function ClassificationPieChart({ statistics, isLoading }: { statistics: CaseStatistics; isLoading: boolean }) {
  const { t } = useLanguage();
  const rawData = statistics.classification;
  const data = rawData.map(d => ({ ...d, name: t(d.name) }));
  const hasData = data.some(item => item.value > 0);

  return (
    <Card className="p-6">
      <div>
        <p className="eyebrow">{t("dashboard.classification_mix")}</p>
        <h2 className="serif mt-1 text-2xl text-forest">{t("dashboard.formulation_assessments")}</h2>
        <p className="mt-1 text-sm text-ink/55">{t("dashboard.classification_desc")}</p>
      </div>

      <div className="mt-4 h-[250px] w-full">
        {isLoading ? (
          <div className="flex h-full items-center justify-center"><Skeleton className="h-40 w-40 rounded-full" /></div>
        ) : !hasData ? (
          <div className="flex h-full items-center justify-center text-center text-sm text-ink/50">{t("dashboard.no_classification_data")}</div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="48%"
                innerRadius={55}
                outerRadius={88}
                paddingAngle={3}
                stroke="#FFFFFF"
                strokeWidth={2}
              >
                {data.map((entry, index) => (
                  <Cell key={`${entry.name}-${index}`} fill={chartColors[index % chartColors.length]} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value, name) => [value, name]}
                contentStyle={{ borderRadius: 10, border: "1px solid #E4E7EB", background: "#FFFFFF", boxShadow: "0 4px 20px rgba(23, 42, 70, 0.08)" }}
              />
              <Legend iconType="circle" verticalAlign="bottom" height={38} wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </Card>
  );
}
