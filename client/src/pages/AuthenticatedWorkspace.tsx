import { useAuth } from "@/_core/hooks/useAuth";
import { WorkspaceNav, visibleWorkspaceNavigation } from "@/components/WorkspaceNav";
import { trpc } from "@/lib/trpc";
import { AmadeoAlertsScreen, AmadeoAnalyticsScreen, AmadeoAssistantScreen, AmadeoCatalogScreen, AmadeoInboxScreen, AmadeoKnowledgeScreen, AmadeoOverviewScreen, AmadeoTicketsScreen } from "@/pages/workspace/AmadeoWorkspaceScreens";
import { ArrowRight, Building2, CheckCircle2, ChevronDown, ExternalLink, Loader2, LockKeyhole, RefreshCw, Settings2, ShieldCheck, Sparkles, UserPlus, UsersRound } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

type Role = "owner" | "operator";
const META_OAUTH_RESUME_KEY = "nexareply:pending-meta-oauth-session";

function MetaConnectionPanel({ organizationId }: { organizationId: number }) {
  const status = trpc.nexareply.workspace.owner.meta.status.useQuery({ organizationId });
  const startOAuth = trpc.nexareply.workspace.owner.meta.startOAuth.useMutation();
  if (status.isLoading) return <div className="mt-5"><PanelLoading title="Meta connection იტვირთება" /></div>;
  return <section className="mt-5 rounded-2xl border border-border bg-card p-6"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-sm font-bold text-primary">Meta Messenger</p><h2 className="mt-1 text-xl font-black">Page კავშირი და webhook მდგომარეობა</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Provider token არასოდეს იგზავნება browser-ში და არც database-ში ინახება. UI იღებს მხოლოდ უსაფრთხო Page metadata-სა და connection status-ს.</p></div><button onClick={() => void status.refetch()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold"><RefreshCw className="size-4" />განახლება</button></div><div className={`mt-5 rounded-xl border p-4 ${status.data?.status === "connected" ? "border-emerald-400/50 bg-emerald-500/10" : "border-amber-400/50 bg-amber-500/10"}`}><div className="flex gap-3"><CheckCircle2 className="mt-0.5 size-5 text-emerald-500" /><div><p className="font-black">{status.data?.status === "connected" ? "დაკავშირებულია" : "კავშირის შემოწმება საჭიროა"}</p><p className="mt-1 text-sm text-muted-foreground">{status.data?.page ? `${status.data.page.name} · Page ID ${status.data.page.id}` : "ჯერ Page არ არის არჩეული."}</p>{status.data?.lastError ? <p className="mt-2 text-xs text-destructive">უსაფრთხო provider summary: {status.data.lastError}</p> : null}</div></div></div>{status.data?.configured ? <button onClick={() => startOAuth.mutate({ organizationId }, { onSuccess: (result) => { if (result.authorizationUrl) window.location.assign(result.authorizationUrl); } })} disabled={startOAuth.isPending} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"><ExternalLink className="size-4" />{startOAuth.isPending ? "Meta იხსნება…" : status.data?.status === "connected" ? "სხვა Page-ის არჩევა" : "Meta-თან დაკავშირება"}</button> : <p className="mt-5 text-sm text-muted-foreground">Meta managed configuration ხელმისაწვდომი არ არის.</p>}</section>;
}

function MembersPanel({ organizationId }: { organizationId: number }) {
  const members = trpc.nexareply.workspace.memberships.list.useQuery({ organizationId });
  const setRole = trpc.nexareply.workspace.memberships.setRole.useMutation();
  const invitations = trpc.nexareply.workspace.memberships.invitations.list.useQuery({ organizationId });
  const invite = trpc.nexareply.workspace.memberships.invitations.create.useMutation();
  const [email, setEmail] = useState("");
  const [manualLink, setManualLink] = useState<string | null>(null);
  return <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]"><article className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-3"><UsersRound className="size-5 text-primary" /><div><p className="text-sm font-bold text-primary">Access</p><h2 className="mt-1 text-xl font-black">წევრები და როლები</h2></div></div>{members.isLoading ? <PanelLoading title="წევრები იტვირთება" /> : <div className="mt-5 grid gap-3">{members.data?.map(({ membership, user }) => <article key={membership.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div><p className="font-black">{user.name || user.email || "მომხმარებელი"}</p><p className="mt-1 text-xs text-muted-foreground">{user.email}</p></div><select value={membership.role} onChange={(event) => setRole.mutate({ organizationId, userId: user.id, role: event.target.value as Role }, { onSuccess: () => void members.refetch() })} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold"><option value="owner">owner</option><option value="operator">operator</option></select></article>)}</div>}</article><aside className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-2"><UserPlus className="size-5 text-primary" /><h2 className="font-black">Operator მოწვევა</h2></div><form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); invite.mutate({ organizationId, email }, { onSuccess: (result) => { setEmail(""); setManualLink(result.inviteLink); void invitations.refetch(); } }); }}><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="operator@example.com" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" /><button disabled={invite.isPending} className="min-h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50">მოწვევის შექმნა</button></form>{manualLink ? <div className="mt-4 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-xs"><p className="font-bold">Manual invite link</p><p className="mt-2 break-all text-muted-foreground">{manualLink}</p></div> : null}<p className="mt-5 text-xs leading-5 text-muted-foreground">Pending invitations: {invitations.data?.filter((item) => item.status === "pending").length ?? 0}</p></aside></section>;
}

function PanelLoading({ title }: { title: string }) { return <div className="mt-5 flex min-h-32 items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 text-sm font-bold text-muted-foreground"><Loader2 className="size-4 animate-spin text-primary" />{title}</div>; }

export default function AuthenticatedWorkspace() {
  const { user, loading, isAuthenticated } = useAuth();
  const bootstrap = trpc.nexareply.workspace.bootstrap.useMutation();
  const organizations = trpc.nexareply.workspace.organizations.useQuery(undefined, { enabled: isAuthenticated && !bootstrap.isPending });
  const [organizationId, setOrganizationId] = useState<number>();
  const [section, setSection] = useState("overview");
  useEffect(() => {
    if (typeof window === "undefined") return;
    const fragment = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const sessionId = fragment.get("meta_oauth_session") || sessionStorage.getItem(META_OAUTH_RESUME_KEY);
    if (sessionId) sessionStorage.setItem(META_OAUTH_RESUME_KEY, sessionId);
    if (fragment.has("meta_oauth_session") || fragment.has("meta_oauth_result")) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
  }, []);
  useEffect(() => { if (isAuthenticated && !organizations.isLoading && !organizations.data?.length && !bootstrap.isPending && !bootstrap.isSuccess) bootstrap.mutate(); }, [isAuthenticated, organizations.isLoading, organizations.data?.length, bootstrap]);
  useEffect(() => { if (!organizationId && organizations.data?.[0]) setOrganizationId(organizations.data[0].organization.id); }, [organizationId, organizations.data]);
  const selected = organizations.data?.find((entry) => entry.organization.id === organizationId) ?? organizations.data?.[0];
  const organization = selected?.organization;
  const role = (selected?.membership.role ?? "operator") as Role;
  const visibleNav = visibleWorkspaceNavigation(role);
  const activeNav = visibleNav.find((item) => item.id === section) ?? visibleNav[0];
  const currentSection = activeNav?.id ?? "overview";
  const screen = useMemo(() => {
    if (!organization) return null;
    const props = { organizationId: organization.id, role };
    if (currentSection === "inbox") return <AmadeoInboxScreen {...props} />;
    if (currentSection === "catalog") return <AmadeoCatalogScreen {...props} />;
    if (currentSection === "knowledge") return <AmadeoKnowledgeScreen {...props} />;
    if (currentSection === "assistant") return <AmadeoAssistantScreen {...props} />;
    if (currentSection === "tickets") return <AmadeoTicketsScreen {...props} />;
    if (currentSection === "analytics") return <AmadeoAnalyticsScreen {...props} />;
    if (currentSection === "notifications") return <AmadeoAlertsScreen {...props} />;
    if (currentSection === "integration" && role === "owner") return <MetaConnectionPanel organizationId={organization.id} />;
    if (currentSection === "members" && role === "owner") return <MembersPanel organizationId={organization.id} />;
    return <AmadeoOverviewScreen {...props} />;
  }, [currentSection, organization, role]);
  if (loading || (isAuthenticated && (organizations.isLoading || bootstrap.isPending))) return <main className="grid min-h-screen place-items-center bg-background"><PanelLoading title="Amadeo workspace იტვირთება" /></main>;
  if (!isAuthenticated) return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,_rgba(126,87,255,.13),_transparent_32%),hsl(var(--background))] p-6"><section className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><LockKeyhole className="size-6" /></span><h1 className="mt-5 text-2xl font-black">დაცული Amadeo Workspace</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Perfume catalog, Messenger inbox და AI კონსულტანტი ხელმისაწვდომია უსაფრთხო ანგარიშით შესვლის შემდეგ.</p><Link href="/auth?mode=login" className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">შესვლა ან რეგისტრაცია</Link><Link href="/demo" className="mt-3 inline-flex min-h-10 items-center justify-center text-sm font-bold text-primary">Public Demo Mode <ArrowRight className="ml-2 size-4" /></Link></section></main>;
  return <main className="min-h-screen bg-background text-foreground lg:flex"><aside className="flex w-full flex-col border-b border-sidebar-border bg-sidebar p-4 lg:min-h-screen lg:w-72 lg:border-b-0 lg:border-r"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="size-5" /></span><div><p className="text-sm font-black">NexaReply · Amadeo</p><p className="text-xs text-muted-foreground">persistent sales workspace</p></div></div><label className="mt-4 block text-xs font-bold text-muted-foreground lg:mt-6">ორგანიზაცია<div className="relative mt-1"><select value={organization?.id ?? ""} onChange={(event) => { setOrganizationId(Number(event.target.value)); setSection("overview"); }} className="h-11 w-full appearance-none rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-3 pr-9 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">{organizations.data?.map(({ organization: item, membership }) => <option key={item.id} value={item.id}>{item.name} · {membership.role}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-muted-foreground" /></div></label><WorkspaceNav role={role} active={currentSection} onSelect={setSection} /><Link href="/demo" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 text-sm font-bold hover:bg-sidebar-accent lg:mt-6">Public Demo Mode <ArrowRight className="size-4" /></Link></aside><section className="min-w-0 flex-1 p-5 md:p-8"><div className="mx-auto max-w-7xl"><header className="flex flex-col justify-between gap-4 rounded-3xl border border-border bg-card p-6 shadow-sm md:flex-row md:items-center"><div><p className="text-sm font-bold text-primary">Authenticated Amadeo workspace</p><h1 className="mt-1 text-2xl font-black">{activeNav?.label ?? "მიმოხილვა"}</h1><p className="mt-2 text-sm text-muted-foreground">{organization?.name ?? "Workspace"} · {role === "owner" ? "ორგანიზაციის მფლობელი" : "გაყიდვების ოპერატორი"}</p></div><span className="inline-flex w-fit items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-bold"><ShieldCheck className="size-4" />{role === "owner" ? "owner controls" : "operator scope"}</span></header>{screen}</div></section></main>;
}
