import {
  AudioLines,
  BookOpen,
  FileCheck2,
  FileText,
  ListChecks,
  Network,
} from "lucide-react";

const outputs = [
  {
    icon: FileText,
    title: "Fiches de révision",
    text: "Un chapitre entier résumé, structuré et relié aux pages du cours.",
    tint: "bg-[#EAF2E7]",
    ink: "text-[#2E7D5B]",
  },
  {
    icon: ListChecks,
    title: "Quiz",
    text: "Des questions générées depuis tes documents, avec correction et source.",
    tint: "bg-[#FBF3E1]",
    ink: "text-[#8A6B2E]",
  },
  {
    icon: Network,
    title: "Cartes mentales",
    text: "Les notions d’un module vues d’ensemble, chapitre par chapitre.",
    tint: "bg-[#F1EFE6]",
    ink: "text-[#5C6B62]",
  },
  {
    icon: FileCheck2,
    title: "Anciens sujets",
    text: "Examen, rattrapage, CC : reconnus depuis le nom du fichier, avec une correction proposée.",
    tint: "bg-[#F6E7C8]",
    ink: "text-[#8A6B2E]",
  },
  {
    icon: AudioLines,
    title: "Résumés à écouter",
    text: "La synthèse d’un cours en lecture audio, pour réviser en marchant.",
    tint: "bg-[#EAF2E7]",
    ink: "text-[#2E7D5B]",
  },
  {
    icon: BookOpen,
    title: "Wiki de la promo",
    text: "Des fiches écrites à plusieurs, historisées et relues par les référents.",
    tint: "bg-[#F1EFE6]",
    ink: "text-[#5C6B62]",
  },
];

export function StudioGrid() {
  return (
    <section id="studio" className="border-b border-[#E7E4D9] bg-white py-20 sm:py-24">
      <div className="mx-auto max-w-[1180px] px-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl">
            <p className="eyebrow text-[#2E7D5B]">Studio</p>
            <h2 className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#16241D] sm:text-[2.6rem]">
              Ce que tu peux créer à partir de tes sources.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-[#5C6B62]">
            Chaque outil travaille uniquement sur les documents sélectionnés, et garde
            la trace des pages qu’il utilise.
          </p>
        </div>

        <div className="mt-12 grid gap-px overflow-hidden rounded-2xl border border-[#E7E4D9] bg-[#E7E4D9] sm:grid-cols-2 lg:grid-cols-3">
          {outputs.map(({ icon: Icon, title, text, tint, ink }) => (
            <div key={title} className="group bg-white p-7 transition-colors hover:bg-[#FBFAF6]">
              <span className={`flex h-11 w-11 items-center justify-center rounded-xl ${tint} ${ink}`}>
                <Icon className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <h3 className="mt-5 font-heading text-[1.02rem] font-semibold text-[#16241D]">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5C6B62]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}