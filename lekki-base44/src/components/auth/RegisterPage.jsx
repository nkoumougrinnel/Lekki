import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { MfaFlow } from "@/components/auth/MfaFlow";
import { MfaScreen } from "@/components/auth/MfaParts";
import { AuthError, AuthLink, GoogleButton, OrDivider, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";

const isAlreadyVerified = (err) => err?.status === 400 && /already verified/i.test(err?.message ?? "");

/**
 * The /register page: register → OTP → verifyOtp → setToken. Registration alone
 * does not sign the user in (the account is unverified), so the code step is never
 * skipped and loginViaEmailPassword is never called right after register.
 */
export function RegisterPage() {
  const returnTo = safeReturnTo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [step, setStep] = useState("form");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState(null);

  async function register(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      await base44.auth.register({ email, password });
      setStep("otp");
    } catch (err) {
      setError(err.message || "L’inscription a échoué.");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await base44.auth.verifyOtp({ email, otpCode });
      if (result?.mfa_required) {
        setMfaChallenge(result);
        return;
      }
      if (result?.access_token) base44.auth.setToken(result.access_token);
      window.location.href = returnTo;
    } catch (err) {
      // Verified server-side but the answer never arrived: the code is spent and
      // there is no token, so the only way forward is a normal sign-in.
      if (isAlreadyVerified(err)) setStep("already_verified");
      else setError(err.message || "Code de vérification invalide.");
      setBusy(false);
    }
  }

  async function resend() {
    setError("");
    try {
      await base44.auth.resendOtp(email);
      toast("Code envoyé", { description: "Vérifie ta boîte mail pour le nouveau code." });
    } catch (err) {
      if (isAlreadyVerified(err)) setStep("already_verified");
      else setError(err.message || "Impossible de renvoyer le code.");
    }
  }

  // The account is verified; the second sign-in step replaces the whole page and finishes signing in.
  if (mfaChallenge) return <MfaScreen><MfaFlow challenge={mfaChallenge} returnTo={returnTo} /></MfaScreen>;

  if (step === "already_verified") {
    return (
      <AuthLayout title="Créer un compte" subtitle="Rejoins ta promo sur Lekki.">
        <p className="mb-4 text-[13px] text-[#5C6B62]">
          <span className="font-medium text-[#16241D]">{email}</span> est déjà vérifié. Connecte-toi pour continuer.
        </p>
        <AuthLink
          to="/login"
          returnTo={returnTo}
          className="inline-flex h-12 w-full items-center justify-center rounded-full bg-[#16241D] text-sm font-semibold text-[#FBFAF6] hover:bg-[#24382D]"
        >
          Se connecter
        </AuthLink>
      </AuthLayout>
    );
  }

  if (step === "otp") {
    return (
      <AuthLayout title="Vérifie ton email" subtitle="Une dernière étape pour sécuriser ton compte.">
        <form onSubmit={verify}>
          <p className="mb-4 text-[13px] text-[#5C6B62]">
            Nous avons envoyé un code à 6 chiffres à{" "}
            <span className="font-medium text-[#16241D]">{email}</span>.
          </p>
          <AuthError>{error}</AuthError>
          <div className="mb-6 flex justify-center">
            <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
              <InputOTPGroup>
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          </div>
          <SubmitButton busy={busy} busyLabel="Vérification…" disabled={busy || otpCode.length < 6}>
            Vérifier
          </SubmitButton>
          <p className="mt-4 text-center text-[13px] text-[#5C6B62]">
            Tu n’as rien reçu ?{" "}
            <button type="button" onClick={resend} className="font-medium text-[#2E7D5B] hover:underline">
              Renvoyer le code
            </button>
          </p>
        </form>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Créer un compte" subtitle="Rejoins ta promo, importe tes cours, pose tes questions.">
      <GoogleButton returnTo={returnTo} onError={setError} />
      <OrDivider />
      <AuthError>{error}</AuthError>
      <form onSubmit={register} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="register-email" className="text-[13px] text-[#3C4A41]">
            Adresse email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA096]" aria-hidden="true" />
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="toi@exemple.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-12 rounded-xl border-[#E2DFD3] bg-[#FCFBF7] pl-10 focus-visible:ring-[#2E7D5B]/20"
              disabled={busy}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="register-password" className="text-[13px] text-[#3C4A41]">
            Mot de passe
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA096]" aria-hidden="true" />
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-[#E2DFD3] bg-[#FCFBF7] pl-10 focus-visible:ring-[#2E7D5B]/20"
              disabled={busy}
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="register-confirm" className="text-[13px] text-[#3C4A41]">
            Confirmer le mot de passe
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA096]" aria-hidden="true" />
            <Input
              id="register-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 rounded-xl border-[#E2DFD3] bg-[#FCFBF7] pl-10 focus-visible:ring-[#2E7D5B]/20"
              disabled={busy}
              required
            />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel="Création…">
          Créer mon compte
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-[13px] text-[#5C6B62]">
        Déjà un compte ?{" "}
        <AuthLink to="/login" returnTo={returnTo}>
          Se connecter
        </AuthLink>
      </p>
    </AuthLayout>
  );
}