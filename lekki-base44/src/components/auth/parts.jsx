import { Link } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleIcon } from "./GoogleIcon";
import { signInWithProvider } from "@/lib/authMfaFlow";
import { returnToSearch } from "@/lib/authReturnTo";

// Small pieces the auth pages share.

export function AuthError({ children }) {
  if (!children) return null;
  return (
    <div
      role="alert"
      className="mb-4 rounded-xl border border-[#E9C9BE] bg-[#FBEAE7] p-3 text-[12.5px] text-[#8A432D]"
    >
      {children}
    </div>
  );
}

export function SubmitButton({ busy, busyLabel, children, ...props }) {
  return (
    <Button
      type="submit"
      className="h-12 w-full rounded-full bg-[#16241D] font-semibold text-[#FBFAF6] hover:bg-[#24382D]"
      disabled={busy}
      {...props}
    >
      {busy ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
          {busyLabel}
        </>
      ) : (
        children
      )}
    </Button>
  );
}

export function GoogleButton({ returnTo, onError }) {
  return (
    <Button
      type="button"
      variant="outline"
      className="mb-6 h-12 w-full rounded-full border-[#E2DFD3] bg-white text-[13px] font-medium text-[#3C4A41] hover:bg-[#FBFAF6]"
      onClick={() =>
        signInWithProvider("google", returnTo).catch((err) =>
          onError(err.message || "Connexion Google impossible"),
        )
      }
    >
      <GoogleIcon className="mr-2 h-5 w-5" />
      Continuer avec Google
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-[#E7E4D9]" />
      </div>
      <div className="relative flex justify-center text-[10px] uppercase tracking-[0.14em]">
        <span className="bg-white px-3 text-[#8A968E]">ou</span>
      </div>
    </div>
  );
}

// A link between auth screens that carries the way back (?returnTo=) along.
export function AuthLink({ to, returnTo, className = "font-medium text-[#2E7D5B] hover:underline", children }) {
  return (
    <Link to={to} search={returnToSearch(returnTo)} className={className}>
      {children}
    </Link>
  );
}