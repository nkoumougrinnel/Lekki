import React, { useCallback, useLayoutEffect, useRef } from "react";
import {
  Bold, Code, Heading2, Italic, Link, List, ListOrdered, Quote, Sigma, Table,
} from "lucide-react";

interface MarkdownEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  /** Ctrl/⌘ + S */
  onSave?: () => void;
  className?: string;
}

type Edit = { text: string; selectionStart: number; selectionEnd: number };

/** Entoure la sélection (ou un texte d'exemple sélectionné) : **gras**, _italique_, `code`, $formule$. */
function wrap(value: string, start: number, end: number, before: string, after: string, sample: string): Edit {
  const selected = value.slice(start, end);
  if (selected && value.slice(start - before.length, start) === before && value.slice(end, end + after.length) === after) {
    // Déjà mis en forme : on retire.
    const text = value.slice(0, start - before.length) + selected + value.slice(end + after.length);
    return { text, selectionStart: start - before.length, selectionEnd: end - before.length };
  }
  const inner = selected || sample;
  const text = value.slice(0, start) + before + inner + after + value.slice(end);
  return { text, selectionStart: start + before.length, selectionEnd: start + before.length + inner.length };
}

/** Préfixe chaque ligne touchée par la sélection (titre, liste, citation) ; un second appui l'enlève. */
function prefixLines(value: string, start: number, end: number, prefix: (index: number) => string, pattern: RegExp): Edit {
  const lineStart = value.lastIndexOf("\n", start - 1) + 1;
  const lineEnd = value.indexOf("\n", end) === -1 ? value.length : value.indexOf("\n", end);
  const lines = value.slice(lineStart, lineEnd).split("\n");
  const allPrefixed = lines.every((line) => pattern.test(line));
  const next = lines.map((line, index) =>
    allPrefixed ? line.replace(pattern, "") : prefix(index) + line.replace(/^(#{1,6}\s|[-*]\s|\d+\.\s|>\s)/, "")
  );
  const block = next.join("\n");
  const text = value.slice(0, lineStart) + block + value.slice(lineEnd);
  return { text, selectionStart: lineStart + (lines.length === 1 ? block.length : 0), selectionEnd: lineStart + block.length };
}

/** Insère un bloc sur ses propres lignes et sélectionne la partie à remplacer. */
function insertBlock(value: string, start: number, end: number, block: string, selectFrom: number, selectTo: number): Edit {
  const before = value.slice(0, start);
  const lead = before === "" || before.endsWith("\n\n") ? "" : before.endsWith("\n") ? "\n" : "\n\n";
  const after = value.slice(end);
  const trail = after.startsWith("\n") ? "" : "\n";
  const text = before + lead + block + trail + after;
  const base = start + lead.length;
  return { text, selectionStart: base + selectFrom, selectionEnd: base + selectTo };
}

const TABLE = "| Colonne | Colonne |\n| --- | --- |\n| … | … |";

export function MarkdownEditor({ value, onChange, placeholder, onSave, className = "" }: MarkdownEditorProps) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const pending = useRef<{ start: number; end: number } | null>(null);

  // La zone grandit avec le texte : un seul défilement (celui de la page), même sur téléphone.
  useLayoutEffect(() => {
    const area = ref.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight + 2}px`;
    if (pending.current) {
      area.focus();
      area.setSelectionRange(pending.current.start, pending.current.end);
      pending.current = null;
    }
  }, [value]);

  const apply = useCallback(
    (make: (value: string, start: number, end: number) => Edit) => {
      const area = ref.current;
      if (!area) return;
      const edit = make(area.value, area.selectionStart, area.selectionEnd);
      pending.current = { start: edit.selectionStart, end: edit.selectionEnd };
      onChange(edit.text);
    },
    [onChange]
  );

  const actions: { label: string; shortcut?: string; icon: React.ElementType; run: () => void }[] = [
    { label: "Titre de section", icon: Heading2, run: () => apply((v, s, e) => prefixLines(v, s, e, () => "## ", /^##\s/)) },
    { label: "Gras", shortcut: "Ctrl+B", icon: Bold, run: () => apply((v, s, e) => wrap(v, s, e, "**", "**", "texte important")) },
    { label: "Italique", shortcut: "Ctrl+I", icon: Italic, run: () => apply((v, s, e) => wrap(v, s, e, "_", "_", "texte")) },
    { label: "Liste à puces", icon: List, run: () => apply((v, s, e) => prefixLines(v, s, e, () => "- ", /^[-*]\s/)) },
    { label: "Liste numérotée", icon: ListOrdered, run: () => apply((v, s, e) => prefixLines(v, s, e, (i) => `${i + 1}. `, /^\d+\.\s/)) },
    {
      label: "Formule (LaTeX)",
      icon: Sigma,
      run: () =>
        apply((v, s, e) => {
          const lineStart = v.lastIndexOf("\n", s - 1) + 1;
          const lineIsEmpty = v.slice(lineStart, s).trim() === "" && (v[e] === undefined || v[e] === "\n");
          // Ligne vide : formule centrée sur sa ligne ; sinon formule dans la phrase.
          return lineIsEmpty
            ? insertBlock(v, s, e, "$$\nf_e \\ge 2B\n$$", 3, 13)
            : wrap(v, s, e, "$", "$", "f_e \\ge 2B");
        }),
    },
    { label: "Tableau", icon: Table, run: () => apply((v, s, e) => insertBlock(v, s, e, TABLE, 2, 9)) },
    {
      label: "Code",
      icon: Code,
      run: () =>
        apply((v, s, e) =>
          v.slice(s, e).includes("\n") || (s === e && (s === 0 || v[s - 1] === "\n"))
            ? insertBlock(v, s, e, "```\n" + (v.slice(s, e) || "code") + "\n```", 4, 4 + (v.slice(s, e) || "code").length)
            : wrap(v, s, e, "`", "`", "code")
        ),
    },
    {
      label: "Lien",
      shortcut: "Ctrl+K",
      icon: Link,
      run: () =>
        apply((v, s, e) => {
          const label = v.slice(s, e) || "texte du lien";
          const text = v.slice(0, s) + `[${label}](https://)` + v.slice(e);
          const urlStart = s + label.length + 3;
          return { text, selectionStart: urlStart, selectionEnd: urlStart + 8 };
        }),
    },
    { label: "À retenir (citation)", icon: Quote, run: () => apply((v, s, e) => prefixLines(v, s, e, () => "> ", /^>\s/)) },
  ];

  const onKeyDown = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const mod = event.ctrlKey || event.metaKey;
    if (mod && !event.shiftKey && !event.altKey) {
      const key = event.key.toLowerCase();
      const byKey: Record<string, number> = { b: 1, i: 2, k: 8 };
      if (key === "s" && onSave) {
        event.preventDefault();
        onSave();
        return;
      }
      if (key in byKey) {
        event.preventDefault();
        actions[byKey[key]].run();
        return;
      }
    }

    // Entrée dans une liste : la puce ou le numéro suivant arrive tout seul ; sur une puce vide, la liste s'arrête.
    if (event.key === "Enter" && !event.shiftKey && !mod) {
      const area = event.currentTarget;
      const { selectionStart: s, selectionEnd: e, value: v } = area;
      if (s !== e) return;
      const lineStart = v.lastIndexOf("\n", s - 1) + 1;
      const line = v.slice(lineStart, s);
      const match = /^(\s*)([-*]|\d+\.|>)\s(.*)$/.exec(line);
      if (!match) return;
      event.preventDefault();
      const [, indent, marker, rest] = match;
      if (!rest.trim()) {
        // Fin de liste : on retire la puce vide et on laisse une ligne blanche, sinon le
        // paragraphe (ou tableau) suivant serait collé au dernier élément.
        const text = v.slice(0, lineStart) + "\n" + v.slice(s);
        pending.current = { start: lineStart + 1, end: lineStart + 1 };
        onChange(text);
        return;
      }
      const nextMarker = /^\d+\.$/.test(marker) ? `${parseInt(marker, 10) + 1}.` : marker;
      const insert = `\n${indent}${nextMarker} `;
      pending.current = { start: s + insert.length, end: s + insert.length };
      onChange(v.slice(0, s) + insert + v.slice(e));
    }
  };

  return (
    <div className={`overflow-clip rounded-2xl border border-white/[0.07] bg-[#101319] focus-within:border-emerald-500/40 sm:rounded-xl ${className}`}>
      <div
        role="toolbar"
        aria-label="Mise en forme"
        className="sticky top-0 z-10 flex gap-0.5 overflow-x-auto border-b border-white/[0.06] bg-[#12161c]/95 px-1.5 py-1.5 backdrop-blur [scrollbar-width:none] sm:px-3"
      >
        {actions.map(({ label, shortcut, icon: Icon, run }, index) => (
          <React.Fragment key={label}>
            {(index === 3 || index === 5) && <span aria-hidden className="mx-1 my-2 w-px shrink-0 bg-white/[0.07]" />}
            <button
              type="button"
              aria-label={label}
              title={shortcut ? `${label} (${shortcut})` : label}
              // Garde le clavier du téléphone ouvert et la sélection en place.
              onPointerDown={(event) => event.preventDefault()}
              onClick={run}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-zinc-400 transition hover:bg-white/[0.06] hover:text-zinc-100 active:bg-emerald-500/15 active:text-emerald-300 sm:h-9 sm:w-9"
            >
              <Icon className="h-[17px] w-[17px]" />
            </button>
          </React.Fragment>
        ))}
      </div>
      <textarea
        ref={ref}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        spellCheck
        autoCapitalize="sentences"
        className="block min-h-[45dvh] w-full resize-none overflow-hidden bg-transparent p-4 font-mono text-[13px] leading-7 text-zinc-300 outline-none placeholder:text-zinc-700 sm:min-h-[55vh] sm:p-7"
      />
    </div>
  );
}
