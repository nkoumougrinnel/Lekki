import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';

export function LoginScreen() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await login(username, password);
      } else {
        await register(username, email, password);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Une erreur est survenue');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <img
            src="/lekki_logo_emerald.svg"
            alt="Lekki Wiki"
            className="h-14 w-auto mb-3"
          />
          <p className="text-sm text-muted-foreground mt-1">
            {mode === 'login' ? 'Connectez-vous à votre espace' : 'Créez votre compte'}
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm"
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">
              {mode === 'login' ? "Email ou nom d'utilisateur" : "Nom d'utilisateur"}
            </label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={mode === 'login' ? 'admin' : 'votre_pseudo'}
              autoComplete="username"
              required
            />
          </div>

          {mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">Email</label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="vous@exemple.com"
                autoComplete="email"
                required
              />
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">Mot de passe</label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              required
            />
          </div>

          {error && (
            <p className="text-sm text-destructive bg-destructive/10 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" disabled={loading} className="w-full">
            {loading && <Loader2 size={16} className="mr-2 animate-spin" />}
            {mode === 'login' ? 'Se connecter' : 'Créer le compte'}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setError(null);
            }}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {mode === 'login'
              ? "Pas de compte ? S'inscrire"
              : 'Déjà un compte ? Se connecter'}
          </button>
        </form>

        <p className="text-xs text-muted-foreground text-center mt-4">
          Compte démo : <span className="font-mono">admin</span> /{' '}
          <span className="font-mono">lekki123</span>
        </p>
      </div>
    </div>
  );
}
