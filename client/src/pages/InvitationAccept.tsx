import { startLogin } from "@/const";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import { AlertTriangle, CheckCircle2, Loader2, LogIn, UserPlus } from "lucide-react";
import { useEffect } from "react";
import { Link, useLocation } from "wouter";

export default function InvitationAccept({ token }: { token: string }) {
  const { isAuthenticated, loading, user } = useAuth();
  const [, setLocation] = useLocation();
  const invite = trpc.nexareply.invitations.preview.useQuery({ token });
  const accept = trpc.nexareply.invitations.accept.useMutation();
  useEffect(() => { if (isAuthenticated) sessionStorage.removeItem("nexareply:pending-invitation-token"); }, [isAuthenticated]);
  if (loading || invite.isLoading) return <main className="grid min-h-screen place-items-center bg-background p-6"><div className="flex items-center gap-3 rounded-2xl border border-border bg-card px-5 py-4 text-sm font-semibold"><Loader2 className="size-4 animate-spin text-primary" />მოწვევა იტვირთება…</div></main>;
  const status = invite.data?.status ?? "invalid";
  const usable = status === "pending";
  const login = () => { sessionStorage.setItem("nexareply:pending-invitation-token", token); startLogin(); };
  return <main className="grid min-h-screen place-items-center bg-[radial-gradient(circle_at_top_right,_rgba(126,87,255,.13),_transparent_32%),hsl(var(--background))] p-6"><section className="w-full max-w-lg rounded-3xl border border-border bg-card p-7 shadow-xl"><span className={`grid size-12 place-items-center rounded-2xl ${usable ? "bg-primary text-primary-foreground" : "bg-destructive/10 text-destructive"}`}>{usable ? <UserPlus className="size-6" /> : <AlertTriangle className="size-6" />}</span><p className="mt-5 text-sm font-semibold text-primary">NexaReply Workspace</p><h1 className="mt-1 text-2xl font-bold">{usable ? `${invite.data?.organizationName ?? "ორგანიზაციის"} მოწვევა` : "მოწვევა მიუწვდომელია"}</h1>{usable ? <p className="mt-3 text-sm leading-6 text-muted-foreground">ეს მოწვევა მხოლოდ იმ ანგარიშით მიიღება, რომლის ელფოსტაზეც გაიგზავნა. მიღების შემდეგ მიიღებთ operator წვდომას workspace-ზე.</p> : <p className="mt-3 text-sm leading-6 text-muted-foreground">ეს ბმული შეიძლება არასწორი იყოს, გაუქმებული, უკვე მიღებული ან ვადაგასული. სთხოვეთ ორგანიზაციის მფლობელს ახალი მოწვევა.</p>}{usable && !isAuthenticated ? <button type="button" onClick={login} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground"><LogIn className="size-4" />შესვლა და მოწვევის გაგრძელება</button> : null}{usable && isAuthenticated ? <button type="button" onClick={() => accept.mutate({ token }, { onSuccess: () => setLocation("/app") })} disabled={accept.isPending} className="mt-6 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-50">{accept.isPending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}მოწვევის მიღება</button> : null}{accept.isError ? <p className="mt-3 text-sm font-medium text-destructive">მოწვევის მიღება ვერ შესრულდა. დარწმუნდით, რომ შესული ხართ შესაბამისი ელფოსტით: {user?.email ?? "ელფოსტა არ არის ხელმისაწვდომი"}.</p> : null}<Link href="/" className="mt-5 inline-flex text-sm font-semibold text-primary">მთავარ გვერდზე დაბრუნება</Link></section></main>;
}
