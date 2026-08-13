import { Menu, X } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { NexaLogo } from "./NexaLogo";
import { ThemeSelector } from "./ThemeSelector";

const links = [
  { href: "/#features", label: "შესაძლებლობები" },
  { href: "/#how-it-works", label: "როგორ მუშაობს" },
  { href: "/pricing", label: "ფასები" },
  { href: "/contact", label: "კონტაქტი" },
];

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();

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
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/85 backdrop-blur-xl">
      <div className="container flex h-[68px] items-center justify-between gap-4">
        <NexaLogo />
        <nav className="hidden items-center gap-1 md:flex" aria-label="მთავარი ნავიგაცია">
          {links.map((link) => (
            <button key={link.href} type="button" onClick={() => navigate(link.href)} className="rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              {link.label}
            </button>
          ))}
        </nav>
        <div className="hidden items-center gap-2 md:flex">
          <ThemeSelector />
          <Link href="/demo" className="inline-flex min-h-10 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-[0_12px_28px_-16px_rgba(124,58,237,0.85)] transition-transform duration-200 hover:brightness-105 active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
            სცადეთ Demo Mode
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
              <button key={link.href} type="button" onClick={() => navigate(link.href)} className="min-h-11 rounded-xl px-3 text-left text-sm font-medium text-foreground hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                {link.label}
              </button>
            ))}
            <Link href="/demo" onClick={() => setOpen(false)} className="mt-2 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              სცადეთ Demo Mode
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
