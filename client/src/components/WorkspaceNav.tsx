import React from "react";
import { BarChart3, Bell, BookOpenText, Bot, Inbox, LayoutDashboard, PackageSearch, Settings2, TicketCheck, UsersRound } from "lucide-react";

export type WorkspaceRole = "owner" | "operator";

export const workspaceNavigation = [
  { id: "overview", label: "მიმოხილვა", icon: LayoutDashboard },
  { id: "inbox", label: "საუბრები", icon: Inbox },
  { id: "catalog", label: "პროდუქტები", icon: PackageSearch },
  { id: "knowledge", label: "ცოდნის ბაზა", icon: BookOpenText },
  { id: "assistant", label: "AI კონსულტანტი", icon: Bot },
  { id: "tickets", label: "Tickets", icon: TicketCheck },
  { id: "analytics", label: "ანალიტიკა", icon: BarChart3 },
  { id: "notifications", label: "შეტყობინებები", icon: Bell },
  { id: "members", label: "წევრები", icon: UsersRound, ownerOnly: true },
  { id: "integration", label: "ინტეგრაციები", icon: Settings2, ownerOnly: true },
] as const;

const navigationGroups: Array<{ label: string; ids: string[] }> = [
  { label: "სამუშაო სივრცე", ids: ["overview", "inbox"] },
  { label: "ცოდნა და გაყიდვები", ids: ["catalog", "knowledge"] },
  { label: "ავტომატიზაცია", ids: ["assistant", "tickets"] },
  { label: "მონიტორინგი", ids: ["analytics", "notifications"] },
  { label: "მართვა", ids: ["integration", "members"] },
];

export function visibleWorkspaceNavigation(role: WorkspaceRole) {
  return workspaceNavigation.filter((item) => !("ownerOnly" in item && item.ownerOnly) || role === "owner");
}

export function WorkspaceNav({ role, active, onSelect }: { role: WorkspaceRole; active: string; onSelect: (section: string) => void }) {
  const visible = visibleWorkspaceNavigation(role);
  return <nav className="mt-6 grid gap-5" aria-label="Protected workspace navigation">{navigationGroups.map((group) => {
    const items = visible.filter((item) => group.ids.includes(item.id));
    if (!items.length) return null;
    return <section key={group.label} aria-label={group.label}><p className="px-3 text-[11px] font-bold uppercase tracking-[0.14em] text-sidebar-foreground/45">{group.label}</p><div className="mt-2 grid gap-1">{items.map((item) => { const Icon = item.icon; return <button type="button" key={item.id} onClick={() => onSelect(item.id)} aria-current={active === item.id ? "page" : undefined} className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring ${active === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-sidebar-foreground/75 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"}`}><Icon className="size-4 shrink-0" aria-hidden="true" />{item.label}</button>; })}</div></section>;
  })}</nav>;
}
