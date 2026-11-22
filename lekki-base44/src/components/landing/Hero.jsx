import { Link } from "@tanstack/react-router";
import { ArrowRight, Sparkles } from "lucide-react";
import { HeroPanels } from "@/components/landing/HeroPanels";

export function Hero() {
  return (
    <section className="relative overflow-hidden border-b border-[#E7E4D9] bg-[#FBFAF6]" aria-label="Présentation de Lekki">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-[-17rem] h-[34rem] w-[48rem] -translate-x-1/2 rounded-full bg-[#D8EAD9] opacity-70 blur-[120px]" />
        <div className="absolute right-[-7rem] top-24 h-72 w-72 rounded-full bg-[#F6E7C8] opacity-60 blur-[100px]" />
        <div className="absolute left-[-8rem] top-44 h-64 w-64 rounded-full bg-[#EAF2E7] opacity-70 blur-[100px]" />
      </div>

      <div className="relative mx-auto max-w-[1180px] px-5 pt-14 sm:pt-20">
        <div className="flex flex-col items-center text-center">
          <span className="eyebrow inline-flex items-center gap-2 rounded-full border border-[#D8D4C6] bg-white/70 px-3 py-1.5 text-[10px] text-[#2E7D5B] backdrop-blur">
            <Sparkles className="h-3.5 w-3.5" />
            Mémoire collective · IA sourcée
          </span>

          <h1 className="mt-6 max-w-[19ch] font-heading text-[2.65rem] font-semibold leading-[1.04] tracking-[-0.035em] text-[#16241D] sm:text-[3.6rem] lg:text-[4.2rem]">
            Tout ton savoir,
            <br className="hidden sm:block" /> une seule conversation.
          </h1>

          <p className="mt-5 max-w-[48ch] text-[15px] leading-relaxed text-[#5C6B62] sm:text-base">
            Tes cours, TD et anciens sujets réunis dans un espace. Pose une question :
            Lekki répond et cite le document, le chapitre et la page.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row">
            <Link
              to="/accueil"
              className="group inline-flex h-12 items-center gap-2 rounded-full bg-[#16241D] pl-6 pr-2 text-sm font-semibold text-[#FBFAF6] transition-colors hover:bg-[#24382D]"
            >
              Créer mon espace
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7FCFA5] text-[#0F1714] transition-colors group-hover:bg-[#F6E7C8]">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
            <a
              href="#comment"
              className="inline-flex h-12 items-center rounded-full border border-[#D8D4C6] bg-white/70 px-6 text-sm font-medium text-[#3C4A41] backdrop-blur transition-colors hover:border-[#16241D]/30 hover:text-[#16241D]"
            >
              Voir comment ça marche
            </a>
          </div>

          <p className="mt-4 text-xs text-[#8A968E]">
            Gratuit · Sans installation · Tes documents restent privés
          </p>
        </div>
      </div>

      <div className="relative mt-12 sm:mt-14">
        <HeroPanels />
      </div>
    </section>
  );
}