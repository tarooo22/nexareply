import { trpc } from "@/lib/trpc";
import { CheckCircle2, LockKeyhole, Loader2, Mail, UserPlus } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";

function destinationAfterAuth() {
  const inviteToken = sessionStorage.getItem("nexareply:pending-invitation-token");
  return inviteToken ? `/invite/${inviteToken}` : "/app";
}

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">(() => new URLSearchParams(window.location.search).get("mode") === "login" ? "login" : "register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const register = trpc.auth.register.useMutation({ onSuccess: () => window.location.assign(destinationAfterAuth()) });
  const login = trpc.auth.login.useMutation({ onSuccess: () => window.location.assign(destinationAfterAuth()) });
  const mutation = mode === "register" ? register : login;
  const message = mutation.error?.message || null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "register") register.mutate({ name, email, password });
    else login.mutate({ email, password });
  };

  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,_rgba(126,87,255,.16),_transparent_32%),hsl(var(--background))] p-5 text-foreground">
    <section className="w-full max-w-md rounded-3xl border border-border bg-card p-6 shadow-xl sm:p-8" aria-labelledby="auth-title">
      <span className="grid size-12 place-items-center rounded-2xl bg-primary text-primary-foreground"><LockKeyhole className="size-6" /></span>
      <p className="mt-5 text-sm font-semibold text-primary">NexaReply ანგარიში</p>
      <h1 id="auth-title" className="mt-1 text-2xl font-bold">{mode === "register" ? "შექმენით workspace" : "შედით workspace-ში"}</h1>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode === "register" ? "რეგისტრაციის შემდეგ შეიქმნება თქვენი პირველი ორგანიზაცია. პაროლი უსაფრთხოდ hash-დება და browser-ში არ ინახება." : "შედით თქვენი ელფოსტითა და პაროლით. Meta authorization მხოლოდ Page კავშირისას გამოიყენება."}</p>
      <div className="mt-6 grid grid-cols-2 rounded-xl bg-secondary p-1" role="tablist" aria-label="ანგარიშის მოქმედება">
        <button type="button" role="tab" aria-selected={mode === "register"} onClick={() => setMode("register")} className={`min-h-10 rounded-lg text-sm font-semibold ${mode === "register" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>რეგისტრაცია</button>
        <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")} className={`min-h-10 rounded-lg text-sm font-semibold ${mode === "login" ? "bg-background shadow-sm" : "text-muted-foreground"}`}>შესვლა</button>
      </div>
      <form onSubmit={submit} className="mt-6 grid gap-4">
        {mode === "register" ? <label className="grid gap-2 text-sm font-semibold">სახელი<input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="h-11 rounded-xl border border-border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-primary" /></label> : null}
        <label className="grid gap-2 text-sm font-semibold">ელფოსტა<div className="relative"><Mail className="pointer-events-none absolute left-3 top-3.5 size-4 text-muted-foreground" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-primary" /></div></label>
        <label className="grid gap-2 text-sm font-semibold">პაროლი<input required type="password" minLength={10} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} className="h-11 rounded-xl border border-border bg-background px-3 font-normal outline-none focus-visible:ring-2 focus-visible:ring-primary" /><span className="text-xs font-normal text-muted-foreground">მინიმუმ 10 სიმბოლო</span></label>
        {message ? <p className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive" role="alert">{message}</p> : null}
        <button type="submit" disabled={mutation.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : mode === "register" ? <UserPlus className="size-4" /> : <CheckCircle2 className="size-4" />}{mode === "register" ? "ანგარიშის შექმნა" : "შესვლა"}</button>
      </form>
      <Link href="/" className="mt-5 inline-flex min-h-10 items-center text-sm font-semibold text-primary">მთავარ გვერდზე დაბრუნება</Link>
    </section>
  </main>;
}
