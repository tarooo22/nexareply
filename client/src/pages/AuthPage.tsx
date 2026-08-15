import { trpc } from "@/lib/trpc";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, Loader2, LockKeyhole, Mail, UserPlus, UserRound } from "lucide-react";
import { useState } from "react";
import { Link } from "wouter";
import { NexaLogo } from "@/components/NexaLogo";

function destinationAfterAuth() {
  const inviteToken = sessionStorage.getItem("nexareply:pending-invitation-token");
  return inviteToken ? `/invite/${inviteToken}` : "/app";
}

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">(() => new URLSearchParams(window.location.search).get("mode") === "login" ? "login" : "register");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const register = trpc.auth.register.useMutation({ onSuccess: () => window.location.assign(destinationAfterAuth()) });
  const login = trpc.auth.login.useMutation({ onSuccess: () => window.location.assign(destinationAfterAuth()) });
  const mutation = mode === "register" ? register : login;
  const message = mutation.error?.message || null;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (mode === "register") register.mutate({ name, email, password });
    else login.mutate({ email, password });
  };

  return <main className="nr-auth min-h-screen px-5 py-7 text-white sm:px-8 sm:py-10">
    <div className="mx-auto flex w-full max-w-[920px] items-center justify-between"><NexaLogo /><Link href="/" className="inline-flex items-center gap-2 text-sm font-semibold text-white/55 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF]">მთავარი <ArrowLeft className="size-4" /></Link></div>
    <section className="mx-auto mt-10 w-full max-w-[488px] rounded-[26px] border border-white/10 bg-white/[0.045] p-6 shadow-[0_34px_90px_-42px_rgba(0,0,0,.95)] backdrop-blur-xl sm:mt-12 sm:p-9" aria-labelledby="auth-title">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl border border-[#2DD4BF]/30 bg-[#2DD4BF]/10 text-[#34E7CE]"><LockKeyhole className="size-5" /></span><span className="nr-auth-kicker">NexaReply ანგარიში</span></div>
      <h1 id="auth-title" className="mt-5 text-[28px] font-extrabold tracking-[-.035em] sm:text-[31px]">{mode === "register" ? "შექმენი workspace" : "შედი workspace-ში"}</h1>
      <p className="mt-3 max-w-[400px] text-sm leading-7 text-white/55">{mode === "register" ? "რეგისტრაციის შემდეგ შეიქმნება შენი პირველი ორგანიზაცია. პაროლი უსაფრთხოდ hash-დება და browser-ში არ ინახება." : "შედი შენი ელფოსტითა და პაროლით. Meta authorization მხოლოდ Page კავშირისას გამოიყენება."}</p>
      <div className="mt-7 grid grid-cols-2 rounded-2xl border border-white/10 bg-black/10 p-1" role="tablist" aria-label="ანგარიშის მოქმედება"><button type="button" role="tab" aria-selected={mode === "register"} onClick={() => setMode("register")} className={`min-h-11 rounded-xl text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF] ${mode === "register" ? "bg-[#2DD4BF] text-[#04201C] shadow-[0_12px_28px_-18px_rgba(45,212,191,.9)]" : "text-white/55 hover:text-white"}`}>რეგისტრაცია</button><button type="button" role="tab" aria-selected={mode === "login"} onClick={() => setMode("login")} className={`min-h-11 rounded-xl text-sm font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF] ${mode === "login" ? "bg-[#2DD4BF] text-[#04201C] shadow-[0_12px_28px_-18px_rgba(45,212,191,.9)]" : "text-white/55 hover:text-white"}`}>შესვლა</button></div>
      <form onSubmit={submit} className="mt-7 grid gap-4">
        {mode === "register" ? <label className="grid gap-2 text-sm font-bold">სახელი<div className="relative"><UserRound className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-white/35" /><input required minLength={2} maxLength={120} value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" placeholder="შენი სახელი" className="nr-auth-input h-12 w-full pl-10 pr-3" /></div></label> : null}
        <label className="grid gap-2 text-sm font-bold">ელფოსტა<div className="relative"><Mail className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-white/35" /><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="you@example.com" className="nr-auth-input h-12 w-full pl-10 pr-3" /></div></label>
        <label className="grid gap-2 text-sm font-bold">პაროლი<div className="relative"><LockKeyhole className="pointer-events-none absolute left-3.5 top-3.5 size-4 text-white/35" /><input required type={showPassword ? "text" : "password"} minLength={10} maxLength={128} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete={mode === "register" ? "new-password" : "current-password"} placeholder="მინიმუმ 10 სიმბოლო" className="nr-auth-input h-12 w-full pl-10 pr-11" /><button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-3 grid size-6 place-items-center text-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2DD4BF]" aria-label={showPassword ? "პაროლის დამალვა" : "პაროლის ჩვენება"}>{showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div><span className="text-xs font-normal text-white/40">მინიმუმ 10 სიმბოლო</span></label>
        {message ? <p className="rounded-xl border border-red-400/25 bg-red-400/10 px-3 py-2 text-sm font-medium text-red-200" role="alert">{message}</p> : null}
        <button type="submit" disabled={mutation.isPending} className="mt-1 inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-[#2DD4BF] px-4 text-sm font-extrabold text-[#04201C] shadow-[0_18px_36px_-18px_rgba(45,212,191,.85)] transition-transform hover:bg-[#34E7CE] active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50">{mutation.isPending ? <Loader2 className="size-4 animate-spin" /> : mode === "register" ? <UserPlus className="size-4" /> : <CheckCircle2 className="size-4" />}{mode === "register" ? "ანგარიშის შექმნა" : "შესვლა"}</button>
      </form>
      <div className="mt-6 flex items-start gap-2 border-t border-white/10 pt-5 text-xs leading-5 text-white/45"><span className="mt-0.5 text-[#2DD4BF]"><CheckCircle2 className="size-4" /></span>პაროლი salted scrypt-ით ინახება. Meta ტოკენები არასდროს ინახება browser-ში.</div>
    </section>
    <p className="mx-auto mt-6 max-w-[488px] text-center text-sm text-white/45">უკვე გაქვს ანგარიში? <button type="button" onClick={() => setMode((value) => value === "register" ? "login" : "register")} className="font-bold text-[#34E7CE] hover:underline">{mode === "register" ? "შესვლა" : "რეგისტრაცია"}</button></p>
  </main>;
}
