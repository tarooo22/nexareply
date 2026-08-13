import { demoConversations } from "@/lib/demo-data";
import { ChevronRight, CircleAlert, ContactRound, Download, Loader2, MessageSquareText, Search, ShoppingBag, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const stageStyles: Record<string, string> = {
  "ახალი": "bg-muted text-muted-foreground",
  "კვალიფიცირებული": "bg-[#E7F8FC] text-[#0E7490] dark:bg-[#0E7490]/30 dark:text-[#A5F3FC]",
  "შეთანხმება": "bg-[#FFF5D9] text-[#92400E] dark:bg-[#92400E]/30 dark:text-[#FDE68A]",
  "დრაფტ შეკვეთა": "bg-[#E9F8EF] text-[#166534] dark:bg-[#166534]/30 dark:text-[#86EFAC]",
};

export default function LeadsView() {
  const [rawQuery, setRawQuery] = useState("");
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("c1");
  const [exported, setExported] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(rawQuery.toLocaleLowerCase("ka-GE").trim()), 240);
    return () => window.clearTimeout(timer);
  }, [rawQuery]);

  const contacts = useMemo(
    () => demoConversations.filter((conversation) => `${conversation.customer} ${conversation.phone} ${conversation.product}`.toLocaleLowerCase("ka-GE").includes(query)),
    [query],
  );
  const selected = demoConversations.find((conversation) => conversation.id === selectedId) ?? demoConversations[0];
  const handoffLabel = selected.humanActive ? "ადამიანმა ჩაიბარა" : selected.ticket ? "ticket ღიაა" : "AI მართავს";
  const exportContacts = () => {
    setIsExporting(true);
    window.setTimeout(() => { setExported(true); setIsExporting(false); }, 420);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">გაყიდვების pipeline</p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">კონტაქტები, ლიდები და დრაფტ შეკვეთები</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">შეკვეთა არ არის დადასტურებული, სანამ ბიზნესის ოპერატორი არ გადაამოწმებს აუცილებელ დეტალებს.</p>
        </div>
        <button type="button" onClick={exportContacts} disabled={isExporting} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-semibold hover:bg-accent disabled:cursor-wait disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{isExporting ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}{isExporting ? "Export მზადდება…" : "CSV export"}</button>
      </div>
      {exported && <p className="rounded-xl border border-[#BEE8F2] bg-[#E7F8FC] px-4 py-3 text-sm text-[#0E7490] dark:border-[#155E75]/70 dark:bg-[#0E7490]/30 dark:text-[#A5F3FC]">Export placeholder მზადაა. რეალური CSV export დაემატება დაცულ organization-scoped service layer-ში.</p>}
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
          <div className="relative border-b border-border p-4"><Search className="pointer-events-none absolute left-7 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={rawQuery} onChange={(event) => setRawQuery(event.target.value)} className="h-11 w-full rounded-xl border border-input bg-background pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" placeholder="მოძებნეთ კონტაქტი ან ტელეფონი" aria-label="კონტაქტების ძიება" /></div>
          <div className="overflow-x-auto"><table className="w-full min-w-[640px] text-left text-sm"><thead className="bg-muted/60 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-semibold">კონტაქტი</th><th className="px-5 py-3 font-semibold">ინტერესი</th><th className="px-5 py-3 font-semibold">ეტაპი</th><th className="px-5 py-3" /></tr></thead><tbody className="divide-y divide-border">{contacts.map((contact) => <tr key={contact.id} className={`cursor-pointer transition-colors hover:bg-accent/40 ${selectedId === contact.id ? "bg-primary/[0.05]" : ""}`} onClick={() => setSelectedId(contact.id)}><td className="px-5 py-4"><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{contact.initials}</span><div><p className="font-bold">{contact.customer}</p><p className="mt-1 text-xs text-muted-foreground">{contact.phone}</p></div></div></td><td className="px-5 py-4 text-muted-foreground">{contact.product}</td><td className="px-5 py-4"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stageStyles[contact.leadStage]}`}>{contact.leadStage}</span></td><td className="px-5 py-4"><ChevronRight className="size-4 text-muted-foreground" /></td></tr>)}</tbody></table></div>
        </section>
        <aside className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full bg-secondary text-xs font-bold text-secondary-foreground">{selected.initials}</span><div><h2 className="font-bold">{selected.customer}</h2><p className="text-xs text-muted-foreground">{selected.phone}</p></div></div>
          <div className="mt-5 grid grid-cols-2 gap-2">
            <div className="rounded-xl border border-border bg-background p-3"><p className="text-[11px] font-medium text-muted-foreground">წყარო</p><p className="mt-1 text-xs font-bold">Messenger Demo</p></div>
            <div className="rounded-xl border border-border bg-background p-3"><p className="text-[11px] font-medium text-muted-foreground">ბოლო აქტივობა</p><p className="mt-1 text-xs font-bold">{selected.updated}</p></div>
            <div className="rounded-xl border border-border bg-background p-3"><p className="text-[11px] font-medium text-muted-foreground">Lead stage</p><p className="mt-1 text-xs font-bold">{selected.leadStage}</p></div>
            <div className="rounded-xl border border-border bg-background p-3"><p className="text-[11px] font-medium text-muted-foreground">მიმდინარე სტატუსი</p><p className="mt-1 text-xs font-bold">{selected.status === "open" ? "ღია" : selected.status === "pending" ? "მოლოდინში" : "დახურული"}</p></div>
          </div>
          <div className="mt-3 rounded-xl border border-border bg-background p-3"><div className="flex items-center gap-2"><Tag className="size-4 text-primary" /><p className="text-xs font-medium text-muted-foreground">პროდუქტის პრეფერენცია</p></div><p className="mt-2 text-sm font-bold">{selected.product}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">მომხმარებლის ბოლო ინტერესი: {selected.preview}</p></div>
          <div className={`mt-3 rounded-xl border p-3 ${selected.ticket ? "border-[#F3C2C2] bg-[#FDECEC] dark:border-[#991B1B]/70 dark:bg-[#991B1B]/30" : selected.humanActive ? "border-[#F6D6A9] bg-[#FFF5D9] dark:border-[#92400E]/70 dark:bg-[#92400E]/30" : "border-[#BEE8F2] bg-[#E7F8FC] dark:border-[#155E75]/70 dark:bg-[#0E7490]/30"}`}><div className="flex items-center gap-2"><CircleAlert className={`size-4 ${selected.ticket ? "text-[#991B1B] dark:text-[#FECACA]" : selected.humanActive ? "text-[#92400E] dark:text-[#FDE68A]" : "text-[#0E7490] dark:text-[#A5F3FC]"}`} /><p className="text-xs font-bold">Handoff / ticket მდგომარეობა</p></div><p className="mt-1.5 text-xs leading-5">{handoffLabel}. {selected.ticket ? "უცნობი დეტალი უნდა გადაამოწმოს ოპერატორმა." : selected.humanActive ? "AI ავტომატური პასუხი ამ conversation-ზე შეჩერებულია." : "კონტექსტზე დაფუძნებული AI draft ხელმისაწვდომია."}</p></div>
          <div className="mt-3 rounded-xl border border-border bg-background p-3"><div className="flex items-center gap-2"><MessageSquareText className="size-4 text-primary" /><p className="text-xs font-medium text-muted-foreground">ბოლო საუბრის ისტორია</p></div><div className="mt-3 space-y-2">{selected.messages.slice(-3).map((message) => <div key={message.id} className="rounded-lg bg-muted/65 p-2.5"><p className="text-[11px] font-semibold text-muted-foreground">{message.sender === "customer" ? "მომხმარებელი" : message.sender === "ai" ? "AI" : message.sender === "operator" ? "ოპერატორი" : "სისტემა"} · {message.time}</p><p className="mt-1 text-xs leading-5">{message.body}</p></div>)}</div></div>
          <button type="button" className="mt-5 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ContactRound className="size-4" />სრული პროფილის ნახვა</button>
        </aside>
      </div>
      <section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#E9F8EF] text-[#166534] dark:bg-[#166534]/30 dark:text-[#86EFAC]"><ShoppingBag className="size-5" /></span><div><h2 className="font-bold">დრაფტ შეკვეთები</h2><p className="mt-1 text-sm text-muted-foreground">საჭიროა სახელის, ტელეფონის, ნივთის, რაოდენობისა და მიწოდების/განვადების პრეფერენციის დადასტურება.</p></div></div><div className="mt-5 grid gap-3 md:grid-cols-2"><article className="rounded-xl border border-border bg-background p-4"><p className="text-sm font-bold">მარიამ ჯაფარიძე · Google Pixel 9</p><p className="mt-1 text-sm text-muted-foreground">მისამართი და მიწოდების დრო დასაზუსტებელია</p><span className="mt-3 inline-flex rounded-full bg-[#FFF5D9] px-2.5 py-1 text-xs font-semibold text-[#92400E] dark:bg-[#92400E]/30 dark:text-[#FDE68A]">needs_confirmation</span></article><article className="rounded-xl border border-border bg-background p-4"><p className="text-sm font-bold">ელენე კიკნაძე · AirPods Pro 2</p><p className="mt-1 text-sm text-muted-foreground">სახელი და ტელეფონი მიღებულია; ფილიალიდან გატანა დასადასტურებელია</p><span className="mt-3 inline-flex rounded-full bg-[#E7F8FC] px-2.5 py-1 text-xs font-semibold text-[#0E7490] dark:bg-[#0E7490]/30 dark:text-[#A5F3FC]">verified</span></article></div></section>
    </div>
  );
}
