import { trpc } from "@/lib/trpc";
import {
  Archive,
  BarChart3,
  BellRing,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleAlert,
  Download,
  FileUp,
  ImagePlus,
  Loader2,
  PackagePlus,
  Pencil,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Star,
  TicketCheck,
  Trash2,
  UserRoundCheck,
  X,
} from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { inboxDeliveryLabel, inboxMessageAuthorLabel } from "@/lib/inboxPresentation";

type WorkspaceProps = { organizationId: number; role: "owner" | "operator" };
type OverviewProps = WorkspaceProps & { onNavigate: (section: string) => void };

const dateTime = (value: Date | string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("ka-GE", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
const money = (value: string | number | null | undefined) =>
  `${Number(value ?? 0).toLocaleString("ka-GE")} GEL`;

function StatePanel({
  kind,
  title,
  description,
  action,
}: {
  kind: "loading" | "empty" | "error";
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  const Icon =
    kind === "loading" ? Loader2 : kind === "error" ? CircleAlert : Sparkles;
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-7 text-center">
      <Icon
        className={`mx-auto size-6 text-primary ${kind === "loading" ? "animate-spin" : ""}`}
      />
      <p className="mt-3 font-bold">{title}</p>
      <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">
        {description}
      </p>
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}

function MiniMetric({
  label,
  value,
  hint,
  accent = "text-primary",
}: {
  label: string;
  value: React.ReactNode;
  hint: string;
  accent?: string;
}) {
  return (
    <article className="group rounded-2xl border border-border/80 bg-card p-5 shadow-sm transition-shadow hover:shadow-md">
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </p>
      <p className={`mt-3 text-2xl font-black ${accent}`}>{value}</p>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">{hint}</p>
    </article>
  );
}

function AccountDeletionCard({ organizationId, role }: WorkspaceProps) {
  return role === "owner" ? <OwnerDeletionRequestCard organizationId={organizationId} /> : null;
}

function OwnerDeletionRequestCard({ organizationId }: { organizationId: number }) {
  const [reason, setReason] = useState("");
  const requests = trpc.nexareply.workspace.owner.accountDeletion.list.useQuery({ organizationId });
  const request = trpc.nexareply.workspace.owner.accountDeletion.request.useMutation({ onSuccess: () => { setReason(""); void requests.refetch(); } });
  const active = requests.data?.find((item) => ["requested", "in_review"].includes(item.status));
  return <section className="nr-deletion-card rounded-3xl border border-rose-500/20 bg-rose-500/[.035] p-5 shadow-sm" aria-labelledby="deletion-request-title">
    <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-rose-500/10 text-rose-600"><Trash2 className="size-5" /></span><div><p className="text-sm font-bold text-rose-700 dark:text-rose-300">ანგარიშისა და workspace-ის მონაცემები</p><h2 id="deletion-request-title" className="mt-1 text-lg font-black">მონაცემების წაშლის მოთხოვნა</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">მოთხოვნა მხოლოდ authenticated owner-ის ელფოსტით იგზავნება. ვერიფიკაციისა და დამუშავების შემდეგ შესაბამისი workspace-ის მონაცემები, მათ შორის Meta Page კავშირი, იშლება ან ანონიმიზდება მოქმედი retention წესების მიხედვით.</p></div></div>
    {active ? <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm"><p className="font-bold">მოთხოვნა უკვე მიღებულია</p><p className="mt-1 text-muted-foreground">სტატუსი: {active.status === "in_review" ? "განხილვაშია" : "მიღებულია"}. განმეორებითი მოთხოვნა აღარ შეიქმნება.</p></div> : <form className="mt-4 grid gap-3" onSubmit={(event) => { event.preventDefault(); request.mutate({ organizationId, reason: reason.trim() || undefined }); }}><label className="grid gap-2 text-sm font-bold" htmlFor="deletion-reason">მიზეზი <span className="text-xs font-normal text-muted-foreground">არასავალდებულო</span><textarea id="deletion-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={500} placeholder="მაგალითად, workspace-ის დახურვა" className="min-h-20 resize-y rounded-xl border border-border bg-background p-3 text-sm font-normal outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label><button type="submit" disabled={request.isPending} className="inline-flex min-h-10 w-fit items-center gap-2 rounded-xl bg-rose-600 px-4 text-sm font-bold text-white transition-colors hover:bg-rose-700 disabled:opacity-50">{request.isPending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />} მოთხოვნის გაგზავნა</button>{request.error ? <p className="text-sm text-destructive" role="alert">მოთხოვნა ვერ გაიგზავნა. სცადეთ ხელახლა.</p> : null}</form>}
  </section>;
}

function OnboardingChecklist({
  organizationId,
  role,
  onNavigate,
}: OverviewProps) {
  const onboarding = trpc.nexareply.workspace.onboarding.state.useQuery({
    organizationId,
  });
  const dismiss = trpc.nexareply.workspace.onboarding.dismiss.useMutation();
  const restart = trpc.nexareply.workspace.onboarding.restart.useMutation();
  if (onboarding.isLoading)
    return (
      <StatePanel
        kind="loading"
        title="დასაწყების ნაბიჯები იტვირთება"
        description="Workspace-ის რეალური მზადყოფნის მდგომარეობა მოწმდება."
      />
    );
  if (onboarding.isError || !onboarding.data)
    return (
      <StatePanel
        kind="error"
        title="დასაწყების ნაბიჯები ვერ ჩაიტვირთა"
        description="სცადეთ ხელახლა; არსებული მონაცემები არ შეცვლილა."
        action={
          <button
            onClick={() => void onboarding.refetch()}
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
          >
            განახლება
          </button>
        }
      />
    );
  const data = onboarding.data;
  if (data.dismissedAt)
    return (
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-black">დასაწყების სია დამალულია</p>
            <p className="mt-1 text-sm text-muted-foreground">
              შეგიძლიათ ნებისმიერ დროს დააბრუნოთ checklist და ნახოთ რეალური
              readiness.
            </p>
          </div>
          {role === "owner" ? (
            <button
              onClick={() =>
                restart.mutate(
                  { organizationId },
                  { onSuccess: () => void onboarding.refetch() }
                )
              }
              disabled={restart.isPending}
              className="min-h-10 rounded-xl border border-border px-4 text-sm font-bold"
            >
              {restart.isPending ? "ბრუნდება…" : "Checklist-ის დაბრუნება"}
            </button>
          ) : null}
        </div>
      </section>
    );
  const steps = [
    {
      key: "channelConnected",
      title: "Messenger არხის შემოწმება",
      description: "Page connection და webhook სტატუსი",
      section: "integration",
      action: "კავშირის ნახვა",
    },
    {
      key: "knowledgeReady",
      title: "მაღაზიის პირობების დამატება",
      description: "მიწოდება, გადახდა, დაბრუნება და სხვა დადასტურებული ფაქტები",
      section: "knowledge",
      action: "ცოდნის დამატება",
    },
    {
      key: "catalogReady",
      title: "პირველი პროდუქტის დამატება",
      description: "ფასი, ვარიანტი და ხელმისაწვდომობა",
      section: "catalog",
      action: "კატალოგში გადასვლა",
    },
    {
      key: "assistantReviewed",
      title: "AI პასუხის წესების განხილვა",
      description: "უსაფრთხო fallback და პასუხის ტონი",
      section: "assistant",
      action: "წესების განხილვა",
    },
    {
      key: "testDraftReady",
      title: "უსაფრთხო AI draft-ის შემოწმება",
      description: "Draft არ აგზავნის შეტყობინებას კლიენტთან ავტომატურად",
      section: "inbox",
      action: "Inbox-ის გახსნა",
    },
  ] as const;
  return (
    <section className="nr-onboarding-card rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(124,58,237,.08),transparent_58%)] p-5 sm:p-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <p className="text-sm font-bold text-primary">
            თქვენი დაწყების გეგმა
          </p>
          <h2 className="mt-1 text-xl font-black">
            მოამზადეთ AI კონსულტანტი რეალური პასუხებისთვის
          </h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
            ნაბიჯები ავტომატურად განახლდება მხოლოდ შენახული და დადასტურებული
            მონაცემის მიხედვით. არაფერი ირთვება ან იგზავნება თქვენი ცალკე
            მოქმედების გარეშე.
          </p>
        </div>
        <div className="rounded-xl border border-primary/15 bg-card/80 px-3 py-2 text-sm font-black text-primary">
          {data.completedCount}/{data.totalActionableSteps} მზადაა
        </div>
      </div>
      <div className="mt-5 grid gap-3 lg:grid-cols-2">
        {steps.map(step => {
          const done = data.steps[step.key];
          return (
            <article
              key={step.key}
              className={`flex min-h-28 flex-col justify-between rounded-xl border p-4 ${done ? "border-emerald-500/25 bg-emerald-500/5" : "border-border bg-card/85"}`}
            >
              <div className="flex gap-3">
                <span
                  className={`grid size-7 shrink-0 place-items-center rounded-full ${done ? "bg-emerald-500 text-white" : "bg-secondary text-muted-foreground"}`}
                >
                  {done ? (
                    <CheckCircle2 className="size-4" />
                  ) : (
                    <span className="text-xs font-black">
                      {steps.indexOf(step) + 1}
                    </span>
                  )}
                </span>
                <div>
                  <h3 className="font-bold">{step.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              </div>
              {done ? (
                <p className="mt-3 text-xs font-bold text-emerald-700 dark:text-emerald-300">
                  დადასტურებულია
                </p>
              ) : (
                <button
                  onClick={() => onNavigate(step.section)}
                  className="mt-3 w-fit text-xs font-black text-primary underline-offset-4 hover:underline"
                >
                  {step.action}
                </button>
              )}
            </article>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col justify-between gap-3 rounded-xl border border-amber-500/25 bg-amber-500/8 p-4 sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold">ავტომატიზაციის მზადყოფნა</p>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {data.workerReady
              ? "Durable worker მზადაა."
              : "Durable worker/scheduler ჯერ არ არის განთავსებული; 10-წამიანი ავტომატიზაციის გარანტია ამ ეტაპზე არ გვაქვს."}
          </p>
        </div>
        <button
          onClick={() => onNavigate("assistant")}
          className="min-h-10 rounded-xl border border-border bg-card px-3 text-xs font-bold"
        >
          AI წესების ნახვა
        </button>
      </div>
      {role === "owner" ? (
        <div className="mt-4 flex justify-end">
          <button
            onClick={() =>
              dismiss.mutate(
                { organizationId },
                { onSuccess: () => void onboarding.refetch() }
              )
            }
            disabled={dismiss.isPending}
            className="text-xs font-bold text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
          >
            {dismiss.isPending ? "ინახება…" : "Checklist-ის დამალვა"}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function WorkspaceOverviewScreen({
  organizationId,
  role,
  onNavigate,
}: OverviewProps) {
  const overview = trpc.nexareply.workspace.overview.useQuery({
    organizationId,
  });
  const analytics = trpc.nexareply.workspace.analytics.useQuery({
    organizationId,
  });
  const alerts = trpc.nexareply.workspace.notifications.list.useQuery({
    organizationId,
  });
  const meta = trpc.nexareply.workspace.owner.meta.status.useQuery(
    { organizationId },
    { enabled: role === "owner" }
  );
  if (overview.isLoading || analytics.isLoading || alerts.isLoading)
    return (
      <StatePanel
        kind="loading"
        title="სამუშაო სივრცე იტვირთება"
        description="საუბრები, შეკვეთები და შეტყობინებები იტვირთება."
      />
    );
  if (overview.isError || analytics.isError || alerts.isError)
    return (
      <StatePanel
        kind="error"
        title="მონაცემები ვერ ჩაიტვირთა"
        description="გადაამოწმეთ კავშირი და სცადეთ ხელახლა."
        action={
          <button
            className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
            onClick={() => {
              void overview.refetch();
              void analytics.refetch();
              void alerts.refetch();
            }}
          >
            განახლება
          </button>
        }
      />
    );
  const data = analytics.data!;
  const unread = alerts.data?.filter(item => !item.readAt).length ?? 0;
  const metaStatus = meta.data?.status ?? "unconfigured";
  const metaBadge = metaStatus === "connected"
    ? { label: "კავშირი აქტიურია", className: "bg-emerald-500/10 text-emerald-600" }
    : metaStatus === "delivery_failed"
      ? { label: "მიწოდება შეფერხებულია", className: "bg-rose-500/10 text-rose-600" }
      : metaStatus === "verification_failed"
        ? { label: "დადასტურება საჭიროა", className: "bg-amber-500/10 text-amber-700 dark:text-amber-300" }
        : { label: "კავშირი საჭიროებს მოქმედებას", className: "bg-secondary text-muted-foreground" };
  return (
    <div className="mt-5 space-y-5">
      <OnboardingChecklist
        organizationId={organizationId}
        role={role}
        onNavigate={onNavigate}
      />
      <AccountDeletionCard organizationId={organizationId} role={role} />
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MiniMetric
          label="აქტიური საუბრები"
          value={data.conversationCount}
          hint="ყველა persistent Messenger საუბარი"
        />
        <MiniMetric
          label="ღია tickets"
          value={overview.data?.ticketCount ?? 0}
          hint="AI-ს ან ოპერატორის escalation"
          accent="text-amber-500"
        />
        <MiniMetric
          label="კვალიფიციური ლიდები"
          value={overview.data?.qualifiedLeadCount ?? 0}
          hint="პროდუქტით ან მომსახურებით დაინტერესებული კლიენტები"
          accent="text-emerald-500"
        />
        <MiniMetric
          label="წაუკითხავი alerts"
          value={unread}
          hint="owner/operator მოქმედებას ელოდება"
          accent={unread ? "text-rose-500" : "text-primary"}
        />
      </section>
      <section className="grid gap-5 xl:grid-cols-[1.3fr_.7fr]">
        <article className="nr-overview-panel rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary">
                ოპერაციული სტატუსი
              </p>
              <h2 className="mt-1 text-xl font-black">
                თქვენი გაყიდვების ტემპი
              </h2>
            </div>
            <BarChart3 className="size-5 text-primary" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-secondary/60 p-4">
              <p className="text-xs text-muted-foreground">AI პასუხები</p>
              <p className="mt-1 text-lg font-black">{data.aiReplies}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-4">
              <p className="text-xs text-muted-foreground">
                ადამიანის პასუხები
              </p>
              <p className="mt-1 text-lg font-black">{data.humanReplies}</p>
            </div>
            <div className="rounded-xl bg-secondary/60 p-4">
              <p className="text-xs text-muted-foreground">
                პასუხის მაჩვენებელი
              </p>
              <p className="mt-1 text-lg font-black">{data.responseRate}%</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            AI კონსულტანტი იყენებს მხოლოდ ამ სამუშაო სივრცეში დამატებულ
            პროდუქტებსა და ცოდნის ბაზას. უცნობი მოთხოვნა ავტომატურად ქმნის
            ticket-ს.
          </p>
        </article>
        <article className="nr-overview-panel rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-bold text-primary">Messenger Page</p>
              <h2 className="mt-1 font-black">კავშირის მდგომარეობა</h2>
            </div>
            <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-bold ${metaBadge.className}`}><ShieldCheck className="size-4" /> {metaBadge.label}</span>
          </div>
          {role === "owner" ? (
            <div className="mt-5 rounded-xl border border-border bg-secondary/35 p-4">
              <p className="font-bold">
                {meta.data?.page?.name ?? "Page არ არის არჩეული"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {metaStatus === "connected"
                  ? "Webhook subscription დაკავშირებულია."
                  : metaStatus === "verification_failed"
                    ? "Page-ის დადასტურება ან webhook subscription ვერ დასრულდა. ინტეგრაციებიდან გაიმეორეთ ავტორიზაცია."
                    : metaStatus === "delivery_failed"
                      ? "Messenger delivery შეფერხებულია. ინტეგრაციებიდან გადაამოწმეთ კავშირი."
                      : "ინტეგრაციების გვერდიდან დაასრულეთ Page connection."}
              </p>
            </div>
          ) : (
            <p className="mt-5 text-sm leading-6 text-muted-foreground">
              Page connection-ის მდგომარეობას მხოლოდ owner მართავს; inbound
              Messenger messages ავტომატურად გამოჩნდება საუბრის inbox-ში.
            </p>
          )}
        </article>
      </section>
    </div>
  );
}

function LegacyWorkspaceInboxScreen({ organizationId }: WorkspaceProps) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "pending" | "closed">(
    "all"
  );
  const conversations = trpc.nexareply.workspace.conversations.list.useQuery({
    organizationId,
    query: query || undefined,
    status: status === "all" ? undefined : status,
  });
  const [selectedId, setSelectedId] = useState<number | null>(null);
  useEffect(() => {
    if (!selectedId && conversations.data?.[0])
      setSelectedId(conversations.data[0].id);
  }, [selectedId, conversations.data]);
  const thread = trpc.nexareply.workspace.conversations.messages.useQuery(
    { organizationId, conversationId: selectedId ?? 0 },
    { enabled: Boolean(selectedId) }
  );
  const draft =
    trpc.nexareply.workspace.conversations.createDraft.useMutation();
  const takeover =
    trpc.nexareply.workspace.conversations.takeover.useMutation();
  const sendReply =
    trpc.nexareply.workspace.conversations.sendReply.useMutation();
  const [reply, setReply] = useState("");
  const selected = conversations.data?.find(item => item.id === selectedId);
  useEffect(() => {
    const lastDraft = [...(thread.data ?? [])]
      .reverse()
      .find(message => message.sender === "ai" && message.isDraft);
    if (lastDraft) setReply(lastDraft.body);
  }, [thread.data]);
  const refresh = () => {
    void conversations.refetch();
    if (selectedId) void thread.refetch();
  };
  if (conversations.isLoading)
    return (
      <div className="mt-5">
        <StatePanel
          kind="loading"
          title="საუბრები იტვირთება"
          description="Meta inbound events და შენახული შეტყობინებები იტვირთება."
        />
      </div>
    );
  if (conversations.isError)
    return (
      <div className="mt-5">
        <StatePanel
          kind="error"
          title="Inbox ვერ ჩაიტვირთა"
          description="გადაამოწმეთ კავშირი და განაახლეთ."
          action={
            <button
              onClick={() => void conversations.refetch()}
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
            >
              განახლება
            </button>
          }
        />
      </div>
    );
  const deliveryLabel: Record<string, string> = {
    received: "მიღებულია",
    draft: "draft",
    queued: "რიგშია",
    sent: "გაგზავნილია",
    failed: "ვერ გაიგზავნა",
  };
  return (
    <div className="mt-5 overflow-hidden rounded-2xl border border-border bg-card">
      <div className="grid min-h-[680px] lg:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="border-b border-border bg-secondary/20 lg:border-b-0 lg:border-r">
          <div className="border-b border-border p-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black">Messenger საუბრები</h2>
              <button
                onClick={refresh}
                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
                aria-label="საუბრის განახლება"
              >
                <RefreshCw className="size-4" />
              </button>
            </div>
            <input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="სახელი ან შეტყობინება"
              className="mt-3 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="mt-3 flex gap-1 overflow-auto">
              {(["all", "open", "pending", "closed"] as const).map(item => (
                <button
                  key={item}
                  onClick={() => setStatus(item)}
                  className={`min-h-9 rounded-lg px-3 text-xs font-bold ${status === item ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground"}`}
                >
                  {item === "all"
                    ? "ყველა"
                    : item === "open"
                      ? "ღია"
                      : item === "pending"
                        ? "ხელით"
                        : "დახურული"}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[560px] overflow-y-auto">
            {conversations.data?.length ? (
              conversations.data.map(item => (
                <button
                  key={item.id}
                  onClick={() => setSelectedId(item.id)}
                  className={`w-full border-b border-border px-4 py-4 text-left transition-colors ${selectedId === item.id ? "bg-primary/10" : "hover:bg-secondary/50"}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-bold">{item.customerName}</p>
                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-bold ${item.status === "pending" ? "bg-amber-100 text-amber-800" : "bg-secondary text-muted-foreground"}`}
                    >
                      {item.status === "pending" ? "ხელით" : item.status}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {item.preview || "ახალი საუბარი"}
                  </p>
                  <p className="mt-2 text-[11px] text-muted-foreground">
                    {dateTime(item.lastMessageAt ?? item.updatedAt)}
                  </p>
                </button>
              ))
            ) : (
              <StatePanel
                kind="empty"
                title="საუბრები ჯერ არ არის"
                description="დაკავშირებულ Page-ზე პირველი Messenger შეტყობინების მიღებისთანავე საუბარი და შემომავალი ისტორია ავტომატურად შეინახება."
              />
            )}
          </div>
        </aside>
        <section className="flex min-w-0 flex-col">
          {!selected ? (
            <div className="grid flex-1 place-items-center p-8">
              <StatePanel
                kind="empty"
                title="აირჩიეთ საუბარი"
                description="მარცხენა სიიდან აირჩიეთ customer conversation, რათა ნახოთ რეალური message history და შექმნათ AI draft."
              />
            </div>
          ) : (
            <>
              <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border p-5">
                <div>
                  <h2 className="font-black">{selected.customerName}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selected.humanActive
                      ? "ადამიანმა ჩაიბარა საუბარი"
                      : selected.aiState === "needs_human"
                        ? "AI-მ escalation მოითხოვა"
                        : "AI კონსულტანტი აქტიურია"}
                  </p>
                </div>
                <button
                  onClick={() =>
                    takeover.mutate(
                      {
                        organizationId,
                        conversationId: selected.id,
                        active: !selected.humanActive,
                      },
                      { onSuccess: refresh }
                    )
                  }
                  disabled={takeover.isPending}
                  className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold ${selected.humanActive ? "border border-border" : "bg-amber-500 text-white"}`}
                >
                  {takeover.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <UserRoundCheck className="size-4" />
                  )}
                  {selected.humanActive
                    ? "AI-ს დაბრუნება"
                    : "ადამიანმა ჩაიბაროს"}
                </button>
              </header>
              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-secondary/15 p-5">
                {thread.isLoading ? (
                  <StatePanel
                    kind="loading"
                    title="ისტორია იტვირთება"
                    description="შეტყობინებების history იტვირთება."
                  />
                ) : (
                  thread.data?.map(message => (
                    <article
                      key={message.id}
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender === "customer" ? "mr-auto border border-border bg-card" : message.sender === "system" ? "mx-auto bg-secondary text-muted-foreground" : "ml-auto bg-primary text-primary-foreground"}`}
                    >
                      <p>{message.body}</p>
                      <p className="mt-1 flex flex-wrap gap-x-1 text-[10px] opacity-70">
                        <span>
                          {message.sender === "customer"
                            ? "Meta customer"
                            : message.sender === "ai"
                              ? "AI draft"
                              : message.sender === "operator"
                                ? "ოპერატორი"
                                : "სისტემა"}
                        </span>
                        <span>
                          ·{" "}
                          {deliveryLabel[message.deliveryStatus] ?? "შენახულია"}
                        </span>
                        <span>· {dateTime(message.createdAt)}</span>
                      </p>
                    </article>
                  ))
                )}
              </div>
              <div className="border-t border-border p-4">
                <div className="flex flex-wrap gap-2">
                  <button
                    onClick={() =>
                      draft.mutate(
                        { organizationId, conversationId: selected.id },
                        { onSuccess: () => void thread.refetch() }
                      )
                    }
                    disabled={draft.isPending || selected.humanActive}
                    className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold disabled:opacity-50"
                  >
                    <Sparkles className="size-4 text-primary" />
                    {draft.isPending ? "Draft მზადდება…" : "AI draft"}
                  </button>
                  <span className="text-xs leading-10 text-muted-foreground">
                    AI პასუხობს მხოლოდ catalog/knowledge ჩანაწერებით; უცნობზე
                    ხსნის ticket-ს.
                  </span>
                </div>
                {draft.isError ? (
                  <p className="mt-2 text-xs text-destructive">
                    AI draft ვერ შეიქმნა.
                  </p>
                ) : null}
                <div className="mt-3 flex gap-2">
                  <textarea
                    value={reply}
                    onChange={event => setReply(event.target.value)}
                    placeholder="უპასუხეთ კლიენტს…"
                    className="min-h-20 flex-1 resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  />
                  <button
                    onClick={() =>
                      selectedId &&
                      reply.trim() &&
                      sendReply.mutate(
                        {
                          organizationId,
                          conversationId: selectedId,
                          body: reply.trim(),
                        },
                        {
                          onSuccess: () => {
                            setReply("");
                            refresh();
                          },
                        }
                      )
                    }
                    disabled={!reply.trim() || sendReply.isPending}
                    className="inline-flex min-h-11 self-end items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    <Send className="size-4" />
                    {sendReply.isPending ? "იგზავნება…" : "გაგზავნა"}
                  </button>
                </div>
                {sendReply.isError ? (
                  <p className="mt-2 text-xs text-destructive">
                    გაგზავნა ვერ შესრულდა: ნახეთ message status და შეამოწმეთ
                    Meta delivery.
                  </p>
                ) : null}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}

export function WorkspaceCatalogScreen({ organizationId, role }: WorkspaceProps) {
  const [query, setQuery] = useState("");
  const [catalogCursors, setCatalogCursors] = useState<Array<{ brand: string; model: string; id: number } | null>>([null]);
  const [catalogPage, setCatalogPage] = useState(0);
  const products = trpc.nexareply.workspace.products.listPage.useQuery({
    organizationId,
    query: query || undefined,
    cursor: catalogCursors[catalogPage] ?? undefined,
    limit: 20,
  });
  const productItems = products.data?.items ?? [];
  const assets = trpc.nexareply.workspace.products.assets.list.useQuery({
    organizationId,
  });
  const create = trpc.nexareply.workspace.products.create.useMutation();
  const update = trpc.nexareply.workspace.products.update.useMutation();
  const archive = trpc.nexareply.workspace.products.archive.useMutation();
  const uploadAsset =
    trpc.nexareply.workspace.products.assets.upload.useMutation();
  const updateAsset =
    trpc.nexareply.workspace.products.assets.update.useMutation();
  const archiveAsset =
    trpc.nexareply.workspace.products.assets.archive.useMutation();
  const preview = trpc.nexareply.workspace.imports.preview.useMutation();
  const commit = trpc.nexareply.workspace.imports.commit.useMutation();
  const exportCsv = trpc.nexareply.workspace.imports.exportCsv.useQuery(
    { organizationId, kind: "products" },
    { enabled: false }
  );
  const [form, setForm] = useState({
    brand: "",
    fragranceName: "",
    sku: "",
    volume: "",
    priceGel: "",
    stock: "0",
    availability: "მარაგშია",
    description: "",
  });
  const [filePayload, setFilePayload] = useState<{
    base64: string;
    fileName: string;
  } | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<number | null>(
    null
  );
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadingCount, setUploadingCount] = useState(0);
  const [editingProductId, setEditingProductId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ brand: "", fragranceName: "", volume: "", priceGel: "", stock: "0", availability: "", description: "" });
  useEffect(() => {
    if (!selectedProductId && productItems[0])
      setSelectedProductId(productItems[0].product.id);
  }, [productItems, selectedProductId]);
  const downloadCatalog = async () => {
    const result = await exportCsv.refetch();
    if (!result.data) return;
    const url = URL.createObjectURL(
      new Blob([result.data], { type: "text/csv;charset=utf-8" })
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "nexareply-catalog.csv";
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const onFile = async (file?: File) => {
    if (!file) return;
    const raw = await file.arrayBuffer();
    const base64 = btoa(
      Array.from(new Uint8Array(raw), value => String.fromCharCode(value)).join(
        ""
      )
    );
    const payload = { base64, fileName: file.name };
    setFilePayload(payload);
    preview.mutate({ organizationId, ...payload });
  };
  const refreshGallery = () => {
    void products.refetch();
    void assets.refetch();
  };
  const uploadImages = async (
    files: FileList | null,
    replaceAssetId?: number
  ) => {
    if (!files?.length || !selectedProductId) return;
    const selectedAssets =
      assets.data?.filter(asset => asset.productId === selectedProductId) ?? [];
    const usable = Array.from(files).slice(
      0,
      Math.max(0, 6 - selectedAssets.length)
    );
    if (!usable.length) {
      setUploadError(
        "ამ პროდუქტს უკვე აქვს 6 ფოტო. ჯერ წაშალეთ ან ჩაანაცვლეთ არსებული ფოტო."
      );
      return;
    }
    setUploadError(null);
    setUploadingCount(usable.length);
    try {
      for (const file of usable) {
        if (
          !(["image/jpeg", "image/png", "image/webp"] as string[]).includes(
            file.type
          ) ||
          file.size > 5 * 1024 * 1024
        )
          throw new Error("ატვირთეთ მხოლოდ JPEG/PNG/WebP ფაილი 5 MB-მდე.");
        const raw = await file.arrayBuffer();
        const base64 = btoa(
          Array.from(new Uint8Array(raw), value =>
            String.fromCharCode(value)
          ).join("")
        );
        await uploadAsset.mutateAsync({
          organizationId,
          productId: selectedProductId,
          base64,
          fileName: file.name,
          mimeType: file.type as "image/jpeg" | "image/png" | "image/webp",
          altText: `${productItems.find(item => item.product.id === selectedProductId)?.product.model ?? "პროდუქტი"} ფოტო`,
        });
      }
      if (replaceAssetId)
        await archiveAsset.mutateAsync({
          organizationId,
          assetId: replaceAssetId,
        });
      refreshGallery();
    } catch (error) {
      setUploadError(
        error instanceof Error ? error.message : "ფოტო ვერ აიტვირთა."
      );
    } finally {
      setUploadingCount(0);
    }
  };
  const selectedProduct = productItems.find(
    item => item.product.id === selectedProductId
  )?.product;
  const editingEntry = productItems.find(item => item.product.id === editingProductId);
  const selectedAssets = (assets.data ?? [])
    .filter(asset => asset.productId === selectedProductId)
    .sort(
      (a, b) =>
        Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder
    );
  const primaryByProduct = useMemo(
    () =>
      new Map(
        (assets.data ?? [])
          .filter(asset => asset.isPrimary)
          .map(asset => [asset.productId, asset])
      ),
    [assets.data]
  );
  const moveAsset = async (assetId: number, direction: -1 | 1) => {
    const index = selectedAssets.findIndex(asset => asset.id === assetId);
    const swap = selectedAssets[index + direction];
    const current = selectedAssets[index];
    if (!current || !swap) return;
    await Promise.all([
      updateAsset.mutateAsync({
        organizationId,
        assetId: current.id,
        sortOrder: swap.sortOrder,
      }),
      updateAsset.mutateAsync({
        organizationId,
        assetId: swap.id,
        sortOrder: current.sortOrder,
      }),
    ]);
    refreshGallery();
  };
  if (products.isLoading)
    return (
      <div className="mt-5">
        <StatePanel
          kind="loading"
          title="პროდუქტების კატალოგი იტვირთება"
          description="თქვენი ორგანიზაციის კატალოგი იტვირთება."
        />
      </div>
    );
  return (
    <div className="mt-5 space-y-5">
      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <article className="rounded-3xl border border-border/80 bg-card p-6 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-primary">Product catalog</p>
              <h2 className="mt-1 text-xl font-black">თქვენი პროდუქტები</h2>
            </div>
            <div className="flex gap-2">
              <button
                onClick={downloadCatalog}
                disabled={exportCsv.isFetching}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold"
              >
                <Download className="size-4" />
                CSV export
              </button>
              {role === "owner" ? (
                <label className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-xl bg-primary px-3 text-sm font-bold text-primary-foreground">
                  <FileUp className="size-4" />
                  CSV/XLSX import
                  <input
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={event => void onFile(event.target.files?.[0])}
                    className="sr-only"
                  />
                </label>
              ) : null}
            </div>
          </div>
          <input
            value={query}
            onChange={event => { setQuery(event.target.value); setCatalogCursors([null]); setCatalogPage(0); setSelectedProductId(null); }}
            placeholder="ბრენდი, პროდუქტი ან ხელმისაწვდომობა"
            className="mt-5 h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <div className="mt-5 overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-border text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-3">ფოტო</th>
                  <th className="px-3 py-3">ბრენდი / პროდუქტი</th>
                  <th className="px-3 py-3">ვარიანტი</th>
                  <th className="px-3 py-3">ფასი</th>
                  <th className="px-3 py-3">მარაგი</th>
                  <th className="px-3 py-3">ხელმისაწვდომობა</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {productItems.map(({ product, variant }) => {
                  const primary = primaryByProduct.get(product.id);
                  return (
                    <tr
                      key={product.id}
                      className={`border-b border-border/70 ${selectedProductId === product.id ? "bg-primary/5" : ""}`}
                    >
                      <td className="px-3 py-4">
                        <button
                          onClick={() => setSelectedProductId(product.id)}
                          className="grid size-12 overflow-hidden rounded-xl border border-border bg-secondary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                          aria-label={`${product.model} ფოტოების მართვა`}
                        >
                          {primary ? (
                            <img
                              src={primary.url}
                              alt={
                                primary.altText ??
                                `${product.model} ძირითადი ფოტო`
                              }
                              className="size-full object-cover"
                            />
                          ) : (
                            <ImagePlus className="m-auto size-4 text-muted-foreground" />
                          )}
                        </button>
                      </td>
                      <td className="px-3 py-4">
                        <button
                          onClick={() => setSelectedProductId(product.id)}
                          className="text-left"
                        >
                          <p className="font-bold">
                            {product.brand} · {product.model}
                          </p>
                          <p className="mt-1 max-w-md text-xs text-muted-foreground">
                            {product.description}
                          </p>
                        </button>
                      </td>
                      <td className="px-3 py-4">{variant.storage}</td>
                      <td className="px-3 py-4 font-bold">
                        {money(variant.priceGel)}
                      </td>
                      <td className="px-3 py-4">{variant.stock}</td>
                      <td className="px-3 py-4">
                        <span
                          className={`rounded-full px-2 py-1 text-xs font-bold ${variant.stock ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}
                        >
                          {variant.color}
                        </span>
                      </td>
                      <td className="px-3 py-4">
                        {role === "owner" ? (
                          <div className="flex items-center gap-1"><button type="button" onClick={() => { setEditingProductId(product.id); setEditForm({ brand: product.brand, fragranceName: product.model, volume: variant.storage, priceGel: String(variant.priceGel), stock: String(variant.stock), availability: variant.color, description: product.description }); }} className="rounded-lg px-2 py-1.5 text-xs font-bold text-primary hover:bg-primary/10">რედაქტირება</button><button
                            onClick={() => archive.mutate(
                                { organizationId, productId: product.id },
                                { onSuccess: () => void products.refetch() }
                              )}
                            className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
                            aria-label={`${product.model} არქივში`}
                          >
                            <Archive className="size-4" />
                          </button></div>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {!productItems.length ? (
              <StatePanel
                kind="empty"
                title="კატალოგი ცარიელია"
                description="პირველი პროდუქტი დაამატეთ ფორმიდან ან ატვირთეთ CSV/XLSX სვეტებით: ბრენდი, პროდუქტის დასახელება, SKU, ვარიანტი, ფასი GEL, მარაგი, ხელმისაწვდომობა, აღწერა."
              />
            ) : null}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4 text-sm">
              <p className="text-muted-foreground">გვერდი {catalogPage + 1} · ნაჩვენებია {productItems.length} პროდუქტი</p>
              <div className="flex gap-2">
                <button type="button" disabled={catalogPage === 0 || products.isFetching} onClick={() => { setCatalogPage(value => Math.max(0, value - 1)); setSelectedProductId(null); }} className="min-h-10 rounded-xl border border-border px-3 text-sm font-bold disabled:opacity-50">წინა</button>
                <button type="button" disabled={!products.data?.nextCursor || products.isFetching} onClick={() => { const next = products.data?.nextCursor; if (!next) return; setCatalogCursors(current => current[catalogPage + 1] ? current : [...current, next]); setCatalogPage(value => value + 1); setSelectedProductId(null); }} className="min-h-10 rounded-xl border border-border px-3 text-sm font-bold disabled:opacity-50">{products.isFetching ? "იტვირთება…" : "შემდეგი"}</button>
              </div>
            </div>
          </div>
        </article>
        <aside className="rounded-2xl border border-border bg-card p-6">
          <div className="flex items-center gap-2">
            <PackagePlus className="size-5 text-primary" />
            <h2 className="font-black">პროდუქტის დამატება</h2>
          </div>
          <form
            className="mt-5 space-y-3"
            onSubmit={event => {
              event.preventDefault();
              create.mutate(
                {
                  organizationId,
                  product: { ...form, stock: Number(form.stock) },
                },
                {
                  onSuccess: product => {
                    setForm({
                      brand: "",
                      fragranceName: "",
                      sku: "",
                      volume: "",
                      priceGel: "",
                      stock: "0",
                      availability: "მარაგშია",
                      description: "",
                    });
                    setSelectedProductId(product.id);
                    void products.refetch();
                  },
                }
              );
            }}
          >
            {(
              [
                ["brand", "ბრენდი"],
                ["fragranceName", "პროდუქტის დასახელება"],
                ["sku", "SKU"],
                ["volume", "ვარიანტი / მოცულობა"],
                ["priceGel", "ფასი GEL"],
                ["stock", "მარაგი"],
                ["availability", "ხელმისაწვდომობა"],
              ] as const
            ).map(([key, label]) => (
              <label
                key={key}
                className="block text-xs font-bold text-muted-foreground"
              >
                {label}
                <input
                  required
                  value={form[key]}
                  onChange={event =>
                    setForm({ ...form, [key]: event.target.value })
                  }
                  className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>
            ))}
            <label className="block text-xs font-bold text-muted-foreground">
              აღწერა
              <textarea
                required
                value={form.description}
                onChange={event =>
                  setForm({ ...form, description: event.target.value })
                }
                className="mt-1 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
            <button
              type="submit"
              disabled={create.isPending || role !== "owner"}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <PackagePlus className="size-4" />
              )}
              კატალოგში დამატება
            </button>
          </form>
          {create.isError ? (
            <p className="mt-3 text-xs text-destructive">
              პროდუქტი ვერ შეინახა; შეამოწმეთ SKU-ის უნიკალურობა.
            </p>
          ) : null}
        </aside>
      </section>
      {editingEntry && role === "owner" ? <section className="rounded-2xl border border-primary/25 bg-card p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-sm font-bold text-primary">პროდუქტის რედაქტირება</p><h2 className="mt-1 text-xl font-black">{editingEntry.product.brand} · {editingEntry.product.model}</h2></div><button type="button" onClick={() => setEditingProductId(null)} className="min-h-10 rounded-xl border border-border px-3 text-sm font-bold">დახურვა</button></div><form className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3" onSubmit={(event) => { event.preventDefault(); update.mutate({ organizationId, productId: editingEntry.product.id, patch: { ...editForm, stock: Number(editForm.stock) } }, { onSuccess: () => { setEditingProductId(null); void products.refetch(); }, }); }}>{([['brand','ბრენდი'],['fragranceName','პროდუქტის დასახელება'],['volume','მოცულობა'],['priceGel','ფასი GEL'],['stock','მარაგი'],['availability','ხელმისაწვდომობა']] as const).map(([key,label]) => <label key={key} className="grid gap-1 text-xs font-bold text-muted-foreground">{label}<input required value={editForm[key]} onChange={(event) => setEditForm({ ...editForm, [key]: event.target.value })} className="h-10 rounded-xl border border-border bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label>)}<label className="grid gap-1 text-xs font-bold text-muted-foreground sm:col-span-2 lg:col-span-3">აღწერა<textarea required value={editForm.description} onChange={(event) => setEditForm({ ...editForm, description: event.target.value })} className="min-h-20 rounded-xl border border-border bg-background p-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label><div className="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-3"><button type="submit" disabled={update.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"><Pencil className="size-4" />{update.isPending ? "ინახება…" : "ცვლილებების შენახვა"}</button>{update.error ? <p role="alert" className="text-sm text-destructive">პროდუქტის განახლება ვერ მოხერხდა.</p> : null}</div></form></section> : null}
      {selectedProduct ? (
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary">ფოტოების გალერეა</p>
              <h2 className="mt-1 text-xl font-black">
                {selectedProduct.brand} · {selectedProduct.model}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                მაქსიმუმ 6 ფოტო · JPEG, PNG ან WebP · თითოეული 5 MB-მდე. ფაილი
                server-side მოწმდება და ინახება მხოლოდ organization-scoped
                object storage-ში.
              </p>
            </div>
            {role === "owner" ? (
              <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
                <ImagePlus className="size-4" />
                {uploadingCount
                  ? `${uploadingCount} ფოტო იტვირთება…`
                  : "ფოტოების დამატება"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={event => {
                    void uploadImages(event.target.files);
                    event.currentTarget.value = "";
                  }}
                  className="sr-only"
                />
              </label>
            ) : null}
          </div>
          {uploadError ? (
            <p className="mt-3 rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
              {uploadError}
            </p>
          ) : null}
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {selectedAssets.map((asset, index) => (
              <article
                key={asset.id}
                className="overflow-hidden rounded-xl border border-border bg-card"
              >
                <img
                  src={asset.url}
                  alt={
                    asset.altText ??
                    `${selectedProduct.model} ფოტო ${index + 1}`
                  }
                  className="aspect-square w-full object-cover"
                />
                <div className="space-y-3 p-3">
                  <div className="flex items-center justify-between gap-2">
                    {asset.isPrimary ? (
                      <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-900">
                        <Star className="size-3 fill-current" />
                        ძირითადი
                      </span>
                    ) : role === "owner" ? (
                      <button
                        onClick={() =>
                          updateAsset.mutate(
                            {
                              organizationId,
                              assetId: asset.id,
                              isPrimary: true,
                            },
                            { onSuccess: refreshGallery }
                          )
                        }
                        className="text-xs font-bold text-primary hover:underline"
                      >
                        მთავარ ფოტოდ
                      </button>
                    ) : (
                      <span className="text-xs text-muted-foreground">
                        გალერეა
                      </span>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {asset.width}×{asset.height}
                    </span>
                  </div>
                  <label className="block text-xs font-bold text-muted-foreground">
                    Alt ტექსტი
                    <input
                      defaultValue={asset.altText ?? ""}
                      disabled={role !== "owner"}
                      onBlur={event => {
                        if (event.currentTarget.value !== (asset.altText ?? ""))
                          updateAsset.mutate({
                            organizationId,
                            assetId: asset.id,
                            altText: event.currentTarget.value || null,
                          });
                      }}
                      className="mt-1 h-9 w-full rounded-lg border border-border bg-background px-2 text-xs text-foreground disabled:opacity-60"
                    />
                  </label>
                  {role === "owner" ? (
                    <div className="flex items-center justify-between">
                      <div className="flex gap-1">
                        <button
                          disabled={index === 0 || updateAsset.isPending}
                          onClick={() => void moveAsset(asset.id, -1)}
                          className="grid size-9 place-items-center rounded-lg border border-border disabled:opacity-40"
                          aria-label="ფოტოს ზემოთ გადატანა"
                        >
                          <ChevronUp className="size-4" />
                        </button>
                        <button
                          disabled={
                            index === selectedAssets.length - 1 ||
                            updateAsset.isPending
                          }
                          onClick={() => void moveAsset(asset.id, 1)}
                          className="grid size-9 place-items-center rounded-lg border border-border disabled:opacity-40"
                          aria-label="ფოტოს ქვემოთ გადატანა"
                        >
                          <ChevronDown className="size-4" />
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <label
                          className="grid size-9 cursor-pointer place-items-center rounded-lg border border-border"
                          title="ფოტოს ჩანაცვლება"
                        >
                          <ImagePlus className="size-4" />
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={event => {
                              void uploadImages(event.target.files, asset.id);
                              event.currentTarget.value = "";
                            }}
                            className="sr-only"
                          />
                        </label>
                        <button
                          onClick={() =>
                            archiveAsset.mutate(
                              { organizationId, assetId: asset.id },
                              { onSuccess: refreshGallery }
                            )
                          }
                          className="grid size-9 place-items-center rounded-lg border border-destructive/30 text-destructive"
                          aria-label="ფოტოს წაშლა"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              </article>
            ))}
            {!selectedAssets.length ? (
              <StatePanel
                kind="empty"
                title="ფოტო ჯერ არ არის"
                description="პროდუქტის ბარათზე ძირითადი ფოტო გამოჩნდება ატვირთვისთანავე; AI ფასს ან ორიგინალობას ფოტოდან არ განსაზღვრავს."
              />
            ) : null}
          </div>
        </section>
      ) : null}
      {preview.data ? (
        <section className="rounded-2xl border border-border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-black">Import preview</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {preview.data.validRows.length} valid ·{" "}
                {preview.data.errors.length} invalid row
              </p>
            </div>
            <button
              onClick={() =>
                filePayload &&
                commit.mutate(
                  { organizationId, ...filePayload, importId: preview.data.importId },
                  {
                    onSuccess: () => {
                      setFilePayload(null);
                      void products.refetch();
                    },
                  }
                )
              }
              disabled={commit.isPending || !preview.data.validRows.length}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"
            >
              <CheckCircle2 className="size-4" />
              {commit.isPending ? "ინახება…" : "valid rows-ის შენახვა"}
            </button>
          </div>
          {preview.data.errors.length ? (
            <div className="mt-4 rounded-xl bg-destructive/10 p-3 text-xs text-destructive">
              {preview.data.errors.slice(0, 4).map(error => (
                <p key={`${error.row}-${error.message}`}>
                  სტრიქონი {error.row}: {error.message}
                </p>
              ))}
            </div>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}

export function WorkspaceKnowledgeScreen({
  organizationId,
  role,
}: WorkspaceProps) {
  const facts = trpc.nexareply.workspace.knowledge.list.useQuery({
    organizationId,
  });
  const create = trpc.nexareply.workspace.knowledge.create.useMutation();
  const archive = trpc.nexareply.workspace.knowledge.archive.useMutation();
  const [form, setForm] = useState({
    title: "",
    body: "",
    category: "delivery",
  });
  const categories = [
    "delivery",
    "payment",
    "location",
    "authenticity",
    "returns",
    "policy",
  ];
  const labels: Record<string, string> = {
    delivery: "მიწოდება",
    payment: "გადახდა",
    location: "ლოკაცია",
    authenticity: "ორიგინალობა",
    returns: "დაბრუნება",
    policy: "მაღაზიის პოლიტიკა",
  };
  if (facts.isLoading)
    return (
      <div className="mt-5">
        <StatePanel
          kind="loading"
          title="ცოდნის ბაზა იტვირთება"
          description="AI-სთვის დამტკიცებული ცოდნის ჩანაწერები იტვირთება."
        />
      </div>
    );
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300">VERIFIED SOURCE</span><p className="text-sm font-bold text-primary">AI-safe answers</p></div>
          <h2 className="mt-1 text-xl font-extrabold">ცოდნის ბაზა</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            აქ დამატებული facts არის AI კონსულტანტის ერთადერთი policy source. თუ
            პასუხი არ მოიძებნა, სისტემა ticket-ს ქმნის.
          </p>
        </div>
        <div className="mt-5 grid gap-3">
          {facts.data?.map(fact => (
            <article
              key={fact.id}
              className="rounded-2xl border border-emerald-500/15 bg-background/35 p-4 transition-colors hover:border-primary/30"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                    {labels[fact.category] ?? fact.category}
                  </span>
                  <h3 className="mt-3 font-extrabold">{fact.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    {fact.body}
                  </p>
                </div>
                {role === "owner" ? (
                  <button
                    onClick={() =>
                      archive.mutate(
                        { organizationId, id: fact.id },
                        { onSuccess: () => void facts.refetch() }
                      )
                    }
                    className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
                    aria-label="Fact არქივში"
                  >
                    <Archive className="size-4" />
                  </button>
                ) : null}
              </div>
            </article>
          ))}
          {!facts.data?.length ? (
            <StatePanel
              kind="empty"
              title="ცოდნის ბაზა ჯერ ცარიელია"
              description="დაამატეთ მხოლოდ თქვენი ბიზნესის დადასტურებული მიწოდების, გადახდის, ლოკაციის, ორიგინალობისა და დაბრუნების პირობები."
            />
          ) : null}
        </div>
      </section>
      <aside className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">
        <div className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="size-4" /></span><h2 className="font-extrabold">ახალი policy fact</h2></div>
        <form
          className="mt-5 space-y-3"
          onSubmit={event => {
            event.preventDefault();
            create.mutate(
              { organizationId, ...form },
              {
                onSuccess: () => {
                  setForm({ title: "", body: "", category: "delivery" });
                  void facts.refetch();
                },
              }
            );
          }}
        >
          <label className="block text-xs font-bold text-muted-foreground">
            კატეგორია
            <select
              value={form.category}
              onChange={event =>
                setForm({ ...form, category: event.target.value })
              }
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            >
              {categories.map(category => (
                <option key={category} value={category}>
                  {labels[category]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-xs font-bold text-muted-foreground">
            სათაური
            <input
              required
              value={form.title}
              onChange={event =>
                setForm({ ...form, title: event.target.value })
              }
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
            />
          </label>
          <label className="block text-xs font-bold text-muted-foreground">
            დადასტურებული პასუხი
            <textarea
              required
              value={form.body}
              onChange={event => setForm({ ...form, body: event.target.value })}
              className="mt-1 min-h-28 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
            />
          </label>
          <button
            disabled={role !== "owner" || create.isPending}
            className="min-h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {create.isPending ? "ინახება…" : "Fact-ის დამატება"}
          </button>
        </form>
      </aside>
    </div>
  );
}

export function WorkspaceKnowledgeComposerScreen({
  organizationId,
  role,
}: WorkspaceProps) {
  const facts = trpc.nexareply.workspace.knowledge.list.useQuery({
    organizationId,
  });
  const drafts = trpc.nexareply.workspace.knowledge.drafts.list.useQuery(
    { organizationId },
    { enabled: role === "owner" }
  );
  const generate =
    trpc.nexareply.workspace.knowledge.drafts.generate.useMutation();
  const approve =
    trpc.nexareply.workspace.knowledge.drafts.approve.useMutation();
  const reject = trpc.nexareply.workspace.knowledge.drafts.reject.useMutation();
  const updateDraft =
    trpc.nexareply.workspace.knowledge.drafts.update.useMutation();
  const create = trpc.nexareply.workspace.knowledge.create.useMutation();
  const archive = trpc.nexareply.workspace.knowledge.archive.useMutation();
  const [composer, setComposer] = useState({
    title: "მაღაზიის წესები",
    originalText: "",
  });
  const [selectedDraftIds, setSelectedDraftIds] = useState<number[]>([]);
  const [manual, setManual] = useState({
    title: "",
    body: "",
    category: "delivery",
  });
  const labels: Record<string, string> = {
    delivery: "მიწოდება",
    payment: "გადახდა",
    location: "ლოკაცია",
    authenticity: "ორიგინალობა",
    returns: "დაბრუნება",
    policy: "მაღაზიის პოლიტიკა",
    general: "ზოგადი",
  };
  const draftCategories = [
    "delivery",
    "payment",
    "location",
    "authenticity",
    "returns",
    "policy",
    "general",
  ] as const;
  const sourceGroups = useMemo(() => {
    const groups = new Map<number, { source: any; drafts: any[] }>();
    (drafts.data ?? []).forEach(row => {
      const current = groups.get(row.source.id) ?? {
        source: row.source,
        drafts: [],
      };
      current.drafts.push(row.draft);
      groups.set(row.source.id, current);
    });
    return Array.from(groups.values());
  }, [drafts.data]);
  const refresh = () => {
    void facts.refetch();
    void drafts.refetch();
  };
  const toggleDraft = (id: number) =>
    setSelectedDraftIds(current =>
      current.includes(id)
        ? current.filter(item => item !== id)
        : [...current, id]
    );
  if (facts.isLoading)
    return (
      <div className="mt-5">
        <StatePanel
          kind="loading"
          title="ცოდნის ბაზა იტვირთება"
          description="დამტკიცებული facts და pending drafts იტვირთება."
        />
      </div>
    );
  return (
    <div className="mt-5 space-y-5">
      <section className="rounded-2xl border border-primary/20 bg-[linear-gradient(135deg,rgba(124,58,237,.08),transparent_58%)] p-5 sm:p-6">
        <p className="text-sm font-bold text-primary">თქვით თქვენი სიტყვებით</p>
        <h2 className="mt-1 text-xl font-black">
          მაღაზიის ცოდნა approval-first რეჟიმში
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          ჩასვით მიწოდების, გადახდის, ლოკაციის, ორიგინალობის, დაბრუნების ან სხვა
          წესები. AI მხოლოდ სტრუქტურირებულ draft-ს შემოგთავაზებთ; არაფერი
          დაემატება პასუხების წყაროში თქვენს დამტკიცებამდე.
        </p>
        {role === "owner" ? (
          <form
            className="mt-5 grid gap-3"
            onSubmit={event => {
              event.preventDefault();
              generate.mutate(
                { organizationId, ...composer },
                {
                  onSuccess: () => {
                    setComposer({ title: "მაღაზიის წესები", originalText: "" });
                    refresh();
                  },
                }
              );
            }}
          >
            <label className="text-xs font-bold text-muted-foreground">
              წყაროს სათაური
              <input
                required
                value={composer.title}
                onChange={event =>
                  setComposer({ ...composer, title: event.target.value })
                }
                className="mt-1 h-11 w-full rounded-xl border border-border bg-card px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
            <label className="text-xs font-bold text-muted-foreground">
              რას უნდა იცნობდეს NexaReply?
              <textarea
                required
                minLength={20}
                maxLength={8000}
                value={composer.originalText}
                onChange={event =>
                  setComposer({ ...composer, originalText: event.target.value })
                }
                placeholder="მაგალითად: მიწოდების ფასი და პირობები, გადახდის მეთოდები, დაბრუნების წესი, მისამართი და სამუშაო საათები…"
                className="mt-1 min-h-36 w-full rounded-xl border border-border bg-card p-3 text-sm leading-6 text-foreground outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                {composer.originalText.length}/8000 · ტექსტი ინახება source-ად
                audit-ისთვის.
              </p>
              <button
                disabled={
                  generate.isPending || composer.originalText.trim().length < 20
                }
                className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                <Sparkles className="size-4" />
                {generate.isPending
                  ? "Draft მზადდება…"
                  : "სტრუქტურირებული draft-ის შექმნა"}
              </button>
            </div>
            {generate.isError ? (
              <p className="rounded-xl bg-destructive/10 p-3 text-sm text-destructive">
                სტრუქტურირებული draft ვერ შეიქმნა. ტექსტი არ დამტკიცებულა და AI
                პასუხებში არ გამოიყენება.
              </p>
            ) : null}
          </form>
        ) : (
          <p className="mt-4 rounded-xl border border-border bg-card/70 p-4 text-sm leading-6 text-muted-foreground">
            Knowledge draft-ის გენერირება და დამტკიცება მხოლოდ ორგანიზაციის
            მფლობელს შეუძლია. თქვენ ხედავთ მხოლოდ დამტკიცებულ rules-ს ქვემოთ.
          </p>
        )}
      </section>

      {role === "owner" ? (
        <section className="rounded-2xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-primary">
                დასამტკიცებელი drafts
              </p>
              <h2 className="mt-1 text-xl font-black">
                წყაროს მიხედვით გადახედვა
              </h2>
            </div>
            <span className="rounded-xl bg-secondary px-3 py-2 text-sm font-bold">
              {
                (drafts.data ?? []).filter(
                  row => row.draft.status === "pending"
                ).length
              }{" "}
              pending
            </span>
          </div>
          {drafts.isLoading ? (
            <div className="mt-5">
              <StatePanel
                kind="loading"
                title="Draft-ები იტვირთება"
                description="Source და approval state მოწმდება."
              />
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              {sourceGroups.map(({ source, drafts: sourceDrafts }) => {
                const pending = sourceDrafts.filter(
                  draft => draft.status === "pending"
                );
                const selected = pending.filter(draft =>
                  selectedDraftIds.includes(draft.id)
                );
                return (
                  <article
                    key={source.id}
                    className="rounded-xl border border-border p-4"
                  >
                    <div className="flex flex-col justify-between gap-3 sm:flex-row">
                      <div>
                        <p className="font-black">{source.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          ვერსია {source.version} · {dateTime(source.createdAt)}{" "}
                          · {source.status}
                        </p>
                      </div>
                      {pending.length ? (
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() =>
                              approve.mutate(
                                {
                                  organizationId,
                                  sourceId: source.id,
                                  draftIds: (selected.length
                                    ? selected
                                    : pending
                                  ).map(draft => draft.id),
                                },
                                {
                                  onSuccess: () => {
                                    setSelectedDraftIds([]);
                                    refresh();
                                  },
                                }
                              )
                            }
                            disabled={approve.isPending}
                            className="min-h-10 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground"
                          >
                            {approve.isPending
                              ? "ინახება…"
                              : selected.length
                                ? `არჩეულის დამტკიცება (${selected.length})`
                                : "ყველას დამტკიცება"}
                          </button>
                        </div>
                      ) : null}
                    </div>
                    <details className="mt-3 rounded-lg bg-secondary/40 p-3">
                      <summary className="cursor-pointer text-xs font-bold">
                        ორიგინალი ტექსტის ნახვა
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                        {source.originalText}
                      </p>
                    </details>
                    <div className="mt-3 grid gap-3">
                      {sourceDrafts.map(draft => (
                        <div
                          key={draft.id}
                          className={`rounded-xl border p-3 ${draft.status === "approved" ? "border-emerald-500/30 bg-emerald-500/5" : draft.status === "rejected" ? "border-border bg-secondary/30 opacity-70" : "border-border"}`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={selectedDraftIds.includes(draft.id)}
                              disabled={draft.status !== "pending"}
                              onChange={() => toggleDraft(draft.id)}
                              className="mt-1 size-4 accent-primary"
                              aria-label={`${draft.title} დასამტკიცებლად არჩევა`}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded-full bg-primary/10 px-2 py-1 text-[11px] font-bold text-primary">
                                  {labels[draft.category] ?? draft.category}
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  ნდობა: {draft.confidence}%
                                </span>
                                <span className="text-[11px] text-muted-foreground">
                                  {draft.status}
                                </span>
                              </div>
                              <h3 className="mt-2 font-bold">{draft.title}</h3>
                              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                                {draft.body}
                              </p>
                              {draft.status === "pending" ? (
                                <details className="mt-3">
                                  <summary className="cursor-pointer text-xs font-bold text-primary">
                                    Draft-ის შესწორება
                                  </summary>
                                  <form
                                    className="mt-3 grid gap-2"
                                    onSubmit={event => {
                                      event.preventDefault();
                                      const form = new FormData(
                                        event.currentTarget
                                      );
                                      updateDraft.mutate(
                                        {
                                          organizationId,
                                          draftId: draft.id,
                                          title: String(
                                            form.get("title") ?? ""
                                          ),
                                          body: String(form.get("body") ?? ""),
                                          category: String(
                                            form.get("category") ?? "general"
                                          ) as (typeof draftCategories)[number],
                                        },
                                        { onSuccess: refresh }
                                      );
                                    }}
                                  >
                                    <input
                                      name="title"
                                      defaultValue={draft.title}
                                      className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                                    />
                                    <select
                                      name="category"
                                      defaultValue={draft.category}
                                      className="h-9 rounded-lg border border-border bg-background px-2 text-sm text-foreground"
                                    >
                                      {draftCategories.map(category => (
                                        <option key={category} value={category}>
                                          {labels[category]}
                                        </option>
                                      ))}
                                    </select>
                                    <textarea
                                      name="body"
                                      defaultValue={draft.body}
                                      className="min-h-20 rounded-lg border border-border bg-background p-2 text-sm text-foreground"
                                    />
                                    <button
                                      disabled={updateDraft.isPending}
                                      className="min-h-9 w-fit rounded-lg border border-border px-3 text-xs font-bold"
                                    >
                                      {updateDraft.isPending
                                        ? "ინახება…"
                                        : "შესწორების შენახვა"}
                                    </button>
                                  </form>
                                </details>
                              ) : null}
                            </div>
                            {draft.status === "pending" ? (
                              <button
                                onClick={() =>
                                  reject.mutate(
                                    { organizationId, draftId: draft.id },
                                    { onSuccess: refresh }
                                  )
                                }
                                className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
                                aria-label={`${draft.title} draft-ის უარყოფა`}
                              >
                                <X className="size-4" />
                              </button>
                            ) : null}
                          </div>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
              {!sourceGroups.length ? (
                <StatePanel
                  kind="empty"
                  title="Pending source ჯერ არ არის"
                  description="მაღაზიის ტექსტის გენერაციის შემდეგ აქ გამოჩნდება editable, დასამტკიცებელი facts."
                />
              ) : null}
            </div>
          )}
        </section>
      ) : null}

      <section className="grid gap-5 xl:grid-cols-[1fr_360px]">
        <div className="rounded-2xl border border-border bg-card p-6">
          <p className="text-sm font-bold text-primary">AI-safe answers</p>
          <h2 className="mt-1 text-xl font-black">დამტკიცებული ცოდნის ბაზა</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            ამ სიაში მხოლოდ owner-ის მიერ დამტკიცებული facts შედის. სწორედ ეს
            მონაცემი შეიძლება გამოიყენოს AI კონსულტანტმა.
          </p>
          <div className="mt-5 grid gap-3">
            {facts.data?.map(fact => (
              <article
                key={fact.id}
                className="rounded-xl border border-border p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                      {labels[fact.category] ?? fact.category}
                    </span>
                    <h3 className="mt-3 font-black">{fact.title}</h3>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">
                      {fact.body}
                    </p>
                  </div>
                  {role === "owner" ? (
                    <button
                      onClick={() =>
                        archive.mutate(
                          { organizationId, id: fact.id },
                          { onSuccess: () => void facts.refetch() }
                        )
                      }
                      className="rounded-lg p-2 text-muted-foreground hover:bg-secondary"
                      aria-label="Fact არქივში"
                    >
                      <Archive className="size-4" />
                    </button>
                  ) : null}
                </div>
              </article>
            ))}
            {!facts.data?.length ? (
              <StatePanel
                kind="empty"
                title="დამტკიცებული ცოდნა ჯერ არ არის"
                description="დაამატეთ manual fact ან შექმენით draft თქვენი მაღაზიის ტექსტიდან."
              />
            ) : null}
          </div>
        </div>
        <aside className="rounded-2xl border border-border bg-card p-6">
          <h2 className="font-black">Manual fact</h2>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            თუ კონკრეტული წესი უკვე ზუსტად იცით, შეგიძლიათ პირდაპირ დაამატოთ
            როგორც დამტკიცებული fact.
          </p>
          <form
            className="mt-5 space-y-3"
            onSubmit={event => {
              event.preventDefault();
              create.mutate(
                { organizationId, ...manual },
                {
                  onSuccess: () => {
                    setManual({ title: "", body: "", category: "delivery" });
                    void facts.refetch();
                  },
                }
              );
            }}
          >
            <label className="block text-xs font-bold text-muted-foreground">
              კატეგორია
              <select
                value={manual.category}
                onChange={event =>
                  setManual({ ...manual, category: event.target.value })
                }
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              >
                {Object.entries(labels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs font-bold text-muted-foreground">
              სათაური
              <input
                required
                value={manual.title}
                onChange={event =>
                  setManual({ ...manual, title: event.target.value })
                }
                className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground"
              />
            </label>
            <label className="block text-xs font-bold text-muted-foreground">
              დადასტურებული პასუხი
              <textarea
                required
                value={manual.body}
                onChange={event =>
                  setManual({ ...manual, body: event.target.value })
                }
                className="mt-1 min-h-28 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"
              />
            </label>
            <button
              disabled={role !== "owner" || create.isPending}
              className="min-h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
            >
              {create.isPending ? "ინახება…" : "Fact-ის დამატება"}
            </button>
          </form>
        </aside>
      </section>
    </div>
  );
}

export function WorkspaceSettingsScreen({ organizationId, role, onNavigate }: OverviewProps) {
  const entitlements = trpc.nexareply.workspace.entitlements.useQuery({ organizationId });
  const assistant = trpc.nexareply.workspace.assistant.settings.useQuery({ organizationId });
  const alerts = trpc.nexareply.workspace.notifications.list.useQuery({ organizationId });
  const meta = trpc.nexareply.workspace.owner.meta.status.useQuery({ organizationId }, { enabled: role === "owner" });
  const [showPlanDetails, setShowPlanDetails] = useState(false);
  if (entitlements.isLoading || assistant.isLoading || alerts.isLoading || meta.isLoading) {
    return <div className="mt-5"><StatePanel kind="loading" title="პარამეტრები იტვირთება" description="Workspace-ის რეალური AI, არხის, alert და plan მდგომარეობა მოწმდება." /></div>;
  }
  const unread = alerts.data?.filter(item => !item.readAt).length ?? 0;
  const cards = [
    { icon: Bot, title: "AI პასუხის წესები", detail: assistant.data?.aiPersona || "პერსონა ჯერ არ არის კონფიგურირებული", status: assistant.data?.aiTone || "უსაფრთხო fallback", action: "assistant", actionLabel: "AI კონსულტანტის გახსნა" },
    { icon: ShieldCheck, title: "Meta Messenger", detail: role === "owner" ? (meta.data?.page?.name ?? "Page არ არის დაკავშირებული") : "მდგომარეობას owner მართავს", status: role === "owner" && meta.data?.status === "connected" ? "დაკავშირებულია" : "შემოწმება საჭიროა", action: "integration", actionLabel: "ინტეგრაციის ნახვა" },
    { icon: BellRing, title: "Owner notifications", detail: `${unread} წაუკითხავი შეტყობინება`, status: "in-app alerts", action: "notifications", actionLabel: "შეტყობინებების გახსნა" },
    { icon: UserRoundCheck, title: "წევრები და წვდომა", detail: `${entitlements.data?.memberLimit ?? 0} წევრის ლიმიტი ამ plan-ზე`, status: "owner-only მართვა", action: "members", actionLabel: "წევრების მართვა" },
  ];
  return <div className="mt-5 space-y-5">
    <section className="nr-onboarding-card rounded-3xl border border-border bg-card p-6 shadow-sm">
      <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start"><div><p className="text-sm font-bold text-primary">ორგანიზაციის მართვა</p><h2 className="mt-1 text-2xl font-black">პარამეტრები და onboarding</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">აქ ნახავთ მხოლოდ ამ workspace-ის რეალურ კონფიგურაციას. Demo-ის მსგავსად ერთ სივრცეშია თავმოყრილი AI, Meta, alerts, წევრები და plan-ის მდგომარეობა; საიდუმლო token-ები არასოდეს ჩანს.</p></div><span className="rounded-full bg-secondary px-3 py-1.5 text-xs font-bold text-secondary-foreground">{entitlements.data?.planCode ?? "plan"}</span></div>
      <div className="mt-5 grid gap-4 md:grid-cols-2">{cards.map(card => { const Icon = card.icon; return <article key={card.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-secondary text-primary"><Icon className="size-5" /></span><div><h3 className="font-black">{card.title}</h3><p className="mt-1 text-xs text-muted-foreground">{card.status}</p></div></div><span className="size-2 rounded-full bg-emerald-500" aria-label="მონაცემი ხელმისაწვდომია" /></div><p className="mt-4 min-h-10 text-sm leading-6 text-muted-foreground">{card.detail}</p><button type="button" onClick={() => onNavigate(card.action)} className="mt-4 text-xs font-black text-primary underline-offset-4 hover:underline">{card.actionLabel} →</button></article>; })}</div>
    </section>
    <section className="nr-overview-panel rounded-3xl border border-border bg-card p-6 shadow-sm"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-primary">გეგმა და გამოყენება</p><h3 className="mt-1 text-xl font-black">{entitlements.data?.subscriptionStatus ?? "მდგომარეობა უცნობია"}</h3><p className="mt-2 text-sm text-muted-foreground">AI automation: {entitlements.data?.aiAutomation ? "ჩართულია" : "ამ ეტაპზე გამორთულია"} · channels: {entitlements.data?.channels ?? 0} · წევრების ლიმიტი: {entitlements.data?.memberLimit ?? 0}</p><p className="mt-1 text-xs text-muted-foreground">AI პასუხების თვიური ლიმიტი: {entitlements.data?.monthlyAiReplies ?? 0}{entitlements.data?.trialEndsAt ? ` · trial სრულდება ${dateTime(entitlements.data.trialEndsAt)}` : ""}</p><p className="mt-2 text-xs text-muted-foreground">რეალური billing/checkout ჯერ არ არის ჩართული; ეს მონაცემები server-side plan entitlement-იდან მოდის.</p></div><span className="rounded-xl bg-secondary px-3 py-2 text-xs font-bold text-secondary-foreground">server-side entitlement</span></div></section>
    <section className="rounded-3xl border border-dashed border-primary/25 bg-primary/5 p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-black text-primary">Upgrade მზადყოფნა</p><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">გეგმის შეზღუდვები server-ზე კონტროლდება. გადახდა ჯერ ხელმისაწვდომი არ არის, ამიტომ არც თანხა ჩამოიჭრება და არც subscription შეიცვლება.</p></div><button type="button" aria-expanded={showPlanDetails} onClick={() => setShowPlanDetails(value => !value)} className="min-h-11 rounded-xl border border-primary/30 bg-card px-4 text-sm font-bold text-primary transition-colors hover:bg-primary/10">{showPlanDetails ? "დეტალების დამალვა" : "გეგმის დეტალები"}</button></div>{showPlanDetails ? <div className="mt-4 grid gap-3 border-t border-primary/15 pt-4 text-sm sm:grid-cols-3"><p><span className="block text-xs font-bold uppercase tracking-[.08em] text-muted-foreground">AI პასუხები</span><span className="mt-1 block font-black">{entitlements.data?.monthlyAiReplies ?? 0}/თვე</span></p><p><span className="block text-xs font-bold uppercase tracking-[.08em] text-muted-foreground">არხები</span><span className="mt-1 block font-black">{entitlements.data?.channels ?? 0}</span></p><p><span className="block text-xs font-bold uppercase tracking-[.08em] text-muted-foreground">წევრები</span><span className="mt-1 block font-black">{entitlements.data?.memberLimit ?? 0}</span></p><p className="sm:col-span-3" role="status">Checkout/provider ინტეგრაცია owner-ის არჩევისა და ცალკე დადასტურების შემდეგ დაემატება.</p></div> : null}</section>
  </div>;
}

export function WorkspaceAssistantScreen({
  organizationId,
  role,
}: WorkspaceProps) {
  const settings = trpc.nexareply.workspace.assistant.settings.useQuery({
    organizationId,
  });
  const update = trpc.nexareply.workspace.assistant.update.useMutation();
  const catalog = trpc.nexareply.workspace.products.list.useQuery({
    organizationId,
  });
  const facts = trpc.nexareply.workspace.knowledge.list.useQuery({
    organizationId,
  });
  const [form, setForm] = useState({
    aiPersona: "",
    aiTone: "",
    replyLength: "normal" as "short" | "normal" | "detailed",
    fallbackMessage: "",
  });
  useEffect(() => {
    if (settings.data) setForm(settings.data);
  }, [settings.data]);
  if (settings.isLoading)
    return (
      <div className="mt-5">
        <StatePanel
          kind="loading"
          title="AI კონსულტანტი იტვირთება"
          description="Persistent persona და safe-reply წესები იტვირთება."
        />
      </div>
    );
  return (
    <div className="mt-5 grid gap-5 xl:grid-cols-[1fr_360px]">
      <section className="rounded-2xl border border-border bg-card p-6">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-primary text-primary-foreground">
            <Bot className="size-5" />
          </span>
          <div>
            <p className="text-sm font-bold text-primary">თქვენი AI კონსულტანტი</p>
            <h2 className="mt-1 text-xl font-black">
              უსაფრთხო გაყიდვების კონსულტანტი
            </h2>
          </div>
        </div>
        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <MiniMetric
            label="კატალოგი"
            value={catalog.data?.length ?? 0}
            hint="AI-სთვის ხელმისაწვდომი პროდუქტი"
          />
          <MiniMetric
            label="policy facts"
            value={facts.data?.length ?? 0}
            hint="დადასტურებული პასუხები"
          />
          <MiniMetric
            label="უცნობი კითხვა"
            value="ticket"
            hint="ავტომატური handoff"
            accent="text-amber-500"
          />
        </div>
        <div className="mt-6 rounded-xl border border-primary/20 bg-primary/5 p-4 text-sm leading-6 text-muted-foreground">
          <p className="font-bold text-foreground">პასუხის წესები</p>
          <p className="mt-2">
            კონსულტანტი არ იგონებს ფასს, მარაგს, პროდუქტის თვისებას, delivery
            promise-ს ან მაღაზიის policy-ს. მხოლოდ persistent catalog/knowledge
            ჩანაწერიდან იღებს პასუხს; სხვა შემთხვევაში აჩერებს AI-ს, ქმნის open
            ticket-ს და owner alert-ს.
          </p>
        </div>
      </section>
      <aside className="rounded-2xl border border-border bg-card p-6">
        <h2 className="font-black">Persona settings</h2>
        <form
          className="mt-5 space-y-3"
          onSubmit={event => {
            event.preventDefault();
            update.mutate({ organizationId, ...form });
          }}
        >
          <label className="block text-xs font-bold text-muted-foreground">
            პერსონა
            <input
              disabled={role !== "owner"}
              value={form.aiPersona}
              onChange={event =>
                setForm({ ...form, aiPersona: event.target.value })
              }
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground disabled:opacity-60"
            />
          </label>
          <label className="block text-xs font-bold text-muted-foreground">
            ტონი
            <input
              disabled={role !== "owner"}
              value={form.aiTone}
              onChange={event =>
                setForm({ ...form, aiTone: event.target.value })
              }
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground disabled:opacity-60"
            />
          </label>
          <label className="block text-xs font-bold text-muted-foreground">
            პასუხის სიგრძე
            <select
              disabled={role !== "owner"}
              value={form.replyLength}
              onChange={event =>
                setForm({
                  ...form,
                  replyLength: event.target.value as typeof form.replyLength,
                })
              }
              className="mt-1 h-10 w-full rounded-xl border border-border bg-background px-3 text-sm text-foreground disabled:opacity-60"
            >
              <option value="short">მოკლე</option>
              <option value="normal">ნორმალური</option>
              <option value="detailed">დეტალური</option>
            </select>
          </label>
          <label className="block text-xs font-bold text-muted-foreground">
            Unknown კითხვა
            <textarea
              disabled={role !== "owner"}
              value={form.fallbackMessage}
              onChange={event =>
                setForm({ ...form, fallbackMessage: event.target.value })
              }
              className="mt-1 min-h-24 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground disabled:opacity-60"
            />
          </label>
          <button
            disabled={role !== "owner" || update.isPending}
            className="min-h-11 w-full rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
          >
            {update.isPending ? "ინახება…" : "პერსონის შენახვა"}
          </button>
        </form>
        {update.isError ? (
          <p className="mt-3 text-xs text-destructive">Settings ვერ შეინახა.</p>
        ) : null}
      </aside>
    </div>
  );
}

export function WorkspaceTicketsScreen({ organizationId }: WorkspaceProps) {
  const tickets = trpc.nexareply.workspace.tickets.list.useQuery({
    organizationId,
    status: "open",
  });
  const resolve = trpc.nexareply.workspace.tickets.resolve.useMutation();
  const [ticketFeedback, setTicketFeedback] = useState<string | null>(null);
  if (tickets.isLoading)
    return (
      <div className="mt-5">
        <StatePanel
          kind="loading"
          title="Tickets იტვირთება"
          description="AI escalation და human takeover tickets იტვირთება."
        />
      </div>
    );
  if (tickets.isError)
    return <div className="mt-5"><StatePanel kind="error" title="Tickets ვერ ჩაიტვირთა" description="მონაცემები არ შეცვლილა. სცადეთ ხელახლა." action={<button type="button" onClick={() => void tickets.refetch()} className="min-h-10 rounded-xl border border-border px-4 text-sm font-bold">განახლება</button>} /></div>;
  return (
    <div className="mt-5 rounded-3xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><TicketCheck className="size-5" /></span>
          <div>
            <p className="text-sm font-bold text-primary">Handoff queue</p>
            <h2 className="mt-1 text-xl font-extrabold">ღია tickets</h2>
          </div>
        </div>
        <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-3 py-1.5 text-xs font-bold text-amber-700 dark:text-amber-300">
          {tickets.data?.length ?? 0} ღია
        </span>
      </div>
      <div className="mt-5 grid gap-3">
        {tickets.data?.map(({ ticket, conversation }) => (
          <article
            key={ticket.id}
            className="flex flex-col justify-between gap-4 rounded-2xl border border-border/80 bg-background/50 p-4 transition-colors hover:border-primary/30 sm:flex-row sm:items-center"
          >
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-extrabold">{conversation.customerName}</p>
                <span
                  className={`rounded-full px-2 py-1 text-xs font-bold ${ticket.priority === "high" ? "bg-rose-100 text-rose-800" : "bg-secondary text-muted-foreground"}`}
                >
                  {ticket.priority === "high" ? "მაღალი" : "ნორმალური"}
                </span>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                მიზეზი: {ticket.reason} · საუბარი: {conversation.preview}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                {dateTime(ticket.createdAt)}
              </p>
            </div>
            <button
              onClick={() =>
                resolve.mutate(
                  { organizationId, ticketId: ticket.id },
                  { onSuccess: () => { setTicketFeedback("Ticket დასრულდა."); void tickets.refetch(); }, onError: () => setTicketFeedback("Ticket ვერ დასრულდა. სცადეთ ხელახლა.") }
                )
              }
              disabled={resolve.isPending}
              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold transition-colors hover:border-primary/40 hover:bg-primary/5"
            >
              <CheckCircle2 className="size-4 text-emerald-500" />
              {resolve.isPending ? "სრულდება…" : "დასრულება"}
            </button>
          </article>
        ))}
        {!tickets.data?.length ? (
          <StatePanel
            kind="empty"
            title="ღია ticket არ არის"
            description="უცნობი კითხვა, AI safety handoff ან ადამიანის ჩართვა აქ გამოჩნდება persistent queue-ად."
          />
        ) : null}
        {ticketFeedback ? <p role="status" className={`text-sm ${resolve.isError ? "text-destructive" : "text-emerald-700 dark:text-emerald-300"}`}>{ticketFeedback}</p> : null}
      </div>
    </div>
  );
}

export function WorkspaceAnalyticsScreen({ organizationId }: WorkspaceProps) {
  const analytics = trpc.nexareply.workspace.analytics.useQuery({
    organizationId,
  });
  if (analytics.isLoading)
    return (
      <div className="mt-5">
        <StatePanel
          kind="loading"
          title="ანალიტიკა იტვირთება"
          description="Persistent message, lead და draft-order მონაცემები ითვლება."
        />
      </div>
    );
  if (analytics.isError)
    return (
      <div className="mt-5">
        <StatePanel
          kind="error"
          title="ანალიტიკა ვერ ჩაიტვირთა"
          description="სცადეთ განახლება."
          action={
            <button
              onClick={() => void analytics.refetch()}
              className="rounded-xl border border-border px-4 py-2 text-sm font-bold"
            >
              განახლება
            </button>
          }
        />
      </div>
    );
  const data = analytics.data!;
  const max = Math.max(
    1,
    ...data.dailyVolume.map(
      (row: { day: string; ai: number; human: number }) => row.ai + row.human
    )
  );
  return (
    <div className="mt-5 space-y-5">
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MiniMetric
          label="საუბრები"
          value={data.conversationCount}
          hint="ყველა persistent thread"
        />
        <MiniMetric
          label="AI vs human"
          value={`${data.aiReplies} / ${data.humanReplies}`}
          hint="შენახული პასუხები"
        />
        <MiniMetric
          label="handoff"
          value={data.handoffs}
          hint="AI paused ან human active"
          accent="text-amber-500"
        />
        <MiniMetric
          label="draft orders"
          value={data.draftOrderCount}
          hint="დასადასტურებელი შეკვეთები"
          accent="text-emerald-500"
        />
      </section>
      <section className="rounded-3xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="grid size-10 place-items-center rounded-2xl bg-ai/10 text-ai"><BarChart3 className="size-5" /></span>
            <div>
              <p className="text-sm font-bold text-primary">Message volume</p>
              <h2 className="mt-1 text-xl font-extrabold">
                AI და ოპერატორის პასუხები დღეების მიხედვით
              </h2>
            </div>
          </div>
          <span className="rounded-full border border-ai/20 bg-ai/10 px-3 py-1.5 text-xs font-bold text-ai">AI · ადამიანი</span>
        </div>
        {data.dailyVolume.length ? (
          <div className="mt-7 flex h-56 items-end gap-3">
            {data.dailyVolume.map(
              (row: { day: string; ai: number; human: number }) => (
                <div
                  key={row.day}
                  className="flex min-w-12 flex-1 flex-col items-center gap-2"
                >
                  <div className="flex w-full items-end justify-center gap-1">
                    <span
                      title={`AI: ${row.ai}`}
                      style={{
                        height: `${Math.max(5, (row.ai / max) * 170)}px`,
                      }}
                      className="w-4 rounded-t bg-primary shadow-[0_-4px_16px_rgba(20,184,166,.25)]"
                    />
                    <span
                      title={`Human: ${row.human}`}
                      style={{
                        height: `${Math.max(5, (row.human / max) * 170)}px`,
                      }}
                      className="w-4 rounded-t bg-ai shadow-[0_-4px_16px_rgba(124,58,237,.2)]"
                    />
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {row.day}
                  </span>
                </div>
              )
            )}
          </div>
        ) : (
          <StatePanel
            kind="empty"
            title="ანალიტიკისთვის ჯერ მონაცემი არ არის"
            description="Messenger საუბრის, AI draft-ისა და ოპერატორის პასუხის შემდეგ აქ გამოჩნდება რეალური operational metrics."
          />
        )}
      </section>
    </div>
  );
}

export function WorkspaceAlertsScreen({ organizationId }: WorkspaceProps) {
  const alerts = trpc.nexareply.workspace.notifications.list.useQuery({
    organizationId,
  });
  const markRead =
    trpc.nexareply.workspace.notifications.markRead.useMutation();
  const [alertFeedback, setAlertFeedback] = useState<string | null>(null);
  if (alerts.isLoading)
    return (
      <div className="mt-5">
        <StatePanel
          kind="loading"
          title="Alerts იტვირთება"
          description="Persistent owner და operator notifications იტვირთება."
        />
      </div>
    );
  if (alerts.isError)
    return <div className="mt-5"><StatePanel kind="error" title="შეტყობინებები ვერ ჩაიტვირთა" description="მონაცემები არ შეცვლილა. სცადეთ ხელახლა." action={<button type="button" onClick={() => void alerts.refetch()} className="min-h-10 rounded-xl border border-border px-4 text-sm font-bold">განახლება</button>} /></div>;
  return (
    <div className="mt-5 rounded-3xl border border-border/80 bg-card p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-2xl bg-primary/10 text-primary"><BellRing className="size-5" /></span>
          <div>
            <p className="text-sm font-bold text-primary">Operational alerts</p>
            <h2 className="mt-1 text-xl font-extrabold">შეტყობინებები</h2>
          </div>
        </div>
        <span className="rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-xs font-bold text-primary">{(alerts.data ?? []).filter(item => !item.readAt).length} წაუკითხავი</span>
        <button
          onClick={() =>
            markRead.mutate(
              { organizationId },
              { onSuccess: () => { setAlertFeedback("შეტყობინებები წაკითხულად მოინიშნა."); void alerts.refetch(); }, onError: () => setAlertFeedback("შეტყობინებების მონიშვნა ვერ მოხერხდა.") }
            )
          }
          disabled={
            !alerts.data?.some(item => !item.readAt) || markRead.isPending
          }
          className="min-h-10 rounded-xl border border-border bg-card px-4 text-sm font-bold transition-colors hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
        >
          ყველას წაკითხვა
        </button>
      </div>
      <div className="mt-5 grid gap-3">
        {alerts.data?.map(alert => (
          <article
            key={alert.id}
            className={`rounded-2xl border p-4 transition-colors ${alert.readAt ? "border-border/80 bg-background/40" : "border-primary/30 bg-primary/5 shadow-sm"}`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><span className={`size-2 rounded-full ${alert.readAt ? "bg-muted-foreground/30" : "bg-primary"}`} aria-hidden="true" /><p className="font-extrabold">{alert.title}</p></div>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  {alert.body}
                </p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {dateTime(alert.createdAt)}
                </p>
              </div>
              {!alert.readAt ? (
                <button
                  onClick={() =>
                    markRead.mutate(
                      { organizationId, ids: [alert.id] },
                      { onSuccess: () => { setAlertFeedback("შეტყობინება წაკითხულად მოინიშნა."); void alerts.refetch(); }, onError: () => setAlertFeedback("შეტყობინების მონიშვნა ვერ მოხერხდა.") }
                    )
                  }
                  className="rounded-lg border border-border px-3 py-2 text-xs font-bold"
                >
                  წაკითხულია
                </button>
              ) : null}
            </div>
          </article>
        ))}
        {!alerts.data?.length ? (
          <StatePanel
            kind="empty"
            title="აქტიური alert არ არის"
            description="უცნობი კითხვა, handoff, high-priority lead და AI pause აქ ავტომატურად გამოჩნდება."
          />
        ) : null}
        {alertFeedback ? <p role="status" className={`text-sm ${markRead.isError ? "text-destructive" : "text-emerald-700 dark:text-emerald-300"}`}>{alertFeedback}</p> : null}
      </div>
    </div>
  );
}

export function WorkspaceInboxScreen({ organizationId, role }: WorkspaceProps) {
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | "open" | "pending" | "closed">(
    "all"
  );
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mobileThread, setMobileThread] = useState(false);
  const [reply, setReply] = useState("");
  const [handoffOpen, setHandoffOpen] = useState(false);
  const [handoffReason, setHandoffReason] = useState("");
  const conversations = trpc.nexareply.workspace.conversations.list.useQuery({
    organizationId,
    query: query || undefined,
    status: status === "all" ? undefined : status,
  });
  const thread = trpc.nexareply.workspace.conversations.messages.useQuery(
    { organizationId, conversationId: selectedId ?? 0 },
    { enabled: Boolean(selectedId) }
  );
  const context = trpc.nexareply.workspace.conversations.context.useQuery(
    { organizationId, conversationId: selectedId ?? 0 },
    { enabled: Boolean(selectedId) }
  );
  const pageStatus = trpc.nexareply.workspace.owner.meta.status.useQuery(
    { organizationId },
    { enabled: role === "owner" }
  );
  const draft =
    trpc.nexareply.workspace.conversations.createDraft.useMutation();
  const takeover =
    trpc.nexareply.workspace.conversations.takeover.useMutation();
  const handoff = trpc.nexareply.workspace.conversations.handoff.useMutation();
  const sendReply =
    trpc.nexareply.workspace.conversations.sendReply.useMutation();
  const selected =
    conversations.data?.find(item => item.id === selectedId) ??
    conversations.data?.[0];
  const activeConversationId = selected?.id ?? null;
  const refresh = () => {
    void conversations.refetch();
    if (activeConversationId) {
      void thread.refetch();
      void context.refetch();
    }
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(rawQuery.trim()), 280);
    return () => window.clearTimeout(timer);
  }, [rawQuery]);
  useEffect(() => {
    if (!selectedId && conversations.data?.[0])
      setSelectedId(conversations.data[0].id);
  }, [selectedId, conversations.data]);
  useEffect(() => {
    const latestDraft = [...(thread.data ?? [])]
      .reverse()
      .find(message => message.sender === "ai" && message.isDraft);
    if (latestDraft) setReply(latestDraft.body);
  }, [thread.data, selectedId]);
  useEffect(() => {
    setHandoffOpen(false);
    setHandoffReason("");
  }, [selectedId]);

  const deliveryTone: Record<string, string> = {
    received: "border-sky-500/25 bg-sky-500/10 text-sky-700 dark:text-sky-300",
    draft: "border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300",
    queued: "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300",
    sent: "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
    failed: "border-rose-500/25 bg-rose-500/10 text-rose-700 dark:text-rose-300",
  };
  const isPaused = Boolean(
    selected?.humanActive ||
    selected?.aiState === "needs_human" ||
    selected?.aiState === "paused"
  );
  const submitHandoff = () => {
    if (!activeConversationId || !handoffReason.trim()) return;
    handoff.mutate(
      {
        organizationId,
        conversationId: activeConversationId,
        reason: handoffReason.trim(),
        priority: selected?.priority === "high" ? "high" : "normal",
      },
      {
        onSuccess: () => {
          setHandoffOpen(false);
          setHandoffReason("");
          refresh();
        },
      }
    );
  };
  const contextPanel = selected ? (
    <aside
      className="border-t border-border bg-card p-4 xl:border-t-0 xl:border-l"
      aria-label="კლიენტის კონტექსტი"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.12em] text-primary">
            Customer context
          </p>
          <h2 className="mt-1 font-black">კლიენტის კონტექსტი</h2>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-[11px] font-bold ${selected.priority === "high" ? "bg-rose-100 text-rose-800" : "bg-secondary text-muted-foreground"}`}
        >
          {selected.priority === "high" ? "მაღალი" : "ნორმალური"}
        </span>
      </div>
      <div className="mt-4 grid gap-3">
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">ინტერესი</p>
          <p className="mt-1 text-sm font-bold">
            {selected.preferredProduct || "ჯერ არ არის მითითებული"}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-background p-3">
          <p className="text-xs text-muted-foreground">Messenger identity</p>
          <p className="mt-1 text-sm font-bold">
            {context.data?.customer?.hasMessengerIdentity
              ? "დაკავშირებულია"
              : "არ არის დადასტურებული"}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            ID და provider credential UI-ში არასოდეს ჩანს.
          </p>
        </div>
        <div
          className={`rounded-xl border p-3 ${isPaused ? "border-amber-500/30 bg-amber-500/10" : "border-emerald-500/25 bg-emerald-500/5"}`}
        >
          <p className="text-xs text-muted-foreground">AI რეჟიმი</p>
          <p className="mt-1 text-sm font-bold">
            {selected.humanActive
              ? "ადამიანმა ჩაიბარა"
              : selected.aiState === "needs_human"
                ? "ოპერატორია საჭირო"
                : "AI აქტიურია"}
          </p>
        </div>
        {context.data?.activeTicket ? (
          <div className="rounded-xl border border-rose-500/25 bg-rose-500/5 p-3">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-300">
              ღია handoff ticket #{context.data.activeTicket.id}
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              {context.data.activeTicket.reason}
            </p>
          </div>
        ) : null}
      </div>
      {!context.data?.activeTicket ? (
        <div className="mt-4">
          {handoffOpen ? (
            <div className="rounded-xl border border-border bg-background p-3">
              <label className="block text-xs font-bold text-muted-foreground">
                რატომ არის საჭირო handoff?
                <textarea
                  value={handoffReason}
                  onChange={event => setHandoffReason(event.target.value)}
                  maxLength={200}
                  placeholder="მაგალითად, შეკვეთის საბოლოო ფასის დადასტურება"
                  className="mt-2 min-h-20 w-full resize-y rounded-lg border border-border bg-card p-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
              </label>
              <div className="mt-2 flex gap-2">
                <button
                  onClick={submitHandoff}
                  disabled={!handoffReason.trim() || handoff.isPending}
                  className="min-h-10 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-50"
                >
                  {handoff.isPending ? "იქმნება…" : "Ticket-ის გახსნა"}
                </button>
                <button
                  onClick={() => setHandoffOpen(false)}
                  className="min-h-10 rounded-lg border border-border px-3 text-xs font-bold"
                >
                  გაუქმება
                </button>
              </div>
              {handoff.isError ? (
                <p className="mt-2 text-xs text-destructive">
                  Ticket ვერ შეიქმნა.
                </p>
              ) : null}
            </div>
          ) : (
            <button
              onClick={() => setHandoffOpen(true)}
              className="inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-bold hover:bg-secondary"
            >
              <TicketCheck className="size-4 text-primary" />
              Handoff ticket
            </button>
          )}
        </div>
      ) : null}
    </aside>
  ) : null;

  if (conversations.isLoading)
    return (
      <div className="mt-5">
        <StatePanel
          kind="loading"
          title="Inbox იტვირთება"
          description="ორგანიზაციის conversation list და persisted customer history იტვირთება."
        />
      </div>
    );
  if (conversations.isError)
    return (
      <div className="mt-5">
        <StatePanel
          kind="error"
          title="Inbox ვერ ჩაიტვირთა"
          description="მონაცემები არ შეცვლილა. სცადეთ ხელახლა."
          action={
            <button
              onClick={() => void conversations.refetch()}
              className="min-h-10 rounded-xl border border-border px-4 text-sm font-bold"
            >
              განახლება
            </button>
          }
        />
      </div>
    );
  return (
    <div className="mt-5 space-y-4">
      <section className="flex flex-col justify-between gap-3 rounded-3xl border border-primary/20 bg-primary/[.045] p-4 shadow-sm sm:flex-row sm:items-center">
        <div>
          <p className="text-sm font-bold text-primary">
            Inbox-ის სამუშაო რეჟიმი
          </p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            Draft მხოლოდ დამოწმებულ catalog/knowledge evidence-ზე იქმნება.
            ავტომატური დამუშავების 10-წამიანი გარანტია ჯერ durable worker
            hosting-ზეა დამოკიდებული.
          </p>
          {role === "owner" && pageStatus.data?.status === "connected" && pageStatus.data.page ? (
            <p className="mt-2 text-xs font-semibold text-emerald-700 dark:text-emerald-300">
              აქტიური Facebook გვერდი: {pageStatus.data.page.name}. გაგზავნილი ოპერატორის პასუხი ამ გვერდიდან მიდის.
            </p>
          ) : null}
        </div>
        <button
          onClick={refresh}
          className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-border bg-card px-3 text-sm font-bold"
        >
          <RefreshCw className="size-4" />
          განახლება
        </button>
      </section>
      <div className="overflow-hidden rounded-3xl border border-border/80 bg-card shadow-sm lg:grid lg:min-h-[680px] lg:grid-cols-[300px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)_290px]">
        <section
          className={`border-b border-border bg-secondary/20 lg:border-r lg:border-b-0 ${mobileThread ? "hidden lg:block" : "block"}`}
          aria-label="საუბრის სია"
        >
          <div className="border-b border-border p-4">
            <label className="sr-only" htmlFor="workspace-conversation-search">
              საუბრის ძიება
            </label>
            <input
              id="workspace-conversation-search"
              value={rawQuery}
              onChange={event => setRawQuery(event.target.value)}
              placeholder="სახელი, ტელეფონი ან ტექსტი"
              className="h-11 w-full rounded-xl border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
            />
            <div className="mt-3 flex gap-1 overflow-x-auto pb-1">
              {(["all", "open", "pending", "closed"] as const).map(item => (
                <button
                  key={item}
                  onClick={() => setStatus(item)}
                  className={`min-h-9 shrink-0 rounded-lg px-3 text-xs font-bold ${status === item ? "bg-primary text-primary-foreground" : "bg-background text-muted-foreground hover:bg-secondary"}`}
                >
                  {
                    {
                      all: "ყველა",
                      open: "ღია",
                      pending: "მოლოდინში",
                      closed: "დახურული",
                    }[item]
                  }
                </button>
              ))}
            </div>
            {rawQuery !== query ? (
              <p className="mt-2 text-xs text-muted-foreground">
                ძიება ახლდება…
              </p>
            ) : null}
          </div>
          <div className="max-h-[610px] overflow-y-auto">
            {conversations.data?.length ? (
              conversations.data.map(item => (
                <button
                  key={item.id}
                  onClick={() => {
                    setSelectedId(item.id);
                    setMobileThread(true);
                  }}
                  className={`w-full border-b border-border px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${selected?.id === item.id ? "bg-primary/10" : "hover:bg-secondary/60"}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-bold">{item.customerName}</p>
                      <p className="mt-1 truncate text-xs text-muted-foreground">
                        {item.preview || "ახალი საუბარი"}
                      </p>
                    </div>
                    <span className="shrink-0 text-[11px] text-muted-foreground">
                      {dateTime(item.lastMessageAt ?? item.updatedAt)}
                    </span>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {item.humanActive ? (
                      <span className="rounded-full bg-amber-100 px-2 py-1 text-[11px] font-bold text-amber-800">
                        ჩაბარებულია
                      </span>
                    ) : null}
                    {item.aiState === "needs_human" ? (
                      <span className="rounded-full bg-rose-100 px-2 py-1 text-[11px] font-bold text-rose-800">
                        ოპერატორი
                      </span>
                    ) : null}
                  </div>
                </button>
              ))
            ) : (
              <div className="p-5">
                <StatePanel
                  kind="empty"
                  title="საუბარი ვერ მოიძებნა"
                  description="შეცვალეთ საძიებო სიტყვა ან ფილტრი."
                />
              </div>
            )}
          </div>
        </section>
        <section
          className={`${mobileThread ? "block" : "hidden lg:block"} min-w-0`}
        >
          {!selected ? (
            <div className="grid min-h-[520px] place-items-center p-6">
              <StatePanel
                kind="empty"
                title="აირჩიეთ საუბარი"
                description="სიის ჩანაწერი გახსნის thread-ს, evidence-ს და customer context-ს."
              />
            </div>
          ) : (
            <>
              <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <button
                    onClick={() => setMobileThread(false)}
                    className="grid size-10 place-items-center rounded-xl border border-border lg:hidden"
                    aria-label="საუბრის სიაში დაბრუნება"
                  >
                    ←
                  </button>
                  <div className="min-w-0">
                    <h2 className="truncate font-extrabold">
                      {selected.customerName}
                    </h2>
                    <p className="truncate text-xs text-muted-foreground">
                      {selected.customerPhone || "ტელეფონი არ არის მითითებული"}{" "}
                      · {selected.preferredProduct || "ზოგადი კითხვა"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${isPaused ? "border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-300" : "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"}`}>
                        {isPaused ? "ადამიანის კონტროლი" : "AI აქტიურია"}
                      </span>
                      {role === "owner" && pageStatus.data?.status === "connected" && pageStatus.data.page ? (
                        <span className="max-w-[190px] truncate rounded-full border border-sky-500/25 bg-sky-500/10 px-2 py-1 text-[10px] font-bold text-sky-700 dark:text-sky-300" title={pageStatus.data.page.name}>
                          გვერდი: {pageStatus.data.page.name}
                        </span>
                      ) : null}
                      {selected.priority === "high" ? (
                        <span className="rounded-full border border-rose-500/25 bg-rose-500/10 px-2 py-1 text-[10px] font-bold text-rose-700 dark:text-rose-300">მაღალი პრიორიტეტი</span>
                      ) : null}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() =>
                    takeover.mutate(
                      {
                        organizationId,
                        conversationId: selected.id,
                        active: !selected.humanActive,
                      },
                      { onSuccess: refresh }
                    )
                  }
                  disabled={
                    takeover.isPending || selected.aiState === "needs_human"
                  }
                  className={`inline-flex min-h-10 items-center gap-2 rounded-xl px-3 text-sm font-bold disabled:opacity-50 ${selected.humanActive ? "border border-border" : "bg-amber-500 text-white"}`}
                >
                  <UserRoundCheck className="size-4" />
                  {takeover.isPending
                    ? "ინახება…"
                    : selected.humanActive
                      ? "AI განახლება"
                      : "AI pause / takeover"}
                </button>
              </header>
              <div className="min-h-[310px] max-h-[390px] space-y-3 overflow-y-auto bg-secondary/15 p-4">
                {thread.isLoading ? (
                  <StatePanel
                    kind="loading"
                    title="ისტორია იტვირთება"
                    description="შეტყობინებები იტვირთება."
                  />
                ) : (
                  thread.data?.map(message => (
                    <article
                      key={message.id}
                      className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${message.sender === "customer" ? "mr-auto border border-border bg-card" : message.sender === "system" ? "mx-auto bg-secondary text-muted-foreground" : message.sender === "ai" ? "ml-auto border border-cyan-500/20 bg-cyan-500/10" : "ml-auto bg-primary text-primary-foreground"}`}
                    >
                      <p>{message.body}</p>
                      {message.draftEvidence?.length ? (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {message.draftEvidence.map(
                            (
                              evidence: {
                                kind: string;
                                label: string;
                                detail?: string;
                              },
                              index: number
                            ) => (
                              <span
                                key={`${evidence.kind}-${index}`}
                                className="rounded-full border border-primary/20 bg-background/80 px-2 py-1 text-[10px] font-bold text-foreground"
                              >
                                {evidence.kind === "catalog"
                                  ? "კატალოგი"
                                  : evidence.kind === "knowledge"
                                    ? "ცოდნა"
                                    : "handoff"}
                                : {evidence.label}
                                {evidence.detail ? ` · ${evidence.detail}` : ""}
                              </span>
                            )
                          )}
                        </div>
                      ) : null}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px] opacity-80">
                        <span>{inboxMessageAuthorLabel(message.sender, message.isDraft)}</span>
                        <span aria-hidden="true">·</span>
                        <span className={`rounded-full border px-1.5 py-0.5 font-bold opacity-100 ${deliveryTone[message.deliveryStatus] ?? "border-border bg-background text-muted-foreground"}`}>
                          {inboxDeliveryLabel(message.deliveryStatus)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>{dateTime(message.createdAt)}</span>
                      </div>
                    </article>
                  ))
                )}
              </div>
              <div className="border-t border-border p-4">
                {isPaused ? (
                  <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-sm leading-6 text-amber-900 dark:text-amber-100">
                    AI ავტომატური პასუხი შეჩერებულია.{" "}
                    {selected.aiState === "needs_human"
                      ? "უცნობ კითხვაზე უკვე შეიქმნა handoff workflow."
                      : "ოპერატორის პასუხი კვლავ შეიძლება გაიგზავნოს."}
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-bold">
                        Evidence-grounded AI draft
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        მხოლოდ catalogue/knowledge ჩანაწერები გამოიყენება;
                        უცნობი კითხვა ticket-ზე გადადის.
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        draft.mutate(
                          { organizationId, conversationId: selected.id },
                          { onSuccess: () => void thread.refetch() }
                        )
                      }
                      disabled={draft.isPending}
                      className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold"
                    >
                      <Sparkles className="size-4 text-primary" />
                      {draft.isPending ? "Draft მზადდება…" : "AI draft"}
                    </button>
                  </div>
                )}
                <textarea
                  value={reply}
                  onChange={event => setReply(event.target.value)}
                  placeholder="შეამოწმეთ და უპასუხეთ კლიენტს…"
                  className="mt-3 min-h-24 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <div className="mt-3 flex flex-wrap justify-end gap-2">
                  <button
                    onClick={() =>
                      activeConversationId &&
                      reply.trim() &&
                      sendReply.mutate(
                        {
                          organizationId,
                          conversationId: activeConversationId,
                          body: reply.trim(),
                        },
                        {
                          onSuccess: () => {
                            setReply("");
                            refresh();
                          },
                        }
                      )
                    }
                    disabled={!reply.trim() || sendReply.isPending}
                    className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50"
                  >
                    <Send className="size-4" />
                    {sendReply.isPending
                      ? "იგზავნება…"
                      : "შეამოწმეთ და გაგზავნეთ"}
                  </button>
                </div>
                {sendReply.isError ? (
                  <p className="mt-2 text-xs text-destructive">
                    გაგზავნა ვერ შესრულდა; შეტყობინება failed სტატუსით ინახება.
                  </p>
                ) : null}
                <div className="mt-4 xl:hidden">{contextPanel}</div>
              </div>
            </>
          )}
        </section>
        <div className="hidden xl:block">{contextPanel}</div>
      </div>
    </div>
  );
}
