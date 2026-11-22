import { createFileRoute } from "@tanstack/react-router";
import { LandingNav } from "@/components/landing/LandingNav";
import { Hero } from "@/components/landing/Hero";
import { HowItWorks } from "@/components/landing/HowItWorks";
import { StudioGrid } from "@/components/landing/StudioGrid";
import { CitationShowcase } from "@/components/landing/CitationShowcase";
import { FaqSection } from "@/components/landing/FaqSection";
import { Footer } from "@/components/landing/Footer";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lekki — Tout ton savoir, une seule conversation" },
      {
        name: "description",
        content:
          "Lekki réunit tes cours, TD et anciens sujets dans un espace, et répond à tes questions en citant le document, le chapitre et la page.",
      },
      { property: "og:title", content: "Lekki — Tout ton savoir, une seule conversation" },
      {
        property: "og:description",
        content:
          "La mémoire collective de ta promo : documents centralisés, réponses sourcées, fiches et quiz générés depuis tes cours.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-[#FBFAF6]">
      <LandingNav />
      <main>
        <Hero />
        <HowItWorks />
        <StudioGrid />
        <CitationShowcase />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}