import { FolderUp, KeyRound, MessageSquareText } from "lucide-react";

const steps = [
  {
    icon: KeyRound,
    title: "Crée l’espace de ta promo",
    text: "Une promo, un club, un groupe d’étude. Chacun arrive au bon endroit, avec les bons documents.",
  },
  {
    icon: FolderUp,
    title: "Importe les documents",
    text: "Cours, TD, anciens sujets : dépose les fichiers. L’arborescence est conservée et chaque page est indexée.",
  },
  {
    icon: MessageSquareText,
    title: "Pose ta question",
    text: "Lekki répond à partir de tes sources, cite le cours et la page, puis te propose de réviser.",
  },
];

export function HowItWorks() {
  return (
    <section id="comment" className="border-b border-[#E7E4D9] bg-[#FBFAF6] py-20 sm:py-24">
      <div className="mx-auto max-w-[1180px] px-5">
        <div className="max-w-2xl">
          <p className="eyebrow text-[#2E7D5B]">Comment ça marche</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#16241D] sm:text-[2.6rem]">
            Trois étapes, et ta promo arrête de chercher dans WhatsApp.
          </h2>
        </div>

        <div className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, text }, index) => (
            <div
              key={title}
              className="group relative rounded-2xl border border-[#E7E4D9] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:border-[#C9D9CC] hover:shadow-[0_24px_50px_-38px_rgba(22,36,29,0.5)]"
            >
              <div className="flex items-center justify-between">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#EAF2E7] text-[#2E7D5B]">
                  <Icon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <span className="font-heading text-[2rem] font-semibold leading-none text-[#EFECE2] transition-colors group-hover:text-[#E3EBDD]">
                  0{index + 1}
                </span>
              </div>
              <h3 className="mt-5 font-heading text-[1.05rem] font-semibold tracking-[-0.01em] text-[#16241D]">
                {title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-[#5C6B62]">{text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}