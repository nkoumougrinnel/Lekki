import React, { useState } from "react";
import { Link } from "wouter";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import { AuthField, AuthLayout, AuthSubmit } from "@/components/auth/AuthLayout";

export function RegisterView() {
  const { register } = useAuth();
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas.");
      return;
    }
    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caractères.");
      return;
    }

    setSubmitting(true);
    try {
      await register({ name, username, email, password });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Impossible de créer le compte";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout
      title="Créer un compte"
      subtitle="Rejoignez Lekki et commencez à unifier vos documents, votre wiki et votre IA."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <AuthField
          id="register-name"
          label="Nom complet"
          value={name}
          onChange={setName}
          autoComplete="name"
          placeholder="Grinnel N."
        />
        <AuthField
          id="register-username"
          label="Identifiant"
          value={username}
          onChange={setUsername}
          autoComplete="username"
          placeholder="grinnel"
        />
        <AuthField
          id="register-email"
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          placeholder="grinnel@lekki.io"
        />
        <AuthField
          id="register-password"
          label="Mot de passe"
          type={showPassword ? "text" : "password"}
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          placeholder="8 caractères minimum"
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
        <AuthField
          id="register-confirm"
          label="Confirmer le mot de passe"
          type={showPassword ? "text" : "password"}
          value={confirmPassword}
          onChange={setConfirmPassword}
          autoComplete="new-password"
          placeholder="Répétez le mot de passe"
        />

        <AuthSubmit disabled={submitting}>
          {submitting ? "Création du compte…" : "Créer mon compte"}
        </AuthSubmit>
      </form>

      <p className="mt-6 text-sm text-zinc-500 text-center">
        Déjà inscrit ?{" "}
        <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium">
          Se connecter
        </Link>
      </p>
    </AuthLayout>
  );
}
