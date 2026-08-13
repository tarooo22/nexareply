import { DemoConversation, DemoMessage, demoConversations } from "@/lib/demo-data";
import { createOwnerEvent, generateDemoReply, type DemoReplyResult, type OwnerEvent } from "@shared/demo-ai";
import { Bot, Check, ChevronLeft, CircleAlert, Clock3, Loader2, MessageCircleMore, Pause, Search, Send, ShieldCheck, Sparkles, UserRound, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type Filter = "all" | "open" | "pending" | "human";

const statusStyles = {
  open: "bg-[#E7F8FC] text-[#0E7490] dark:bg-[#0E7490]/30 dark:text-[#A5F3FC]",
  pending: "bg-[#FFF5D9] text-[#92400E] dark:bg-[#92400E]/30 dark:text-[#FDE68A]",
  closed: "bg-muted text-muted-foreground",
};

const statusLabels = { open: "ღია", pending: "მოლოდინში", closed: "დახურული" };

function now() {
  return new Intl.DateTimeFormat("ka-GE", { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date());
}

export default function ConversationsView({ debounceSeconds }: { debounceSeconds: number }) {
  const [conversations, setConversations] = useState<DemoConversation[]>(demoConversations);
  const [selectedId, setSelectedId] = useState("c1");
  const [filter, setFilter] = useState<Filter>("all");
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [composer, setComposer] = useState("iPhone 16 Pro Max 256GB შავი ფერი გვაქვს მარაგში. ფასი არის 3,699 GEL და ხელმისაწვდომია 0%-იანი განვადება 12 თვემდე.");
  const [tone, setTone] = useState("თბილი და კონკრეტული");
  const [approved, setApproved] = useState(false);
  const [sent, setSent] = useState(false);
  const [mobileThread, setMobileThread] = useState(false);
  const [draftState, setDraftState] = useState<DemoReplyResult | null>(null);
  const [ownerEvents, setOwnerEvents] = useState<OwnerEvent[]>([]);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);

  const addOwnerEvent = (event: OwnerEvent) => setOwnerEvents((items) => items.some((item) => item.dedupeKey === event.dedupeKey) ? items : [event, ...items]);

  useEffect(() => {
    const previewDelay = Math.min(Math.max(120, debounceSeconds * 100), 1000);
    const timer = window.setTimeout(() => setQuery(rawQuery.trim().toLocaleLowerCase("ka-GE")), previewDelay);
    return () => window.clearTimeout(timer);
  }, [rawQuery, debounceSeconds]);

  const filtered = useMemo(() => conversations.filter((conversation) => {
    const matchesQuery = [conversation.customer, conversation.phone, conversation.preview, conversation.product].join(" ").toLocaleLowerCase("ka-GE").includes(query);
    const matchesFilter = filter === "all" || (filter === "human" ? conversation.humanActive : conversation.status === filter);
    return matchesQuery && matchesFilter;
  }), [conversations, filter, query]);
  const selected = conversations.find((conversation) => conversation.id === selectedId) ?? conversations[0];

  const updateConversation = (id: string, patch: Partial<DemoConversation>) => setConversations((items) => items.map((item) => item.id === id ? { ...item, ...patch } : item));
  const appendMessage = (conversationId: string, message: DemoMessage) => setConversations((items) => items.map((item) => item.id === conversationId ? { ...item, messages: [...item.messages, message], updated: "ახლა", preview: message.body } : item));
  const draftDelay = Math.min(Math.max(350, debounceSeconds * 100), 1000);
  const scheduleDraft = (history: DemoMessage[], nextTone = tone, humanActive = selected.humanActive) => {
    setApproved(false);
    setSent(false);
    setIsGeneratingDraft(true);
    window.setTimeout(() => {
      const draft = generateDemoReply({ history, preferredProduct: selected.product, tone: nextTone, humanActive });
      setDraftState(draft);
      setComposer(draft.text);
      setIsGeneratingDraft(false);
      if (draft.decision === "escalate") addOwnerEvent(createOwnerEvent("unknown_question", selected.id, selected.customer));
    }, draftDelay);
  };

  useEffect(() => {
    if (!selected) return;
    scheduleDraft(selected.messages);
  }, [selectedId]);

  const selectConversation = (id: string) => { const conversation = conversations.find((item) => item.id === id); if (conversation?.priority === "high") addOwnerEvent(createOwnerEvent("high_priority_lead", conversation.id, conversation.customer)); setSelectedId(id); setMobileThread(true); };
  const simulateIncomingMessage = () => {
    if (selected.humanActive) return;
    const message: DemoMessage = { id: `customer-${Date.now()}`, sender: "customer", body: "შავი ფერი ნამდვილად გაქვთ? განვადებაც მაინტერესებს.", time: now() };
    appendMessage(selected.id, message);
    scheduleDraft([...selected.messages, message]);
  };
  const toggleTakeover = () => {
    const humanActive = !selected.humanActive;
    updateConversation(selected.id, { humanActive, status: humanActive ? "pending" : "open" });
    appendMessage(selected.id, { id: `system-${Date.now()}`, sender: "system", body: humanActive ? "ადამიანმა ჩაიბარა საუბარი — AI პასუხები შეჩერებულია" : "AI პასუხები განახლდა", time: now() });
    if (humanActive) addOwnerEvent(createOwnerEvent("human_takeover", selected.id, selected.customer));
    scheduleDraft(selected.messages, tone, humanActive);
  };
  const createTicket = () => {
    setIsCreatingTicket(true);
    window.setTimeout(() => {
      updateConversation(selected.id, { ticket: true, status: "pending", humanActive: true });
      appendMessage(selected.id, { id: `ticket-${Date.now()}`, sender: "system", body: "Ticket შეიქმნა; AI პასუხები შეჩერებულია ოპერატორის შემოწმებამდე", time: now() });
      addOwnerEvent(createOwnerEvent("unknown_question", selected.id, selected.customer));
      setIsCreatingTicket(false);
    }, 420);
  };
  const approve = () => { setApproved(true); setSent(false); };
  const sendReply = () => {
    if (!composer.trim() || selected.humanActive) return;
    appendMessage(selected.id, { id: `operator-${Date.now()}`, sender: "operator", body: composer.trim(), time: now() });
    setSent(true);
    setApproved(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-semibold text-primary">Messenger inbox</p><h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">საუბრები და AI პასუხები</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">ძიება იყენებს {debounceSeconds} წმ. debounce წესის სწრაფ Demo preview-ს; პასუხი არასოდეს იგზავნება human takeover-ის დროს.</p></div><span className="inline-flex w-fit items-center gap-2 rounded-full bg-[#E7F8FC] px-3 py-1.5 text-xs font-semibold text-[#0E7490] dark:bg-[#0E7490]/30 dark:text-[#A5F3FC]"><ShieldCheck className="size-4" />Demo Mode · მონაცემები სიმულირებულია</span></div>
      {ownerEvents[0] && <div className="flex items-start justify-between gap-3 rounded-xl border border-[#BEE8F2] bg-[#E7F8FC] p-3 text-sm text-[#0E7490] dark:border-[#155E75]/70 dark:bg-[#0E7490]/30 dark:text-[#A5F3FC]"><div><p className="font-bold">Owner event შექმნილია: {ownerEvents[0].title}</p><p className="mt-1 text-xs leading-5">{ownerEvents[0].body} რეალურ გარემოში ეს event გაიგზავნება იდემპოტენტური notification adapter-ით.</p></div><button type="button" onClick={() => setOwnerEvents((items) => items.slice(1))} className="rounded-lg px-2 py-1 text-xs font-semibold hover:bg-[#0E7490]/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">დახურვა</button></div>}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:grid lg:min-h-[680px] lg:grid-cols-[300px_minmax(0,1fr)_280px] xl:grid-cols-[330px_minmax(0,1fr)_300px]">
        <section className={`border-r border-border ${mobileThread ? "hidden lg:block" : "block"}`} aria-label="საუბრის სია">
          <div className="border-b border-border p-4"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={rawQuery} onChange={(event) => setRawQuery(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring" placeholder="მოძებნეთ საუბარი ან ტელეფონი" aria-label="საუბრის ძიება" /></div><div className="mt-3 flex gap-1 overflow-x-auto pb-0.5">{(["all", "open", "pending", "human"] as Filter[]).map((value) => <button key={value} type="button" onClick={() => setFilter(value)} className={`min-h-9 shrink-0 rounded-lg px-2.5 text-xs font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${filter === value ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground"}`}>{({ all: "ყველა", open: "ღია", pending: "მოლოდინში", human: "ადამიანი" })[value]}</button>)}</div>{rawQuery !== query && <p className="mt-2 text-xs text-muted-foreground">ძიება ახლდება…</p>}</div>
          <div className="max-h-[610px] overflow-y-auto">{filtered.length ? filtered.map((conversation) => <button key={conversation.id} type="button" onClick={() => selectConversation(conversation.id)} className={`flex w-full gap-3 border-b border-border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${selected.id === conversation.id ? "bg-primary/[0.06]" : "hover:bg-accent/55"}`}><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{conversation.initials}</span><span className="min-w-0 flex-1"><span className="flex items-start justify-between gap-2"><span className="truncate text-sm font-bold">{conversation.customer}</span><span className="shrink-0 text-xs text-muted-foreground">{conversation.updated}</span></span><span className="mt-1 block truncate text-xs leading-5 text-muted-foreground">{conversation.preview}</span><span className="mt-2 flex flex-wrap gap-1.5">{conversation.ticket && <span className="rounded-full bg-[#FDECEC] px-2 py-0.5 text-[11px] font-semibold text-[#991B1B] dark:bg-[#991B1B]/30 dark:text-[#FECACA]">ოპერატორი</span>}{conversation.humanActive && <span className="rounded-full bg-[#FFF5D9] px-2 py-0.5 text-[11px] font-semibold text-[#92400E] dark:bg-[#92400E]/30 dark:text-[#FDE68A]">ჩაბარებულია</span>}</span></span></button>) : <div className="p-8 text-center"><Search className="mx-auto size-6 text-muted-foreground" /><p className="mt-3 text-sm font-semibold">საუბარი ვერ მოიძებნა</p><p className="mt-1 text-xs leading-5 text-muted-foreground">შეცვალეთ საძიებო სიტყვა ან ფილტრი.</p></div>}</div>
        </section>
        <section className={`${mobileThread ? "block" : "hidden lg:block"} min-w-0`} aria-label="საუბრის ისტორია">
          <div className="flex min-h-[73px] items-center justify-between gap-3 border-b border-border px-4 py-3"><div className="flex min-w-0 items-center gap-3"><button type="button" onClick={() => setMobileThread(false)} className="grid size-9 place-items-center rounded-lg border border-border lg:hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="საუბრის სიაში დაბრუნება"><ChevronLeft className="size-4" /></button><span className="grid size-10 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{selected.initials}</span><div className="min-w-0"><h2 className="truncate text-sm font-bold">{selected.customer}</h2><p className="truncate text-xs text-muted-foreground">{selected.phone} · {selected.product}</p></div></div><span className={`hidden rounded-full px-2.5 py-1 text-xs font-semibold sm:inline-flex ${statusStyles[selected.status]}`}>{statusLabels[selected.status]}</span></div>
          <div className="max-h-[360px] min-h-[300px] space-y-4 overflow-y-auto bg-background/45 p-4">{selected.messages.map((message) => <div key={message.id} className={`flex ${message.sender === "customer" ? "justify-end" : "justify-start"}`}>{message.sender === "system" ? <div className="mx-auto flex items-center gap-2 rounded-full bg-muted px-3 py-1.5 text-xs text-muted-foreground"><Clock3 className="size-3.5" />{message.body}</div> : <div className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm leading-6 ${message.sender === "customer" ? "rounded-br-md bg-primary text-primary-foreground" : message.sender === "ai" ? "rounded-bl-md border border-[#BEE8F2] bg-[#EDF9FC] text-[#164E63] dark:border-[#155E75]/70 dark:bg-[#164E63]/30 dark:text-[#CFFAFE]" : "rounded-bl-md border border-border bg-card text-foreground"}`}><div className={`mb-1 flex items-center gap-1.5 text-[11px] font-semibold ${message.sender === "customer" ? "text-primary-foreground/70" : message.sender === "ai" ? "text-[#0E7490] dark:text-[#A5F3FC]" : "text-muted-foreground"}`}>{message.sender === "ai" ? <Bot className="size-3.5" /> : message.sender === "operator" ? <UserRound className="size-3.5" /> : <MessageCircleMore className="size-3.5" />}{message.sender === "ai" ? "AI პასუხი" : message.sender === "operator" ? "ოპერატორი" : "მომხმარებელი"}</div><p>{message.body}</p><p className={`mt-1 text-right text-[10px] ${message.sender === "customer" ? "text-primary-foreground/65" : "text-muted-foreground"}`}>{message.time}</p></div>}</div>)}</div>
          <div className="border-t border-border p-4"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-lg bg-[#E7F8FC] text-[#0E7490] dark:bg-[#0E7490]/30 dark:text-[#A5F3FC]">{isGeneratingDraft ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}</span><div><p className="text-sm font-bold">AI-ის პასუხის draft</p><p className="text-xs text-muted-foreground">{isGeneratingDraft ? `ახალი პასუხი მზადდება (${debounceSeconds} წმ. წესის სწრაფი preview)` : `ტონი: ${tone} · ${draftState?.source === "catalog" ? "კატალოგის ფაქტი" : draftState?.source === "fallback" ? "საჭიროა დაზუსტება" : "AI შეჩერებულია"}`}</p></div></div><div className="flex flex-wrap gap-2"><button type="button" onClick={simulateIncomingMessage} disabled={selected.humanActive || isGeneratingDraft} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><MessageCircleMore className="size-3.5" />ახალი მესიჯის Demo</button><select value={tone} onChange={(event) => { const nextTone = event.target.value; setTone(nextTone); scheduleDraft(selected.messages, nextTone); }} className="h-10 rounded-xl border border-input bg-background px-3 text-xs outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label="AI-ის პასუხის ტონი"><option>თბილი და კონკრეტული</option><option>ფორმალური</option><option>მოკლე და სწრაფი</option></select><button type="button" onClick={toggleTakeover} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-xs font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selected.humanActive ? "border-[#BEE8F2] bg-[#E7F8FC] text-[#0E7490] dark:border-[#155E75]/70 dark:bg-[#0E7490]/30 dark:text-[#A5F3FC]" : "border-[#F6D6A9] bg-[#FFF5D9] text-[#92400E] dark:border-[#92400E]/70 dark:bg-[#92400E]/30 dark:text-[#FDE68A]"}`}>{selected.humanActive ? <><Check className="size-3.5" />AI განაახლეთ</> : <><Pause className="size-3.5" />ადამიანმა ჩაიბაროს</>}</button></div></div>
            {selected.humanActive ? <div className="mt-3 flex items-start gap-2 rounded-xl border border-[#F6D6A9] bg-[#FFF5D9] p-3 text-xs leading-5 text-[#92400E] dark:border-[#92400E]/70 dark:bg-[#92400E]/30 dark:text-[#FDE68A]"><Pause className="mt-0.5 size-4 shrink-0" />AI ავტომატური პასუხი შეჩერებულია. განაახლეთ AI მხოლოდ მას შემდეგ, რაც ხელით მართვა დასრულდება.</div> : <>{draftState?.decision === "escalate" && <div className="mt-3 flex flex-col gap-3 rounded-xl border border-[#F3C2C2] bg-[#FDECEC] p-3 text-xs leading-5 text-[#7F1D1D] dark:border-[#991B1B]/70 dark:bg-[#991B1B]/30 dark:text-[#FECACA]"><span><CircleAlert className="mr-1 inline size-4 align-text-bottom" />{draftState.reason}</span><button type="button" onClick={createTicket} disabled={isCreatingTicket} className="inline-flex min-h-9 w-fit items-center gap-2 rounded-lg bg-[#991B1B] px-3 text-xs font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">{isCreatingTicket && <Loader2 className="size-3.5 animate-spin" />}{isCreatingTicket ? "Ticket იქმნება…" : "Ticket შექმნა და ოპერატორზე გადაცემა"}</button></div>}<textarea value={composer} onChange={(event) => { setComposer(event.target.value); setApproved(false); setSent(false); }} disabled={isGeneratingDraft} className="mt-3 min-h-[94px] w-full resize-none rounded-xl border border-input bg-background p-3 text-sm leading-6 outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-wait disabled:opacity-60" aria-label="AI პასუხის ტექსტი" /><div className="mt-3 flex flex-col gap-2 sm:flex-row sm:justify-end">{sent && <span className="mr-auto inline-flex items-center gap-1.5 rounded-lg bg-[#E9F8EF] px-2.5 py-2 text-xs font-semibold text-[#166534] dark:bg-[#166534]/30 dark:text-[#86EFAC]"><Check className="size-3.5" />Demo პასუხი დაემატა thread-ში</span>}<button type="button" onClick={approve} disabled={isGeneratingDraft} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 text-xs font-semibold hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Check className="size-3.5" />პასუხის დამტკიცება</button><button type="button" onClick={sendReply} disabled={isGeneratingDraft || !approved || !composer.trim()} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition-transform hover:brightness-105 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Send className="size-3.5" />{approved ? "Demo პასუხის გაგზავნა" : "ჯერ დაამტკიცეთ"}</button></div></>}</div>
        </section>
        <aside className="hidden border-l border-border p-4 lg:block"><h2 className="text-sm font-bold">კლიენტის კონტექსტი</h2><div className="mt-4 space-y-3"><div className="rounded-xl border border-border bg-background p-3"><p className="text-xs font-medium text-muted-foreground">ეტაპი</p><p className="mt-1 text-sm font-bold">{selected.leadStage}</p></div><div className="rounded-xl border border-border bg-background p-3"><p className="text-xs font-medium text-muted-foreground">ინტერესი</p><p className="mt-1 text-sm font-bold">{selected.product}</p></div><div className="rounded-xl border border-border bg-background p-3"><p className="text-xs font-medium text-muted-foreground">AI სტატუსი</p><p className="mt-1 text-sm font-bold">{selected.humanActive ? "შეჩერებულია" : "აქტიურია"}</p></div>{selected.ticket && <div className="rounded-xl border border-[#F3C2C2] bg-[#FDECEC] p-3 dark:border-[#991B1B]/70 dark:bg-[#991B1B]/30"><div className="flex items-center gap-2 text-[#991B1B] dark:text-[#FECACA]"><CircleAlert className="size-4" /><p className="text-xs font-bold">საჭიროა ოპერატორი</p></div><p className="mt-2 text-xs leading-5 text-[#7F1D1D] dark:text-[#FECACA]">უცნობი ან დასაზუსტებელი საკითხი. Ticket უკვე შექმნილია და დუბლირება არ მოხდება.</p></div>}</div></aside>
      </div>
    </div>
  );
}
