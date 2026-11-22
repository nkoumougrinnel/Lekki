import { useEffect, useRef } from "react";
import { ArrowUp, Sparkles } from "lucide-react";
import { ChatMessage } from "@/components/notebook/ChatMessage";
import { ChatComposer } from "@/components/notebook/ChatComposer";

export function ChatPanel({
  espace,
  messages,
  asking,
  sources,
  selectedCount,
  onAsk,
  onOpenCitation,
  onSaveAnswer,
  onOpenSources,
  onOpenPanel,
}) {
  const bottomRef = useRef(null);
  const suggestions = [
    sources[0]?.name ? `Résume « ${sources[0].name} » en 5 points.` : "Résume mes documents en 5 points.",
    "Quelles notions vont tomber à l’examen ?",
    "Explique la notion la plus difficile simplement.",
    "Fais-moi un plan de révision sur ce semestre.",
  ];

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, asking]);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <div className="mx-auto flex max-w-xl flex-col items-center px-6 py-10 text-center sm:py-16">
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#16241D] text-[#FBFAF6]">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="mt-5 font-heading text-[1.65rem] font-semibold leading-tight tracking-[-0.03em] text-[#16241D] sm:text-[1.9rem]">
              Que veux-tu comprendre ?
            </h2>
            <p className="mt-2 max-w-sm text-[13px] leading-relaxed text-[#5C6B62]">
              {sources.length
                ? `Lekki répond à partir de ${selectedCount || sources.length} source${(selectedCount || sources.length) > 1 ? "s" : ""} et cite toujours le document et la page.`
                : "Ajoute une source, puis pose ta première question."}
            </p>

            <div className="mt-6 flex w-full flex-col gap-2">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => (sources.length ? onAsk(suggestion) : onOpenSources())}
                  className="group flex items-center gap-2.5 rounded-xl border border-[#E7E4D9] bg-white px-3.5 py-2.5 text-left text-[12.5px] text-[#3C4A41] transition-colors hover:border-[#C9D9CC] hover:bg-[#FBFAF6]"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#EAF2E7] text-[#2E7D5B]">
                    <Sparkles className="h-3 w-3" />
                  </span>
                  <span className="flex-1">{suggestion}</span>
                  <ArrowUp className="h-3.5 w-3.5 shrink-0 rotate-45 text-[#B3B7AE] transition-colors group-hover:text-[#2E7D5B]" />
                </button>
              ))}
            </div>

            {!sources.length && (
              <button
                type="button"
                onClick={onOpenSources}
                className="mt-5 rounded-full bg-[#16241D] px-5 py-2.5 text-[12.5px] font-semibold text-[#FBFAF6] transition-colors hover:bg-[#24382D]"
              >
                Ajouter ma première source
              </button>
            )}
          </div>
        ) : (
          <div className="mx-auto max-w-3xl space-y-6 px-4 py-6 sm:px-6">
            <div className="flex items-center gap-2 text-[11px] text-[#8A968E]">
              <span className="flex h-5 w-5 items-center justify-center rounded-md bg-[#16241D] text-[9px] font-semibold text-[#FBFAF6]">
                L
              </span>
              Conversation · {espace?.name || "Espace"}
            </div>
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                message={message}
                onAsk={onAsk}
                onOpenCitation={onOpenCitation}
                onSaveAnswer={onSaveAnswer}
              />
            ))}
            {asking && (
              <div className="flex items-start gap-2.5">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#16241D] text-[#FBFAF6]">
                  <Sparkles className="h-3.5 w-3.5" />
                </span>
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-[#F1EFE6] bg-[#FBFAF6] px-3.5 py-3">
                  {[0, 1, 2].map((dot) => (
                    <span
                      key={dot}
                      className="h-1.5 w-1.5 animate-bounce rounded-full bg-[#9CC4A8]"
                      style={{ animationDelay: `${dot * 120}ms` }}
                    />
                  ))}
                  <span className="ml-1 text-[11.5px] text-[#8A968E]">Lekki cherche dans tes sources…</span>
                </div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="shrink-0 border-t border-[#F1EFE6] bg-white px-3 pb-3 pt-2.5 sm:px-5">
        <ChatComposer
          asking={asking}
          sourceCount={sources.length}
          selectedCount={selectedCount}
          onAsk={onAsk}
          onOpenSources={onOpenSources}
        />
        <p className="mt-1.5 text-center text-[10px] text-[#B3B7AE]">
          Lekki peut se tromper : vérifie toujours la page citée.
        </p>
      </div>
    </div>
  );
}