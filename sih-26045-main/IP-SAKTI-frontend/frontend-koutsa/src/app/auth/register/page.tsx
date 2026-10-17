"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, CheckCircle2, Eye, EyeOff, LockKeyhole, Mail, ShieldCheck, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { AuthVisual } from "@/components/domain/auth-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/components/providers";
import { useLanguage } from "@/components/providers/language-provider";

export default function RegisterPage() {
  const { t } = useLanguage();
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

  async function processGoogleUser(googleUser: any) {
    setLoading(true);
    setError("");
    try {
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
      if (result.access_token) {
        setSession(result.access_token, result.user);
        window.location.href = "/dashboard";
      } else {
        setError("Sign-in failed. Please try again.");
        setLoading(false);
      }
    } catch (err) {
      console.error("Google sign-in error", err);
      setError(getApiErrorMessage(err, "We couldn't complete sign in with Google."));
      setLoading(false);
    }
  }

  useEffect(() => {
    let isMounted = true;
    async function handlePendingRedirect() {
      try {
        const { getRedirectResult, onAuthStateChanged } = await import("firebase/auth");
        const { auth } = await import("@/lib/firebase");

        const userCred = await getRedirectResult(auth);
        if (userCred?.user && isMounted) {
          sessionStorage.removeItem("ip_sakti_google_pending");
          await processGoogleUser(userCred.user);
          return;
        }

        if (typeof window !== "undefined" && sessionStorage.getItem("ip_sakti_google_pending") === "1") {
          const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user && isMounted) {
              sessionStorage.removeItem("ip_sakti_google_pending");
              unsubscribe();
              await processGoogleUser(user);
            }
          });
          setTimeout(() => {
            if (isMounted) sessionStorage.removeItem("ip_sakti_google_pending");
          }, 6000);
        }
      } catch (err) {
        console.error("Google redirect handling error", err);
      }
    }
    handlePendingRedirect();
    return () => { isMounted = false; };
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault(); setError("");
    if (!firstName.trim() || !lastName.trim()) return setError("Enter your first and last name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return setError("Enter a valid email address.");
    if (password.length < 8) return setError("Password must contain at least 8 characters.");
    if (password !== confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    try {
      const cleanEmail = email.trim().toLowerCase();
      const result = await authApi.register({ first_name: firstName.trim(), last_name: lastName.trim(), email: cleanEmail, password });
      if (result.requires_otp) {
        // Demo mode (no mail configured): hand the code + notice to the verify screen.
        try {
          if (result.dev_otp) sessionStorage.setItem("ip-sakti-dev-otp", result.dev_otp);
          else sessionStorage.removeItem("ip-sakti-dev-otp");
          if (result.message) sessionStorage.setItem("ip-sakti-verify-msg", result.message);
        } catch { /* sessionStorage may be unavailable; ignore */ }
        window.location.href = `/auth/verify?mode=register&email=${encodeURIComponent(cleanEmail)}`;
      } else if (result.access_token) {
        setSession(result.access_token, result.user);
        window.location.href = "/dashboard";
      } else {
        window.location.href = `/auth/login?mode=otp&email=${encodeURIComponent(email)}`;
      }
    } catch (err) { setError(getApiErrorMessage(err, "We couldn't create your account right now. Please try again.")); }
    finally { setLoading(false); }
  }

  async function handleGoogleSignIn() {
    setError(""); setLoading(true);
    try {
      const { signInWithPopup, signInWithRedirect } = await import("firebase/auth");
      const { auth, googleProvider } = await import("@/lib/firebase");
      try {
        const userCred = await signInWithPopup(auth, googleProvider);
        if (userCred?.user) {
          await processGoogleUser(userCred.user);
          return;
        }
      } catch (popupErr: any) {
        if (popupErr?.code === "auth/popup-closed-by-user") {
          setLoading(false);
          return;
        }
        if (popupErr?.code === "auth/popup-blocked" || popupErr?.code === "auth/cancelled-popup-request") {
          sessionStorage.setItem("ip_sakti_google_pending", "1");
          await signInWithRedirect(auth, googleProvider);
          return;
        }
        throw popupErr;
      }
    } catch (err: any) {
      if (err?.code === "auth/unauthorized-domain") {
        setError("This domain is not authorized in Firebase Console. Add this domain under Authentication > Settings > Authorized Domains.");
      } else {
        setError(getApiErrorMessage(err, "Could not sign in with Google."));
      }
      setLoading(false);
    }
  }

  return (
    <main className="min-h-[100dvh] w-full overflow-x-hidden bg-forest">
      <div className="grid min-h-[100dvh] w-full overflow-hidden bg-canvas md:grid-cols-[.92fr_1.08fr]">
        <AuthVisual mode="register" />
        <section className="flex items-center justify-center bg-canvas px-6 py-10 md:px-10 xl:px-16">
          <div className="w-full max-w-[560px]">
            <div className="lg:hidden mb-8 flex items-center gap-3 text-forest"><div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest text-white"><ShieldCheck size={22}/></div><div><div className="serif text-2xl">IP-SAKTI</div><div className="text-xs text-ink/55">Sahayak AI</div></div></div>
            <p className="eyebrow">{t("auth.get_started", "Get started")}</p>
            <h1 className="serif mt-2 text-4xl leading-tight text-forest md:text-5xl">{t("auth.create_account_title", "Create your account")}</h1>
            <p className="mt-3 text-sm leading-6 text-ink/60">{t("auth.create_account_desc", "Create an account to start managing your Ayurvedic IP research.")}</p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div><label htmlFor="first-name" className="mb-2 block text-sm font-bold">{t("auth.first_name", "First name")}</label><div className="relative"><UserRound className="absolute left-4 top-3.5 text-ink/35" size={17}/><Input id="first-name" autoComplete="given-name" value={firstName} onChange={e=>setFirstName(e.target.value)} placeholder={t("auth.first_name", "First name")} className="h-14 pl-11" required/></div></div>
                <div><label htmlFor="last-name" className="mb-2 block text-sm font-bold">{t("auth.last_name", "Last name")}</label><div className="relative"><UserRound className="absolute left-4 top-3.5 text-ink/35" size={17}/><Input id="last-name" autoComplete="family-name" value={lastName} onChange={e=>setLastName(e.target.value)} placeholder={t("auth.last_name", "Last name")} className="h-14 pl-11" required/></div></div>
              </div>
              <div><label htmlFor="register-email" className="mb-2 block text-sm font-bold">{t("auth.email_address", "Email address")}</label><div className="relative"><Mail className="absolute left-4 top-3.5 text-ink/35" size={18}/><Input id="register-email" type="email" autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder={t("auth.email_placeholder", "you@example.com")} className="h-14 pl-11" required/></div></div>
              <div><label htmlFor="register-password" className="mb-2 block text-sm font-bold">{t("auth.password", "Password")}</label><div className="relative"><LockKeyhole className="absolute left-4 top-3.5 text-ink/35" size={18}/><Input id="register-password" type={showPassword?"text":"password"} autoComplete="new-password" value={password} onChange={e=>setPassword(e.target.value)} placeholder={t("auth.create_password_placeholder", "Create a password")} className="h-14 pl-11 pr-12" required/><button type="button" aria-label={t("auth.password", "Password")} onClick={()=>setShowPassword(v=>!v)} className="absolute right-3 top-2.5 rounded-lg p-2 text-ink/40 hover:bg-mist">{showPassword?<EyeOff size={18}/>:<Eye size={18}/>}</button></div><p className="mt-1.5 text-xs text-ink/45">{t("auth.use_8_chars", "Use at least 8 characters.")}</p></div>
              <div><label htmlFor="confirm-password" className="mb-2 block text-sm font-bold">{t("auth.confirm_password", "Confirm password")}</label><div className="relative"><LockKeyhole className="absolute left-4 top-3.5 text-ink/35" size={18}/><Input id="confirm-password" type={showConfirm?"text":"password"} autoComplete="new-password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} placeholder={t("auth.reenter_password_placeholder", "Re-enter your password")} className="h-14 pl-11 pr-12" required/><button type="button" aria-label={t("auth.confirm_password", "Confirm password")} onClick={()=>setShowConfirm(v=>!v)} className="absolute right-3 top-2.5 rounded-lg p-2 text-ink/40 hover:bg-mist">{showConfirm?<EyeOff size={18}/>:<Eye size={18}/>}</button></div>{confirmPassword && password===confirmPassword && <p className="mt-1.5 flex items-center gap-1 text-xs font-semibold text-emerald"><CheckCircle2 size={13}/> {t("auth.passwords_match", "Passwords match")}</p>}</div>
              {error && <div role="alert" className="rounded-lg border border-[#FFD0CB] bg-[#FFF1EF] px-4 py-3 text-sm text-[#93000A]">{t(error)}</div>}
              <Button type="submit" size="lg" className="h-14 w-full" disabled={loading}>{loading ? t("auth.creating_account", "Creating account…") : <>{t("auth.create_account", "Create account")} <ArrowRight size={18}/></>}</Button>
            </form>

            <div className="my-7 flex items-center gap-3 text-xs text-ink/35"><span className="h-px flex-1 bg-line"/><span>{t("auth.or", "OR")}</span><span className="h-px flex-1 bg-line"/></div>

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
              {t("auth.continue_with_google", "Continue with Google")}
            </button>

            <div className="my-7 flex items-center gap-3 text-[10px] font-semibold uppercase tracking-wider text-ink/35"><span className="h-px flex-1 bg-line"/><span>{t("auth.already_registered", "Already registered?")}</span><span className="h-px flex-1 bg-line"/></div>
            <p className="text-center text-sm text-ink/60">{t("auth.already_have_account", "Already have an account?")} <Link href="/auth/login" className="font-bold text-forest hover:underline">{t("auth.sign_in", "Sign in")}</Link></p>
            <div className="mt-7 flex items-center justify-center gap-2 text-xs text-ink/45"><ShieldCheck size={15}/> {t("auth.info_protected", "Your information is securely protected.")}</div>
          </div>
        </section>
      </div>
    </main>
  );
}
