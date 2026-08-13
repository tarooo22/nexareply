import { NexaLogo } from "@/components/NexaLogo";
import { ThemeSelector } from "@/components/ThemeSelector";
import { demoConversations } from "@/lib/demo-data";
import ConversationsView from "./demo/ConversationsView";
import KnowledgeView from "./demo/KnowledgeView";
import LeadsView from "./demo/LeadsView";
import NotificationsView from "./demo/NotificationsView";
import ProductsView from "./demo/ProductsView";
import SettingsView from "./demo/SettingsView";
import {
  BarChart3,
  Bell,
  Bot,
  Boxes,
  ChevronDown,
  CircleAlert,
  ClipboardCheck,
  CreditCard,
  FileText,
  HelpCircle,
  LayoutDashboard,
  Menu,
  MessageSquareText,
  PackageSearch,
  PanelLeftClose,
  PanelLeftOpen,
  Settings2,
  ShoppingBag,
  Sparkles,
  UsersRound,
  X,
} from "lucide-react";
import { lazy, Suspense, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";

type DemoSection = "overview" | "conversations" | "products" | "knowledge" | "leads" | "analytics" | "settings" | "notifications";

const AnalyticsView = lazy(() => import("./demo/AnalyticsView"));

const navItems: Array<{ section: DemoSection; label: string; icon: typeof LayoutDashboard; count?: string }> = [
  { section: "overview", label: "მიმოხილვა", icon: LayoutDashboard },
  { section: "conversations", label: "საუბრები", icon: MessageSquareText, count: "3" },
  { section: "products", label: "პროდუქტები", icon: PackageSearch },
  { section: "knowledge", label: "ცოდნის ბაზა", icon: FileText },
  { section: "leads", label: "ლიდები და შეკვეთები", icon: UsersRound },
  { section: "analytics", label: "ანალიტიკა", icon: BarChart3 },
  { section: "notifications", label: "შეტყობინებები", icon: Bell, count: "2" },
  { section: "settings", label: "პარამეტრები", icon: Settings2 },
];

function getSection(location: string): DemoSection {
  const value = location.replace(/^\/demo\/?/, "").split("/")[0] || "overview";
  return navItems.some((item) => item.section === value) ? (value as DemoSection) : "overview";
}

function StatusPill({ children, tone = "neutral" }: { children: React.ReactNode; tone?: "neutral" | "success" | "warning" | "danger" | "accent" }) {
  const styles = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-[#E9F8EF] text-[#166534] dark:bg-[#166534]/30 dark:text-[#86EFAC]",
    warning: "bg-[#FFF5D9] text-[#92400E] dark:bg-[#92400E]/30 dark:text-[#FDE68A]",
    danger: "bg-[#FDECEC] text-[#991B1B] dark:bg-[#991B1B]/30 dark:text-[#FECACA]",
    accent: "bg-[#E7F8FC] text-[#0E7490] dark:bg-[#0E7490]/30 dark:text-[#A5F3FC]",
  };
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold ${styles[tone]}`}>{children}</span>;
}

function KpiCard({ icon: Icon, label, value, detail, tone = "primary" }: { icon: typeof Bot; label: string; value: string; detail: string; tone?: "primary" | "accent" | "success" | "warning" }) {
  const tones = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-[#E7F8FC] text-[#0E7490] dark:bg-[#0E7490]/30 dark:text-[#A5F3FC]",
    success: "bg-[#E9F8EF] text-[#166534] dark:bg-[#166534]/30 dark:text-[#86EFAC]",
    warning: "bg-[#FFF5D9] text-[#92400E] dark:bg-[#92400E]/30 dark:text-[#FDE68A]",
  };
  return <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-4"><div><p className="text-sm font-medium text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-bold tracking-tight text-foreground">{value}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{detail}</p></div><span className={`grid size-10 place-items-center rounded-xl ${tones[tone]}`}><Icon className="size-5" /></span></div></article>;
}

function Overview() {
  const priorityConversations = demoConversations.filter((conversation) => conversation.ticket || conversation.priority === "high").slice(0, 3);
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-sm font-semibold text-primary">დღევანდელი სურათი</p><h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">TechZone Demo-ის სამუშაო სივრცე</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">ეს არის სრულად სიმულირებული გარემო. რეალური Meta, Telegram და OpenAI კავშირები არ არის კონფიგურირებული.</p></div><Link href="/demo/conversations" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_14px_30px_-18px_rgba(124,58,237,0.9)] transition-transform duration-200 hover:brightness-105 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">გახსენით Inbox<MessageSquareText className="size-4" /></Link></div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5"><KpiCard icon={MessageSquareText} label="მიღებული შეტყობინებები" value="382" detail="ბოლო 7 დღის Demo მონაცემი" /><KpiCard icon={Bot} label="AI-ის პასუხები" value="271" detail="71% პასუხი დაფუძნებულია კატალოგზე" tone="accent" /><KpiCard icon={UsersRound} label="ადამიანის ჩართვა" value="36" detail="9% საუბარი გადაეცა ოპერატორს" tone="success" /><KpiCard icon={ShoppingBag} label="დრაფტ შეკვეთები" value="18" detail="დასადასტურებელი შეკვეთები" tone="warning" /><KpiCard icon={CreditCard} label="გეგმის გამოყენება" value="2,718 / 5,000" detail="Growth Demo · დარჩენილია 2,282 პასუხი" tone="primary" /></div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]"><section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">პრიორიტეტული საუბრები</h2><p className="mt-1 text-sm text-muted-foreground">მოითხოვს სწრაფ შემოწმებას ან ოპერატორის მოქმედებას</p></div><Link href="/demo/conversations" className="text-sm font-semibold text-primary hover:underline">ყველა საუბარი</Link></div><div className="mt-5 divide-y divide-border">{priorityConversations.map((conversation) => <Link key={conversation.id} href={`/demo/conversations?conversation=${conversation.id}`} className="flex items-center gap-3 py-3.5 first:pt-0 last:pb-0"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{conversation.initials}</span><div className="min-w-0 flex-1"><div className="flex items-center justify-between gap-3"><p className="truncate text-sm font-bold">{conversation.customer}</p><span className="text-xs text-muted-foreground">{conversation.updated}</span></div><p className="mt-1 truncate text-sm text-muted-foreground">{conversation.preview}</p></div>{conversation.ticket ? <StatusPill tone="danger">ოპერატორი</StatusPill> : <StatusPill tone="warning">ლიდი</StatusPill>}</Link>)}</div></section>
        <section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><Boxes className="size-5" /></span><div><h2 className="font-bold">Demo Mode აქტიურია</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">გამოსცადეთ AI პასუხი, human takeover და ticket workflow უსაფრთხო მონაცემებით.</p></div></div><div className="mt-5 space-y-3"><div className="rounded-xl border border-border bg-background p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Meta Messenger</span><StatusPill tone="neutral">არ არის კონფიგურირებული</StatusPill></div></div><div className="rounded-xl border border-border bg-background p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">Telegram owner assist</span><StatusPill tone="neutral">არ არის კონფიგურირებული</StatusPill></div></div><div className="rounded-xl border border-border bg-background p-3"><div className="flex items-center justify-between gap-3"><span className="text-sm font-medium">AI answer provider</span><StatusPill tone="accent">Demo provider</StatusPill></div></div></div><Link href="/demo/settings" className="mt-5 inline-flex min-h-10 w-full items-center justify-center rounded-xl border border-border bg-background text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">გახსენით პარამეტრები</Link></section>
      </div>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-bold">სწრაფი სცენარები</h2><p className="mt-1 text-sm text-muted-foreground">შეამოწმეთ Demo Mode-ის კრიტიკული workflow-ები.</p></div><StatusPill tone="accent">შესვლის გარეშე</StatusPill></div><div className="mt-5 grid gap-3 md:grid-cols-3"><Link href="/demo/conversations" className="rounded-xl border border-border bg-background p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><MessageSquareText className="size-5 text-primary" /><p className="mt-4 text-sm font-bold">სამი მესიჯი, ერთი პასუხი</p><p className="mt-1 text-xs leading-5 text-muted-foreground">იხილეთ ანა მჭედლიძის გაერთიანებული მოთხოვნა.</p></Link><Link href="/demo/conversations" className="rounded-xl border border-border bg-background p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CircleAlert className="size-5 text-[#B45309]" /><p className="mt-4 text-sm font-bold">უცნობი კითხვა</p><p className="mt-1 text-xs leading-5 text-muted-foreground">იხილეთ ticket-ად გადაცემის უსაფრთხო flow.</p></Link><Link href="/demo/leads" className="rounded-xl border border-border bg-background p-4 transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ClipboardCheck className="size-5 text-[#15803D]" /><p className="mt-4 text-sm font-bold">დრაფტ შეკვეთა</p><p className="mt-1 text-xs leading-5 text-muted-foreground">ნახეთ ლიდის დადასტურებამდე მართვის გზა.</p></Link></div></section>
    </div>
  );
}

function PlaceholderPage({ section }: { section: Exclude<DemoSection, "overview"> }) {
  const copy: Record<Exclude<DemoSection, "overview">, { title: string; description: string; icon: typeof HelpCircle }> = {
    conversations: { title: "საუბრები", description: "აქ გამოჩნდება Messenger Inbox, AI პასუხები, takeover და tickets.", icon: MessageSquareText },
    products: { title: "პროდუქტები", description: "აქ გამოჩნდება კატალოგი, search/filter და import mapping workflow.", icon: PackageSearch },
    knowledge: { title: "ცოდნის ბაზა", description: "აქ გამოჩნდება ბიზნეს ფაქტები, FAQ და policy documents.", icon: FileText },
    leads: { title: "ლიდები და შეკვეთები", description: "აქ გამოჩნდება კონტაქტები, deal stages და draft orders.", icon: UsersRound },
    analytics: { title: "ანალიტიკა", description: "აქ გამოჩნდება პასუხების, funnel-ის და daily message volume-ის ანალიზი.", icon: BarChart3 },
    notifications: { title: "შეტყობინებები", description: "აქ გამოჩნდება human takeover და მაღალი პრიორიტეტის ლიდების owner alerts.", icon: Bell },
    settings: { title: "პარამეტრები", description: "აქ გამოჩნდება AI persona, reply rules, integrations და usage controls.", icon: Settings2 },
  };
  const page = copy[section];
  const Icon = page.icon;
  return <section className="grid min-h-[420px] place-items-center rounded-2xl border border-dashed border-border bg-card p-8 text-center"><div className="max-w-md"><span className="mx-auto grid size-12 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-6" /></span><h1 className="mt-5 text-2xl font-bold">{page.title}</h1><p className="mt-3 leading-7 text-muted-foreground">{page.description}</p><p className="mt-6 text-sm font-medium text-primary">Demo interface მზადდება ამავე სამუშაო სივრცეში.</p></div></section>;
}

export default function DemoWorkspace() {
  const [location, setLocation] = useLocation();
  const [navOpen, setNavOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [debounceSeconds, setDebounceSeconds] = useState(10);
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [workspace, setWorkspace] = useState("TechZone Demo");
  const [role, setRole] = useState<"owner" | "operator">("owner");
  const section = useMemo(() => getSection(location), [location]);
  const visibleNavItems = useMemo(() => navItems.filter((item) => role === "owner" || item.section !== "settings"), [role]);
  const navigate = (next: DemoSection) => { setNavOpen(false); setLocation(next === "overview" ? "/demo" : `/demo/${next}`); };

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      {navOpen && <button type="button" aria-label="ნავიგაციის დახურვა" onClick={() => setNavOpen(false)} className="fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px] lg:hidden" />}
      <aside className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:sticky lg:top-0 lg:h-screen ${navOpen ? "translate-x-0" : "-translate-x-full"} ${collapsed ? "lg:w-[76px]" : "lg:w-[280px]"} lg:translate-x-0`}>
        <div className="flex h-[68px] items-center justify-between gap-2 border-b border-sidebar-border px-4"><NexaLogo compact={collapsed} /><button type="button" onClick={() => setCollapsed((value) => !value)} className="hidden size-9 place-items-center rounded-lg text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring lg:grid" aria-label={collapsed ? "ნავიგაციის გაფართოება" : "ნავიგაციის შეკუმშვა"}>{collapsed ? <PanelLeftOpen className="size-4" /> : <PanelLeftClose className="size-4" />}</button><button type="button" onClick={() => setNavOpen(false)} className="grid size-9 place-items-center rounded-lg hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring lg:hidden" aria-label="ნავიგაციის დახურვა"><X className="size-4" /></button></div>
        <div className="relative p-3"><button type="button" onClick={() => setWorkspaceMenuOpen((value) => !value)} className="flex min-h-12 w-full items-center gap-3 rounded-xl border border-sidebar-border bg-sidebar-accent/55 px-3 text-left hover:bg-sidebar-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring" aria-expanded={workspaceMenuOpen}><span className="grid size-8 place-items-center rounded-lg bg-primary text-xs font-bold text-primary-foreground">{workspace === "TechZone Demo" ? "TZ" : "NX"}</span>{!collapsed && <><span className="min-w-0 flex-1"><span className="block truncate text-sm font-bold">{workspace}</span><span className="block truncate text-xs text-muted-foreground">{role === "owner" ? "ორგანიზაციის მფლობელი" : "გაყიდვების ოპერატორი"}</span></span><ChevronDown className={`size-4 text-muted-foreground transition-transform ${workspaceMenuOpen ? "rotate-180" : ""}`} /></>}</button>{workspaceMenuOpen && !collapsed && <div className="absolute left-3 right-3 top-[68px] z-20 rounded-xl border border-sidebar-border bg-popover p-1.5 shadow-xl"><p className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">ორგანიზაციები</p>{["TechZone Demo", "Nexa Retail Preview"].map((name) => <button key={name} type="button" onClick={() => { setWorkspace(name); setWorkspaceMenuOpen(false); }} className={`flex min-h-10 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${workspace === name ? "bg-accent text-accent-foreground" : ""}`}><span className="grid size-6 place-items-center rounded-md bg-primary/10 text-[10px] font-bold text-primary">{name === "TechZone Demo" ? "TZ" : "NX"}</span>{name}</button>)}<div className="my-1.5 border-t border-border" /><p className="px-2.5 py-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Demo როლი</p><div className="grid grid-cols-2 gap-1 px-1"><button type="button" onClick={() => { setRole("owner"); setWorkspaceMenuOpen(false); }} className={`min-h-9 rounded-lg px-2 text-xs font-semibold ${role === "owner" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>მფლობელი</button><button type="button" onClick={() => { setRole("operator"); setWorkspaceMenuOpen(false); if (section === "settings") navigate("overview"); }} className={`min-h-9 rounded-lg px-2 text-xs font-semibold ${role === "operator" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent"}`}>ოპერატორი</button></div></div>}</div>
        <nav className="flex-1 space-y-1 px-3 py-2" aria-label="Demo workspace navigation">
          {visibleNavItems.map((item) => {
            const Icon = item.icon;
            const active = section === item.section;
            return (
              <button
                key={item.section}
                type="button"
                onClick={() => navigate(item.section)}
                className={`flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${active ? "bg-primary text-primary-foreground shadow-[0_8px_20px_-14px_rgba(124,58,237,0.8)]" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}
                title={collapsed ? item.label : undefined}
              >
                <Icon className="size-[18px] shrink-0" aria-hidden="true" />
                {!collapsed && (
                  <>
                    <span className="min-w-0 flex-1 truncate">{item.label}</span>
                    {item.count && <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-primary-foreground/15 text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{item.count}</span>}
                  </>
                )}
              </button>
            );
          })}
        </nav>
        <div className="border-t border-sidebar-border p-3"><Link href="/" className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${collapsed ? "justify-center px-0" : ""}`}><Sparkles className="size-[18px]" />{!collapsed && "მარკეტინგ გვერდზე"}</Link></div>
      </aside>
      <div className="min-w-0 flex-1"><header className="sticky top-0 z-30 flex h-[68px] items-center justify-between gap-3 border-b border-border bg-background/85 px-4 backdrop-blur-xl md:px-6"><div className="flex items-center gap-3"><button type="button" onClick={() => setNavOpen(true)} className="grid size-10 place-items-center rounded-xl border border-border bg-card lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="ნავიგაციის გახსნა"><Menu className="size-5" /></button><div><div className="flex items-center gap-2"><p className="text-sm font-semibold md:text-base">{navItems.find((item) => item.section === section)?.label}</p><StatusPill tone="accent">Demo Mode</StatusPill></div><p className="hidden text-xs text-muted-foreground sm:block">TechZone Demo · შესვლის გარეშე</p></div></div><div className="flex items-center gap-2"><button type="button" onClick={() => navigate("notifications")} className="relative grid size-10 place-items-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="შეტყობინებები"><Bell className="size-[18px]" /><span className="absolute -right-1 -top-1 grid size-4 place-items-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">2</span></button><ThemeSelector /></div></header>
        <main className="p-4 md:p-6 lg:p-7">
          {section === "overview" && <Overview />}
          {section === "conversations" && <ConversationsView debounceSeconds={debounceSeconds} />}
          {section === "products" && <ProductsView />}
          {section === "knowledge" && <KnowledgeView />}
          {section === "leads" && <LeadsView />}
          {section === "analytics" && <Suspense fallback={<div className="grid min-h-[420px] place-items-center rounded-2xl border border-border bg-card text-sm font-semibold text-muted-foreground">ანალიტიკა იტვირთება…</div>}><AnalyticsView /></Suspense>}
          {section === "notifications" && <NotificationsView />}
          {section === "settings" && role === "owner" && <SettingsView debounceSeconds={debounceSeconds} onDebounceChange={setDebounceSeconds} />}
        </main>
      </div>
    </div>
  );
}
