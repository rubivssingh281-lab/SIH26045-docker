"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, Loader2, Plug, ShieldCheck, Trash2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { PageHeader } from "@/components/domain/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/components/providers/language-provider";
import { connectorsApi, getApiErrorMessage } from "@/lib/api";
import type { Connector, ConnectorAuditEvent } from "@/types";

export default function ConnectorsPage() {
  const { t } = useLanguage();
  const [providers, setProviders] = useState<string[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [audit, setAudit] = useState<ConnectorAuditEvent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);

  const [form, setForm] = useState({ name: "", provider: "Custom REST API", base_url: "", api_key: "", auth_type: "bearer", header_name: "Authorization", consent: false });
  const set = (patch: Partial<typeof form>) => setForm(f => ({ ...f, ...patch }));

  const refresh = async () => {
    try {
      const [c, a] = await Promise.all([connectorsApi.list(), connectorsApi.audit()]);
      setConnectors(c); setAudit(a);
    } catch { /* keep prior state */ }
  };

  useEffect(() => {
    connectorsApi.providers().then(setProviders).catch(() => setProviders(["Custom REST API"]));
    refresh();
  }, []);

  const add = async () => {
    if (!form.name.trim() || !form.base_url.trim() || !form.api_key.trim()) { toast.error(t("connectors.fill_required")); return; }
    if (!form.consent) { toast.error(t("connectors.need_consent")); return; }
    setBusy("add");
    try {
      await connectorsApi.add(form);
      toast.success(t("connectors.added"));
      setForm({ name: "", provider: form.provider, base_url: "", api_key: "", auth_type: "bearer", header_name: "Authorization", consent: false });
      await refresh();
    } catch (err) { toast.error(getApiErrorMessage(err, t("connectors.error"))); }
    finally { setBusy(null); }
  };

  const test = async (id: string) => {
    setBusy(id);
    try {
      const r = await connectorsApi.test(id);
      r.ok ? toast.success(`${t("connectors.reachable")} (${r.detail})`) : toast.error(`${t("connectors.unreachable")}: ${r.detail}`);
      await refresh();
    } catch (err) { toast.error(getApiErrorMessage(err, t("connectors.error"))); }
    finally { setBusy(null); }
  };

  const toggle = async (c: Connector) => { setBusy(c.id); try { await connectorsApi.toggle(c.id, !c.enabled); await refresh(); } finally { setBusy(null); } };
  const remove = async (id: string) => { setBusy(id); try { await connectorsApi.remove(id); await refresh(); } finally { setBusy(null); } };

  return (
    <div>
      <PageHeader eyebrow={t("connectors.eyebrow")} title={t("connectors.title")} description={t("connectors.description")} />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          {/* Add form */}
          <Card className="p-6">
            <h2 className="serif text-lg text-forest">{t("connectors.add_title")}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div><label className="text-xs font-bold text-navy">{t("connectors.name")}</label><Input className="mt-1" value={form.name} onChange={e => set({ name: e.target.value })} placeholder={t("connectors.name_placeholder", "My WIPO subscription")} /></div>
              <div>
                <label className="text-xs font-bold text-navy">{t("connectors.provider")}</label>
                <select className="mt-1 h-11 w-full rounded-control border border-line bg-white px-3 text-sm" value={form.provider} onChange={e => set({ provider: e.target.value })}>
                  {providers.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div className="sm:col-span-2"><label className="text-xs font-bold text-navy">{t("connectors.base_url")}</label><Input className="mt-1" value={form.base_url} onChange={e => set({ base_url: e.target.value })} placeholder="https://api.provider.com/v1/search" /></div>
              <div>
                <label className="text-xs font-bold text-navy">{t("connectors.auth_type")}</label>
                <select className="mt-1 h-11 w-full rounded-control border border-line bg-white px-3 text-sm" value={form.auth_type}
                  onChange={e => set({ auth_type: e.target.value, header_name: e.target.value === "bearer" ? "Authorization" : "X-API-Key" })}>
                  <option value="bearer">{t("connectors.bearer_token", "Bearer token")}</option>
                  <option value="header">{t("connectors.apikey_header", "API-key header")}</option>
                </select>
              </div>
              <div><label className="text-xs font-bold text-navy">{t("connectors.header_name")}</label><Input className="mt-1" value={form.header_name} onChange={e => set({ header_name: e.target.value })} /></div>
              <div className="sm:col-span-2"><label className="text-xs font-bold text-navy">{t("connectors.api_key")}</label><Input type="password" className="mt-1" value={form.api_key} onChange={e => set({ api_key: e.target.value })} placeholder={t("connectors.key_placeholder", "paste your key — stored locally, masked")} /></div>
            </div>
            <label className="mt-4 flex items-start gap-2 rounded-control border border-line bg-[#F3F7FC] p-3 text-xs leading-5 text-ink/70">
              <input type="checkbox" className="mt-0.5" checked={form.consent} onChange={e => set({ consent: e.target.checked })} />
              {t("connectors.consent_label")}
            </label>
            <div className="mt-4"><Button onClick={add} disabled={busy === "add"}>{busy === "add" ? <Loader2 size={16} className="animate-spin" /> : <Plug size={16} />} {t("connectors.add_button")}</Button></div>
          </Card>

          {/* Connected sources */}
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-[#F3F7FC] px-6 py-4"><h2 className="serif text-lg text-forest">{t("connectors.connected")}</h2></div>
            {connectors.length === 0 ? (
              <p className="p-6 text-sm text-ink/55">{t("connectors.none")}</p>
            ) : (
              <ul className="divide-y divide-line">
                {connectors.map(c => (
                  <li key={c.id} className="p-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-navy">{c.name}</span>
                      <Badge tone="navy">{c.provider}</Badge>
                      {c.enabled ? <Badge tone="success">{t("connectors.enabled")}</Badge> : <Badge tone="default">{t("connectors.disabled")}</Badge>}
                      <div className="ml-auto flex items-center gap-2">
                        <Button variant="secondary" size="sm" onClick={() => test(c.id)} disabled={busy === c.id}>{busy === c.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />} {t("connectors.test")}</Button>
                        <Button variant="secondary" size="sm" onClick={() => toggle(c)} disabled={busy === c.id}>{c.enabled ? t("connectors.disable") : t("connectors.enable")}</Button>
                        <button onClick={() => remove(c.id)} disabled={busy === c.id} className="rounded-lg p-2 text-ink/40 hover:bg-mist hover:text-[#93000A]" aria-label={t("common.delete", "Delete")}><Trash2 size={15} /></button>
                      </div>
                    </div>
                    <p className="mt-1.5 text-xs text-ink/55">{c.base_url}</p>
                    <p className="mt-0.5 text-xs text-ink/45">{t("connectors.key")}: <span className="font-mono">{c.key_masked}</span> · {c.auth_type} · {c.header_name}</p>
                    {c.last_status && <p className="mt-1 flex items-center gap-1 text-xs text-ink/60">{c.last_status.startsWith("HTTP 2") ? <CheckCircle2 size={13} className="text-forest" /> : <XCircle size={13} className="text-[#93000A]" />} {t("connectors.last_test")}: {c.last_status}</p>}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        {/* Audit + privacy */}
        <div className="space-y-6">
          <Card className="p-5">
            <div className="flex items-center gap-2"><ShieldCheck size={16} className="text-forest" /><h2 className="serif text-lg text-forest">{t("connectors.privacy_title")}</h2></div>
            <p className="mt-2 text-xs leading-5 text-ink/65">{t("connectors.privacy_note")}</p>
          </Card>
          <Card className="overflow-hidden">
            <div className="border-b border-line bg-[#F3F7FC] px-5 py-3"><h2 className="text-sm font-bold text-navy">{t("connectors.audit")}</h2></div>
            {audit.length === 0 ? <p className="p-5 text-xs text-ink/50">{t("connectors.no_audit")}</p> : (
              <ul className="max-h-[420px] divide-y divide-line overflow-y-auto">
                {audit.map((e, i) => (
                  <li key={i} className="px-5 py-2.5 text-xs">
                    <span className="font-bold text-navy">{e.action}</span> · {e.connector}
                    {e.detail && <span className="text-ink/55"> — {e.detail}</span>}
                    <div className="text-[10px] text-ink/40">{new Date(e.time).toLocaleString()}</div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
