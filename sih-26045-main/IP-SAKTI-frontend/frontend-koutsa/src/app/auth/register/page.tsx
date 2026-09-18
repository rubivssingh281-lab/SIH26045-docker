"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthVisual } from "@/components/domain/auth-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/components/providers";

export default function RegisterPage() {
  const router = useRouter();
  const { setSession } = useAuth();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!firstName.trim() || !lastName.trim()) return setError("Enter your first and last name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must contain at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const result = await authApi.register({ first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim(), password });
      if (result.requires_otp) {
        router.push(`/auth/verify?mode=register&email=${encodeURIComponent(email)}`);
      } else if (result.access_token) {
        setSession(result.access_token, result.user); router.push("/dashboard");
      } else {
        router.push(`/auth/login?mode=otp&email=${encodeURIComponent(email)}`);
      }
    } catch (err) { setError(getApiErrorMessage(err, "We couldn't create your account right now. Please try again.")); }
    finally { setLoading(false); }
  }

  return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden bg-forest">
      <div className="grid min-h-[100dvh] w-full overflow-hidden bg-canvas md:grid-cols-[.92fr_1.08fr]">
        <AuthVisual mode="register" />
        <section className="flex items-center justify-center bg-canvas px-6 py-10 md:px-10 xl:px-16">
          <div className="w-full max-w-[560px]">
            <div className="lg:hidden mb-8 flex items-center gap-3 text-forest"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest text-white"><ShieldCheck size={22}/></div><div><div className="serif text-2xl">IP-SAKTI</div><div className="text-xs text-ink/55">Sahayak AI</div></div></div>
            <p className="eyebrow">Get started</p>
            <h1 className="serif mt-2 text-4xl leading-tight text-forest md:text-5xl">Create your account</h1>
            <p className="mt-3 text-sm leading-6 text-ink/60">Create an account to start managing your Ayurvedic IP research.</p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="first-name" className="mb-2 block text-sm font-bold">First name</label><div className="relative"><UserRound className="absolute left-4 top-3.5 text-ink/35" size={17}/><Input id="first-name" autoComplete="given-name" value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder="First name" className="h-14 pl-11" required/></div></div>
                <div><label htmlFor="last-name" className="mb-2 block text-sm font-bold">Last name</label><div className="relative"><UserRound className="absolute left-4 top-3.5 text-ink/35" size={17}/><Input id="last-name" autoComplete="family-name" value={lastName} onChange={e=>setLastName(e.target.value)} placeholder="Last name" className="h-14 pl-11" required/></div></div>
              </div>
              <div><label htmlFor="register-email" className="mb-2 block text-sm font-bold">Email address</label><div className="relative"><Mail className="absolute left-4 top-3.5 text-ink/35" size={18}/><Input id="register-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" className="h-14 pl-11" required/></div></div>
              <div><label htmlFor="register-password" className="mb-2 block text-sm font-bold">Password</label><div className="relative"><LockKeyhole className="absolute left-4 top-3.5 text-ink/35" size={18}/><Input id="register-password" type={showPassword?"text":"password"} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Create a password" className="h-14 pl-11 pr-12" required/><button type="button" aria-label="Toggle password visibility" onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-2.5 rounded-lg p-2 text-ink/40 hover:bg-mist">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><p className="mt-1.5 text-xs text-ink/45">Use at least 8 characters.</p></div>
              <div><label htmlFor="confirm-password" className="mb-2 block text-sm font-bold">Confirm password</label><div className="relative"><LockKeyhole className="absolute left-4 top-3.5 text-ink/35" size={18}/><Input id="confirm-password" type={showConfirm?"text":"password"} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder="Re-enter your password" className="h-14 pl-11 pr-12" required/><button type="button" aria-label="Toggle confirm password visibility" onClick={()=>setShowConfirm(v=>!v)} className="absolute right-3 top-2.5 rounded-lg p-2 text-ink/40 hover:bg-mist">{showConfirm?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{confirmPassword && password===confirmPassword && <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald"><CheckCircle2 size={13}/> Passwords match</p>}</div>
              {error && <div role="alert" className="rounded-lg border border-[#FFD0CB] bg-[#FFF1EF] px-4 py-3 text-sm text-[#93000A]">{error}</div>}
              <Button type="submit" size="lg" className="h-14 w-full" disabled={loading}>{loading ? "Creating account…" : <>Create account <ArrowRight size={18}/></>}</Button>
            </form>

            <div className="my-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-ink/35"><span className="h-px flex-1 bg-line"/><span>Already registered?</span><span className="h-px flex-1 bg-line"/></div>
            <p className="text-center text-sm text-ink/60">Already have an account? <Link href="/auth/login" className="font-bold text-forest hover:underline">Sign in</Link></p>
            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-ink/45"><ShieldCheck size={15}/> Your information is securely protected.</div>
          </div>
        </section>
      </div>
    </main>
  );
}
