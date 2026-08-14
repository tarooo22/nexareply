import { ArrowRight, Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { NexaLogo } from "./NexaLogo";
import { ThemeSelector } from "./ThemeSelector";

const links = [
  { href: "/#features", label: "შესაძლებლობები" },
  { href: "/#how-it-works", label: "როგორ მუშაობს" },
  { href: "/pricing", label: "ფასები" },
  { href: "/demo", label: "Demo" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [location, setLocation] = useLocation();

  const navigate = (href: string) => {
    setOpen(false);
    if (href.startsWith("/#")) {
      setLocation("/");
      window.setTimeout(() => document.querySelector(href.slice(1))?.scrollIntoView({ behavior: "smooth" }), 20);
      return;
    }
    setLocation(href);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/90 backdrop-blur-xl">
      <div className="container flex h-[72px] items-center justify-between gap-4">
        <NexaLogo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="მთავარი ნავიგაცია">
          {links.map((link) => (
            <button
              key={link.href}
              type="button"
              onClick={() => navigate(link.href)}
              aria-current={location === link.href ? "page" : undefined}
              className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {link.label}
            </button>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeSelector />
          <Link href="/auth?mode=login" className="inline-flex min-h-10 items-center justify-center rounded-xl px-3 text-sm font-semibold text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            შესვლა
          </Link>
          <Link href="/auth" className="inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_-16px_rgba(124,58,237,0.85)] transition-transform duration-200 hover:brightness-105 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            დაიწყეთ უფასოდ <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        <div className="flex items-center gap-2 md:hidden">
          <ThemeSelector />
          <button type="button" onClick={() => setOpen((value) => !value)} className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={open ? "მენიუს დახურვა" : "მენიუს გახსნა"} aria-expanded={open}>
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>
      {open && (
        <div className="container border-t border-border pb-4 pt-3 md:hidden">
          <nav className="grid gap-1" aria-label="მობილური ნავიგაცია">
            {links.map((link) => (
              <button key={link.href} type="button" onClick={() => navigate(link.href)} aria-current={location === link.href ? "page" : undefined} className="min-h-11 rounded-xl px-3 text-left text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {link.label}
              </button>
            ))}
            <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
              <Link href="/auth?mode=login" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-3 text-sm font-semibold text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">შესვლა</Link>
              <Link href="/auth" onClick={() => setOpen(false)} className="inline-flex min-h-11 items-center justify-center gap-1 rounded-xl bg-primary px-3 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">რეგისტრაცია <ArrowRight className="size-4" /></Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
