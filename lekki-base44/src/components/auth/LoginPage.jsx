import { Lock, Mail } from "lucide-react";
import { useState } from "react";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthError, AuthLink, GoogleButton, OrDivider, SubmitButton } from "@/components/auth/parts";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MfaFlow } from "@/components/auth/MfaFlow";
import { MfaScreen } from "@/components/auth/MfaParts";
import { loginWithMfa } from "@/lib/authMfa";
import { safeReturnTo } from "@/lib/authReturnTo";

// The /login page. ?returnTo= (or the platform's ?from_url=) is where the visitor
// goes after signing in — the login gate and the MCP consent page send people here with it.
export function LoginPage() {
  const returnTo = safeReturnTo();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [mfaChallenge, setMfaChallenge] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const result = await loginWithMfa(email, password);
      if (result.mfa_required) {
        setMfaChallenge(result);
        return;
      }
      // A hard redirect: the app re-initializes with the new session.
      window.location.href = returnTo;
    } catch (err) {
      setError(err.message || "Email ou mot de passe incorrect");
      setBusy(false);
    }
  }

  // The second sign-in step (authenticator app or text message) replaces the whole page.
  if (mfaChallenge) return <MfaScreen><MfaFlow challenge={mfaChallenge} returnTo={returnTo} /></MfaScreen>;

  return (
    <AuthLayout title="Content de te revoir" subtitle="Connecte-toi pour retrouver tes espaces et tes documents.">
      <GoogleButton returnTo={returnTo} onError={setError} />
      <OrDivider />
      <AuthError>{error}</AuthError>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="login-email" className="text-[13px] text-[#3C4A41]">
            Adresse email
          </Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA096]" aria-hidden="true" />
            <Input
              id="login-email"
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
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label htmlFor="login-password" className="text-[13px] text-[#3C4A41]">
              Mot de passe
            </Label>
            <AuthLink to="/forgot-password" returnTo={returnTo} className="text-[11.5px] font-medium text-[#2E7D5B] hover:underline">
              Mot de passe oublié ?
            </AuthLink>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9AA096]" aria-hidden="true" />
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-12 rounded-xl border-[#E2DFD3] bg-[#FCFBF7] pl-10 focus-visible:ring-[#2E7D5B]/20"
              required
            />
          </div>
        </div>
        <SubmitButton busy={busy} busyLabel="Connexion…">
          Se connecter
        </SubmitButton>
      </form>
      <p className="mt-6 text-center text-[13px] text-[#5C6B62]">
        Pas encore de compte ?{" "}
        <AuthLink to="/register" returnTo={returnTo}>
          Créer un compte
        </AuthLink>
      </p>
    </AuthLayout>
  );
}