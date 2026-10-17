"use client";

import { useEffect, useState } from "react";
import { Globe2, LogOut, Save, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers";
import { useLanguage } from "@/components/providers/language-provider";
import { authApi, getApiErrorMessage } from "@/lib/api";
import { PageHeader } from "@/components/domain/page-header";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Jurisdiction } from "@/types";
import { toast } from "sonner";

export default function ProfilePage() {
  const router = useRouter();
  const { user, setSession, clearSession } = useAuth();
  const { t } = useLanguage();
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>(user?.default_jurisdiction || "INDIA");
  const [firstName, setFirstName] = useState(user?.first_name || "");
  const [lastName, setLastName] = useState(user?.last_name || "");
  const [role, setRole] = useState(user?.role || "");
  const [address, setAddress] = useState(user?.address || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => { 
    setJurisdiction(user?.default_jurisdiction || "INDIA"); 
    setFirstName(user?.first_name || "");
    setLastName(user?.last_name || "");
    setRole(user?.role || "");
    setAddress(user?.address || "");
  }, [user]);

  async function save() {
    setSaving(true);     try {
      const updated = await authApi.updateProfile({ 
        default_jurisdiction: jurisdiction,
        first_name: firstName,
        last_name: lastName,
        role,
        address
      });
      const token = localStorage.getItem("ip-sakti-token");
      if (token) setSession(token, updated);
      toast.success(t("profile.preferences_saved"), { description: t("profile.preferences_saved_desc") });
    } catch (err) {
      toast.error(t("profile.preferences_error"), { description: getApiErrorMessage(err, t("profile.preferences_error_desc")) });
    } finally { setSaving(false); }
  }

  function logout() { clearSession(); router.push("/auth/login"); }

  return (
    <div>
      <PageHeader title={t("profile.title")} description={t("profile.description")} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <Card className="p-7">
          <div className="flex items-start gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-mist text-navy"><ShieldCheck size={22}/></div><div><p className="eyebrow">{t("profile.account")}</p><h2 className="serif mt-1 text-2xl text-forest">{t("profile.research_identity")}</h2></div></div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="eyebrow block">{t("common.first_name", "First Name")}</label>
              <Input value={firstName} onChange={e => setFirstName(e.target.value)} placeholder={t("common.placeholder_first_name", "e.g. Aditi")} />
            </div>
            <div className="space-y-2">
              <label className="eyebrow block">{t("common.last_name", "Last Name")}</label>
              <Input value={lastName} onChange={e => setLastName(e.target.value)} placeholder={t("common.placeholder_last_name", "e.g. Sharma")} />
            </div>
            <div className="space-y-2">
              <label className="eyebrow block">{t("common.job_role", "Job Role")}</label>
              <Input value={role} onChange={e => setRole(e.target.value)} placeholder={t("common.placeholder_job_role", "e.g. Lead Researcher")} />
            </div>
            <div className="space-y-2">
              <label className="eyebrow block">{t("common.email_address", "Email Address (Read-only)")}</label>
              <Input value={user?.email || ""} disabled className="bg-mist text-ink/70" />
            </div>
            <div className="sm:col-span-2 space-y-2">
              <label className="eyebrow block">{t("common.physical_address", "Physical Address")}</label>
              <Input value={address} onChange={e => setAddress(e.target.value)} placeholder={t("common.placeholder_address", "e.g. 123 Research Park, New Delhi")} />
            </div>
          </div>
          <div className="mt-6 rounded-lg border border-line p-5"><div className="flex items-center gap-3"><Globe2 size={20} className="text-navy"/><div><p className="font-bold">{t("profile.default_jurisdiction")}</p><p className="mt-1 text-xs text-ink/55">{t("profile.jurisdiction_desc")}</p></div></div><div className="mt-5 grid gap-3">{(["INDIA"] as Jurisdiction[]).map(item=><button key={item} type="button" onClick={()=>setJurisdiction(item)} className={`rounded-lg border px-4 py-3 text-left text-sm font-bold ${jurisdiction===item?"border-forest bg-[#E9F3F0] text-forest":"border-line bg-white text-ink/65"}`}>{item === "INDIA" ? t("profile.india") : t("profile.international")}</button>)}</div></div>
          <div className="mt-6 flex flex-wrap gap-3"><Button onClick={save} disabled={saving}><Save size={16}/>{saving?t("profile.saving"):t("profile.save_preferences")}</Button><Button variant="secondary" onClick={logout}><LogOut size={16}/> {t("profile.sign_out")}</Button></div>
        </Card>
        <Card className="p-6"><p className="eyebrow">{t("profile.security")}</p><h2 className="serif mt-1 text-2xl text-forest">{t("profile.authenticated_workspace")}</h2><p className="mt-3 text-sm leading-6 text-ink/65">{t("profile.security_desc")}</p></Card>
      </div>
    </div>
  );
}
