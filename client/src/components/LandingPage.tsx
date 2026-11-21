import React from "react";
import { Link } from "wouter";
import {
  ArrowRight,
  AudioLines,
  BookOpen,
  ChevronDown,
  FileCheck2,
  FileText,
  FolderUp,
  GraduationCap,
  KeyRound,
  ListChecks,
  MessageSquareText,
  Network,
  Quote,
  Search,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { LekkiMark } from "@/components/auth/AuthLayout";

const outputs = [
  {
    icon: FileText,
    title: "Fiches de révision",
    text: "Un chapitre entier résumé, structuré et relié aux pages du cours.",
    tint: "bg-[#E7F1E9]",
  },
  {
    icon: ListChecks,
    title: "Quiz",
    text: "Des questions générées depuis tes documents, avec la correction et la source.",
    tint: "bg-[#fef7e0]",
  },
  {
    icon: Network,
    title: "Cartes mentales",
    text: "Les notions d’un module vues d’ensemble, chapitre par chapitre.",
    tint: "bg-[#e6f4ea]",
  },
  {
    icon: FileCheck2,
    title: "Anciens sujets",
    text: "Examen, rattrapage, CC : reconnus depuis le nom du fichier, avec une correction proposée.",
    tint: "bg-[#fce8e6]",
  },
  {
    icon: AudioLines,
    title: "Résumés à écouter",
    text: "La synthèse d’un cours en lecture audio, pour réviser en marchant.",
    tint: "bg-[#f3e8fd]",
  },
  {
    icon: BookOpen,
    title: "Wiki de la promo",
    text: "Des fiches écrites à plusieurs, historisées et relues par les référents.",
    tint: "bg-[#E7F1E9]",
  },
];

const steps = [
  {
    icon: KeyRound,
    title: "Crée l’espace de ta promo",
    text: "Une promo, un club, un groupe d’étude. Tes camarades rejoignent avec un code, et chacun arrive au bon endroit.",
  },
  {
    icon: FolderUp,
    title: "Importe les documents",
    text: "Cours, TD, anciens sujets : dépose le dossier entier. Les sous-dossiers sont conservés et chaque fichier est indexé.",
  },
  {
    icon: MessageSquareText,
    title: "Pose ta question",
    text: "Lekki répond à partir des documents de l’espace, cite le cours et la page, puis t’interroge pour vérifier.",
  },
];

const faq = [
  {
    q: "D’où viennent les réponses de Lekki ?",
    a: "Uniquement des documents importés dans ton espace. Chaque réponse affiche le document, le chapitre et la page d’où elle vient, pour que tu puisses vérifier en un clic.",
  },
  {
    q: "Qui peut voir les documents de ma promo ?",
    a: "Seuls les membres de l’espace. Un espace est privé par défaut : personne d’autre ne voit ses fichiers, et chaque membre n’accède qu’aux espaces qu’il a rejoints.",
  },
  {
    q: "Quels fichiers puis-je importer ?",
    a: "PDF, Word, PowerPoint et fichiers texte. Les documents scannés sont lus par OCR, et les dossiers importés gardent leur arborescence.",
  },
  {
    q: "Faut-il un serveur ou une installation ?",
    a: "Non. Lekki s’ouvre dans le navigateur et s’installe comme une application sur ton téléphone. Tes documents restent sur ton espace.",
  },
];

function NotebookMock() {
  return (
    <div className="relative mx-auto mt-14 w-full max-w-5xl">
      <div className="pointer-events-none absolute -inset-x-10 -top-10 bottom-0 rounded-[3rem] bg-[radial-gradient(60%_60%_at_20%_10%,#D6E8D7_0%,transparent_70%),radial-gradient(55%_55%_at_85%_20%,#fef7e0_0%,transparent_72%)] blur-2xl" />
      <div className="relative overflow-hidden rounded-[1.75rem] border border-[#E5E9DC] bg-white shadow-[0_30px_80px_-40px_rgba(60,64,67,0.25)]">
        {/* Barre de fenêtre */}
        <div className="flex items-center gap-2 border-b border-[#F1F0E9] px-4 py-3">
          <span className="h-2.5 w-2.5 rounded-full bg-[#E5E9DC]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E5E9DC]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#E5E9DC]" />
          <span className="ml-3 truncate text-[11px] font-medium text-[#5C6B62]">
            ITT2 · Travail du signal · 14 documents
          </span>
        </div>

        <div className="grid md:grid-cols-[0.9fr_1.5fr_0.9fr]">
          {/* Sources */}
          <aside className="border-b border-[#F1F0E9] p-4 md:border-b-0 md:border-r">
            <p className="eyebrow text-[#5C6B62]">Sources</p>
            <ul className="mt-3 space-y-1.5">
              {[
                { name: "Cours TS · chap. 3", meta: "34 pages" },
                { name: "TD 4 · échantillonnage", meta: "6 pages" },
                { name: "Examen 2024", meta: "4 pages" },
                { name: "Rattrapage 2023", meta: "3 pages" },
              ].map((source, index) => (
                <li
                  key={source.name}
                  className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[12px] ${
                    index === 0 ? "bg-[#E7F1E9] text-[#2E7D5B]" : "text-[#3E4641]"
                  }`}
                >
                  <FileText className="h-3.5 w-3.5 shrink-0 text-[#2E7D5B]" />
                  <span className="truncate">{source.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-[#8A968E]">{source.meta}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center gap-2 rounded-lg border border-dashed border-[#D9DFD2] px-2 py-1.5 text-[11px] text-[#5C6B62]">
              <FolderUp className="h-3.5 w-3.5" /> Importer un dossier
            </div>
          </aside>

          {/* Conversation */}
          <div className="p-4 sm:p-5">
            <div className="flex items-center gap-2 text-[11px] text-[#5C6B62]">
              <Sparkles className="h-3.5 w-3.5 text-[#2E7D5B]" /> Lekki AI
            </div>
            <div className="mt-3 ml-auto w-fit max-w-[90%] rounded-2xl rounded-br-md bg-[#2E7D5B] px-3.5 py-2 text-[12.5px] text-white">
              Énonce le théorème de Shannon. Il tombe souvent ?
            </div>
            <div className="mt-3 space-y-2 rounded-2xl rounded-bl-md border border-[#F1F0E9] bg-[#FBFAF6] px-3.5 py-3 text-[12.5px] leading-relaxed text-[#3E4641]">
              <p>
                Pour reconstruire un signal de bande <b>B</b>, il faut échantillonner à{" "}
                <b>fe ≥ 2B</b>. Sinon, les répliques du spectre se chevauchent : c’est le repliement.
              </p>
              <p className="text-[#5C6B62]">
                Il est demandé dans l’examen 2024 et dans le rattrapage 2023.
              </p>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {["Cours TS · p. 12", "Examen 2024 · p. 2", "Rattrapage 2023 · p. 1"].map((cite) => (
                  <span
                    key={cite}
                    className="inline-flex items-center gap-1 rounded-md bg-[#E7F1E9] px-1.5 py-0.5 text-[10.5px] font-medium text-[#2E7D5B]"
                  >
                    <Quote className="h-2.5 w-2.5" /> {cite}
                  </span>
                ))}
              </div>
            </div>
            <div className="mt-3 flex items-center gap-2 rounded-xl border border-[#F1F0E9] px-3 py-2 text-[11.5px] text-[#8A968E]">
              <Search className="h-3.5 w-3.5" /> Poser une autre question…
            </div>
          </div>

          {/* Studio */}
          <aside className="border-t border-[#F1F0E9] p-4 md:border-t-0 md:border-l">
            <p className="eyebrow text-[#5C6B62]">Studio</p>
            <ul className="mt-3 space-y-1.5">
              {[
                { icon: FileText, label: "Fiche de révision" },
                { icon: ListChecks, label: "Quiz · 10 questions" },
                { icon: Network, label: "Carte mentale" },
                { icon: AudioLines, label: "Résumé audio" },
              ].map(({ icon: Icon, label }) => (
                <li
                  key={label}
                  className="flex items-center gap-2 rounded-lg border border-[#F1F0E9] px-2 py-1.5 text-[11.5px] text-[#3E4641]"
                >
                  <Icon className="h-3.5 w-3.5 shrink-0 text-[#2E7D5B]" />
                  <span className="truncate">{label}</span>
                </li>
              ))}
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}

export function LandingPage() {
  return (
    <div className="h-screen overflow-y-auto bg-[#FBFAF6] text-[#16241D]">
      <div className="relative min-h-full overflow-hidden">
        {/* Halos pastel, comme la page de NotebookLM */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[46rem]">
          <div className="absolute left-1/2 top-[-14rem] h-[34rem] w-[52rem] -translate-x-1/2 rounded-full bg-[#D6E8D7]/70 blur-[110px]" />
          <div className="absolute right-[-6rem] top-10 h-72 w-72 rounded-full bg-[#fef7e0]/50 blur-[100px]" />
          <div className="absolute left-[-8rem] top-40 h-72 w-72 rounded-full bg-[#E7F1E9]/50 blur-[100px]" />
        </div>

        <header className="relative z-20 mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
          <Link href="/" className="flex items-center gap-2.5">
            <LekkiMark size="sm" />
            <span className="font-display text-lg font-medium tracking-tight text-[#16241D]">
              Lekki
            </span>
          </Link>

          <nav className="hidden items-center gap-1 md:flex">
            {[
              { href: "#comment", label: "Comment ça marche" },
              { href: "#studio", label: "Ce que tu peux créer" },
              { href: "#faq", label: "FAQ" },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-full px-3.5 py-2 text-sm font-medium text-[#3E4641] transition-colors hover:bg-[#16241D]/[0.05] hover:text-[#16241D]"
              >
                {item.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-1.5 sm:gap-2">
            <Link
              href="/login"
              className="rounded-full px-3 py-2 text-sm font-medium text-[#3E4641] transition-colors hover:bg-[#16241D]/[0.05] hover:text-[#16241D]"
            >
              Se connecter
            </Link>
            <Link
              href="/register"
              className="inline-flex items-center gap-1.5 rounded-full bg-[#2E7D5B] px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#246147]"
            >
              Essayer
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </header>

        <main className="relative z-10 px-5 pb-20 sm:px-8">
          {/* Hero : centré, une seule promesse, un seul geste */}
          <section className="mx-auto max-w-3xl pt-10 text-center sm:pt-16">
            <span className="inline-flex items-center gap-2 rounded-full border border-[#D9DFD2] bg-white/70 px-3.5 py-1.5 text-[12px] font-medium text-[#3E4641] backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-[#2E7D5B]" />
              Ton partenaire de révision, ancré dans tes cours
            </span>
            <h1 className="mt-6 font-display text-[2.75rem] font-medium leading-[1.03] tracking-[-0.03em] text-[#16241D] sm:text-[4.25rem]">
              Comprends tout,
              <br />
              à partir de <em className="italic text-[#2E7D5B]">tes cours</em>.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-[1.0625rem] leading-relaxed text-[#3E4641]">
              Lekki réunit les cours, TD et anciens sujets de ta promo, et répond à tes questions en
              citant le document et la page. Pas d’invention : seulement ce que vous avez écrit.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full bg-[#2E7D5B] px-6 py-3.5 text-sm font-medium text-white shadow-[0_6px_20px_-8px_rgba(26,115,232,0.6)] transition-colors hover:bg-[#246147]"
              >
                Essayer Lekki
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/register"
                className="inline-flex items-center gap-2 rounded-full border border-[#D9DFD2] bg-white/70 px-5 py-3.5 text-sm font-medium text-[#3E4641] backdrop-blur transition-colors hover:bg-white"
              >
                <KeyRound className="h-4 w-4 text-[#5C6B62]" />
                J’ai un code d’invitation
              </Link>
            </div>
            <p className="mt-4 text-[12px] text-[#5C6B62]">
              Gratuit pour une promo · Aucune carte bancaire
            </p>
          </section>

          <NotebookMock />

          {/* Comment ça marche */}
          <section id="comment" className="mx-auto mt-28 max-w-5xl scroll-mt-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow text-[#5C6B62]">Comment ça marche</p>
              <h2 className="mt-3 font-display text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
                Vos documents, une seule mémoire.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#3E4641]">
                Chaque nouvelle promo repart de zéro, et les cours se perdent dans les groupes de
                discussion. Lekki garde ce que la promo a déjà produit, et le rend interrogeable.
              </p>
            </div>

            <ol className="mt-10 grid gap-4 sm:grid-cols-3">
              {steps.map(({ icon: Icon, title, text }, index) => (
                <li
                  key={title}
                  className="rounded-2xl border border-[#E5E9DC] bg-white/80 p-5 backdrop-blur"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#E7F1E9] text-[11px] font-bold text-[#2E7D5B]">
                      {index + 1}
                    </span>
                    <Icon className="h-4 w-4 text-[#5C6B62]" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-medium text-[#16241D]">{title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5C6B62]">{text}</p>
                </li>
              ))}
            </ol>
          </section>

          {/* Ce que tu peux créer */}
          <section id="studio" className="mx-auto mt-24 max-w-5xl scroll-mt-20">
            <div className="mx-auto max-w-2xl text-center">
              <p className="eyebrow text-[#5C6B62]">Le studio</p>
              <h2 className="mt-3 font-display text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
                D’un dossier à de quoi réviser.
              </h2>
              <p className="mt-4 text-[15px] leading-relaxed text-[#3E4641]">
                À partir des mêmes documents, Lekki produit les formats dont tu as besoin la veille
                d’un contrôle — chaque élément renvoie à sa source.
              </p>
            </div>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {outputs.map(({ icon: Icon, title, text, tint }) => (
                <article
                  key={title}
                  className="rounded-2xl border border-[#E5E9DC] bg-white/80 p-5 backdrop-blur transition-shadow hover:shadow-[0_6px_24px_-16px_rgba(60,64,67,0.3)]"
                >
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${tint}`}>
                    <Icon className="h-5 w-5 text-[#2E7D5B]" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-medium text-[#16241D]">{title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-[#5C6B62]">{text}</p>
                </article>
              ))}
            </div>
          </section>

          {/* Confidentialité */}
          <section className="mx-auto mt-24 max-w-5xl">
            <div className="flex flex-col items-start gap-5 rounded-2xl border border-[#E5E9DC] bg-[#E7F1E9]/50 p-6 sm:flex-row sm:items-center sm:p-8">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white">
                <ShieldCheck className="h-6 w-6 text-[#2E7D5B]" />
              </div>
              <div>
                <h2 className="font-display text-xl font-medium tracking-[-0.01em]">
                  Un espace privé, pour ta promo seulement.
                </h2>
                <p className="mt-1.5 text-[14px] leading-relaxed text-[#3E4641]">
                  Les documents d’un espace ne sont visibles que par ses membres. Ni publicité, ni
                  revente : vos cours restent vos cours.
                </p>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section id="faq" className="mx-auto mt-24 max-w-3xl scroll-mt-20">
            <h2 className="text-center font-display text-3xl font-medium tracking-[-0.02em] sm:text-4xl">
              Questions fréquentes
            </h2>
            <div className="mt-8 divide-y divide-[#E5E9DC] border-y border-[#E5E9DC]">
              {faq.map((item) => (
                <details key={item.q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-[#16241D]">
                    {item.q}
                    <ChevronDown className="h-4 w-4 shrink-0 text-[#5C6B62] transition-transform group-open:rotate-180" />
                  </summary>
                  <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-[#5C6B62]">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </section>

          {/* Dernier appel */}
          <section className="mx-auto mt-20 max-w-5xl">
            <div className="relative overflow-hidden rounded-[1.75rem] bg-[#2E7D5B] px-6 py-14 text-center sm:px-10">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_70%_at_50%_0%,rgba(255,255,255,0.15),transparent_70%)]" />
              <h2 className="relative font-display text-3xl font-medium tracking-[-0.02em] text-white sm:text-4xl">
                Ta promo a déjà les documents.
              </h2>
              <p className="relative mx-auto mt-3 max-w-md text-[15px] leading-relaxed text-white/80">
                Il leur manque un endroit où on les retrouve, et quelqu’un à qui poser la question.
              </p>
              <Link
                href="/register"
                className="relative mt-7 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3.5 text-sm font-medium text-[#2E7D5B] transition-colors hover:bg-[#FBFAF6]"
              >
                Créer l’espace de ma promo
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        </main>

        <footer className="relative z-10 border-t border-[#E5E9DC] px-6 py-7">
          <div className="mx-auto flex max-w-5xl flex-col items-center justify-between gap-3 text-[12px] text-[#5C6B62] sm:flex-row">
            <span>© {new Date().getFullYear()} Lekki · Né à SUP’PTIC, Yaoundé</span>
            <span className="inline-flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <GraduationCap className="h-3.5 w-3.5" /> Par des étudiants, pour les étudiants
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" /> Promos · clubs · groupes
              </span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}

export function AuthSplash() {
  return (
    <div className="h-screen flex flex-col items-center justify-center bg-[#FBFAF6] text-[#16241D] gap-4">
      <LekkiMark size="lg" />
      <p className="text-xs font-medium tracking-[0.18em] text-[#5C6B62]">LEKKI</p>
    </div>
  );
}
