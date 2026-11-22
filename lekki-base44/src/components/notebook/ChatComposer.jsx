import { useEffect, useRef, useState } from "react";
import { ArrowUp, Paperclip } from "lucide-react";

export function ChatComposer({ asking, sourceCount, selectedCount, onAsk, onOpenSources }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);

  useEffect(() => {
    const element = textareaRef.current;
    if (!element) return;
    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, 140)}px`;
  }, [value]);

  const submit = () => {
    if (!value.trim() || asking) return;
    onAsk(value);
    setValue("");
  };

  return (
    <div className="rounded-2xl border border-[#E2DFD3] bg-white p-1.5 shadow-[0_1px_2px_rgba(22,36,29,0.04)] transition-colors focus-within:border-[#2E7D5B]/45 focus-within:ring-2 focus-within:ring-[#2E7D5B]/10">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter" && !event.shiftKey) {
            event.preventDefault();
            submit();
          }
        }}
        rows={1}
        placeholder={
          sourceCount
            ? "Pose une question sur tes sources…"
            : "Ajoute une source pour commencer…"
        }
        className="max-h-[140px] w-full resize-none border-0 bg-transparent px-2.5 py-1.5 text-[13.5px] leading-relaxed text-[#16241D] outline-none placeholder:text-[#9AA096]"
      />
      <div className="flex items-center justify-between px-1 pb-0.5">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onOpenSources}
            aria-label="Ajouter une source"
            className="flex h-7 w-7 items-center justify-center rounded-md text-[#8A968E] transition-colors hover:bg-[#F1EFE6] hover:text-[#16241D]"
          >
            <Paperclip className="h-3.5 w-3.5" />
          </button>
          <span className="text-[10.5px] text-[#B3B7AE]">
            {sourceCount
              ? `${selectedCount || sourceCount} source${(selectedCount || sourceCount) > 1 ? "s" : ""} sélectionnée${(selectedCount || sourceCount) > 1 ? "s" : ""}`
              : "Aucune source"}
          </span>
        </div>
        <button
          type="button"
          onClick={submit}
          disabled={!value.trim() || asking}
          aria-label="Envoyer la question"
          className="flex h-7 w-7 items-center justify-center rounded-full bg-[#16241D] text-[#FBFAF6] transition-all hover:bg-[#24382D] disabled:cursor-not-allowed disabled:bg-[#E2DFD3] disabled:text-[#9AA096]"
        >
          <ArrowUp className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}