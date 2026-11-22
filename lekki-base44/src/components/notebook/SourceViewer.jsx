import ReactMarkdown from "react-markdown";
import { BookOpen, FileText, ListChecks } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { KIND_META, formatBytes } from "@/lib/lekki";

export function SourceViewer({ source, open, onOpenChange }) {
  if (!source) return null;
  const meta = KIND_META[source.kind] || KIND_META.txt;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[86vh] max-w-2xl flex-col gap-0 overflow-hidden rounded-2xl border-[#E7E4D9] bg-white p-0">
        <DialogHeader className="shrink-0 border-b border-[#F1EFE6] px-5 py-4 text-left">
          <div className="flex items-start gap-3 pr-8">
            <span className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${meta.tone}`}>
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <DialogTitle className="truncate font-heading text-[15px] font-semibold text-[#16241D]">
                {source.name}
              </DialogTitle>
              <p className="mt-0.5 text-[11px] text-[#8A968E]">
                {meta.label}
                {source.page_count ? ` · ${source.page_count} pages` : ""}
                {source.size_bytes ? ` · ${formatBytes(source.size_bytes)}` : ""}
              </p>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {source.summary && (
            <div className="rounded-xl bg-[#FBFAF6] p-4">
              <p className="eyebrow text-[9px] text-[#8A968E]">Résumé</p>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#3C4A41]">{source.summary}</p>
            </div>
          )}

          {source.key_points?.length > 0 && (
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A968E]">
                <ListChecks className="h-3 w-3" /> Points clés
              </p>
              <ul className="mt-2 space-y-1.5">
                {source.key_points.map((point) => (
                  <li key={point} className="flex gap-2 text-[12.5px] leading-relaxed text-[#3C4A41]">
                    <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-[#2E7D5B]" />
                    {point}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {source.chapters?.length > 0 && (
            <div className="mt-4">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#8A968E]">
                <BookOpen className="h-3 w-3" /> Chapitres
              </p>
              <ul className="mt-2 divide-y divide-[#F1EFE6] overflow-hidden rounded-xl border border-[#E7E4D9]">
                {source.chapters.map((chapter, index) => (
                  <li
                    key={`${chapter.title}-${index}`}
                    className="flex items-center justify-between gap-3 px-3 py-2 text-[12px]"
                  >
                    <span className="truncate text-[#3C4A41]">{chapter.title}</span>
                    {chapter.page ? (
                      <span className="shrink-0 text-[10.5px] text-[#8A968E]">p. {chapter.page}</span>
                    ) : null}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {source.content && (
            <div className="lekki-prose mt-5 border-t border-[#F1EFE6] pt-4">
              <ReactMarkdown>{source.content}</ReactMarkdown>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}