import React from "react";
import { BarChart3, Bell, Inbox, LayoutDashboard, PackageSearch, Settings2, UsersRound } from "lucide-react";

export type WorkspaceRole = "owner" | "operator";

export const workspaceNavigation = [
  { id: "overview", label: "მიმოხილვა", icon: LayoutDashboard },
  { id: "inbox", label: "საუბრები", icon: Inbox },
  { id: "catalog", label: "პროდუქტები", icon: PackageSearch },
  { id: "analytics", label: "ანალიტიკა", icon: BarChart3 },
  { id: "notifications", label: "შეტყობინებები", icon: Bell },
  { id: "members", label: "წევრები", icon: UsersRound, ownerOnly: true },
  { id: "integration", label: "ინტეგრაციები", icon: Settings2, ownerOnly: true },
] as const;

export function visibleWorkspaceNavigation(role: WorkspaceRole) {
  return workspaceNavigation.filter((item) => !("ownerOnly" in item && item.ownerOnly) || role === "owner");
}

export function WorkspaceNav({ role, active, onSelect }: { role: WorkspaceRole; active: string; onSelect: (section: string) => void }) {
  return <nav className="mt-5 grid gap-1" aria-label="Protected workspace navigation">{visibleWorkspaceNavigation(role).map((item) => { const Icon = item.icon; return <button type="button" key={item.id} onClick={() => onSelect(item.id)} className={`flex min-h-10 items-center gap-3 rounded-xl px-3 text-left text-sm font-semibold ${active === item.id ? "bg-primary text-primary-foreground" : "text-sidebar-foreground/75 hover:bg-sidebar-accent"}`}><Icon className="size-4" />{item.label}</button>; })}</nav>;
}
