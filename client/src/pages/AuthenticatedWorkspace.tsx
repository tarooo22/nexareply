import { useAuth } from "@/_core/hooks/useAuth";
import { MetaConnectionWizard } from "@/components/MetaConnectionWizard";
import { WorkspaceNav, visibleWorkspaceNavigation } from "@/components/WorkspaceNav";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useTheme } from "@/contexts/ThemeContext";
import { trpc } from "@/lib/trpc";
import { WorkspaceAlertsScreen, WorkspaceAnalyticsScreen, WorkspaceAssistantScreen, WorkspaceCatalogScreen, WorkspaceInboxScreen, WorkspaceKnowledgeComposerScreen, WorkspaceOverviewScreen, WorkspaceSettingsScreen, WorkspaceTicketsScreen } from "@/pages/workspace/AmadeoWorkspaceScreens";
import { ArrowRight, Building2, ChevronDown, Loader2, LockKeyhole, Menu, Monitor, Moon, Plus, RefreshCw, ShieldCheck, Sun, UserPlus, UsersRound } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";

type Role = "owner" | "operator";

function LegacyMembersPanel({ organizationId }: { organizationId: number }) {
  const members = trpc.nexareply.workspace.memberships.list.useQuery({ organizationId });
  const setRole = trpc.nexareply.workspace.memberships.setRole.useMutation();
  const invitations = trpc.nexareply.workspace.memberships.invitations.list.useQuery({ organizationId });
  const invite = trpc.nexareply.workspace.memberships.invitations.create.useMutation();
  const [email, setEmail] = useState("");
  const [manualLink, setManualLink] = useState<string | null>(null);
  return <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]"><article className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-3"><UsersRound className="size-5 text-primary" /><div><p className="text-sm font-bold text-primary">Access</p><h2 className="mt-1 text-xl font-black">წევრები და როლები</h2></div></div>{members.isLoading ? <PanelLoading title="წევრები იტვირთება" /> : <div className="mt-5 grid gap-3">{members.data?.map(({ membership, user }) => <article key={membership.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div><p className="font-black">{user.name || user.email || "მომხმარებელი"}</p><p className="mt-1 text-xs text-muted-foreground">{user.email}</p></div><select value={membership.role} onChange={(event) => setRole.mutate({ organizationId, userId: user.id, role: event.target.value as Role }, { onSuccess: () => void members.refetch() })} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold"><option value="owner">owner</option><option value="operator">operator</option></select></article>)}</div>}</article><aside className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-2"><UserPlus className="size-5 text-primary" /><h2 className="font-black">Operator მოწვევა</h2></div><form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); invite.mutate({ organizationId, email }, { onSuccess: (result) => { setEmail(""); setManualLink(result.inviteLink); void invitations.refetch(); } }); }}><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="operator@example.com" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" /><button disabled={invite.isPending} className="min-h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50">მოწვევის შექმნა</button></form>{manualLink ? <div className="mt-4 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-xs"><p className="font-bold">Manual invite link</p><p className="mt-2 break-all text-muted-foreground">{manualLink}</p></div> : null}<p className="mt-5 text-xs leading-5 text-muted-foreground">Pending invitations: {invitations.data?.filter((item) => item.status === "pending").length ?? 0}</p></aside></section>;
}

function PanelLoading({ title }: { title: string }) { return <div className="mt-5 flex min-h-32 items-center justify-center gap-3 rounded-2xl border border-dashed border-border bg-card/50 text-sm font-bold text-muted-foreground"><Loader2 className="size-4 animate-spin text-primary" />{title}</div>; }

function QueueOwnerPanel({ organizationId }: { organizationId: number }) {
  const status = trpc.nexareply.workspace.operations.queueStatus.useQuery({ organizationId });
  const failures = trpc.nexareply.workspace.operations.queueFailures.useQuery({ organizationId, limit: 12 });
  const redrive = trpc.nexareply.workspace.operations.redriveDeadLetter.useMutation({ onSuccess: () => { void status.refetch(); void failures.refetch(); } });
  if (status.isLoading) return <PanelLoading title="Queue მდგომარეობა იტვირთება" />;
  if (status.isError) return <section className="mt-5 rounded-2xl border border-destructive/30 bg-destructive/5 p-5"><p className="font-black">Queue სტატუსი ვერ ჩაიტვირთა</p><button onClick={() => void status.refetch()} className="mt-3 min-h-10 rounded-xl border border-border px-3 text-sm font-bold">განახლება</button></section>;
  const data = status.data;
  const cells = [{ label: "Pending", value: data?.pending ?? 0, tone: "text-sky-700 dark:text-sky-300" }, { label: "Processing", value: data?.processing ?? 0, tone: "text-primary" }, { label: "Retrying", value: data?.retrying ?? 0, tone: "text-amber-700 dark:text-amber-300" }, { label: "Failed", value: data?.failed ?? 0, tone: "text-rose-700 dark:text-rose-300" }, { label: "Dead-letter", value: data?.deadLetter ?? 0, tone: "text-rose-700 dark:text-rose-300" }];
  return <section className="mt-5 rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-primary">Queue monitoring</p><h2 className="mt-1 text-xl font-black">Inbox job-ის მდგომარეობა</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Worker token, job payload და provider credential არასოდეს ჩანს. {data?.tenSecondGuarantee ? "10-წამიანი trigger დადასტურებულია." : "10-წამიანი trigger ჯერ სრულდება; არსებული სტატუსი არ აცხადებს SLA-ს."}</p></div><button onClick={() => { void status.refetch(); void failures.refetch(); }} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold"><RefreshCw className="size-4" />განახლება</button></div><div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{cells.map((cell) => <article key={cell.label} className="rounded-xl border border-border bg-background p-3"><p className="text-xs font-bold uppercase tracking-[.1em] text-muted-foreground">{cell.label}</p><p className={`mt-2 text-2xl font-black ${cell.tone}`}>{cell.value}</p></article>)}</div>{failures.data?.length ? <div className="mt-4 grid gap-2">{failures.data.map((job) => <article key={job.id} className="flex flex-col justify-between gap-3 rounded-xl border border-border bg-background p-3 sm:flex-row sm:items-center"><div><p className="text-sm font-black">Job #{job.id} · {job.status === "dead_letter" ? "Dead-letter" : job.status === "retrying" ? "Retrying" : "Failed"}</p><p className="mt-1 text-xs text-muted-foreground">ცდა {job.attempts}/{job.maxAttempts} · {job.errorState ? "processing error" : "მდგომარეობა ახლდება"} · {job.updatedAt ? new Date(job.updatedAt).toLocaleString("ka-GE", { dateStyle: "medium", timeStyle: "short" }) : "—"}</p></div>{job.status === "dead_letter" ? <button onClick={() => redrive.mutate({ organizationId, jobId: job.id })} disabled={redrive.isPending} className="min-h-10 rounded-xl border border-border px-3 text-xs font-bold disabled:opacity-50">{redrive.isPending ? "ბრუნდება…" : "რიგში დაბრუნება"}</button> : null}</article>)}</div> : <p className="mt-4 rounded-xl border border-dashed border-border p-4 text-sm text-muted-foreground">აქტიური retry ან dead-letter job არ არის.</p>}</section>;
}

function ThemeSelector() {
  const { theme, setTheme } = useTheme();
  const choices = [
    { id: "light" as const, label: "ღია", icon: Sun },
    { id: "dark" as const, label: "მუქი", icon: Moon },
    { id: "system" as const, label: "სისტემა", icon: Monitor },
  ];

  return <div className="grid grid-cols-3 gap-1 rounded-xl border border-sidebar-border bg-sidebar-accent/40 p-1" role="radiogroup" aria-label="ფერების თემა">
    {choices.map((choice) => {
      const Icon = choice.icon;
      return <button key={choice.id} type="button" role="radio" aria-checked={theme === choice.id} onClick={() => setTheme(choice.id)} className={`inline-flex min-h-9 items-center justify-center gap-1 rounded-lg px-2 text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${theme === choice.id ? "bg-sidebar text-sidebar-foreground shadow-sm" : "text-sidebar-foreground/65 hover:bg-sidebar-accent"}`}><Icon className="size-3.5" aria-hidden="true" /><span className="sr-only sm:not-sr-only">{choice.label}</span></button>;
    })}
  </div>;
}

function MembersPanel({ organizationId }: { organizationId: number }) {
  const members = trpc.nexareply.workspace.memberships.list.useQuery({ organizationId });
  const invitations = trpc.nexareply.workspace.memberships.invitations.list.useQuery({ organizationId });
  const invite = trpc.nexareply.workspace.memberships.invitations.create.useMutation();
  const setRole = trpc.nexareply.workspace.memberships.setRole.useMutation();
  const [email, setEmail] = useState("");
  const [inviteLink, setInviteLink] = useState<string | null>(null);

  return <section className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
    <article className="rounded-2xl border border-border bg-card p-6">
      <div className="flex items-center gap-3"><UsersRound className="size-5 text-primary" /><div><p className="text-sm font-bold text-primary">წვდომის მართვა</p><h2 className="mt-1 text-xl font-black">წევრები და როლები</h2></div></div>
      {members.isLoading ? <PanelLoading title="წევრები იტვირთება" /> : <div className="mt-5 grid gap-3">{members.data?.map(({ membership, user }) => <article key={membership.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border p-4"><div><p className="font-black">{user.name || user.email || "მომხმარებელი"}</p><p className="mt-1 text-xs text-muted-foreground">{user.email}</p></div><select value={membership.role} onChange={(event) => setRole.mutate({ organizationId, userId: user.id, role: event.target.value as Role }, { onSuccess: () => void members.refetch() })} className="h-10 rounded-xl border border-border bg-background px-3 text-sm font-bold"><option value="owner">owner</option><option value="operator">operator</option></select></article>)}</div>}
    </article>
    <aside className="rounded-2xl border border-border bg-card p-6"><div className="flex items-center gap-2"><UserPlus className="size-5 text-primary" /><h2 className="font-black">ოპერატორის მოწვევა</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">დაამატე თანამშრომელი Inbox-ის, შეკვეთებისა და tickets-ის სამართავად.</p><form className="mt-5 space-y-3" onSubmit={(event) => { event.preventDefault(); invite.mutate({ organizationId, email }, { onSuccess: (result) => { setEmail(""); setInviteLink(result.inviteLink); void invitations.refetch(); } }); }}><input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="operator@example.com" className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary" /><button disabled={invite.isPending} className="min-h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50">{invite.isPending ? "იქმნება…" : "მოწვევის შექმნა"}</button></form>{inviteLink ? <div className="mt-4 rounded-xl border border-amber-400/50 bg-amber-500/10 p-3 text-xs"><p className="font-bold">მოწვევის ბმული</p><p className="mt-2 break-all text-muted-foreground">{inviteLink}</p></div> : null}<p className="mt-5 text-xs leading-5 text-muted-foreground">მოლოდინშია: {invitations.data?.filter((item) => item.status === "pending").length ?? 0} მოწვევა</p></aside>
  </section>;
}

export default function AuthenticatedWorkspace() {
  const { loading, isAuthenticated } = useAuth();
  const bootstrap = trpc.nexareply.workspace.bootstrap.useMutation();
  const organizations = trpc.nexareply.workspace.organizations.useQuery(undefined, { enabled: isAuthenticated && !bootstrap.isPending });
  const [organizationId, setOrganizationId] = useState<number>();
  const [section, setSection] = useState("overview");
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const createOrganization = trpc.nexareply.workspace.createOrganization.useMutation({
    onSuccess: async (created) => {
      await organizations.refetch();
      setOrganizationId(created.id);
      setSection("overview");
      setWorkspaceName("");
      setCreatingWorkspace(false);
      setMobileNavigationOpen(false);
    },
  });

  useEffect(() => {
    if (isAuthenticated && !organizations.isLoading && !organizations.data?.length && !bootstrap.isPending && !bootstrap.isSuccess) bootstrap.mutate();
  }, [isAuthenticated, organizations.isLoading, organizations.data?.length, bootstrap]);
  useEffect(() => {
    if (!organizationId && organizations.data?.[0]) setOrganizationId(organizations.data[0].organization.id);
  }, [organizationId, organizations.data]);

  const selected = organizations.data?.find((entry) => entry.organization.id === organizationId) ?? organizations.data?.[0];
  const organization = selected?.organization;
  const role = (selected?.membership.role ?? "operator") as Role;
  const visibleNav = visibleWorkspaceNavigation(role);
  const activeNav = visibleNav.find((item) => item.id === section) ?? visibleNav[0];
  const currentSection = activeNav?.id ?? "overview";
  const screen = useMemo(() => {
    if (!organization) return null;
    const props = { organizationId: organization.id, role };
    if (currentSection === "inbox") return <>{role === "owner" ? <QueueOwnerPanel organizationId={organization.id} /> : null}<WorkspaceInboxScreen {...props} /></>;
    if (currentSection === "catalog") return <WorkspaceCatalogScreen {...props} />;
    if (currentSection === "knowledge") return <WorkspaceKnowledgeComposerScreen {...props} />;
    if (currentSection === "assistant") return <WorkspaceAssistantScreen {...props} />;
    if (currentSection === "tickets") return <WorkspaceTicketsScreen {...props} />;
    if (currentSection === "analytics") return <WorkspaceAnalyticsScreen {...props} />;
    if (currentSection === "notifications") return <WorkspaceAlertsScreen {...props} />;
    if (currentSection === "integration" && role === "owner") return <MetaConnectionWizard organizationId={organization.id} />;
    if (currentSection === "settings" && role === "owner") return <WorkspaceSettingsScreen organizationId={organization.id} role={role} onNavigate={setSection} />;
    if (currentSection === "members" && role === "owner") return <MembersPanel organizationId={organization.id} />;
    return <WorkspaceOverviewScreen {...props} onNavigate={setSection} />;
  }, [currentSection, organization, role]);

  if (loading || (isAuthenticated && (organizations.isLoading || bootstrap.isPending))) return <main className="grid min-h-screen place-items-center bg-background"><PanelLoading title="სამუშაო სივრცე იტვირთება" /></main>;
  if (!isAuthenticated) return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,_rgba(126,87,255,.13),_transparent_32%),hsl(var(--background))] p-6"><section className="max-w-md rounded-3xl border border-border bg-card p-8 text-center shadow-xl"><span className="mx-auto grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><LockKeyhole className="size-6" /></span><h1 className="mt-5 text-2xl font-black">დაცული NexaReply Workspace</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">პროდუქტების კატალოგი, Messenger Inbox და AI კონსულტანტი ხელმისაწვდომია უსაფრთხო ანგარიშით შესვლის შემდეგ.</p><Link href="/auth?mode=login" className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">შესვლა ან რეგისტრაცია</Link><Link href="/demo" className="mt-3 inline-flex min-h-10 items-center justify-center text-sm font-bold text-primary">Public Demo Mode <ArrowRight className="ml-2 size-4" /></Link></section></main>;

  const organizationPicker = <div className="mt-6"><label className="block text-xs font-bold text-sidebar-foreground/60">ორგანიზაცია<div className="relative mt-1"><select value={organization?.id ?? ""} onChange={(event) => { setOrganizationId(Number(event.target.value)); setSection("overview"); setMobileNavigationOpen(false); }} className="h-11 w-full appearance-none rounded-xl border border-sidebar-border bg-sidebar-accent/60 px-3 pr-9 text-sm font-bold outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring">{organizations.data?.map(({ organization: item, membership }) => <option key={item.id} value={item.id}>{item.name} · {membership.role}</option>)}</select><ChevronDown className="pointer-events-none absolute right-3 top-3.5 size-4 text-sidebar-foreground/60" /></div></label><button type="button" onClick={() => setCreatingWorkspace((open) => !open)} className="mt-2 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 text-sm font-bold transition-colors hover:bg-sidebar-accent"><Plus className="size-4" />ახალი workspace</button>{creatingWorkspace ? <form className="mt-3 rounded-xl border border-sidebar-border bg-sidebar-accent/30 p-3" onSubmit={(event) => { event.preventDefault(); createOrganization.mutate({ name: workspaceName }); }}><label className="text-xs font-bold text-sidebar-foreground/70">Workspace-ის სახელი<input autoFocus required minLength={2} maxLength={160} value={workspaceName} onChange={(event) => setWorkspaceName(event.target.value)} placeholder="მაგალითად, ჩემი მაღაზია" className="mt-1 h-10 w-full rounded-lg border border-sidebar-border bg-sidebar px-3 text-sm text-sidebar-foreground outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring" /></label>{createOrganization.error ? <p className="mt-2 text-xs text-destructive">{createOrganization.error.message}</p> : null}<button disabled={createOrganization.isPending} className="mt-3 min-h-10 w-full rounded-lg bg-primary px-3 text-sm font-bold text-primary-foreground disabled:opacity-50">{createOrganization.isPending ? "იქმნება…" : "Workspace-ის შექმნა"}</button></form> : null}</div>;
  const navigation = <><WorkspaceNav role={role} active={currentSection} onSelect={(next) => { setSection(next); setMobileNavigationOpen(false); }} /><div className="mt-6 space-y-3"><ThemeSelector /><Link href="/demo" className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-sidebar-border bg-sidebar-accent/40 px-3 text-sm font-bold transition-colors hover:bg-sidebar-accent">Public Demo Mode <ArrowRight className="size-4" /></Link></div></>;

  return <main className="nr-workspace min-h-screen bg-background text-foreground lg:flex"><aside className="nr-workspace-sidebar hidden w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-5 lg:flex"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="size-5" /></span><div><p className="text-sm font-black">NexaReply</p><p className="text-xs text-sidebar-foreground/55">გაყიდვების ოპერაციები</p></div></div>{organizationPicker}{navigation}</aside><section className="min-w-0 flex-1"><header className="nr-workspace-mobile-header sticky top-0 z-20 border-b border-border/80 bg-background/90 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:hidden"><div className="flex items-center justify-between gap-3"><div className="flex min-w-0 items-center gap-2"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="size-4" /></span><div className="min-w-0"><p className="truncate text-sm font-black">NexaReply</p><p className="truncate text-xs text-muted-foreground">{activeNav?.label ?? "მიმოხილვა"}</p></div></div><Sheet open={mobileNavigationOpen} onOpenChange={setMobileNavigationOpen}><SheetTrigger asChild><button type="button" className="inline-grid size-11 place-items-center rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="Workspace მენიუს გახსნა"><Menu className="size-5" /></button></SheetTrigger><SheetContent side="left" className="w-[86vw] max-w-sm overflow-y-auto border-sidebar-border bg-sidebar p-4"><SheetHeader className="px-0 pt-1"><SheetTitle className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-primary text-primary-foreground"><Building2 className="size-4" /></span>NexaReply</SheetTitle><SheetDescription>AI გაყიდვების სამუშაო სივრცე</SheetDescription></SheetHeader>{organizationPicker}{navigation}</SheetContent></Sheet></div></header><div className="p-4 sm:p-6 lg:p-8"><div className="mx-auto max-w-7xl"><header className="nr-workspace-page-header flex flex-col justify-between gap-4 rounded-2xl border border-border bg-card p-5 shadow-sm md:flex-row md:items-center md:p-6"><div><p className="text-sm font-bold text-primary">{organization?.name ?? "თქვენი სამუშაო სივრცე"}</p><h1 className="mt-1 text-2xl font-black tracking-tight">{activeNav?.label ?? "მიმოხილვა"}</h1><p className="mt-2 text-sm text-muted-foreground">{role === "owner" ? "ორგანიზაციის მფლობელი" : "გაყიდვების ოპერატორი"}</p></div><span className="inline-flex w-fit items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-sm font-bold"><ShieldCheck className="size-4 text-primary" />{role === "owner" ? "მფლობელის წვდომა" : "ოპერატორის წვდომა"}</span></header>{screen}</div></div></section></main>;
}
