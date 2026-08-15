import { ArrowRight, Bot, CheckCircle2, CircleHelp, Clock3, FileText, Inbox, MessageSquareText, ShieldCheck, Sparkles, UsersRound, Zap } from "lucide-react";
import { Link } from "wouter";
import { MarketingHeader } from "@/components/MarketingHeader";
import { NexaLogo } from "@/components/NexaLogo";

const features = [
  { icon: Inbox, tone: "teal", title: "Messenger ინტეგრაცია", text: "დააკავშირე Facebook Page და მართე საუბრები ერთი, tenant-safe სამუშაო სივრციდან." },
  { icon: Bot, tone: "violet", title: "AI draft-ები", text: "AI ამზადებს პასუხს მხოლოდ კატალოგისა და დამტკიცებული ცოდნის ბაზის საფუძველზე." },
  { icon: FileText, tone: "amber", title: "ცოდნის ბაზა", text: "პროდუქტები, ფასები, მიწოდება და ბიზნეს წესები ერთ დაცულ ადგილას." },
  { icon: UsersRound, tone: "cyan", title: "ადამიანური კონტროლი", text: "შეაჩერე AI, აიღე საუბარი ან შექმენი handoff ticket მაშინ, როცა საჭიროა." },
];

const steps = [
  ["01", "დააკავშირე შენი Page", "OAuth-ის საშუალებით აირჩიე შენი Facebook Page — token ინახება მხოლოდ დაცულ server-side vault-ში."],
  ["02", "დაამატე ცოდნა", "ატვირთე კატალოგი, ფასები და წესები; ცვლილებები approval-first პროცესით კონტროლდება."],
  ["03", "მართე საუბრები", "AI ამზადებს draft-ს და evidence-ს, შენ კი ამტკიცებ, არედაქტირებ ან იღებ საუბარს."],
];

const faq = [
  ["რა არის Demo Mode?", "Demo Mode შესვლის გარეშე აჩვენებს Amadeo perfume-store-ის უსაფრთხო მაგალითს. ის არ უკავშირდება რეალურ Facebook მომხმარებლებს ან Page-ს."],
  ["AI თვითონ აგზავნის პასუხს?", "რეალურ workspace-ში AI draft-ის approval, pause და human takeover ბიზნესის კონფიგურაციით იმართება. საიტი არ გვპირდება იმას, რაც ჯერ არ არის ჩართული."],
  ["როგორ იცავს სისტემა არაზუსტი პასუხისგან?", "draft-ს ახლავს evidence წყაროებიდან. თუ საკმარისი მონაცემი არ არის, სისტემა ქმნის handoff ticket-ს და საუბარს ოპერატორს გადასცემს."],
];

function ChatPreview() {
  return (
    <div className="nr-chat-wrap" aria-label="NexaReply Messenger preview">
      <div className="nr-float nr-float-top"><span>საჭიროა ოპერატორი</span><strong>1 ახალი ticket</strong></div>
      <div className="nr-float nr-float-bottom"><span>გაყიდვის შესაძლებლობა</span><strong>ლიდი დაფიქსირდა</strong></div>
      <div className="nr-chat-card">
        <div className="nr-chat-head"><div className="flex items-center gap-3"><div className="nr-avatar">ა</div><div><p className="text-sm font-bold">ანა მჭედლიძე</p><p className="text-xs text-white/50">Messenger · ახლახან</p></div></div><span className="nr-ai-badge"><span className="nr-pulse" />AI აქტიურია</span></div>
        <div className="nr-chat-body">
          <div className="nr-msg nr-customer">გამარჯობა, Rose Amber 50 მლ გაქვთ? მიმდინარე ფასი მაინტერესებს.<small>14:32 ✓✓</small></div>
          <div className="nr-typing"><i /><i /><i /></div>
          <div className="nr-msg nr-ai"><span className="nr-ai-label"><Bot className="size-3.5" />AI-ის პასუხი</span>დიახ, პროდუქტი მარაგშია. ფასი და ხელმისაწვდომობა კატალოგში დადასტურებულია.</div>
          <div className="nr-evidence">◆ წყარო: კატალოგი · SKU AM-4412</div>
          <div className="nr-msg nr-customer">კი, გავაფორმოთ</div>
          <div className="nr-handoff">◆ ოპერატორმა ჩაიბარა საუბარი</div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="nr-marketing min-h-screen overflow-x-hidden text-white">
      <MarketingHeader />
      <main>
        <section className="nr-hero relative isolate overflow-hidden"><div className="nr-grid-overlay" /><div className="nr-glow nr-glow-a" /><div className="nr-glow nr-glow-b" /><div className="container nr-hero-grid">
          <div className="max-w-2xl"><span className="nr-eyebrow"><Sparkles className="size-3.5" />AI გაყიდვების სივრცე ქართული ბიზნესისთვის</span><h1 className="nr-hero-title">AI, რომელიც შენს Messenger-ში <span>ყიდის და პასუხობს</span></h1><p className="nr-hero-lead">დააკავშირე Facebook გვერდი, ატვირთე პროდუქტები და ბიზნეს-ცოდნა — NexaReply ამზადებს სწრაფ, evidence-ით გამყარებულ პასუხებს. კონტროლი კი ყოველთვის შენ გრჩება.</p><div className="flex flex-wrap gap-3"><Link href="/auth" className="nr-btn nr-btn-primary">დაიწყე უფასოდ <ArrowRight className="size-4" /></Link><Link href="/demo" className="nr-btn nr-btn-ghost">ნახე Demo Mode</Link></div><div className="nr-micro"><span>ბარათი არ სჭირდება</span><b /> <span>სწრაფი onboarding</span><b /> <span>ადამიანზე გადართვა</span></div></div>
          <ChatPreview />
        </div></section>
        <div className="nr-trust"><div className="container nr-trust-grid">{[[Zap, "სწრაფი დაკავშირება"], [Clock3, "24/7 AI draft-ები"], [ShieldCheck, "ცოდნაზე დაფუძნებული"], [UsersRound, "ადამიანური კონტროლი"], [MessageSquareText, "ერთიანი Inbox"]].map(([Icon, label]) => <div key={label as string}><Icon className="size-4" />{label as string}</div>)}</div></div>
        <section id="features" className="container nr-section"><div className="nr-section-head"><span className="nr-eyebrow">კონტროლი ყველა ეტაპზე</span><h2>AI გეხმარება პასუხში. გადაწყვეტილებას შენ იღებ.</h2><p>ყველა შესაძლებლობა ერთ სამუშაო სივრცეში — გამჭვირვალედ, უსაფრთხოდ და შენი ბიზნესის მონაცემებით.</p></div><div className="nr-feature-grid">{features.map(({ icon: Icon, tone, title, text }) => <article key={title} className={`nr-feature nr-feature-${tone}`}><span className="nr-feature-icon"><Icon className="size-5" /></span><h3>{title}</h3><p>{text}</p></article>)}</div></section>
        <section id="how-it-works" className="nr-section nr-section-alt"><div className="container"><div className="nr-section-head"><span className="nr-eyebrow">მარტივი workflow</span><h2>შენი წესები, შენი კატალოგი, ერთი მშვიდი სივრცე.</h2><p>NexaReply არ ცდილობს ადამიანის ჩანაცვლებას. ის ამზადებს სწორ კონტექსტს და გასაგებ შემდეგ ნაბიჯს.</p></div><div className="nr-steps">{steps.map(([num, title, text]) => <article key={num}><strong>{num}</strong><div><h3>{title}</h3><p>{text}</p></div></article>)}</div></div></section>
        <section id="app" className="container nr-section"><div className="nr-dashboard-preview"><div className="nr-browser-bar"><span /><span /><span /><code>app.nexareply.ge / inbox</code></div><div className="nr-preview-app"><aside><div className="nr-preview-brand"><div>AR</div><span>Amadeo<br /><small>● დაკავშირებული</small></span></div><p>WORKSPACE</p>{["Overview", "Inbox", "Products", "Knowledge"].map((item, i) => <div key={item} className={i === 1 ? "active" : ""}><MessageSquareText className="size-3.5" />{item}{i === 1 && <b>3</b>}</div>)}</aside><div className="nr-preview-main"><div className="flex items-start justify-between"><div><span className="nr-eyebrow">live workspace</span><h3>Inbox &amp; AI draft-ები</h3><p>მომხმარებლის კონტექსტი, evidence და operator control ერთ ხედში.</p></div><span className="nr-preview-status">● AI აქტიურია</span></div><div className="nr-preview-kpis"><div><span>ღია საუბრები</span><strong>12</strong><small>+4 დღეს</small></div><div><span>AI draft-ები</span><strong>28</strong><small>94% evidence</small></div><div><span>handoff tickets</span><strong>3</strong><small>1 ახალი</small></div></div><div className="nr-preview-thread"><div className="nr-preview-list"><b>ბოლო საუბრები</b><div className="selected">ანა მჭედლიძე <small>Rose Amber 50 მლ გაქვთ?</small></div><div>ნინო ბერიძე <small>მიწოდების პირობები</small></div><div>თამარ გელაშვილი <small>ფასის დაზუსტება</small></div></div><div className="nr-preview-convo"><span className="nr-preview-tag">AI DRAFT · evidence attached</span><div className="bubble user">Rose Amber 50 მლ გაქვთ?</div><div className="bubble bot">დიახ, მარაგშია. ფასი 49₾. გსურთ შეკვეთის გაფორმება?</div><small className="nr-source">◆ Catalog · AM-4412</small></div></div></div></div><div className="nr-preview-note">ეს არის visual preview. რეალური Inbox მუშაობს თქვენს დაცულ workspace-ში — <Link href="/auth">შექმენით ანგარიში</Link>.</div></div></section>
        <section className="nr-cta"><div className="container"><div className="nr-cta-box"><span className="nr-eyebrow">დაიწყე მშვიდი გაყიდვები</span><h2>ჯერ ნახე Demo, შემდეგ შექმენი შენი workspace.</h2><p>შეაერთე შენი Facebook Page, დაამატე ცოდნა და დატოვე AI მხოლოდ იმ საზღვრებში, რომლებიც შენ განსაზღვრე.</p><div className="flex flex-wrap justify-center gap-3"><Link href="/demo" className="nr-btn nr-btn-ghost">იხილე Demo Mode</Link><Link href="/auth" className="nr-btn nr-btn-primary">შექმენი workspace <ArrowRight className="size-4" /></Link></div></div></div></section>
        <section className="container nr-section nr-faq"><div className="grid gap-10 lg:grid-cols-[.75fr_1.25fr]"><div><span className="nr-eyebrow">ხშირი კითხვები</span><h2>ზუსტი საზღვრები ქმნის ნდობას.</h2></div><div className="space-y-3">{faq.map(([q, a]) => <details key={q} className="nr-faq-item"><summary>{q}<CircleHelp className="size-5" /></summary><p>{a}</p></details>)}</div></div></section>
      </main>
      <footer className="nr-footer"><div className="container flex flex-col gap-5 py-8 text-sm text-white/55 sm:flex-row sm:items-center sm:justify-between"><NexaLogo /><div className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/privacy">კონფიდენციალურობა</Link><Link href="/terms">პირობები</Link><Link href="/data-deletion">მონაცემების წაშლა</Link><Link href="/contact">კონტაქტი</Link></div></div></footer>
    </div>
  );
}
