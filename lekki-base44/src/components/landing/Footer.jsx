import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import LekkiLogo from "@/components/brand/LekkiLogo";

export function Footer() {
  return (
    <footer className="bg-[#FBFAF6]">
      <div className="mx-auto max-w-[1180px] px-5 py-16 sm:py-20">
        <div className="relative overflow-hidden rounded-[28px] border border-[#D8D4C6] bg-[#16241D] px-7 py-12 text-center sm:px-12 sm:py-16">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-70"
            style={{
              backgroundImage:
                "radial-gradient(50% 60% at 15% 0%, rgba(216,234,217,0.22), transparent 70%), radial-gradient(45% 55% at 90% 15%, rgba(246,231,200,0.18), transparent 72%)",
            }}
          />
          <div className="relative">
            <p className="eyebrow text-[10px] text-[#9CC4A8]">Prêt quand tu l’es</p>
            <h2 className="mx-auto mt-4 max-w-[20ch] font-heading text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#FBFAF6] sm:text-[2.7rem]">
              Ta promo mérite mieux qu’un groupe WhatsApp.
            </h2>
            <p className="mx-auto mt-4 max-w-[42ch] text-sm leading-relaxed text-[#C9D3CB]">
              Crée ton espace, importe les cours, et laisse Lekki répondre avec les bonnes pages.
            </p>
            <Link
              to="/accueil"
              className="group mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-[#FBFAF6] pl-6 pr-2 text-sm font-semibold text-[#16241D] transition-colors hover:bg-white"
            >
              Commencer maintenant
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#7FCFA5] text-[#0F1714] transition-transform group-hover:translate-x-0.5">
                <ArrowRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-6 border-t border-[#E7E4D9] pt-8 sm:flex-row">
          <LekkiLogo size={28} wordmarkClassName="text-base" />
          <p className="order-3 text-xs text-[#8A968E] sm:order-2">
            © {new Date().getFullYear()} Lekki · Né à SUP’PTIC, Yaoundé.
          </p>
          <div className="order-2 flex items-center gap-5 text-xs text-[#5C6B62] sm:order-3">
            <a href="#comment" className="transition-colors hover:text-[#16241D]">
              Comment ça marche
            </a>
            <a href="#faq" className="transition-colors hover:text-[#16241D]">
              FAQ
            </a>
            <Link to="/login" className="transition-colors hover:text-[#16241D]">
              Se connecter
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}