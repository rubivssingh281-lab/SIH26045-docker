"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import {
  Bell, BookOpen, Boxes, Brain, ClipboardCheck, Database, FileText, Gavel, Globe2, Leaf,
  Menu, MessageSquare, Network, Plug, Plus, Search, Settings, ShieldCheck,
  UserCircle, X, PanelLeftClose, ChevronDown, Mail, LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Jurisdiction } from "@/types";
import { FloatingAIChat } from "@/components/domain/floating-ai-chat";
import { useLanguage, LANGUAGES, type Language } from "@/components/providers/language-provider";
import { useAuth } from "@/components/providers";

const primary = [
  { key: "dashboard", href: "/dashboard", label: "nav.dashboard", icon: Boxes },
  { key: "ask", href: "/cases/new?tool=ask", label: "nav.ask_sahayak", icon: MessageSquare },
  { key: "navigator", href: "/cases/new?tool=ip-navigator", label: "nav.ip_navigator", icon: Gavel },
  { key: "classifier", href: "/cases/new?tool=formulation-classifier", label: "nav.formulation_classifier", icon: ClipboardCheck },
  { key: "abs", href: "/cases/new?tool=abs", label: "nav.abs_compliance", icon: ShieldCheck },
  { key: "tkdl", href: "/cases/new?tool=tkdl", label: "nav.tkdl_prior_art", icon: FileText },
  { key: "regulatory", href: "/cases/new?tool=regulatory", label: "nav.regulatory_pathway", icon: Network },
  { key: "compare", href: "/compare", label: "nav.compare", icon: Globe2 },
  { key: "reasoning", href: "/reasoning", label: "nav.reasoning", icon: Brain },
  { key: "saved", href: "/archive", label: "nav.case_archive", icon: BookOpen },
  { key: "sources", href: "/sources", label: "nav.source_library", icon: Database },
  { key: "connectors", href: "/connectors", label: "nav.connectors", icon: Plug }
];

function getActiveKey(pathname: string, search: string) {
  const params = new URLSearchParams(search);
  const tool = params.get("tool");
  if (pathname === "/archive" || (pathname.startsWith("/cases/") && pathname !== "/cases/new")) return "saved";
  if (pathname === "/sources" || pathname.startsWith("/sources/")) return "sources";
  if (pathname === "/connectors") return "connectors";
  if (pathname === "/compare") return "compare";
  if (pathname === "/reasoning") return "reasoning";
  if (pathname === "/dashboard") return "dashboard";
    if (pathname === "/cases/new") {
    const mapping: Record<string, string> = {
      ask: "ask", "ip-navigator": "navigator", "formulation-classifier": "classifier",
      abs: "abs", tkdl: "tkdl", regulatory: "regulatory"
    };
    return mapping[tool ?? "ask"] ?? "ask";
  }
  return "";
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [preferencesOpen, setPreferencesOpen] = useState(false);
  const [jurisdiction, setJurisdiction] = useState<Jurisdiction>("INDIA");
  const [search, setSearch] = useState(searchParams.get("q") ?? "");
  const [languageOpen, setLanguageOpen] = useState(false);
  const [langQuery, setLangQuery] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const { language, setLanguage, t, isTranslating } = useLanguage();
  const { user, clearSession } = useAuth();
  const activeKey = getActiveKey(pathname, searchParams.toString());

  const profileRef = useRef<HTMLDivElement>(null);
  const languageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setProfileOpen(false);
      }
      if (languageRef.current && !languageRef.current.contains(event.target as Node)) {
        setLanguageOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const saved = window.localStorage.getItem("ip-sakti-jurisdiction") as Jurisdiction | null;
    if (saved === "INDIA" || saved === "INTERNATIONAL") setJurisdiction(saved);
  }, []);

  useEffect(() => {
    setSearch(searchParams.get("q") ?? "");
  }, [searchParams]);

  const sidebarWidth = collapsed ? "w-[82px]" : "w-[276px]";
  const contentPad = collapsed ? "lg:pl-[82px]" : "lg:pl-[276px]";

  const saveJurisdiction = (value: Jurisdiction) => {
    setJurisdiction(value);
    window.localStorage.setItem("ip-sakti-jurisdiction", value);
    window.dispatchEvent(new CustomEvent("ip-sakti-jurisdiction", { detail: value }));
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    const params = new URLSearchParams(searchParams.toString());
    if (value.trim()) params.set("q", value.trim());
    else params.delete("q");
    router.replace(`${pathname}${params.toString() ? `?${params}` : ""}`, { scroll: false });
  };

  const isAuthRoute = pathname.startsWith("/auth/");

  // Auth pages are standalone surfaces. They must not inherit the dashboard
  // sidebar/header shell and should own the entire browser viewport.
  if (isAuthRoute) return <>{children}</>;

  return (
    <div className="min-h-screen bg-canvas">
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-[#CCD4D0] bg-[#F7F9FF] py-5 transition-all duration-200 lg:translate-x-0",
        sidebarWidth,
        mobileOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className={cn("flex items-center px-4", collapsed ? "justify-center" : "justify-between")}>
          <Link href="/dashboard" className="flex items-center gap-3" onClick={() => setMobileOpen(false)} aria-label="Go to IP-SAKTI dashboard">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-forest text-white"><Leaf size={22} /></div>
            {!collapsed && <div>
              <div className="serif text-[22px] leading-none text-forest">IP-SAKTI</div>
              <div className="mt-1 text-xs font-semibold text-ink/65">Sahayak AI</div>
            </div>}
          </Link>
          <button className="rounded-lg p-2 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={19} /></button>
        </div>

        <div className="px-4">
          <Link href="/cases/new?tool=ask" onClick={() => setMobileOpen(false)} className={cn(
            "mt-8 flex h-12 items-center justify-center gap-2 rounded-lg bg-forest px-4 py-3 text-sm font-semibold text-white hover:bg-emerald",
            collapsed && "px-0"
          )}>
            <Plus size={18} /> {!collapsed && t("nav.new_query")}
          </Link>
        </div>

        <nav className="mt-7 space-y-1.5 px-4" aria-label="Primary navigation">
          {primary.map(item => {
            const Icon = item.icon;
            const active = activeKey === item.key;
            return (
              <Link key={item.key} href={item.href} onClick={() => setMobileOpen(false)} title={collapsed ? t(item.label) : undefined} className={cn(
                "flex items-center gap-4 rounded-lg px-3 py-3 text-sm font-semibold transition",
                collapsed && "justify-center px-0",
                active ? "bg-[#0E4B3D] text-white shadow-sm" : "text-ink hover:bg-[#EAF1F8]"
              )}>
                <Icon size={20} strokeWidth={1.7} />
                {!collapsed && t(item.label)}
              </Link>
            );
          })}
        </nav>

        <div className="mt-auto border-t border-[#CCD4D0] px-4 pt-4">
          <button onClick={() => setPreferencesOpen(v => !v)} className={cn("flex w-full items-center gap-4 rounded-lg px-3 py-3 text-sm font-semibold text-ink hover:bg-[#EAF1F8]", collapsed && "justify-center px-0")} title={collapsed ? t("nav.workspace_preferences") : undefined}>
            <Settings size={20} strokeWidth={1.7} /> {!collapsed && t("nav.workspace_preferences")}
          </button>
          <Link href="/profile" className={cn("flex w-full items-center gap-4 rounded-lg px-3 py-3 text-sm font-semibold text-ink hover:bg-[#EAF1F8]", collapsed && "justify-center px-0")} title={collapsed ? t("nav.research_profile") : undefined}>
            <UserCircle size={20} strokeWidth={1.7} /> {!collapsed && t("nav.research_profile")}
          </Link>
        </div>
      </aside>

      {mobileOpen && <button className="fixed inset-0 z-40 bg-navy/20 lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close menu overlay" />}

      {preferencesOpen && (
        <div className="fixed bottom-6 left-6 z-[60] w-[320px] rounded-card border border-line bg-white p-5 shadow-xl lg:left-[300px]">
          <div className="flex items-start justify-between gap-4">
            <div><p className="eyebrow">{t("common.workspace", "Workspace")}</p><h2 className="serif mt-1 text-2xl text-forest">{t("common.research_preferences", "Research preferences")}</h2></div>
            <button onClick={() => setPreferencesOpen(false)} className="rounded-lg p-1.5 hover:bg-mist" aria-label="Close preferences"><X size={17}/></button>
          </div>
          <p className="mt-3 text-xs leading-5 text-ink/60">{t("common.preferences_dialog_desc", "Your jurisdiction preference is reused when starting a new research case. It does not replace the case-level jurisdiction control.")}</p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {(["INDIA"] as Jurisdiction[]).map(item => (
              <button key={item} onClick={() => saveJurisdiction(item)} className={cn("rounded-control border px-3 py-2.5 text-xs font-bold", jurisdiction === item ? "border-forest bg-forest text-white" : "border-line bg-white text-navy")}>{item === "INDIA" ? t("common.india", "India") : t("common.international", "International")}</button>
            ))}
          </div>
        </div>
      )}

      <div className={contentPad}>
        <header className="sticky top-0 z-30 flex min-h-[69px] items-center gap-3 border-b border-[#CCD4D0] bg-[#EEF5FF]/95 px-[15px] backdrop-blur">
          <button className="rounded-lg p-2 lg:hidden" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={21} /></button>
          <button className="hidden rounded-lg p-2 text-ink hover:bg-white lg:block" onClick={() => setCollapsed(v => !v)} aria-label="Toggle sidebar"><PanelLeftClose size={19} /></button>
          <div className="serif hidden text-[26px] text-forest md:block">IP-SAKTI Sahayak</div>
          <div className="hidden h-full items-center gap-1 md:flex" role="group" aria-label="Global jurisdiction preference">
            {(["INDIA"] as Jurisdiction[]).map(item => (
              <button key={item} type="button" onClick={() => saveJurisdiction(item)} className={cn("rounded-lg px-3 py-2 text-sm font-semibold", jurisdiction === item ? "bg-white text-forest shadow-sm" : "text-ink/55 hover:bg-white/70")}>
                {item === "INDIA" ? t("common.india", "India") : t("common.international", "International")}
              </button>
            ))}
          </div>
          <div className="ml-auto flex items-center gap-2 md:gap-3">
            <div className="hidden w-[290px] items-center gap-2 rounded-full border border-[#BFC6C1] bg-white px-4 py-2 md:flex">
              <Search size={16} className="text-ink/45" />
              <input aria-label="Search cases" value={search} onChange={e => handleSearch(e.target.value)} className="w-full border-0 bg-transparent p-0 text-sm outline-none" placeholder={t("nav.search_placeholder")} />
            </div>
            
            <div className="relative" ref={languageRef}>
              <button 
                type="button" 
                className="flex items-center gap-1 rounded-full px-3 py-2 text-sm font-semibold text-ink hover:bg-white" 
                onClick={() => setLanguageOpen(!languageOpen)}
              >
                <Globe2 size={18} />
                <span className="hidden md:inline">{LANGUAGES.find(l => l.name === language)?.native ?? language}</span>
                {isTranslating && <span className="hidden md:inline text-xs text-ink/45">…</span>}
                <ChevronDown size={14} className="text-ink/60" />
              </button>

              {languageOpen && (
                <div className="absolute right-0 top-full mt-1 max-h-[75vh] w-64 overflow-y-auto rounded-xl border border-line bg-white shadow-xl z-50">
                  <div className="sticky top-0 bg-white p-2 border-b border-line/60 z-10 backdrop-blur-sm">
                    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#F4F6F4] text-xs">
                      <Search size={13} className="text-ink/40 shrink-0" />
                      <input
                        type="text"
                        placeholder={t("common.search_languages", "Search 39 languages...")}
                        value={langQuery}
                        onChange={e => setLangQuery(e.target.value)}
                        className="w-full bg-transparent border-0 outline-none text-xs text-ink placeholder:text-ink/40"
                        autoFocus
                      />
                    </div>
                  </div>

                  {(() => {
                    const q = langQuery.trim().toLowerCase();
                    const filtered = LANGUAGES.filter(l =>
                      !q || l.name.toLowerCase().includes(q) || l.native.toLowerCase().includes(q)
                    );

                    if (filtered.length === 0) {
                      return <div className="p-4 text-center text-xs text-ink/45">{t("common.no_languages_match", "No languages match")} &ldquo;{langQuery}&rdquo;</div>;
                    }

                    return (["Scheduled Languages", "Additional Indian Languages", "International"] as const).map(region => {
                      const list = filtered.filter(l => l.region === region);
                      if (list.length === 0) return null;
                      const localizedRegion = region === "Scheduled Languages" ? t("common.scheduled_languages", "Scheduled Languages") : region === "Additional Indian Languages" ? t("common.additional_languages", "Additional Indian Languages") : t("common.international_languages", "International");
                      return (
                        <div key={region} className="py-1">
                          <p className="px-3.5 pb-1 pt-1.5 text-[10px] font-bold uppercase tracking-wider text-ink/40">
                            {localizedRegion} ({list.length})
                          </p>
                          {list.map(opt => (
                            <button
                              key={opt.name}
                              onClick={() => { setLanguage(opt.name as Language); setLanguageOpen(false); setLangQuery(""); }}
                              className={cn(
                                "flex w-full items-center justify-between gap-2 px-3.5 py-1.5 text-left text-sm transition-colors",
                                language === opt.name ? "bg-forest/10 font-bold text-forest" : "text-ink hover:bg-[#EAF1F8]"
                              )}
                            >
                              <span className="truncate">{opt.native}</span>
                              <span className="text-xs text-ink/45 shrink-0">{t(opt.name)}</span>
                            </button>
                          ))}
                        </div>
                      );
                    });
                  })()}
                </div>
              )}
            </div>

            <div className="relative" ref={profileRef}>
              <button 
                type="button" 
                onClick={() => setProfileOpen(!profileOpen)} 
                className="flex h-9 w-9 items-center justify-center rounded-full bg-mist text-navy transition-colors hover:bg-[#EAF1F8] border border-transparent hover:border-line shadow-sm" 
                aria-label="User profile"
              >
                <UserCircle size={21} />
              </button>
              
              {profileOpen && (
                <div className="absolute right-0 top-full mt-3 flex h-[380px] w-[350px] flex-col overflow-hidden rounded-2xl border border-line bg-white shadow-2xl transition-all origin-top-right">
                  {/* Banner & Avatar section */}
                  <div className="relative h-[90px] bg-gradient-to-r from-[#0E4B3D] via-[#166752] to-[#1a7a63]">
                    <div className="absolute -bottom-10 left-6">
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-[4px] border-white bg-mist text-3xl font-bold text-navy shadow-sm">
                        {user?.first_name ? user.first_name[0].toUpperCase() : (user?.email?.[0].toUpperCase() || <UserCircle size={40} />)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-12 flex flex-1 flex-col px-6">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="serif text-[22px] font-bold text-forest leading-tight">
                          {user?.first_name ? `${user.first_name} ${user.last_name || ""}`.trim() : t("common.research_preferences", "Researcher")}
                        </h3>
                        <p className="mt-1 flex items-center gap-1.5 text-xs font-semibold text-navy/70">
                          <ShieldCheck size={14} className="text-emerald" /> {user?.role ? t(user.role) : t("profile.authenticated_workspace")}
                        </p>
                      </div>
                    </div>

                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-3 rounded-xl border border-[#EAF1F8] bg-[#F7F9FF] p-3 transition-colors hover:border-line hover:bg-mist/50">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-sm"><Mail size={15} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">{t("common.email_address", "Email Account")}</p>
                          <p className="truncate text-sm font-semibold text-ink">{user?.email || t("Not signed in")}</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3 rounded-xl border border-[#EAF1F8] bg-[#F7F9FF] p-3 transition-colors hover:border-line hover:bg-mist/50">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white text-navy shadow-sm"><Boxes size={15} /></div>
                        <div className="min-w-0 flex-1">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-ink/45">{t("Workspace ID")}</p>
                          <p className="truncate font-mono text-xs font-medium text-ink/70">{user?.id || "N/A"}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 border-t border-line bg-[#F8FAFD] p-5">
                    <Link href="/profile" onClick={() => setProfileOpen(false)} className="flex flex-1 items-center justify-center gap-2 rounded-lg border border-line bg-white px-4 py-2.5 text-sm font-bold text-navy shadow-sm transition-colors hover:bg-mist hover:text-forest">
                      <Settings size={16} /> {t("Manage")}
                    </Link>
                    <button 
                      onClick={() => {
                        clearSession();
                        router.push("/auth/login");
                      }} 
                      className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-forest"
                    >
                      {t("common.sign_out", "Log out")}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>
        <main className="w-full px-[15px] py-7">{children}</main>
      </div>
      {!isAuthRoute && <FloatingAIChat />}
    </div>
  );
}
