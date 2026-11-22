import { AudioLines, FileText, ListChecks, Network, Plus, Quote, Sparkles } from "lucide-react";

const sources = [
  { name: "Cours · Traitement du signal", meta: "34 p.", active: true },
  { name: "TD 4 · Échantillonnage", meta: "6 p.", active: true },
  { name: "Examen 2024", meta: "4 p.", active: true },
  { name: "Rattrapage 2023", meta: "3 p.", active: false },
];

const studio = [
  { icon: FileText, label: "Fiche de révision", meta: "Prête", tint: "bg-[#EAF2E7]", ink: "text-[#2E7D5B]" },
  { icon: ListChecks, label: "Quiz · 10 questions", meta: "Générer", tint: "bg-[#FBF3E1]", ink: "text-[#8A6B2E]" },
  { icon: Network, label: "Carte mentale", meta: "Générer", tint: "bg-[#F1EFE6]", ink: "text-[#5C6B62]" },
  { icon: AudioLines, label: "Résumé audio", meta: "4 min", tint: "bg-[#EAF2E7]", ink: "text-[#2E7D5B]" },
];

function Panel({ title, aside, children }) {
  return (
    <div className="h-[430px] overflow-hidden rounded-t-[20px] border border-b-0 border-[#E7E4D9] bg-white shadow-[0_30px_70px_-45px_rgba(22,36,29,0.45)]">
      <div className="flex items-center justify-between border-b border-[#F1EFE6] px-4 py-3">
        <span className="eyebrow text-[10px] text-[#5C6B62]">{title}</span>
        <span className="text-[10px] font-medium text-[#8A968E]">{aside}</span>
      </div>
      {children}
    </div>
  );
}

export function HeroPanels() {
  return (
    <div className="relative mx-auto h-[250px] max-w-[1180px] overflow-hidden px-5 sm:h-[330px] lg:h-[400px]">
      <div className="grid grid-cols-1 items-start gap-4 md:grid-cols-3">
        <div className="hidden md:block">
          <Panel title="Sources" aside="4 sélectionnées">
            <ul className="space-y-1 p-2.5">
              {sources.map((source) => (
                <li
                  key={source.name}
                  className="flex items-center gap-2 rounded-xl px-2 py-2 text-[11.5px] text-[#3C4A41]"
                >
                  <span
                    className={`flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-[4px] border ${
                      source.active
                        ? "border-[#2E7D5B] bg-[#2E7D5B] text-white"
                        : "border-[#D8D4C6] bg-white"
                    }`}
                  >
                    {source.active && (
                      <svg viewBox="0 0 12 12" className="h-2.5 w-2.5" fill="none">
                        <path d="M2.5 6.2 4.8 8.5 9.5 3.6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    )}
                  </span>
                  <FileText className="h-3.5 w-3.5 shrink-0 text-[#2E7D5B]" />
                  <span className="truncate">{source.name}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-[#8A968E]">{source.meta}</span>
                </li>
              ))}
            </ul>
            <div className="mx-2.5 flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-[#D8D4C6] py-2 text-[11px] font-medium text-[#5C6B62]">
              <Plus className="h-3.5 w-3.5" /> Ajouter une source
            </div>
            <div className="mx-2.5 mt-3 rounded-xl bg-[#FBFAF6] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A968E]">
                Notes enregistrées
              </p>
              <p className="mt-1.5 text-[11.5px] leading-snug text-[#3C4A41]">
                Théorème de Shannon — à revoir avant l’examen.
              </p>
            </div>
          </Panel>
        </div>

        <div className="md:translate-y-8">
          <Panel title="Conversation" aside="Lekki AI">
            <div className="space-y-3 p-3.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="inline-flex items-center gap-1 rounded-full bg-[#EAF2E7] px-2 py-1 text-[10px] font-medium text-[#256A4C]">
                  <Sparkles className="h-3 w-3" /> 4 sources
                </span>
                <span className="inline-flex items-center gap-1 rounded-full border border-[#E7E4D9] px-2 py-1 text-[10px] text-[#5C6B62]">
                  Traitement du signal
                </span>
              </div>
              <div className="ml-auto w-fit max-w-[92%] rounded-2xl rounded-br-md bg-[#16241D] px-3 py-2 text-[11.5px] leading-snug text-[#FBFAF6]">
                Énonce le théorème de Shannon. Il tombe souvent ?
              </div>
              <div className="rounded-2xl rounded-bl-md border border-[#F1EFE6] bg-[#FBFAF6] px-3 py-2.5 text-[11.5px] leading-relaxed text-[#3C4A41]">
                <p>
                  Pour reconstruire un signal de bande <strong className="text-[#16241D]">B</strong>, il
                  faut échantillonner à <strong className="text-[#16241D]">fe ≥ 2B</strong>. Sinon les
                  répliques du spectre se chevauchent : c’est le repliement.
                </p>
                <p className="mt-1.5 text-[#5C6B62]">
                  Il est demandé dans l’examen 2024 et le rattrapage 2023.
                </p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {["Cours TS · p. 12", "Examen 2024 · p. 2", "Rattrapage · p. 1"].map((cite) => (
                    <span
                      key={cite}
                      className="inline-flex items-center gap-1 rounded-md bg-[#EAF2E7] px-1.5 py-0.5 text-[10px] font-medium text-[#256A4C]"
                    >
                      <Quote className="h-2.5 w-2.5" /> {cite}
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-[#E7E4D9] px-3 py-2 text-[11px] text-[#8A968E]">
                <Sparkles className="h-3.5 w-3.5 text-[#2E7D5B]" /> Poser une autre question…
              </div>
            </div>
          </Panel>
        </div>

        <div className="hidden md:block">
          <Panel title="Studio" aside="4 outils">
            <ul className="space-y-1.5 p-2.5">
              {studio.map(({ icon: Icon, label, meta, tint, ink }) => (
                <li
                  key={label}
                  className="flex items-center gap-2.5 rounded-xl border border-[#F1EFE6] px-2.5 py-2 text-[11.5px] text-[#3C4A41]"
                >
                  <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${tint}`}>
                    <Icon className={`h-3.5 w-3.5 ${ink}`} />
                  </span>
                  <span className="truncate">{label}</span>
                  <span className="ml-auto shrink-0 text-[10px] text-[#8A968E]">{meta}</span>
                </li>
              ))}
            </ul>
            <div className="mx-2.5 mt-2 rounded-xl border border-[#F1EFE6] p-3">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#8A968E]">
                Fiche de révision
              </p>
              <div className="mt-2 space-y-1.5">
                <div className="h-1.5 w-full rounded-full bg-[#F1EFE6]" />
                <div className="h-1.5 w-11/12 rounded-full bg-[#F1EFE6]" />
                <div className="h-1.5 w-3/4 rounded-full bg-[#F1EFE6]" />
              </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
}