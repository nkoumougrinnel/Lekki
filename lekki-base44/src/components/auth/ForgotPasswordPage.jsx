import { ArrowLeft, Mail } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthLink, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeReturnTo } from "@/lib/authReturnTo";

// The /forgot-password page. Always ends in the generic "if an account exists"
// message: the API does not reveal whether the email is registered, and neither should the UI.
export function ForgotPasswordPage() {
  const returnTo = safeReturnTo();
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      await base44.auth.resetPasswordRequest(email);
    } catch {
      // Same outcome either way.
    } finally {
      setBusy(false);
      setSent(true);
    }
  }

  return (
    <AuthLayout title="Mot de passe oublié" subtitle="Nous t’envoyons un lien pour le réinitialiser.">
      {sent ? (
        <p className="text-center text-[13px] leading-relaxed text-[#3C4A41]">
          Si un compte existe avec cet email, tu recevras un lien de réinitialisation dans quelques
          instants.
        </p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="forgot-email" className="text-[13px] text-[#3C4A41]">
              Adresse email
            </Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA096]" aria-hidden="true" />
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                autoFocus
                placeholder="toi@exemple.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-12 rounded-xl border-[#E2DFD3] bg-[#FCFBF7] pl-10 focus-visible:ring-[#2E7D5B]/20"
                required
              />
            </div>
          </div>
          <SubmitButton busy={busy} busyLabel="Envoi…">
            Envoyer le lien
          </SubmitButton>
        </form>
      )}
      <p className="mt-6 text-center text-[13px] text-[#5C6B62]">
        <AuthLink to="/login" returnTo={returnTo}>
          <ArrowLeft className="mr-1 inline h-3 w-3" aria-hidden="true" />
          Retour à la connexion
        </AuthLink>
      </p>
    </AuthLayout>
  );
}