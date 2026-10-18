import React from "react";
import { Link } from "wouter";
import { ArrowRight, BookOpen, Files, Search, Share2, Sparkles } from "lucide-react";
import { LekkiMark } from "@/components/auth/AuthLayout";

const features = [
  {
    icon: Files,
    title: "Drive",
    text: "Stockez cours, TD et comptes-rendus. Classement, partage et aperçus dans un espace unique.",
  },
  {
    icon: Share2,
    title: "Partage",
    text: "Diffusez un document à un camarade ou à toute la promotion, sans perdre le fil des versions.",
  },
  {
    icon: BookOpen,
    title: "Wiki",
    text: "Transformez les fichiers en savoir collectif : pages structurées, historiques, statuts de validation.",
  },
  {
    icon: Search,
    title: "Recherche",
    text: "Retrouvez une notion, un polycopié ou une fiche wiki à travers tout l’espace de travail.",
  },
  {
    icon: Sparkles,
    title: "Lekki AI",
    text: "Posez une question. L’IA répond à partir de vos documents, avec des sources que vous pouvez ouvrir.",
  },
];

export function LandingPage() {
  return (
    <div className="h-screen overflow-y-auto bg-[#0D0F12] text-zinc-100">
      <div className="relative min-h-full">
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute left-1/2 top-[-8rem] h-[28rem] w-[42rem] -translate-x-1/2 rounded-full bg-emerald-500/12 blur-3xl" />
          <div className="absolute right-[-8rem] bottom-24 h-80 w-80 rounded-full bg-teal-500/10 blur-3xl" />
        </div>

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <LekkiMark size="sm" />
            <span className="font-bold tracking-[0.18em] text-sm bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
              LEKKI
            </span>
          </Link>
          <nav className="flex items-center gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3.5 py-2 text-sm font-semibold transition-colors"
            >
              Créer un compte
            </Link>
          </nav>
        </header>

        <main className="relative z-10 mx-auto max-w-6xl px-6 pb-20 pt-10 sm:pt-16">
          <section className="max-w-3xl space-y-6">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-400">
              Wiki · Drive · Intelligence
            </p>
            <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight leading-[1.05]">
              L’espace documentaire{" "}
              <span className="text-emerald-400">intelligent</span> de votre promotion.
            </h1>
            <p className="text-base sm:text-lg text-zinc-400 leading-relaxed max-w-2xl">
              Le Drive stocke, le partage connecte, le Wiki structure, la recherche
              retrouve, et Lekki AI comprend. Un seul endroit pour transformer
              l’information en connaissance.
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-5 py-2.5 text-sm font-semibold transition-colors shadow-[0_8px_28px_rgba(16,185,129,0.22)]"
              >
                Commencer
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 px-5 py-2.5 text-sm font-medium text-zinc-200 transition-colors"
              >
                J’ai déjà un compte
              </Link>
            </div>
          </section>

          <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article
                key={title}
                className="rounded-2xl border border-zinc-800/80 bg-[#12151B]/80 p-5 shadow-xl"
              >
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h2 className="text-base font-semibold text-zinc-100">{title}</h2>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{text}</p>
              </article>
            ))}
          </section>
        </main>

        <footer className="relative z-10 border-t border-zinc-800/80 px-6 py-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} Lekki — tout votre savoir, unifié et exploitable.
        </footer>
      </div>
    </div>
  );
}

export function AuthSplash() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#0D0F12] text-zinc-100 gap-4">
      <LekkiMark size="lg" />
      <p className="text-xs font-semibold tracking-[0.22em] text-zinc-500">LEKKI</p>
    </div>
  );
}
