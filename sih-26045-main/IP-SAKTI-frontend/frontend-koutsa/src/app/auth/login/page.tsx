"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowRight, Eye, EyeOff, Mail, LockKeyhole, RefreshCw, ShieldCheck } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthVisual } from "@/components/domain/auth-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/components/providers";

const OTP_LENGTH = 6;
const OTP_TTL = 60;
type LoginMode = "password" | "otp";

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain || name.length < 3) return email;
  return `${name.slice(0, 2)}${"•".repeat(Math.min(4, Math.max(1, name.length - 2)))}@${domain}`;
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();
  const [mode, setMode] = useState<LoginMode>(searchParams.get("mode") === "otp" ? "otp" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [otp, setOtp] = useState("");
  const [secondsLeft, setSecondsLeft] = useState(0);
  const [otpStage, setOtpStage] = useState<"request" | "verify">("request");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const otpRef = useRef<HTMLInputElement>(null);
  const next = searchParams.get("next") || "/dashboard";

  const expiryLabel = useMemo(() => `00:${secondsLeft.toString().padStart(2, "0")}`, [secondsLeft]);

  useEffect(() => {
    const queryEmail = searchParams.get("email");
    if (queryEmail) setEmail(queryEmail);
  }, [searchParams]);

  useEffect(() => {
    if (!secondsLeft) return;
    const timer = window.setInterval(() => setSecondsLeft(value => Math.max(value - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (otpStage === "verify") otpRef.current?.focus();
  }, [otpStage]);

  function switchMode(nextMode: LoginMode) {
    setMode(nextMode); setError(""); setInfo(""); setOtpStage("request"); setOtp("");
  }

  async function handlePasswordLogin(event: FormEvent) {
    event.preventDefault(); setError(""); setInfo("");
    if (!email.includes("@")) return setError("Enter a valid email address.");
    if (password.length < 6) return setError("Enter your password to continue.");
    setLoading(true);
    try {
      const result = await authApi.login(email, password);
      if (!result.access_token) throw new Error("Authentication failed");
      setSession(result.access_token, result.user);
      router.push(next);
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't sign you in. Check your credentials and try again."));
    } finally { setLoading(false); }
  }

  async function requestOtp(event?: FormEvent) {
    event?.preventDefault(); setError(""); setInfo("");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address to receive your OTP.");
    setLoading(true);
    try {
      const result = await authApi.requestOtp(email);
      setSecondsLeft(OTP_TTL); setOtpStage("verify");
      if (result.dev_otp) { setOtp(result.dev_otp); setInfo(`Demo mode — email delivery is off. Your code is ${result.dev_otp} (pre-filled).`); }
      else { setOtp(""); setInfo(`Verification code sent to ${maskEmail(email)}.`); }
    } catch (err) { setError(getApiErrorMessage(err, "We couldn't send the verification code right now.")); }
    finally { setLoading(false); }
  }

  async function verifyOtp(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!/^\d{6}$/.test(otp)) return setError("Enter the 6-digit verification code.");
    if (!secondsLeft) return setError("This OTP has expired. Request a new code.");
    setLoading(true);
    try {
      const result = await authApi.verifyOtp(email, otp);
      if (!result.access_token) return setError("That OTP is incorrect. Check your email and try again.");
      setSession(result.access_token, result.user); router.push(next);
    } catch (err) { setError(getApiErrorMessage(err, "We couldn't verify the OTP right now.")); }
    finally { setLoading(false); }
  }

  async function handleGoogleSignIn() {
    setError(""); setInfo(""); setLoading(true);
    try {
      const { signInWithPopup } = await import("firebase/auth");
      const { auth, googleProvider } = await import("@/lib/firebase");
      const userCred = await signInWithPopup(auth, googleProvider);
      const googleUser = userCred.user;
      const names = (googleUser.displayName || "").split(" ");
      const firstName = names[0] || "Researcher";
      const lastName = names.slice(1).join(" ") || "";
      const idToken = await googleUser.getIdToken();

      const result = await authApi.googleLogin({
        email: googleUser.email || "",
        first_name: firstName,
        last_name: lastName,
        id_token: idToken
      });

      if (!result.access_token) throw new Error("Google authentication failed");
      setSession(result.access_token, result.user);
      router.push(next);
    } catch (err: any) {
      if (err?.code === "auth/popup-closed-by-user") {
        setLoading(false);
        return;
      }
      if (err?.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized in Firebase Console. Add this domain under Authentication > Settings > Authorized Domains.");
      } else {
        setError(getApiErrorMessage(err, "Could not sign in with Google. Check Firebase configuration."));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden bg-forest">
      <div className="grid min-h-[100dvh] w-full overflow-hidden bg-canvas md:grid-cols-[.96fr_1.04fr] xl:grid-cols-[.9fr_1.1fr]">
        <AuthVisual mode="login" />
        <section className="flex items-center justify-center bg-canvas px-6 py-10 md:px-10 xl:px-16">
          <div className="w-full max-w-[560px]">
            <div className="lg:hidden mb-8 flex items-center gap-3 text-forest"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest text-white"><ShieldCheck size={22} /></div><div><div className="serif text-2xl">IP-SAKTI</div><div className="text-xs text-ink/55">Sahayak AI</div></div></div>
            <p className="eyebrow">Welcome back</p>
            <h1 className="serif mt-2 text-4xl leading-tight text-forest md:text-5xl">Sign in to your account</h1>
            <p className="mt-3 text-sm leading-6 text-ink/60">Continue your Ayurvedic IP research from where you left off.</p>

            <div className="mt-8 rounded-control border border-line bg-white p-1">
              <div className="grid grid-cols-2 gap-1">
                {(["password", "otp"] as LoginMode[]).map(item => (
                  <button key={item} type="button" onClick={() => switchMode(item)} className={`h-11 rounded-[7px] text-sm font-bold ${mode === item ? "bg-forest text-white" : "text-navy hover:bg-mist"}`}>
                    {item === "password" ? "Password" : "Login with OTP"}
                  </button>
                ))}
              </div>
            </div>

            {mode === "password" ? (
              <form onSubmit={handlePasswordLogin} className="mt-7 space-y-5">
                <div><label htmlFor="login-email" className="mb-2 block text-sm font-bold">Email address</label><div className="relative"><Mail className="absolute left-4 top-3.5 text-ink/35" size={18}/><Input id="login-email" type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="h-14 pl-11" required/></div></div>
                <div><div className="mb-2 flex items-center justify-between"><label htmlFor="login-password" className="text-sm font-bold">Password</label><Link href={`/auth/forgot-password${email ? `?email=${encodeURIComponent(email)}` : ""}`} className="text-xs font-bold text-emerald hover:underline">Forgot password?</Link></div><div className="relative"><LockKeyhole className="absolute left-4 top-3.5 text-ink/35" size={18}/><Input id="login-password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" className="h-14 pl-11 pr-12" required/><button type="button" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password visibility" className="absolute right-3 top-2.5 rounded-lg p-2 text-ink/40 hover:bg-mist">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></div>
                <Button type="submit" size="lg" className="h-14 w-full" disabled={loading}>{loading ? "Signing in…" : <>Sign in <ArrowRight size={18}/></>}</Button>
              </form>
            ) : (
              <form onSubmit={otpStage === "request" ? requestOtp : verifyOtp} className="mt-7 space-y-5">
                {otpStage === "request" ? <div><label htmlFor="otp-email" className="mb-2 block text-sm font-bold">Email address</label><div className="relative"><Mail className="absolute left-4 top-3.5 text-ink/35" size={18}/><Input id="otp-email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@example.com" className="h-14 pl-11" required/></div></div> : <div className="rounded-xl border border-[#D4E4DF] bg-[#F0F8F5] p-4"><div className="flex items-center gap-3"><Mail size={18} className="text-forest"/><div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-wide text-ink/45">OTP sent to</p><p className="mt-1 truncate text-sm font-semibold text-forest">{maskEmail(email)}</p></div><button type="button" onClick={() => {setOtpStage("request");setOtp("");setError("");}} className="text-xs font-bold text-gold hover:underline">Edit</button></div></div>}
                {otpStage === "verify" && <div><label htmlFor="login-otp" className="mb-2 block text-sm font-bold">Verification code</label><Input ref={otpRef} id="login-otp" inputMode="numeric" autoComplete="one-time-code" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="000000" maxLength={6} className="h-16 text-center text-2xl tracking-[.5em]" required/><div className="mt-2 flex justify-between text-xs text-ink/50"><span>Expires in {expiryLabel}</span><button type="button" onClick={() => requestOtp()} disabled={secondsLeft > 0} className="inline-flex items-center gap-1 font-bold text-gold disabled:text-ink/25"><RefreshCw size={13}/> Resend OTP</button></div></div>}
                <Button type="submit" size="lg" className="h-14 w-full" disabled={loading || (otpStage === "verify" && otp.length !== 6)}>{loading ? (otpStage === "request" ? "Sending OTP…" : "Verifying…") : <>{otpStage === "request" ? "Send OTP" : "Verify & continue"}<ArrowRight size={18}/></>}</Button>
              </form>
            )}

            {error && <div role="alert" className="mt-4 rounded-lg border border-[#FFD0CB] bg-[#FFF1EF] px-4 py-3 text-sm text-[#93000A]">{error}</div>}
            {info && !error && <div className="mt-4 rounded-lg border border-[#CFE5DF] bg-[#F0F8F5] px-4 py-3 text-sm text-forest">{info}</div>}

            <div className="my-8 flex items-center gap-3 text-xs text-ink/35"><span className="h-px flex-1 bg-line"/><span>OR</span><span className="h-px flex-1 bg-line"/></div>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="flex h-14 w-full items-center justify-center gap-3 rounded-control border border-line bg-white px-4 text-sm font-bold text-navy shadow-sm transition-all hover:bg-mist active:scale-[0.99] disabled:opacity-60"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
              </svg>
              Continue with Google
            </button>

            <p className="mt-8 text-center text-sm text-ink/60">Don't have an account? <Link href="/auth/register" className="font-bold text-forest hover:underline">Create an account</Link></p>
            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-ink/45"><ShieldCheck size={15}/> Your research workspace is securely protected.</div>
          </div>
        </section>
      </div>
    </main>
  );
}
