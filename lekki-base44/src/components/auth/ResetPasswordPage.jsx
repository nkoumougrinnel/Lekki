import { Link } from "@tanstack/react-router";
import { AlertTriangle, Lock } from "lucide-react";
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthError, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// The /reset-password page; the reset email links here with ?token=.
export function ResetPasswordPage() {
  // Read raw: the router's search parser would turn an all-digit token into a number.
  const token = new URLSearchParams(window.location.search).get("token");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    setBusy(true);
    try {
      await base44.auth.resetPassword({ resetToken: token, newPassword: password });
      window.location.href = "/login";
    } catch (err) {
      setError(err.message || "Impossible de réinitialiser le mot de passe.");
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title="Lien invalide"
        subtitle="Ce lien de réinitialisation est incomplet ou expiré."
        footer={
          <Link to="/forgot-password" className="font-medium text-[#2E7D5B] hover:underline">
            Demander un nouveau lien
          </Link>
        }
      >
        <p className="text-center text-[13px] leading-relaxed text-[#3C4A41]">
          Le lien utilisé semble incomplet. Demande un nouvel email de réinitialisation.
        </p>
      </AuthLayout>
    );
  }
  return (
    <AuthLayout title="Nouveau mot de passe" subtitle="Choisis un mot de passe solide pour ton compte.">
      <AuthError>{error}</AuthError>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="reset-password" className="text-[13px] text-[#3C4A41]">
            Nouveau mot de passe
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA096]" aria-hidden="true" />
            <Input
              id="reset-password"
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-[#E2DFD3] bg-[#FCFBF7] pl-10 focus-visible:ring-[#2E7D5B]/20"
              required
            />
          </div>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="reset-confirm" className="text-[13px] text-[#3C4A41]">
            Confirmer le mot de passe
          </Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA096]" aria-hidden="true" />
            <Input
              id="reset-confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="h-12 rounded-xl border-[#E2DFD3] bg-[#FCFBF7] pl-10 focus-visible:ring-[#2E7D5B]/20"
              required
            />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel="Réinitialisation…">
          Réinitialiser
        </SubmitButton>
      </form>
    </AuthLayout>
  );
}