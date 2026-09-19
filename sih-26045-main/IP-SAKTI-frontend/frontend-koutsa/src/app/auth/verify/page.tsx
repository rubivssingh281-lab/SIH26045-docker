"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Leaf, RefreshCw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, getApiErrorMessage } from "@/lib/api";
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
  const [info, setInfo] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => { otpRef.current?.focus(); }, []);
  useEffect(() => { if (!secondsLeft) return; const timer=window.setInterval(()=>setSecondsLeft(v=>Math.max(0,v-1)),1000); return ()=>window.clearInterval(timer); }, [secondsLeft]);

  // Demo mode (backend has no mail configured): the register step stashes the
  // code here so the user can still verify without an email account.
  useEffect(() => {
    try {
      const stashedOtp = sessionStorage.getItem("ip-sakti-dev-otp");
      const stashedMsg = sessionStorage.getItem("ip-sakti-verify-msg");
      if (stashedOtp) { setDevOtp(stashedOtp); setOtp(stashedOtp); }
      if (stashedMsg) setInfo(stashedMsg);
      sessionStorage.removeItem("ip-sakti-dev-otp");
      sessionStorage.removeItem("ip-sakti-verify-msg");
    } catch { /* sessionStorage may be unavailable; ignore */ }
  }, []);

  async function verify(event: FormEvent) {
    event.preventDefault(); setError("");
    if (otp.length !== 6) return setError("Enter the 6-digit verification code.");
    if (!secondsLeft && !devOtp) return setError("This code has expired. Tap Resend to get a new one.");
    setLoading(true);
    try {
      const result = await authApi.verifyOtp(email, otp);
      if (!result.access_token) return setError("That code is incorrect. Please check and try again.");
      setSession(result.access_token, result.user); router.push("/dashboard");
    } catch (err) {
      // Backend returns precise reasons: "Invalid OTP", "OTP expired", etc.
      // getApiErrorMessage surfaces those, and a distinct message when the
      // service can't be reached at all.
      setError(getApiErrorMessage(err, "We couldn't verify the code right now. Please try again."));
    }
    finally { setLoading(false); }
  }

  async function resend() {
    setError(""); setInfo(""); setDevOtp("");
    setLoading(true);
    try {
      const result = await authApi.requestOtp(email);
      setSecondsLeft(60);
      if (result.dev_otp) { setDevOtp(result.dev_otp); setOtp(result.dev_otp); setInfo(result.message || "Email delivery is off — use the code shown below."); }
      else setInfo("A new code is on its way to your email.");
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't send a new code right now. Please try again."));
    }
    finally { setLoading(false); }
  }

  return (
    <main className="flex min-h-[100dvh] w-full items-center justify-center bg-forest p-0">
      <div className="flex min-h-[100dvh] w-full items-center justify-center bg-canvas px-6 py-10 md:px-12">
        <div className="w-full max-w-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-xl bg-forest text-white"><Leaf size={27}/></div>
          <p className="eyebrow mt-6">Verify your email</p>
          <h1 className="serif mt-2 text-4xl text-forest">Enter your verification code</h1>
          <p className="mt-3 text-sm leading-6 text-ink/60">We sent a 6-digit OTP to <span className="font-bold text-forest">{email || "your email address"}</span>.</p>
          {devOtp && (
            <div className="mt-5 rounded-xl border border-[#E4D8BC] bg-[#FBF6E7] px-4 py-3 text-left text-sm text-[#6B5A21]">
              <p className="font-bold">Demo mode — email delivery is off</p>
              <p className="mt-1">Your verification code is <span className="font-mono text-lg font-bold tracking-widest text-forest">{devOtp}</span> (pre-filled below). Configure the mail settings in <span className="font-mono">backend/.env</span> to send real emails.</p>
            </div>
          )}
          <form onSubmit={verify} className="mt-8 space-y-5">
            <Input ref={otpRef} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="000000" className="h-16 text-center text-2xl tracking-[.5em]" required/>
            {error && <div role="alert" className="rounded-lg border border-[#FFD0CB] bg-[#FFF1EF] px-4 py-3 text-sm text-[#93000A]">{error}</div>}
            {info && !error && !devOtp && <div className="rounded-lg border border-[#CFE5DF] bg-[#F0F8F5] px-4 py-3 text-sm text-forest">{info}</div>}
            <Button className="h-14 w-full" size="lg" disabled={loading || otp.length!==6}>{loading ? "Verifying…" : <>Verify email <ArrowRight size={18}/></>}</Button>
          </form>
          <div className="mt-4 flex items-center justify-center gap-3 text-xs text-ink/50"><span>Expires in 00:{secondsLeft.toString().padStart(2,"0")}</span><button type="button" onClick={resend} disabled={secondsLeft>0 || loading} className="inline-flex items-center gap-1 font-bold text-gold disabled:text-ink/25"><RefreshCw size={13}/> Resend</button></div>
          <div className="mt-8 flex items-center justify-center gap-2 text-xs text-ink/45"><CheckCircle2 size={15}/> Secure verification for your research workspace.</div>
          <Link href="/auth/login" className="mt-6 inline-block text-sm font-bold text-forest hover:underline">Back to sign in</Link>
        </div>
      </div>
    </main>
  );
}
