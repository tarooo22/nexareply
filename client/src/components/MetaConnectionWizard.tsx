import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, BadgeCheck, Building2, CheckCircle2, ChevronRight, ExternalLink, KeyRound, Loader2, RefreshCw, ShieldCheck } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

const RESUME_KEY = "nexareply:pending-meta-oauth-session";

type ConnectionMode = "oauth" | "manual";
type Stage = "method" | "pages" | "success";

function isEmbeddedPreview() {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
}

function StageProgress({ stage }: { stage: Stage }) {
  const current = stage === "method" ? 1 : 2;
  return <ol className="grid grid-cols-[auto_1fr_auto] items-center gap-3" aria-label="Facebook გვერდის მიბმის ნაბიჯები">
    <li className="flex items-center gap-2"><span className="grid size-8 place-items-center rounded-full bg-primary text-sm font-black text-primary-foreground">1</span><span className="text-xs font-bold text-primary">Facebook</span></li>
    <span className="h-px bg-border" aria-hidden="true" />
    <li className="flex items-center gap-2"><span className={`grid size-8 place-items-center rounded-full border text-sm font-black ${current === 2 ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground"}`}>2</span><span className={`text-xs font-bold ${current === 2 ? "text-primary" : "text-muted-foreground"}`}>დადასტურება</span></li>
  </ol>;
}

function manualConnectionErrorMessage(reason?: string) {
  if (reason === "page_not_found") return "ეს Page ID Meta-ში ვერ მოიძებნა. გადაამოწმე, რომ Page ID სწორია და token სწორედ იმავე Page-იდან არის აღებული.";
  if (reason === "invalid_token") return "ეს Access Token ვადაგასულია, გაუქმებულია ან User Token-ია. შექმენი ახალი Page Access Token Graph API Explorer-იდან.";
  if (reason === "missing_page_metadata_permission") return "ამ Meta App-ს აკლია pages_read_engagement Page metadata წვდომა. Meta Dashboard-ში დაამატე ეს permission, დაელოდე Ready for testing სტატუსს და შემდეგ შექმენი ახალი Page Access Token.";
  if (reason === "missing_permissions") return "Token-ს აკლია Messenger უფლებები. შექმენი ახალი token pages_show_list, pages_manage_metadata და pages_messaging უფლებების დადასტურების შემდეგ.";
  if (reason === "webhook_subscription") return "Page დადასტურდა, მაგრამ webhook subscription ვერ ჩაირთო. გადაამოწმე pages_manage_metadata/pages_messaging და Page-ზე Full control.";
  return "Page ID ან Access Token ვერ დადასტურდა. გამოიყენე ერთი და იმავე Page-ის id და access_token /me/accounts პასუხიდან.";
}

function Feedback({ title, body, tone = "neutral" }: { title: string; body: string; tone?: "neutral" | "success" | "warning" }) {
  const tones = {
    neutral: "border-border bg-secondary/35",
    success: "border-emerald-500/45 bg-emerald-500/10",
    warning: "border-amber-500/45 bg-amber-500/10",
  };
  return <div className={`rounded-2xl border p-4 ${tones[tone]}`}><p className="font-black">{title}</p><p className="mt-1 text-sm leading-6 text-muted-foreground">{body}</p></div>;
}

export function MetaConnectionWizard({ organizationId }: { organizationId: number }) {
  const status = trpc.nexareply.workspace.owner.meta.status.useQuery({ organizationId });
  const manualSetupEnabled = status.data?.readiness.manualSetupEnabled ?? false;
  const startOAuth = trpc.nexareply.workspace.owner.meta.startOAuth.useMutation();
  const selectPage = trpc.nexareply.workspace.owner.meta.selectPage.useMutation();
  const manualConnect = trpc.nexareply.workspace.owner.meta.manualConnect.useMutation();
  const disconnect = trpc.nexareply.workspace.owner.meta.disconnect.useMutation();
  const [mode, setMode] = useState<ConnectionMode>("oauth");
  const [stage, setStage] = useState<Stage>("method");
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [pageId, setPageId] = useState("");
  const [pageAccessToken, setPageAccessToken] = useState("");
  const [error, setError] = useState<string | null>(null);
  const pages = trpc.nexareply.workspace.owner.meta.oauthPages.useQuery(
    { organizationId, sessionId: sessionId ?? "invalid-session" },
    { enabled: Boolean(sessionId), refetchInterval: (query) => query.state.data?.status === "pending" ? 1_500 : false },
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const fromCallback = new URLSearchParams(window.location.hash.replace(/^#/, "")).get("meta_oauth_session");
    const saved = fromCallback || window.sessionStorage.getItem(RESUME_KEY);
    if (saved) {
      setSessionId(saved);
      setStage("pages");
      if (fromCallback) window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}`);
    }
  }, []);

  useEffect(() => {
    if (pages.data?.status === "pages_ready") setStage("pages");
    if (pages.data?.status === "completed") {
      window.sessionStorage.removeItem(RESUME_KEY);
      setSessionId(null);
      setStage("success");
      void status.refetch();
    }
  }, [pages.data?.status]);

  useEffect(() => () => setPageAccessToken(""), []);

  const connected = status.data?.status === "connected";
  const isRoleUserTestMode = !status.data?.readiness.businessLoginConfiguration;
  const connectionRecoveryMessage = useMemo(() => {
    if (status.data?.status === "verification_failed") return "Page-ის დადასტურება ან webhook subscription ვერ დასრულდა. ძველი credential დაცულია; ხელახლა გაიარე Facebook ავტორიზაცია.";
    if (status.data?.status === "delivery_failed") return "Messenger delivery შეფერხებულია. გადაამოწმე Page-ის უფლებები და ხელახლა დააკავშირე Page.";
    if (status.data?.status === "disabled") return "ეს კავშირი გამორთულია. განაახლე Facebook ავტორიზაცია ახალი Page-ის დასაკავშირებლად.";
    return null;
  }, [status.data?.status]);
  const pageCount = pages.data?.pages.length ?? 0;
  const showWizard = !connected || Boolean(sessionId) || stage === "success";
  const isSubmitting = startOAuth.isPending || selectPage.isPending || manualConnect.isPending || disconnect.isPending;
  const message = useMemo(() => {
    if (pages.data?.status === "failed") return "Facebook ავტორიზაცია გაუქმდა ან უარყოფილია. დაიწყე თავიდან და გადაამოწმე Page-ის ადმინისტრატორის წვდომა.";
    if (pages.data?.status === "expired") return "ავტორიზაციის სესიის დრო ამოიწურა. დაიწყე თავიდან.";
    return null;
  }, [pages.data?.status]);

  const beginOAuth = () => {
    setError(null);
    // Facebook blocks rendering its authorization page inside an iframe. Open
    // a blank top-level tab synchronously so browser popup protection does not
    // block the later async authorization URL assignment.
    const oauthWindow = isEmbeddedPreview() ? window.open("about:blank", "_blank") : null;
    if (isEmbeddedPreview() && !oauthWindow) {
      setError("Facebook ავტორიზაციისთვის ბრაუზერმა ცალკე ფანჯარა დაბლოკა. დაუშვი pop-up-ები და სცადე ხელახლა.");
      return;
    }
    startOAuth.mutate({ organizationId }, {
      onSuccess: (result) => {
        if (!result.authorizationUrl || !result.sessionId) {
          oauthWindow?.close();
          setError("Meta ავტორიზაცია ამ გარემოში ჯერ არ არის გამზადებული. სცადე ხელით დაკავშირება ან დაუკავშირდი ადმინისტრატორს.");
          return;
        }
        window.sessionStorage.setItem(RESUME_KEY, result.sessionId);
        if (oauthWindow) {
          oauthWindow.opener = null;
          oauthWindow.location.assign(result.authorizationUrl);
          return;
        }
        window.location.assign(result.authorizationUrl);
      },
      onError: () => {
        oauthWindow?.close();
        setError("Facebook ავტორიზაციის დაწყება ვერ მოხერხდა. სცადე ხელახლა.");
      },
    });
  };

  const choosePage = (selectedPageId: string) => {
    if (!sessionId) return;
    setError(null);
    selectPage.mutate({ organizationId, sessionId, pageId: selectedPageId }, {
      onSuccess: (result) => {
        if (result.status !== "connected") {
          setError("გვერდის webhook-ის დადასტურება ვერ მოხერხდა. გადაამოწმე Facebook-ის უფლებები და სცადე თავიდან.");
          return;
        }
        window.sessionStorage.removeItem(RESUME_KEY);
        setSessionId(null);
        setStage("success");
        void status.refetch();
      },
      onError: () => setError("გვერდის არჩევა ვერ მოხერხდა. სცადე თავიდან."),
    });
  };

  const submitManual = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError(null);
    manualConnect.mutate({ organizationId, pageId, pageAccessToken }, {
      onSuccess: (result) => {
        setPageAccessToken("");
        if (result.status !== "connected") {
          setError(manualConnectionErrorMessage(result.reason));
          return;
        }
        setStage("success");
        void status.refetch();
      },
      onError: () => {
        setPageAccessToken("");
        setError("უსაფრთხო შემოწმება ვერ დასრულდა. Access Token არ შეგვინახავს ბრაუზერში.");
      },
    });
  };

  const disconnectPage = () => {
    setError(null);
    disconnect.mutate({ organizationId }, {
      onSuccess: (result) => {
        if (result.status !== "disabled") {
          setError("Facebook გვერდის გათიშვა ვერ დასრულდა. ძველი კავშირი დაცულია; სცადე ხელახლა.");
          return;
        }
        reset();
        void status.refetch();
      },
      onError: () => setError("Facebook გვერდის გათიშვა ვერ დასრულდა. ძველი კავშირი დაცულია; სცადე ხელახლა."),
    });
  };

  const reset = () => {
    window.sessionStorage.removeItem(RESUME_KEY);
    setSessionId(null);
    setStage("method");
    setMode("oauth");
    setError(null);
    setPageAccessToken("");
  };

  return (
    <section className="mt-5 max-w-4xl rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-7">
      {!showWizard ? (
        <div className="space-y-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary">Meta Messenger</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">Facebook გვერდი დაკავშირებულია</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">ამ workspace-ის მონაცემები იზოლირებულია. სხვა ორგანიზაცია ამ Page-სა და მის token-ს ვერ ხედავს.</p>
            </div>
            <button type="button" onClick={() => void status.refetch()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold transition-colors hover:bg-secondary"><RefreshCw className="size-4" />განახლება</button>
          </div>
          <Feedback tone="success" title={status.data?.page?.name ?? "Facebook გვერდი"} body={`Page ID ${status.data?.page?.id ?? "—"} · webhook მზად არის შეტყობინებების მისაღებად.`} />
          <button type="button" onClick={disconnectPage} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><RefreshCw className="size-4" />გათიშვა და ახალი Page-ის მიბმა</button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-bold text-primary">ახალი ასისტენტი</p>
              <h2 className="mt-1 text-2xl font-black tracking-tight">დააკავშირე Facebook გვერდი</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">აირჩიე Facebook-ით ავტორიზაცია ან გამოიყენე ხელით კონფიგურაცია. მონაცემები ინახება მხოლოდ ამ ორგანიზაციის დაშიფრულ server-side vault-ში.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-xl bg-secondary px-3 py-2 text-xs font-bold"><ShieldCheck className="size-4 text-primary" />მხოლოდ owner წვდომა</span>
          </div>
          <div className="mt-7"><StageProgress stage={stage} /></div>
          {isRoleUserTestMode ? <div className="mt-5"><Feedback tone="warning" title="სატესტო Meta ავტორიზაცია" body="Facebook Login for Business-ის production configuration ჯერ არ არის აქტიური. ამ OAuth გზას ამ ეტაპზე მხოლოდ Meta App-ის Admin/Developer/Tester როლების მქონე მომხმარებლები გამოცდიან; გარე მომხმარებლის self-service მიბმა App Review და Live რეჟიმის შემდეგ შემოწმდება." /></div> : null}
          {connectionRecoveryMessage ? <div className="mt-5"><Feedback tone="warning" title="კავშირის აღდგენა" body={connectionRecoveryMessage} /></div> : null}
          <AnimatePresence mode="wait">
            {stage === "success" ? (
              <motion.div key="success" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mt-7 space-y-5">
                <Feedback tone="success" title="Facebook გვერდი წარმატებით დაუკავშირდა" body="Webhook აქტიურია. ახლა შეგიძლია დაამატო პროდუქტები, ცოდნის ბაზა და დააკონფიგურირო AI კონსულტანტი." />
                <div className="flex flex-wrap gap-3"><button type="button" onClick={() => { setStage("method"); void status.refetch(); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">დასრულება <ChevronRight className="size-4" /></button><button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold">სხვა გვერდის მიბმა</button></div>
              </motion.div>
            ) : stage === "pages" ? (
              <motion.div key="pages" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mt-7 space-y-5">
                <div className="rounded-2xl border border-border bg-secondary/20 p-5">
                  <div className="flex items-start gap-3"><Building2 className="mt-0.5 size-5 text-primary" /><div><h3 className="font-black">აირჩიე გვერდი</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Facebook-მა დააბრუნა შენი მართვადი გვერდები. აირჩიე ის, რომლის Messenger-იც უნდა მართოს NexaReply-მ.</p></div></div>
                  {pages.isLoading || pages.data?.status === "pending" ? <div className="mt-5 flex min-h-28 items-center justify-center gap-2 text-sm font-bold text-muted-foreground"><Loader2 className="size-4 animate-spin text-primary" />გვერდებს ვამოწმებთ…</div> : pageCount ? <div className="mt-5 grid gap-3">{pages.data?.pages.map((page) => <button key={page.id} type="button" disabled={isSubmitting} onClick={() => choosePage(page.id)} className="group flex min-h-20 items-center justify-between gap-4 rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/60 hover:bg-primary/5 disabled:opacity-60"><span className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/15 text-sm font-black text-primary">{page.name.slice(0, 2).toUpperCase()}</span><span><span className="block font-black">{page.name}</span><span className="mt-1 block text-xs text-muted-foreground">Messenger Page</span></span></span>{selectPage.isPending ? <Loader2 className="size-5 animate-spin text-primary" /> : <ChevronRight className="size-5 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />}</button>)}</div> : <Feedback tone="warning" title="გვერდები ვერ მოიძებნა" body={message ?? "ამ Facebook ანგარიშს მართვადი გვერდი არ დაუბრუნდა. დარწმუნდი, რომ გვერდზე Full control გაქვს."} />}
                </div>
                <div className="flex flex-wrap gap-3"><button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold"><ArrowLeft className="size-4" />თავიდან დაწყება</button>{message ? <button type="button" onClick={beginOAuth} disabled={startOAuth.isPending} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">ავტორიზაციის გამეორება <ChevronRight className="size-4" /></button> : null}</div>
              </motion.div>
            ) : (
              <motion.div key="method" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }} className="mt-7">
                <div className="rounded-2xl border border-border bg-secondary/20 p-5"><h3 className="font-black">მიბმის მეთოდი</h3><p className="mt-1 text-sm text-muted-foreground">რეკომენდებულია Facebook ავტორიზაცია. თუ გინდა მონაცემების ხელით შეყვანა, აირჩიე ალტერნატიული კონფიგურაცია.</p><div className="mt-5 grid gap-3 sm:grid-cols-2"><button type="button" onClick={() => setMode("oauth")} className={`rounded-xl border p-4 text-left transition ${mode === "oauth" ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:border-primary/50"}`}><ExternalLink className="size-5 text-primary" /><span className="mt-3 block font-black">Facebook-ით ავტორიზაცია</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">აირჩიე შენი Page უსაფრთხო Facebook ფანჯრიდან.</span><span className="mt-4 block text-xs font-bold text-primary">რეკომენდებულია</span></button>{manualSetupEnabled ? <button type="button" onClick={() => setMode("manual")} className={`rounded-xl border p-4 text-left transition ${mode === "manual" ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card hover:border-primary/50"}`}><KeyRound className="size-5 text-primary" /><span className="mt-3 block font-black">ხელით დაკავშირება</span><span className="mt-1 block text-sm leading-5 text-muted-foreground">Page ID და იმავე გვერდის Page Access Token.</span><span className="mt-4 block text-xs font-bold text-primary">ალტერნატიული მეთოდი</span></button> : null}</div></div>
                {mode === "oauth" ? (
                  <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border p-5"><div><p className="font-black">მზად ხარ Facebook-ზე გადასასვლელად?</p><p className="mt-1 text-sm text-muted-foreground">დაბრუნების შემდეგ აქვე აირჩევ გვერდს.</p></div><button type="button" onClick={beginOAuth} disabled={isSubmitting} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground disabled:opacity-50">{startOAuth.isPending ? <Loader2 className="size-4 animate-spin" /> : <ExternalLink className="size-4" />}Facebook-ით გაგრძელება <ChevronRight className="size-4" /></button></div>
                ) : manualSetupEnabled ? (
                  <div className="mt-5 space-y-5">
                    <Feedback tone="neutral" title="ხელით მიბმის შესახებ" body="NexaReply-ის საერთო Webhook კონფიგურაციას პლატფორმა მართავს. შენ შეიყვან მხოლოდ Page ID-ს და იმავე გვერდის Page Access Token-ს; სერვერი კავშირსა და Messenger subscription-ს ავტომატურად და უსაფრთხოდ გადაამოწმებს." />
                    <form onSubmit={submitManual} className="rounded-2xl border border-border bg-card p-5"><div className="flex items-start gap-3"><KeyRound className="mt-0.5 size-5 text-primary" /><div><h3 className="font-black">Facebook პარამეტრები</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">შეიყვანე Page ID და Page Access Token. Token მხოლოდ სერვერზე გადამოწმდება და დაშიფრულ vault-ში შეინახება.</p></div></div><div className="mt-5 grid gap-4"><label className="grid gap-2 text-sm font-bold">Facebook გვერდის ID<input required inputMode="numeric" pattern="[0-9]{5,30}" value={pageId} onChange={(event) => setPageId(event.target.value.replace(/\D/g, ""))} placeholder="მაგ: 123456789012345" className="h-11 rounded-xl border border-input bg-background px-3 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label><label className="grid gap-2 text-sm font-bold">Facebook Page Access Token <span className="font-normal text-muted-foreground">(ცვლილებებისთვის შეიყვანე)</span><input required type="password" autoComplete="off" spellCheck={false} value={pageAccessToken} onChange={(event) => setPageAccessToken(event.target.value)} placeholder="EAA…" className="h-11 rounded-xl border border-input bg-background px-3 py-3 text-sm font-medium outline-none focus-visible:ring-2 focus-visible:ring-ring" /></label></div><p className="mt-4 text-xs leading-5 text-muted-foreground">Token არასოდეს გამოჩნდება UI-ში, analytics-ში ან audit log-ში.</p><button disabled={isSubmitting || pageId.length < 5 || pageAccessToken.length < 20} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-bold text-primary-foreground disabled:opacity-50">{manualConnect.isPending ? <Loader2 className="size-4 animate-spin" /> : <BadgeCheck className="size-4" />}შენახვა და შემოწმება</button></form>
                  </div>
                ) : <Feedback tone="neutral" title="დამატებითი დადასტურება" body="ხელით Page ID და token-ით დაკავშირება ამ გარემოში გამორთულია. გამოიყენე Facebook-ით უსაფრთხო ავტორიზაცია." />}
                {error ? <p role="alert" className="mt-4 rounded-xl border border-destructive/50 bg-destructive/10 p-3 text-sm font-medium text-destructive">{error}</p> : null}
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </section>
  );
}
