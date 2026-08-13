import { MessageCircleMore } from "lucide-react";
import { Link } from "wouter";

export function NexaLogo({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="inline-flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
      <span className="relative grid size-9 place-items-center rounded-xl bg-[linear-gradient(135deg,#5B21B6_0%,#7C3AED_58%,#0891B2_100%)] text-primary-foreground shadow-[0_12px_26px_-12px_rgba(109,40,217,0.78)]">
        <MessageCircleMore className="size-5" aria-hidden="true" />
        <span className="absolute -bottom-1 -right-1 size-3 rounded-full border-2 border-background bg-[#22D3EE]" aria-hidden="true" />
      </span>
      {!compact && <span className="text-[17px] font-bold tracking-[-0.04em] text-foreground"><span>Nexa</span><span className="text-primary">Reply</span></span>}
    </Link>
  );
}
