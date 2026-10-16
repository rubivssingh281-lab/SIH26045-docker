"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  RefreshCw,
  ShieldCheck
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthVisual } from "@/components/domain/auth-visual";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authApi, getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/components/providers";

const OTP_TTL = 60;

function maskEmail(email: string) {
  const [name, domain] = email.split("@");
  if (!domain || name.length < 3) return email;
  return `${name.slice(0, 2)}${"•".repeat(Math.min(4, Math.max(1, name.length - 2)))}@${domain}`;
}

export default function ForgotPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setSession } = useAuth();

  const [stage, setStage] = useState<"request" | "reset">("request");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [secondsLeft, setSecondsLeft] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [success, setSuccess] = useState(false);
  const [devOtp, setDevOtp] = useState("");

  const otpRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const qEmail = searchParams.get("email");
    if (qEmail) setEmail(qEmail.trim());
  }, [searchParams]);

  useEffect(() => {
    if (!secondsLeft) return;
    const timer = window.setInterval(() => setSecondsLeft(v => Math.max(v - 1, 0)), 1000);
    return () => window.clearInterval(timer);
  }, [secondsLeft]);

  useEffect(() => {
    if (stage === "reset") {
      otpRef.current?.focus();
    }
  }, [stage]);

  const expiryLabel = useMemo(
    () => `00:${secondsLeft.toString().padStart(2, "0")}`,
    [secondsLeft]
  );

  async function handleRequestCode(event?: FormEvent) {
    event?.preventDefault();
    setError("");
    setInfo("");

    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setError("Please enter a valid email address.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.forgotPassword(trimmed);
      setSecondsLeft(OTP_TTL);
      setStage("reset");

      if (res.dev_otp) {
        setDevOtp(res.dev_otp);
        setOtp(res.dev_otp);
        setInfo(`Demo mode — code: ${res.dev_otp} (pre-filled).`);
      } else {
        setOtp("");
        setInfo(res.message || `Password reset code sent to ${maskEmail(trimmed)}.`);
      }
    } catch (err) {
      setError(getApiErrorMessage(err, "We couldn't dispatch the reset code. Please check your email and try again."));
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event: FormEvent) {
    event.preventDefault();
    setError("");
    setInfo("");

    const code = otp.trim();
    if (!/^\d{6}$/.test(code)) {
      setError("Please enter the 6-digit verification code from your email.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Your new password must be at least 6 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("The two passwords do not match. Please verify and re-type.");
      return;
    }

    setLoading(true);
    try {
      const res = await authApi.resetPassword({
        email: email.trim().toLowerCase(),
        otp_code: code,
        new_password: newPassword
      });

      if (!res.access_token) {
        setError("Could not complete password reset. Please try requesting a new code.");
        return;
      }

      setSuccess(true);
      setSession(res.access_token, res.user);

      setTimeout(() => {
        router.push("/dashboard");
      }, 1500);
    } catch (err) {
      setError(getApiErrorMessage(err, "Invalid or expired reset code. Please check or request a new code."));
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
            {/* Mobile Header */}
            <div className="lg:hidden mb-8 flex items-center gap-3 text-forest">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-forest text-white">
                <ShieldCheck size={22} />
              </div>
              <div>
                <div className="serif text-2xl">IP-SAKTI</div>
                <div className="text-xs text-ink/55">Sahayak AI</div>
              </div>
            </div>

            {success ? (
              <div className="text-center py-8">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[#E5F5EE] text-[#1E6F50]">
                  <CheckCircle2 size={36} />
                </div>
                <h1 className="serif mt-6 text-3xl text-forest md:text-4xl">Password reset successful!</h1>
                <p className="mt-3 text-sm leading-6 text-ink/65">
                  Your credentials have been securely updated. Logging you into your research workspace...
                </p>
                <div className="mt-8 flex justify-center">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-forest border-t-transparent" />
                </div>
              </div>
            ) : stage === "request" ? (
              <div>
                <p className="eyebrow">Account Recovery</p>
                <h1 className="serif mt-2 text-4xl leading-tight text-forest md:text-5xl">
                  Forgot your password?
                </h1>
                <p className="mt-3 text-sm leading-6 text-ink/60">
                  Enter your registered email address and we'll send you a 6-digit verification code to reset your password.
                </p>

                <form onSubmit={handleRequestCode} className="mt-8 space-y-5">
                  <div>
                    <label htmlFor="recovery-email" className="mb-2 block text-sm font-bold text-ink">
                      Email address
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-3.5 text-ink/35" size={18} />
                      <Input
                        id="recovery-email"
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={e => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="h-14 pl-11"
                        required
                        disabled={loading}
                      />
                    </div>
                  </div>

                  <Button type="submit" size="lg" className="h-14 w-full" disabled={loading || !email}>
                    {loading ? "Sending recovery code…" : (
                      <>
                        Send recovery code <ArrowRight size={18} />
                      </>
                    )}
                  </Button>
                </form>

                {error && (
                  <div role="alert" className="mt-4 rounded-lg border border-[#FFD0CB] bg-[#FFF1EF] px-4 py-3 text-sm text-[#93000A]">
                    {error}
                  </div>
                )}
                {info && !error && (
                  <div className="mt-4 rounded-lg border border-[#CFE5DF] bg-[#F0F8F5] px-4 py-3 text-sm text-forest">
                    {info}
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-line text-center">
                  <Link
                    href="/auth/login"
                    className="inline-flex items-center gap-2 text-sm font-bold text-forest hover:underline"
                  >
                    <ArrowLeft size={16} /> Return to sign in
                  </Link>
                </div>
              </div>
            ) : (
              <div>
                <p className="eyebrow">Step 2 of 2</p>
                <h1 className="serif mt-2 text-4xl leading-tight text-forest md:text-5xl">
                  Set new password
                </h1>
                <p className="mt-3 text-sm leading-6 text-ink/60">
                  Enter the 6-digit code sent to your email, then choose a secure new password.
                </p>

                {/* Masked Email Banner */}
                <div className="mt-6 rounded-xl border border-[#D4E4DF] bg-[#F0F8F5] p-4">
                  <div className="flex items-center gap-3">
                    <Mail size={18} className="text-forest" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold uppercase tracking-wide text-ink/45">Code dispatched to</p>
                      <p className="mt-0.5 truncate text-sm font-semibold text-forest">{maskEmail(email)}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setStage("request");
                        setError("");
                        setInfo("");
                      }}
                      className="text-xs font-bold text-gold hover:underline"
                    >
                      Change
                    </button>
                  </div>
                </div>

                {devOtp && (
                  <div className="mt-4 rounded-xl border border-[#E4D8BC] bg-[#FBF6E7] px-4 py-3 text-left text-xs text-[#6B5A21]">
                    <p className="font-bold">Demo Mode / Local SMTP</p>
                    <p className="mt-1">
                      Your verification code is{" "}
                      <span className="font-mono text-base font-bold tracking-widest text-forest">{devOtp}</span>
                    </p>
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="mt-6 space-y-5">
                  {/* OTP Code */}
                  <div>
                    <label htmlFor="reset-otp" className="mb-2 block text-sm font-bold text-ink">
                      6-Digit Verification Code
                    </label>
                    <Input
                      ref={otpRef}
                      id="reset-otp"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={otp}
                      onChange={e => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
                      placeholder="000000"
                      maxLength={6}
                      className="h-16 text-center text-2xl tracking-[.5em] font-mono"
                      required
                      disabled={loading}
                    />
                    <div className="mt-2 flex items-center justify-between text-xs text-ink/50">
                      <span>Expires in {expiryLabel}</span>
                      <button
                        type="button"
                        onClick={() => handleRequestCode()}
                        disabled={secondsLeft > 0 || loading}
                        className="inline-flex items-center gap-1 font-bold text-gold disabled:text-ink/25 hover:underline"
                      >
                        <RefreshCw size={13} /> Resend code
                      </button>
                    </div>
                  </div>

                  {/* New Password */}
                  <div>
                    <label htmlFor="reset-new-password" className="mb-2 block text-sm font-bold text-ink">
                      New Password
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-4 top-3.5 text-ink/35" size={18} />
                      <Input
                        id="reset-new-password"
                        type={showPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        className="h-14 pl-11 pr-12"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(v => !v)}
                        aria-label="Toggle password visibility"
                        className="absolute right-3 top-2.5 rounded-lg p-2 text-ink/40 hover:bg-mist"
                      >
                        {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div>
                    <label htmlFor="reset-confirm-password" className="mb-2 block text-sm font-bold text-ink">
                      Confirm New Password
                    </label>
                    <div className="relative">
                      <LockKeyhole className="absolute left-4 top-3.5 text-ink/35" size={18} />
                      <Input
                        id="reset-confirm-password"
                        type={showConfirmPassword ? "text" : "password"}
                        autoComplete="new-password"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Re-enter new password"
                        className="h-14 pl-11 pr-12"
                        required
                        disabled={loading}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(v => !v)}
                        aria-label="Toggle confirm password visibility"
                        className="absolute right-3 top-2.5 rounded-lg p-2 text-ink/40 hover:bg-mist"
                      >
                        {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                      </button>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    size="lg"
                    className="h-14 w-full"
                    disabled={loading || otp.length !== 6 || newPassword.length < 6 || !confirmPassword}
                  >
                    {loading ? "Resetting password…" : (
                      <>
                        Reset Password & Sign in <ArrowRight size={18} />
                      </>
                    )}
                  </Button>
                </form>

                {error && (
                  <div role="alert" className="mt-4 rounded-lg border border-[#FFD0CB] bg-[#FFF1EF] px-4 py-3 text-sm text-[#93000A]">
                    {error}
                  </div>
                )}
                {info && !error && (
                  <div className="mt-4 rounded-lg border border-[#CFE5DF] bg-[#F0F8F5] px-4 py-3 text-sm text-forest">
                    {info}
                  </div>
                )}

                <div className="mt-8 pt-6 border-t border-line text-center">
                  <button
                    type="button"
                    onClick={() => {
                      setStage("request");
                      setOtp("");
                      setNewPassword("");
                      setConfirmPassword("");
                      setError("");
                    }}
                    className="inline-flex items-center gap-2 text-sm font-bold text-forest hover:underline"
                  >
                    <ArrowLeft size={16} /> Back to email entry
                  </button>
                </div>
              </div>
            )}

            <div className="mt-8 flex items-center justify-center gap-2 text-xs text-ink/45">
              <ShieldCheck size={15} /> Your credentials are encrypted and securely stored.
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
