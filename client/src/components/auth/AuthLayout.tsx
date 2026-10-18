import React from "react";
import { Link } from "wouter";
import { BookOpen, Files, Sparkles } from "lucide-react";

const highlights = [
  {
    icon: Files,
    title: "Drive académique",
    text: "Cours, TD et comptes-rendus centralisés, classés, partageables.",
  },
  {
    icon: BookOpen,
    title: "Wiki collaboratif",
    text: "Un savoir de promotion versionné, structuré et vérifié.",
  },
  {
    icon: Sparkles,
    title: "Lekki AI",
    text: "Interrogez vos documents et obtenez des réponses sourcées.",
  },
];

export function LekkiMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-8 w-8" : "h-10 w-10";
  return (
    <img
      src="/logo.svg"
      alt="Lekki"
      className={`${box} rounded-xl shadow-[0_0_24px_rgba(0,200,150,0.25)]`}
    />
  );
}

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="h-screen overflow-y-auto bg-[#0D0F12] text-zinc-100">
      <div className="min-h-full grid lg:grid-cols-2">
        <aside className="relative hidden lg:flex flex-col justify-between overflow-hidden border-r border-zinc-800/80 bg-[#0B0D10] px-12 py-10">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-24 top-24 h-80 w-80 rounded-full bg-emerald-500/10 blur-3xl" />
            <div className="absolute right-0 bottom-0 h-96 w-96 rounded-full bg-teal-500/8 blur-3xl" />
            <div
              className="absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage:
                  "linear-gradient(to right, #3f3f46 1px, transparent 1px), linear-gradient(to bottom, #3f3f46 1px, transparent 1px)",
                backgroundSize: "48px 48px",
              }}
            />
          </div>

          <Link href="/" className="relative z-10 flex items-center gap-3 w-fit">
            <LekkiMark />
            <span className="font-bold text-lg tracking-[0.18em] bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
              LEKKI
            </span>
          </Link>

          <div className="relative z-10 max-w-md space-y-8">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-emerald-400">
                Espace documentaire intelligent
              </p>
              <h1 className="text-4xl font-extrabold tracking-tight leading-tight">
                Tout votre savoir,{" "}
                <span className="text-emerald-400">unifié et exploitable.</span>
              </h1>
              <p className="text-zinc-400 leading-relaxed">
                Drive, Wiki et IA dans un même espace de travail — pensé pour les
                promotions, les équipes et les laboratoires de savoir.
              </p>
            </div>

            <ul className="space-y-4">
              {highlights.map(({ icon: Icon, title: itemTitle, text }) => (
                <li
                  key={itemTitle}
                  className="flex gap-3 rounded-xl border border-zinc-800/70 bg-zinc-900/40 p-4"
                >
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-100">{itemTitle}</p>
                    <p className="text-sm text-zinc-500 leading-relaxed">{text}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <p className="relative z-10 text-xs text-zinc-600">
            © {new Date().getFullYear()} Lekki — la mémoire vive de votre promotion.
          </p>
        </aside>

        <main className="flex flex-col px-6 py-8 sm:px-10">
          <div className="flex items-center justify-between lg:justify-end">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <LekkiMark size="sm" />
              <span className="font-bold tracking-[0.16em] text-sm text-zinc-200">LEKKI</span>
            </Link>
            <Link
              href="/"
              className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Accueil
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-10">
            <div className="w-full max-w-md">
              <div className="mb-8 space-y-2">
                <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
                <p className="text-sm text-zinc-400">{subtitle}</p>
              </div>
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  placeholder,
  required = true,
  trailing,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-sm font-medium text-zinc-300">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-xl border border-zinc-800 bg-[#12151B] px-3.5 py-2.5 text-sm text-zinc-100 placeholder:text-zinc-600 outline-none transition-colors focus:border-emerald-500/60 focus:ring-2 focus:ring-emerald-500/20"
        />
        {trailing}
      </div>
    </div>
  );
}

export function AuthSubmit({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-semibold text-sm py-2.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_8px_24px_rgba(16,185,129,0.18)]"
    >
      {children}
    </button>
  );
}
