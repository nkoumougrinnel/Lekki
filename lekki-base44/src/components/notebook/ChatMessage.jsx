import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { BookmarkPlus, Check, Copy, Quote, Sparkles } from "lucide-react";
import { toast } from "sonner";

export function ChatMessage({ message, onAsk, onOpenCitation, onSaveAnswer }) {
  const [copied, setCopied] = useState(false);

  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[88%] rounded-2xl rounded-br-md bg-[#16241D] px-4 py-2.5 text-[13.5px] leading-relaxed text-[#FBFAF6]">
          {message.content}
        </div>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Copie impossible sur ce navigateur.");
    }
  };

  return (
    <div className="flex items-start gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#16241D] text-[#FBFAF6]">
        <Sparkles className="h-3.5 w-3.5" />
      </span>

      <div className="min-w-0 flex-1">
        <div className="lekki-prose">
          <ReactMarkdown>{message.content}</ReactMarkdown>
        </div>

        {message.citations?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.citations.map((citation, index) => (
              <button
                key={`${citation.source_id}-${index}`}
                type="button"
                onClick={() => onOpenCitation(citation)}
                title={citation.quote || citation.source_name}
                className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-[#D8E4D6] bg-[#F7FBF6] px-2 py-1 text-[10.5px] font-medium text-[#256A4C] transition-colors hover:border-[#2E7D5B]/40 hover:bg-[#EAF2E7]"
              >
                <Quote className="h-2.5 w-2.5 shrink-0" />
                <span className="truncate">{citation.source_name}</span>
                {citation.location && <span className="shrink-0 text-[#5C6B62]">· {citation.location}</span>}
              </button>
            ))}
          </div>
        )}

        {message.follow_ups?.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {message.follow_ups.map((followUp) => (
              <button
                key={followUp}
                type="button"
                onClick={() => onAsk(followUp)}
                className="rounded-full border border-[#E7E4D9] bg-white px-2.5 py-1 text-[11px] text-[#3C4A41] transition-colors hover:border-[#C9D9CC] hover:bg-[#FBFAF6] hover:text-[#256A4C]"
              >
                {followUp}
              </button>
            ))}
          </div>
        )}

        <div className="mt-2.5 flex items-center gap-1">
          <button
            type="button"
            onClick={copy}
            aria-label="Copier la réponse"
            className="flex h-7 items-center gap-1 rounded-md px-1.5 text-[10.5px] text-[#8A968E] transition-colors hover:bg-[#F1EFE6] hover:text-[#16241D]"
          >
            {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
            {copied ? "Copié" : "Copier"}
          </button>
          <button
            type="button"
            onClick={() => onSaveAnswer(message)}
            aria-label="Enregistrer dans les notes"
            className="flex h-7 items-center gap-1 rounded-md px-1.5 text-[10.5px] text-[#8A968E] transition-colors hover:bg-[#F1EFE6] hover:text-[#16241D]"
          >
            <BookmarkPlus className="h-3 w-3" /> Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
}