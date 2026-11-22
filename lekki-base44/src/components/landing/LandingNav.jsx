import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import LekkiLogo from "@/components/brand/LekkiLogo";

const links = [
  { href: "#comment", label: "Comment ça marche" },
  { href: "#studio", label: "Ce que tu peux créer" },
  { href: "#sources", label: "Sources citées" },
  { href: "#faq", label: "FAQ" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-40 border-b border-[#E7E4D9]/80 bg-[#FBFAF6]/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-[1180px] items-center justify-between gap-4 px-5">
        <Link to="/" className="transition-opacity hover:opacity-80">
          <LekkiLogo size={32} />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {links.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#5C6B62] transition-colors hover:bg-[#16241D]/[0.05] hover:text-[#16241D]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            to="/login"
            className="hidden rounded-full px-3.5 py-2 text-[13.5px] font-medium text-[#3C4A41] transition-colors hover:bg-[#16241D]/[0.05] sm:inline-flex"
          >
            Se connecter
          </Link>
          <Link
            to="/accueil"
            className="group inline-flex items-center gap-1.5 rounded-full bg-[#16241D] px-4 py-2 text-[13.5px] font-semibold text-[#FBFAF6] transition-colors hover:bg-[#24382D]"
          >
            Commencer
            <ArrowUpRight className="h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </div>
      </div>
    </header>
  );
}