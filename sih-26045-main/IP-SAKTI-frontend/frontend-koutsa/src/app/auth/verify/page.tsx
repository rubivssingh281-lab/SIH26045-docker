"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Leaf, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi } from "@/lib/api";
import { useAuth } from "@/components/providers";

export default function AuthVerifyPage() {
  const router = useRouter();
  const params = useSearchParams();
  const { setSession } = useAuth();
  const email = params.get("email") || "";
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => { otpRef.current?.focus(); }, []);
  useEffect(() => { if (!secondsLeft) return; const timer=window.setInterval(()=>setSecondsLeft(v=>Math.max(0,v-1)),1000); return ()=>window.clearInterval(timer); }, [secondsLeft]);

  async function verify(event: FormEvent) {
    event.preventDefault(); setError("");
    if (otp.length !== 6) return setError("Enter the 6-digit verification code.");
    setLoading(true);
    try {
      const result = await authApi.verifyOtp(email, otp);
      if (!result.access_token) return setError("That OTP is incorrect. Please try again.");
      setSession(result.access_token, result.user); router.push("/dashboard");
    } catch { setError("We couldn't verify the OTP right now. Please try again."); }
    finally { setLoading(false); }
  }

  async function resend() {
    setError(""); await authApi.requestOtp(email); setSecondsLeft(60);
  }

  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center bg-forest p-0">
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-canvas px-6 py-10 md:px-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-forest text-white"><Leaf size={27}/></div>
          <p className="eyebrow mt-6">Verify your email</p>
          <h1 className="serif mt-2 text-4xl text-forest">Enter your verification code</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">We sent a 6-digit OTP to <span className="font-bold text-forest">{email || "your email address"}</span>.</p>
          <form onSubmit={verify} className="mt-8 space-y-5">
            <Input ref={otpRef} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" className="h-16 text-center text-2xl tracking-[.5em]" required/>
            {error && <div role="alert" className="rounded-lg border border-[#FFD0CB] bg-[#FFF1EF] px-4 py-3 text-sm text-[#93000A]">{error}</div>}
            <Button className="h-14 w-full" size="lg" disabled={loading || otp.length!==6}>{loading ? "Verifying…" : <>Verify email <ArrowRight size={18}/></>}</Button>
          </form>
          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-ink/50"><span>Expires in 00:{secondsLeft.toString().padStart(2,"0")}</span><button type="button" onClick={resend} disabled={secondsLeft>0} className="inline-flex items-center gap-1 font-bold text-gold disabled:text-ink/25"><RefreshCw size={13}/> Resend</button></div>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-ink/45"><CheckCircle2 size={15}/> Secure verification for your research workspace.</div>
          <Link href="/auth/login" className="mt-6 inline-block text-sm font-bold text-forest hover:underline">Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}
