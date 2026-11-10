import React from "react";
import { Link } from "wouter";
import {
  ArrowRight, BookOpen, FileCheck2, GraduationCap, Quote, Smartphone, Sparkles, Users,
  FolderUp, KeyRound, MessageSquareText,
} from "lucide-react";
import { LekkiMark } from "@/components/auth/AuthLayout";

const steps = [
  {
    icon: KeyRound,
    title: "Crée l’espace",
    text: "Une promo, un club ou un groupe d’étude. Tes camarades le rejoignent avec un code.",
  },
  {
    icon: FolderUp,
    title: "Importe le dossier",
    text: "Cours, TD, anciens sujets : glisse le dossier entier, l’arborescence par UE est conservée.",
  },
  {
    icon: MessageSquareText,
    title: "Révise et pose tes questions",
    text: "Lekki répond à partir de vos documents, cite le cours et la page, et t’interroge.",
  },
];

const features = [
  {
    icon: FileCheck2,
    title: "Anciens sujets reconnus",
    text: "Examen, rattrapage, CC, année et filière détectés depuis le nom du fichier. Un clic pour une proposition de correction.",
  },
  {
    icon: Quote,
    title: "Des réponses sourcées",
    text: "Chaque réponse cite le document d’origine. Tu peux l’ouvrir et vérifier : pas de réponse inventée.",
  },
  {
    icon: GraduationCap,
    title: "Mode révision",
    text: "Quiz générés à partir d’un chapitre, avec l’explication et la source de chaque réponse.",
  },
  {
    icon: BookOpen,
    title: "Wiki de la promo",
    text: "Fiches de révision écrites à plusieurs, historisées et vérifiées par les référents.",
  },
  {
    icon: Users,
    title: "Promo, club, groupe",
    text: "Chaque espace est privé : seuls ses membres voient ses documents. La passation entre bureaux devient simple.",
  },
  {
    icon: Smartphone,
    title: "Sur ton téléphone",
    text: "Lekki s’installe comme une application, directement depuis le navigateur.",
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

        <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <LekkiMark size="sm" />
            <span className="font-bold tracking-[0.18em] text-sm bg-clip-text text-transparent bg-gradient-to-r from-zinc-100 to-zinc-400">
              LEKKI
            </span>
          </Link>
          <nav className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/login"
              className="rounded-lg px-3 py-2 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-800/70 transition-colors"
            >
              Connexion
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-3 py-2 text-sm font-semibold transition-colors"
            >
              Créer un compte
            </Link>
          </nav>
        </header>

        <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 pt-6 sm:px-6 sm:pt-14">
          <section className="grid items-center gap-10 lg:grid-cols-[1.15fr_1fr]">
            <div className="space-y-6">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">
                Pour les promos, les clubs et les groupes d’étude
              </p>
              <h1 className="text-[2.6rem] sm:text-6xl font-extrabold tracking-tight leading-[1.04]">
                La <span className="text-emerald-400">mémoire collective</span> de ta promo.
              </h1>
              <p className="max-w-xl text-base leading-relaxed text-zinc-400 sm:text-lg">
                Cours, TD et anciens sujets se perdent dans les groupes WhatsApp, et chaque nouvelle
                promo recommence à zéro. Lekki les rassemble au même endroit et répond à tes questions
                en citant le cours et la page.
              </p>
              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-5 py-3 text-sm font-semibold transition-colors shadow-[0_8px_28px_rgba(16,185,129,0.22)]"
                >
                  Créer l’espace de ma promo
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/register"
                  className="inline-flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 px-5 py-3 text-sm font-medium text-zinc-200 transition-colors"
                >
                  <KeyRound className="h-4 w-4 text-zinc-400" />
                  J’ai un code d’invitation
                </Link>
              </div>
            </div>

            {/* Exemple d'échange : ce que Lekki fait, montré plutôt que décrit */}
            <figure aria-label="Exemple de réponse de Lekki AI" className="relative">
              <div className="rounded-2xl border border-zinc-800/80 bg-[#12151B]/90 p-4 shadow-2xl sm:p-5">
                <div className="flex items-center justify-between text-[11px] text-zinc-500">
                  <span className="inline-flex items-center gap-1.5"><Sparkles className="h-3.5 w-3.5 text-emerald-400" /> Lekki AI · ITT2</span>
                  <span>Exemple</span>
                </div>
                <div className="mt-4 ml-auto w-fit max-w-[85%] rounded-2xl rounded-br-md bg-emerald-500/15 px-3.5 py-2.5 text-sm text-emerald-50">
                  Énonce le théorème de Shannon. Il tombe souvent ?
                </div>
                <div className="mt-3 max-w-[95%] space-y-2 rounded-2xl rounded-bl-md bg-zinc-900 px-3.5 py-3 text-sm leading-relaxed text-zinc-200 ring-1 ring-inset ring-white/[0.04]">
                  <p>
                    Pour reconstruire un signal de bande <b>B</b>, il faut échantillonner à{" "}
                    <b>fe ≥ 2B</b>. Sinon, les répliques du spectre se chevauchent : c’est le repliement{" "}
                    <span className="text-emerald-300">(Cours TS, chap. 3)</span>.
                  </p>
                  <p>
                    Oui : il est demandé dans <b>l’examen 2024</b> et dans <b>le rattrapage 2023</b>{" "}
                    <span className="text-emerald-300">(TS Examen CL 2024, TS RAT ALT 2023)</span>.
                  </p>
                </div>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {["Cours TS · chap. 3 · p. 12", "TS Examen CL 2024", "TS RAT ALT 2023"].map((source) => (
                    <span key={source} className="rounded-md border border-zinc-800 bg-zinc-900/80 px-2 py-1 text-[11px] text-zinc-400">
                      {source}
                    </span>
                  ))}
                </div>
              </div>
            </figure>
          </section>

          <section className="mt-20">
            <h2 className="text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500">Comment ça marche</h2>
            <ol className="mt-5 grid gap-4 sm:grid-cols-3">
              {steps.map(({ icon: Icon, title, text }, index) => (
                <li key={title} className="rounded-2xl border border-zinc-800/80 bg-[#12151B]/80 p-5">
                  <div className="flex items-center gap-3">
                    <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 text-xs font-bold text-emerald-300">
                      {index + 1}
                    </span>
                    <Icon className="h-4 w-4 text-zinc-500" />
                  </div>
                  <h3 className="mt-4 text-base font-semibold text-zinc-100">{title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map(({ icon: Icon, title, text }) => (
              <article key={title} className="rounded-2xl border border-zinc-800/80 bg-[#12151B]/60 p-5">
                <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-400">
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-semibold text-zinc-100">{title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-zinc-500">{text}</p>
              </article>
            ))}
          </section>

          <section className="mt-16 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-6 sm:p-8">
            <div className="flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <h2 className="text-xl font-bold text-zinc-100 sm:text-2xl">Ta promo a déjà les documents.</h2>
                <p className="mt-1 text-sm text-zinc-400">Il leur manque un endroit où on les retrouve, et quelqu’un à qui poser la question.</p>
              </div>
              <Link
                href="/register"
                className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-zinc-950 px-5 py-3 text-sm font-semibold transition-colors"
              >
                Commencer gratuitement <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </main>

        <footer className="relative z-10 border-t border-zinc-800/80 px-6 py-6 text-center text-xs text-zinc-600">
          © {new Date().getFullYear()} Lekki · Né à SUP’PTIC, Yaoundé · Par des étudiants, pour les étudiants.
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
