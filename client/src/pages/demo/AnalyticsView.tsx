import { demoAnalytics } from "@/lib/demo-data";
import { ArrowUpRight, Bot, ChartNoAxesCombined, MessageSquareText, UsersRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const funnel = [
  { label: "ახალი საუბრები", count: 382, width: "100%", color: "bg-primary" },
  { label: "კვალიფიცირებული ლიდები", count: 126, width: "72%", color: "bg-[#0891B2]" },
  { label: "დრაფტ შეკვეთები", count: 18, width: "42%", color: "bg-[#B45309]" },
  { label: "დადასტურება ელოდება", count: 11, width: "24%", color: "bg-[#15803D]" },
];

function MetricCard({ icon: Icon, label, value, detail, accent = "primary" }: { icon: typeof Bot; label: string; value: string; detail: string; accent?: "primary" | "cyan" | "green" | "amber" }) {
  const colors = {
    primary: "text-primary",
    cyan: "text-[#0E7490] dark:text-[#A5F3FC]",
    green: "text-[#15803D] dark:text-[#86EFAC]",
    amber: "text-[#B45309] dark:text-[#FDE68A]",
  };
  return <article className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div className="flex justify-between gap-3"><div><p className="text-sm text-muted-foreground">{label}</p><p className="mt-3 text-3xl font-bold">{value}</p></div><Icon className={`size-5 ${colors[accent]}`} /></div><p className="mt-3 text-xs leading-5 text-muted-foreground">{detail}</p></article>;
}

export default function AnalyticsView() {
  return <div className="space-y-6"><div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between"><div><p className="text-sm font-semibold text-primary">მონაცემებზე დაფუძნებული სურათი</p><h1 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">ანალიტიკა</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">ყველა მეტრიკა არის TechZone Demo-ის უსაფრთხო, წინასწარ მომზადებული მონაცემი.</p></div><span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-muted px-3 py-1.5 text-xs font-semibold text-muted-foreground">ბოლო 7 დღე</span></div><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4"><MetricCard icon={MessageSquareText} label="პასუხის მაჩვენებელი" value="94%" detail="359 საუბარმა მიიღო პასუხი განსაზღვრულ window-ში" /><MetricCard icon={Bot} label="AI პასუხის წილი" value="71%" detail="271 AI პასუხი · 111 ოპერატორი" accent="cyan" /><MetricCard icon={UsersRound} label="ლიდის კონვერსია" value="33%" detail="126 კვალიფიცირებული ლიდი" accent="green" /><MetricCard icon={ChartNoAxesCombined} label="ოპერატორის handoff" value="9%" detail="36 საუბარი საჭიროებდა ადამიანს" accent="amber" /></div><div className="grid gap-5 xl:grid-cols-[1.35fr_0.65fr]"><section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><div><h2 className="font-bold">დღიური შეტყობინებების მოცულობა</h2><p className="mt-1 text-sm text-muted-foreground">AI და ოპერატორის პასუხების თანაფარდობა</p></div><div className="mt-5 h-[310px] w-full" aria-label="დღიური შეტყობინებების სვეტოვანი გრაფიკი"><ResponsiveContainer width="100%" height="100%"><BarChart data={demoAnalytics} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" opacity={0.1} /><XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "currentColor" }} /><YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: "currentColor" }} /><Tooltip contentStyle={{ borderRadius: 12, borderColor: "var(--border)", background: "var(--card)", color: "var(--card-foreground)" }} /><Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} /><Bar dataKey="ai" name="AI პასუხი" fill="var(--chart-1)" radius={[6, 6, 0, 0]} /><Bar dataKey="human" name="ოპერატორი" fill="var(--chart-2)" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer></div></section><section className="rounded-2xl border border-border bg-card p-5 shadow-sm"><h2 className="font-bold">კონვერსიის funnel</h2><p className="mt-1 text-sm text-muted-foreground">კონტაქტიდან draft order-მდე</p><div className="mt-6 space-y-5">{funnel.map((step) => <div key={step.label}><div className="flex items-center justify-between gap-3 text-sm"><span className="font-medium">{step.label}</span><span className="font-bold">{step.count}</span></div><div className="mt-2 h-2.5 overflow-hidden rounded-full bg-muted"><div className={`h-full rounded-full ${step.color}`} style={{ width: step.width }} /></div></div>)}</div><p className="mt-6 inline-flex items-center gap-1.5 text-xs font-semibold text-[#166534] dark:text-[#86EFAC]"><ArrowUpRight className="size-3.5" />Response-rate და funnel Demo metric-ებია</p></section></div></div>;
}
