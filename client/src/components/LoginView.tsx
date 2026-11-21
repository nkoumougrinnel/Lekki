import { hasPendingJoin } from "@/lib/pendingLinks";
import React, { useState } from "react";
import { Link } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AuthField, AuthLayout, AuthSubmit } from "@/components/auth/AuthLayout";
import { isDemoEnabled } from "@/lib/demo";

export function LoginView() {
  const { login } = useAuth();
  const demo = isDemoEnabled();
  const [username, setUsername] = useState(demo ? "demo" : "");
  const [password, setPassword] = useState(demo ? "lekki" : "");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await login(username, password);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Identifiants invalides";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Connexion"
      subtitle={hasPendingJoin() ? "Tu as été invité dans un espace. Connecte-toi : tu le rejoindras directement." : "Retrouve les cours, les sujets et les fiches de ta promo."}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="login-username"
          label="Identifiant ou email"
          value={username}
          onChange={setUsername}
          autoComplete="username"
          placeholder="grinnel"
        />
        <AuthField
          id="login-password"
          label="Mot de passe"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          placeholder="••••••••"
          trailing={
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-1 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-lg text-[#8A968E] hover:text-[#16241D]"
              aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          }
        />

        <AuthSubmit disabled={submitting}>
          {submitting ? "Connexion…" : "Se connecter"}
        </AuthSubmit>
      </form>

      {demo && (
        <div className="mt-5 rounded-xl border border-[#E5E9DC] bg-[#F4F6EE] px-4 py-3 text-[13px] leading-relaxed text-[#4A5A50]">
          <span className="font-semibold text-[#16241D]">Mode démo.</span> N’importe quel
          identifiant fonctionne — les données sont fictives et aucun serveur n’est appelé.
        </div>
      )}

      <p className="mt-6 text-center text-sm text-[#5C6B62]">
        Pas encore de compte ?{" "}
        <Link href="/register" className="font-medium text-[#2E7D5B] hover:text-[#246147]">
          Créer un compte
        </Link>
      </p>
    </AuthLayout>
  );
}
