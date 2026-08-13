import { MarketingHeader } from "@/components/MarketingHeader";
import { NexaLogo } from "@/components/NexaLogo";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { Link } from "wouter";

type PublicPageKind = "pricing" | "privacy" | "terms" | "contact";

const pricingPlans = [
  { name: "Start", price: "99", limit: "2,000 AI პასუხი", note: "პატარა გუნდისთვის", highlighted: false },
  { name: "Growth", price: "149", limit: "5,000 AI პასუხი", note: "მზარდი გაყიდვებისთვის", highlighted: true },
  { name: "Pro", price: "199", limit: "10,000 AI პასუხი", note: "მაღალი მოცულობისთვის", highlighted: false },
];

function Pricing() {
  return (
    <section className="container py-14 md:py-20">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold text-primary">მარტივი და გასაგები გეგმები</p>
        <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground md:text-5xl">აირჩიეთ პასუხების მოცულობა თქვენი გუნდისთვის</h1>
        <p className="mt-4 text-base leading-7 text-muted-foreground">ყველა გეგმა იწყება უსაფრთხო Demo Mode-ით. გადახდის დამუშავება ამ ვერსიაში ჯერ არ არის აქტიური.</p>
      </div>
      <div className="mx-auto mt-10 grid max-w-5xl gap-5 md:grid-cols-3">
        {pricingPlans.map((plan) => (
          <article key={plan.name} className={`relative rounded-2xl border p-6 shadow-sm ${plan.highlighted ? "border-primary bg-primary/[0.035] shadow-[0_22px_55px_-36px_rgba(124,58,237,0.62)]" : "border-border bg-card"}`}>
            {plan.highlighted && <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">რეკომენდებული</span>}
            <h2 className="text-lg font-bold text-foreground">{plan.name}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{plan.note}</p>
            <p className="mt-7 text-4xl font-bold tracking-tight text-foreground">{plan.price} <span className="text-base font-medium text-muted-foreground">GEL</span></p>
            <p className="mt-2 text-sm font-medium text-primary">{plan.limit}</p>
            <Link href="/demo" className={`mt-7 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${plan.highlighted ? "bg-primary text-primary-foreground" : "border border-border bg-background text-foreground hover:bg-accent"}`}>
              იხილეთ Demo Mode
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

const content: Record<Exclude<PublicPageKind, "pricing">, { eyebrow: string; title: string; body: string[] }> = {
  privacy: {
    eyebrow: "კონფიდენციალურობა",
    title: "თქვენი მონაცემები ეკუთვნის თქვენს ორგანიზაციას",
    body: [
      "NexaReply-ის Demo Mode იყენებს მხოლოდ წინასწარ მომზადებულ დემო მონაცემებს და არ აკავშირებს რეალურ Facebook Page-ს, Telegram ანგარიშს ან AI გასაღებს.",
      "რეალური ინტეგრაციების ჩართვამდე პროდუქტი მოითხოვს server-side secrets-ს, ორგანიზაციული წვდომის კონტროლს და მკაფიო retention წესებს. Page access token არასოდეს უნდა გამოჩნდეს browser-ში, screenshots-ში ან ლოგებში.",
    ],
  },
  terms: {
    eyebrow: "გამოყენების პირობები",
    title: "სანდო automation იწყება მკაფიო საზღვრებით",
    body: [
      "NexaReply-ის AI პასუხი არის სამუშაო draft და მისი გაგზავნა უნდა დაემყაროს ორგანიზაციის კატალოგსა და ცოდნის ბაზას. სისტემა არ უნდა ადასტურებდეს შეკვეთას, თუ ბიზნესმა ის არ დაადასტურა.",
      "Demo Mode არის პროდუქტის შეფასების სივრცე. აქ ნაჩვენები ინტეგრაციები, შეტყობინებები და ანალიტიკა სიმულირებულია, თუ კონკრეტული კავშირი აშკარად არ არის ვერიფიცირებული.",
    ],
  },
  contact: {
    eyebrow: "კონტაქტი",
    title: "დაგეგმეთ თქვენი Messenger გაყიდვების workflow",
    body: [
      "დაიწყეთ TechZone Demo-ით, შემდეგ კი მოამზადეთ თქვენი პროდუქტის კატალოგი, ბიზნეს წესები და პასუხების ტონი რეალური workspace-ისთვის.",
      "ინტეგრაციების ჩართვისას ყველა კონფიდენციალური მნიშვნელობა უნდა დაემატოს მხოლოდ უსაფრთხო გარემოს ცვლადებში და არასოდეს ჩაისვას source code-ში.",
    ],
  },
};

export default function PublicPage({ kind }: { kind: PublicPageKind }) {
  const item = kind === "pricing" ? null : content[kind];
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MarketingHeader />
      <main>{kind === "pricing" ? <Pricing /> : <section className="container py-14 md:py-20"><div className="mx-auto max-w-3xl rounded-3xl border border-border bg-card p-7 shadow-sm md:p-11"><div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">{kind === "contact" ? <Mail className="size-5" /> : <ShieldCheck className="size-5" />}</div><p className="mt-7 text-sm font-semibold text-primary">{item?.eyebrow}</p><h1 className="mt-3 text-3xl font-bold tracking-tight md:text-5xl">{item?.title}</h1>{item?.body.map((paragraph) => <p key={paragraph} className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground">{paragraph}</p>)}<Link href="/" className="mt-9 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-semibold hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft className="size-4" />მთავარ გვერდზე დაბრუნება</Link></div></section>}</main>
      <footer className="border-t border-border"><div className="container flex flex-col gap-4 py-7 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><NexaLogo /><span>Demo Mode · Georgian-first AI sales workspace</span></div></footer>
    </div>
  );
}
