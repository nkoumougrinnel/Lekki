import { Check, FileText, Quote, ShieldCheck } from "lucide-react";

export function CitationShowcase() {
  return (
    <section id="sources" className="border-b border-[#E7E4D9] bg-[#FBFAF6] py-20 sm:py-24">
      <div className="mx-auto grid max-w-[1180px] items-center gap-12 px-5 lg:grid-cols-[0.9fr_1.1fr]">
        <div>
          <p className="eyebrow text-[#2E7D5B]">Réponses sourcées</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#16241D] sm:text-[2.6rem]">
            Chaque réponse ouvre la page d’où elle vient.
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-[#5C6B62]">
            Pas de réponse inventée. Lekki s’appuie sur les documents de l’espace,
            affiche le chapitre et la page, et te laisse vérifier en un clic.
          </p>

          <ul className="mt-8 space-y-3">
            {[
              "Le document, le chapitre et la page, toujours visibles.",
              "Les contradictions entre deux cours sont signalées.",
              "Tes documents restent privés : seuls les membres de l’espace y accèdent.",
            ].map((item) => (
              <li key={item} className="flex items-start gap-3 text-sm text-[#3C4A41]">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#EAF2E7] text-[#2E7D5B]">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="relative">
          <div
            aria-hidden="true"
            className="absolute -inset-6 rounded-[2rem] bg-[radial-gradient(60%_60%_at_20%_10%,#EAF2E7_0%,transparent_70%),radial-gradient(55%_55%_at_85%_25%,#F6E7C8_0%,transparent_72%)] blur-2xl"
          />
          <div className="relative overflow-hidden rounded-2xl border border-[#E7E4D9] bg-white shadow-[0_30px_70px_-45px_rgba(22,36,29,0.45)]">
            <div className="flex items-center justify-between border-b border-[#F1EFE6] px-5 py-3.5">
              <span className="inline-flex items-center gap-2 text-[12px] font-medium text-[#3C4A41]">
                <span className="flex h-6 w-6 items-center justify-center rounded-md bg-[#16241D] text-[10px] font-semibold text-[#FBFAF6]">
                  L
                </span>
                Lekki AI
              </span>
              <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF2E7] px-2 py-1 text-[10.5px] font-medium text-[#256A4C]">
                <ShieldCheck className="h-3 w-3" /> 3 sources
              </span>
            </div>

            <div className="space-y-4 p-5">
              <div className="ml-auto w-fit max-w-[88%] rounded-2xl rounded-br-md bg-[#16241D] px-4 py-2.5 text-[13px] leading-snug text-[#FBFAF6]">
                Quelle est la différence entre échantillonnage et quantification ?
              </div>

              <div className="rounded-2xl rounded-bl-md border border-[#F1EFE6] bg-[#FBFAF6] p-4">
                <p className="text-[13.5px] leading-relaxed text-[#3C4A41]">
                  <strong className="text-[#16241D]">Échantillonner</strong>, c’est prélever le signal
                  dans le temps ; <strong className="text-[#16241D]">quantifier</strong>, c’est arrondir
                  chaque valeur sur une échelle finie. Le premier agit sur l’axe temporel, le second sur
                  l’amplitude.
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {["Cours TS · chap. 2 · p. 8", "TD 3 · exercice 2", "Fiche wiki · Conversions"].map(
                    (cite) => (
                      <span
                        key={cite}
                        className="inline-flex items-center gap-1 rounded-md border border-[#D8E4D6] bg-white px-2 py-1 text-[10.5px] font-medium text-[#256A4C]"
                      >
                        <Quote className="h-2.5 w-2.5" /> {cite}
                      </span>
                    ),
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-xl border border-[#E7E4D9] p-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#FBF3E1] text-[#8A6B2E]">
                  <FileText className="h-4 w-4" />
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[12px] font-medium text-[#16241D]">
                    Cours TS · chap. 2 — p. 8
                  </p>
                  <p className="truncate text-[11px] text-[#8A968E]">
                    « Le pas d’échantillonnage Te fixe la résolution temporelle… »
                  </p>
                </div>
                <span className="ml-auto shrink-0 rounded-md bg-[#F1EFE6] px-2 py-1 text-[10px] font-medium text-[#5C6B62]">
                  Ouvrir
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}