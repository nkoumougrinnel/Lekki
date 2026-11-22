import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    a: "PDF, Word, PowerPoint, texte et Markdown. Tu peux aussi coller directement le contenu d’une page ou d’un cours.",
  },
  {
    q: "Faut-il un serveur ou une installation ?",
    a: "Non. Lekki s’ouvre dans le navigateur et s’installe comme une application sur ton téléphone. Tes documents restent dans ton espace.",
  },
];

export function FaqSection() {
  return (
    <section id="faq" className="bg-white py-20 sm:py-24">
      <div className="mx-auto grid max-w-[1180px] gap-10 px-5 lg:grid-cols-[0.7fr_1.3fr]">
        <div>
          <p className="eyebrow text-[#2E7D5B]">FAQ</p>
          <h2 className="mt-3 font-heading text-3xl font-semibold leading-tight tracking-[-0.03em] text-[#16241D] sm:text-[2.4rem]">
            Les questions qu’on nous pose.
          </h2>
        </div>
        <Accordion type="single" collapsible className="w-full">
          {faq.map((item, index) => (
            <AccordionItem
              key={item.q}
              value={`item-${index}`}
              className="border-b border-[#E7E4D9]"
            >
              <AccordionTrigger className="py-5 text-left font-heading text-[15px] font-medium text-[#16241D] hover:no-underline">
                {item.q}
              </AccordionTrigger>
              <AccordionContent className="pb-5 text-sm leading-relaxed text-[#5C6B62]">
                {item.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}