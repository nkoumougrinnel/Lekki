import React, { useState } from "react";
import { Link } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AuthField, AuthLayout, AuthSubmit } from "@/components/auth/AuthLayout";

export function LoginView() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
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
      subtitle="Retrouvez votre Drive, votre Wiki et Lekki AI."
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
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300"
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

      <p className="mt-6 text-sm text-zinc-500 text-center">
        Pas encore de compte ?{" "}
        <Link href="/register" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Créer un espace Lekki
        </Link>
      </p>
    </AuthLayout>
  );
}
