import { MarketingHeader } from "@/components/MarketingHeader";
import { NexaLogo } from "@/components/NexaLogo";
import { ArrowRight, Bot, ChartNoAxesCombined, CheckCircle2, CircleHelp, ClipboardCheck, MessageSquareText, ShieldCheck, Sparkles, UsersRound } from "lucide-react";
import { Link } from "wouter";

const features = [
  { icon: Bot, title: "AI პასუხი თქვენი მონაცემებით", text: "კატალოგი და ცოდნის ბაზა პასუხის საფუძველია. გაურკვეველი დეტალი არ გამოიგონება." },
  { icon: MessageSquareText, title: "ერთი სრული პასუხი", text: "რამდენიმე ზედიზედ შეტყობინება ერთ კითხვად ერთიანდება, რათა საუბარი ბუნებრივად გაგრძელდეს." },
  { icon: UsersRound, title: "ადამიანური კონტროლი", text: "ნებისმიერ საუბარში შეგიძლიათ AI შეაჩეროთ, აიღოთ მართვა და თავად უპასუხოთ." },
  { icon: ChartNoAxesCombined, title: "გაყიდვების სრული სურათი", text: "ნახეთ შეტყობინებები, ლიდები, tickets და AI-ისა და გუნდის პასუხების ბალანსი." },
];

const useCases = [
  { title: "მობილური ტექნიკა", text: "დაამოწმეთ მოდელი, ფერი, ფასი, მარაგი, განვადება და ფილიალიდან გატანა ერთი სამუშაო სივრციდან." },
  { title: "სილამაზისა და მოვლის ბიზნესი", text: "მომხმარებლის კითხვები გადაამისამართეთ სერვისებზე, ხელმისაწვდომ დროზე, წესებსა და კონსულტაციაზე." },
  { title: "ლოკალური რითეილი", text: "გააერთიანეთ პროდუქტის ცოდნა, მიწოდების პირობები და ოპერატორის ჩართვა მაღალი განზრახვის მქონე ლიდისთვის." },
];

const steps = [
  ["01", "დაამატეთ თქვენი ცოდნა", "ატვირთეთ პროდუქტები, ფასები, მარაგი, განვადება და ბიზნეს წესები."],
  ["02", "მიეცით AI-ს სწორი კონტექსტი", "აირჩიეთ ტონი, პასუხის სიგრძე და ის პირობები, რომელთა დაპირებაც არ შეიძლება."],
  ["03", "მართეთ ყველა საუბარი ერთ ადგილას", "AI ამზადებს პასუხს, თქვენ ამტკიცებთ ან იღებთ საუბარს მაშინ, როცა საჭიროა."],
];

const faq = [
  ["რა არის Demo Mode?", "Demo Mode ღიაა შესვლის გარეშე და იყენებს TechZone Demo-ის წინასწარ მომზადებულ მონაცემებს. ის არ უკავშირდება რეალურ Facebook Page-ს ან რეალურ მომხმარებლებს."],
  ["AI თვითონ აგზავნის პასუხს?", "Demo Mode-ში პასუხები სიმულირებულია. რეალურ workspace-ში AI-ის ქცევა, დამტკიცება და human takeover ბიზნესის კონფიგურაციით იმართება."],
  ["როგორ იცავს სისტემა არაზუსტი პასუხისგან?", "როცა კატალოგში ან ცოდნის ბაზაში საკმარისი ინფორმაცია არ არის, NexaReply ქმნის ticket-ს და გადასცემს საკითხს ოპერატორს."],
];

export default function Home() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-background text-foreground">
      <MarketingHeader />
      <main>
        <section className="relative isolate overflow-hidden">
          <div className="absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(circle_at_20%_15%,rgba(124,58,237,0.16),transparent_35%),radial-gradient(circle_at_78%_18%,rgba(8,145,178,0.14),transparent_30%)]" />
          <div className="container grid gap-12 pb-16 pt-16 md:pb-24 md:pt-24 lg:grid-cols-[1.02fr_0.98fr] lg:items-center lg:gap-16">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/15 bg-primary/[0.06] px-3 py-1.5 text-sm font-semibold text-primary"><Sparkles className="size-4" aria-hidden="true" />ქართული ბიზნესისთვის შექმნილი AI გაყიდვების სივრცე</div>
              <h1 className="mt-6 text-4xl font-bold tracking-[-0.045em] text-foreground sm:text-5xl lg:text-[3.7rem] lg:leading-[1.04]">Messenger გაყიდვები <span className="text-primary">უფრო ნათლად</span> იმართება.</h1>
              <p className="mt-6 max-w-xl text-base leading-8 text-muted-foreground md:text-lg">NexaReply აერთიანებს თქვენს კატალოგს, AI draft-ებს და ადამიანურ კონტროლს ერთ სამუშაო სივრცეში — რათა მომხმარებელმა მიიღოს სწრაფი პასუხი, რომელსაც თქვენი მონაცემები ამყარებს.</p>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link href="/demo" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_18px_35px_-20px_rgba(124,58,237,0.92)] transition-transform duration-200 hover:brightness-105 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">სცადეთ Demo Mode<ArrowRight className="size-4" aria-hidden="true" /></Link>
                <a href="#how-it-works" className="inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-5 text-sm font-semibold text-foreground shadow-sm transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">იხილეთ როგორ მუშაობს</a>
              </div>
              <div className="mt-8 flex flex-wrap gap-x-5 gap-y-3 text-sm text-muted-foreground"><span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-[#15803D]" aria-hidden="true" />ქართული-first გამოცდილება</span><span className="inline-flex items-center gap-2"><CheckCircle2 className="size-4 text-[#15803D]" aria-hidden="true" />Demo Mode შესვლის გარეშე</span></div>
            </div>
            <div className="relative mx-auto w-full max-w-[560px] rounded-[28px] border border-border/80 bg-card p-3 shadow-[0_34px_80px_-44px_rgba(30,27,75,0.42)]">
              <div className="rounded-[20px] border border-border bg-background p-4 sm:p-5">
                <div className="flex items-center justify-between border-b border-border pb-4"><div className="flex items-center gap-3"><div className="grid size-10 place-items-center rounded-full bg-primary/10 font-semibold text-primary">ა</div><div><p className="text-sm font-semibold">ანა მჭედლიძე</p><p className="text-xs text-muted-foreground">Messenger · ახლახან</p></div></div><span className="rounded-full bg-[#E9F8EF] px-2.5 py-1 text-xs font-semibold text-[#166534] dark:bg-[#166534]/30 dark:text-[#86EFAC]">AI აქტიურია</span></div>
                <div className="space-y-3 py-5"><div className="ml-auto max-w-[80%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2.5 text-sm leading-6 text-primary-foreground">iPhone 16 Pro Max გაქვთ? რამდენია? შავი ფერი მინდა</div><div className="max-w-[89%] rounded-2xl rounded-bl-md border border-[#BEE8F2] bg-[#EDF9FC] px-3.5 py-3 text-sm leading-6 text-[#164E63] dark:border-[#155E75]/70 dark:bg-[#164E63]/30 dark:text-[#CFFAFE]"><div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-[#0E7490]"><Bot className="size-3.5" />AI-ის პასუხი</div>iPhone 16 Pro Max 256GB შავი ფერი გვაქვს მარაგში. ფასი არის 3,699 GEL და მოქმედებს 0%-იანი განვადება 12 თვემდე.</div></div>
                <div className="rounded-xl border border-primary/20 bg-primary/[0.04] p-3"><div className="flex items-start gap-2"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" /><div><p className="text-xs font-semibold text-foreground">რატომ არის პასუხი სანდო?</p><p className="mt-1 text-xs leading-5 text-muted-foreground">AI პასუხობს მხოლოდ პროდუქტის მონაცემებისა და ბიზნეს წესების საფუძველზე.</p></div></div></div>
              </div>
              <div className="absolute -right-3 -top-4 hidden rounded-2xl border border-border bg-card px-4 py-3 shadow-lg sm:block"><p className="text-xs font-medium text-muted-foreground">საჭიროა ოპერატორი</p><p className="mt-1 text-sm font-bold text-foreground">1 ახალი ticket</p></div>
            </div>
          </div>
        </section>
        <section id="features" className="border-y border-border bg-card/50 py-16 md:py-22"><div className="container"><div className="max-w-2xl"><p className="text-sm font-semibold text-primary">კონტროლი ყველა ეტაპზე</p><h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">AI გეხმარებათ პასუხში. გადაწყვეტილებას თქვენ იღებთ.</h2></div><div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{features.map((feature) => { const Icon = feature.icon; return <article key={feature.title} className="rounded-2xl border border-border bg-background p-5 shadow-sm"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><Icon className="size-5" /></span><h3 className="mt-5 text-base font-bold">{feature.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{feature.text}</p></article>; })}</div></div></section>
        <section className="container py-16 md:py-22"><div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between"><div className="max-w-2xl"><p className="text-sm font-semibold text-primary">ვისთვის არის NexaReply</p><h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">ერთი workflow სხვადასხვა გაყიდვების რეალობისთვის.</h2></div><Link href="/demo" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-4 text-sm font-semibold text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">სცადეთ მაგალითი</Link></div><div className="mt-8 grid gap-4 md:grid-cols-3">{useCases.map((useCase) => <article key={useCase.title} className="rounded-2xl border border-border bg-card p-5 shadow-sm"><span className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Use case</span><h3 className="mt-4 text-lg font-bold">{useCase.title}</h3><p className="mt-2 text-sm leading-7 text-muted-foreground">{useCase.text}</p></article>)}</div></section>
        <section id="how-it-works" className="container py-16 md:py-22"><div className="grid gap-10 lg:grid-cols-[0.7fr_1.3fr]"><div><p className="text-sm font-semibold text-primary">მარტივი workflow</p><h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">თქვენი წესები, თქვენი კატალოგი, ერთი მშვიდი სამუშაო სივრცე.</h2><p className="mt-4 max-w-md text-base leading-7 text-muted-foreground">NexaReply არ ცდილობს ადამიანის ჩანაცვლებას. ის ამზადებს სწორ კონტექსტს და გასაგებ შემდეგ ნაბიჯს.</p></div><div className="grid gap-3">{steps.map(([number, title, text]) => <article key={number} className="grid gap-4 rounded-2xl border border-border bg-card p-5 sm:grid-cols-[44px_1fr]"><span className="grid size-11 place-items-center rounded-xl bg-accent text-sm font-bold text-accent-foreground">{number}</span><div><h3 className="font-bold">{title}</h3><p className="mt-1.5 text-sm leading-6 text-muted-foreground">{text}</p></div></article>)}</div></div></section>
        <section className="border-y border-border bg-[#F4F0FF] py-16 dark:bg-primary/[0.09]"><div className="container grid gap-8 lg:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold text-primary">TechZone Demo</p><h2 className="mt-3 max-w-2xl text-3xl font-bold tracking-tight md:text-4xl">გაიარეთ სრული workflow — რეგისტრაციის გარეშე.</h2><p className="mt-4 max-w-2xl text-base leading-7 text-muted-foreground">ნახეთ რეალისტური საუბრები, AI draft-ები, human takeover, tickets, პროდუქტის კატალოგი და ანალიტიკა უსაფრთხო დემო გარემოში.</p></div><Link href="/demo" className="inline-flex min-h-12 items-center justify-center gap-2 self-center rounded-xl bg-primary px-5 text-sm font-semibold text-primary-foreground shadow-[0_16px_30px_-18px_rgba(124,58,237,0.85)] transition-transform duration-200 hover:brightness-105 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">გახსენით სამუშაო სივრცე<ArrowRight className="size-4" /></Link></div></section>
        <section className="container py-16 md:py-22"><div className="grid gap-10 lg:grid-cols-[0.8fr_1.2fr]"><div><p className="text-sm font-semibold text-primary">ხშირი კითხვები</p><h2 className="mt-3 text-3xl font-bold tracking-tight md:text-4xl">ზუსტი საზღვრები ქმნის ნდობას.</h2></div><div className="space-y-3">{faq.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-border bg-card p-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-sm font-bold"><span>{question}</span><CircleHelp className="size-5 shrink-0 text-primary transition-transform group-open:rotate-180" /></summary><p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground">{answer}</p></details>)}</div></div></section>
      </main>
      <footer className="border-t border-border bg-card"><div className="container flex flex-col gap-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><NexaLogo /><div className="flex flex-wrap gap-x-5 gap-y-2"><Link href="/privacy">კონფიდენციალურობა</Link><Link href="/terms">პირობები</Link><Link href="/contact">კონტაქტი</Link></div></div></footer>
    </div>
  );
}
