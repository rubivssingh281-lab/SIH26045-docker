import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { RegulatoryAssessment, RegulatoryRouteItem } from "@/types";

function tone(status: RegulatoryRouteItem["status"]): "success" | "gold" | "danger" | "navy" {
  if (status === "APPLICABLE") return "success";
  if (status === "CONDITIONAL" || status === "REVIEW") return "gold";
  return "navy";
}

function RouteRow({ item }: { item: RegulatoryRouteItem }) {
  return <div className="rounded-lg border border-line bg-white p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <p className="font-bold">{item.title}</p><Badge tone={tone(item.status)}>{item.status.replace("_", " ")}</Badge>
    </div>
    <p className="mt-2 text-sm leading-6 text-ink/70">{item.details}</p>
    {item.authority && <p className="mt-2 text-xs font-semibold text-navy">Authority: {item.authority}</p>}
    {item.citation && <p className="mt-1 text-xs text-ink/50">Citation: {item.citation}</p>}
  </div>;
}

export function RegulatoryPathway({ assessment }: { assessment: RegulatoryAssessment }) {
  return <div className="space-y-6">
    <Card className="botanical p-7"><div className="relative z-10">
      <p className="eyebrow">Regulatory route</p>
      <h2 className="serif mt-2 text-4xl text-forest">Applicable regulatory pathway</h2>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-line bg-white p-4"><p className="eyebrow">Applicable Act</p><p className="mt-2 text-lg font-bold text-navy">{assessment.applicable_act}</p></div>
        <div className="rounded-lg border border-line bg-white p-4"><p className="eyebrow">Licensing / market route</p><p className="mt-2 text-lg font-bold text-navy">{assessment.licensing_route}</p></div>
      </div>
    </div></Card>
    <Card className="p-6"><p className="eyebrow">Route obligations</p><h3 className="serif mt-1 text-2xl text-forest">Which route applies</h3><div className="mt-5 space-y-3">{assessment.route_items.length ? assessment.route_items.map((x,i)=><RouteRow item={x} key={`${x.title}-${i}`} />) : <p className="text-sm text-ink/60">No route items were returned by the backend.</p>}</div></Card>
    <div className="grid gap-6 lg:grid-cols-2">
      <Card className="p-6"><p className="eyebrow">Advertising & claims</p><h3 className="serif mt-1 text-2xl text-forest">Claim restrictions</h3><div className="mt-5 space-y-3">{assessment.claim_restrictions.map((x,i)=><RouteRow item={x} key={`${x.title}-${i}`} />)}</div></Card>
      <Card className="p-6"><p className="eyebrow">Labelling</p><h3 className="serif mt-1 text-2xl text-forest">Label requirements</h3><div className="mt-5 space-y-3">{assessment.labelling_requirements.map((x,i)=><RouteRow item={x} key={`${x.title}-${i}`} />)}</div></Card>
    </div>
  </div>;
}
