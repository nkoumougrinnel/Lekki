import React, { useEffect, useMemo, useRef } from "react";
import { BookOpen, FilePlus2, PenLine, Sparkles } from "lucide-react";
import type { DriveFile, WikiPage } from "@/types/lekki";
import { classifyFile, prettyName } from "@/lib/studentDocs";
import { StudentDocBadge } from "./StudentDocBadge";
import { DocumentTypeIcon } from "./DocumentTypeIcon";

interface SpaceNewsProps {
  spaceId: string;
  userId?: string;
  files: DriveFile[];
  wikiPages: WikiPage[];
  onOpenFile: (file: DriveFile) => void;
  onOpenWiki: (page: WikiPage) => void;
}

type NewsItem =
  | { kind: "file"; at: number; who: string; mine: boolean; file: DriveFile }
  | { kind: "wiki"; at: number; who: string; mine: boolean; created: boolean; page: WikiPage };

const WINDOW_DAYS = 21;
const MAX_ITEMS = 6;

function lastSeenKey(spaceId: string, userId?: string) {
  return `lekki_last_seen_${userId ?? "anon"}_${spaceId}`;
}

function readLastSeen(key: string): number {
  try {
    return Number(localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

export function relativeTime(at: number, now = Date.now()): string {
  const minutes = Math.round((now - at) / 60000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return "hier";
  if (days < 7) return `il y a ${days} jours`;
  return new Date(at).toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

/**
 * « Quoi de neuf dans l'espace ? » : documents ajoutés, fiches créées ou modifiées par les
 * camarades. Ce qui est arrivé depuis la dernière visite est marqué « Nouveau ».
 */
export function SpaceNews({ spaceId, userId, files, wikiPages, onOpenFile, onOpenWiki }: SpaceNewsProps) {
  const key = lastSeenKey(spaceId, userId);
  // Valeur lue une seule fois par espace : la visite en cours ne doit pas effacer les marques.
  const previousVisit = useRef<{ key: string; at: number } | null>(null);
  if (previousVisit.current?.key !== key) previousVisit.current = { key, at: readLastSeen(key) };
  const seenAt = previousVisit.current.at;

  useEffect(() => {
    try {
      localStorage.setItem(key, String(Date.now()));
    } catch {
      // stockage indisponible : pas de marque « Nouveau », rien de grave
    }
  }, [key]);

  const items = useMemo(() => {
    const since = Date.now() - WINDOW_DAYS * 86400000;
    const list: NewsItem[] = [];
    for (const file of files) {
      if (file.is_deleted || file.workspace_id !== spaceId) continue;
      const at = new Date(file.created_at).getTime();
      if (at < since) continue;
      list.push({ kind: "file", at, who: file.owner_name || "Un membre", mine: file.owner_id === userId, file });
    }
    for (const page of wikiPages) {
      if (page.workspace_id !== spaceId) continue;
      const at = new Date(page.updated_at).getTime();
      if (at < since) continue;
      const created = Math.abs(at - new Date(page.created_at).getTime()) < 60000;
      const editorId = created ? page.creator_id : page.last_editor_id;
      const who = (created ? page.creator_name || page.author_name : page.last_editor_name) || "Un membre";
      list.push({ kind: "wiki", at, who, mine: editorId === userId, created, page });
    }
    return list.sort((a, b) => b.at - a.at);
  }, [files, wikiPages, spaceId, userId]);

  if (!items.length) return null;
  const fresh = seenAt ? items.filter((item) => item.at > seenAt && !item.mine).length : 0;

  return (
    <section className="space-y-3" aria-labelledby="space-news-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="space-news-title" className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          <Sparkles className="h-4 w-4 text-emerald-400" /> Nouveautés
        </h2>
        {fresh > 0 && (
          <span className="rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-medium text-emerald-300">
            {fresh} depuis ta dernière visite
          </span>
        )}
      </div>
      <ul className="divide-y divide-zinc-800/70 overflow-hidden rounded-xl border border-zinc-800 bg-[#12151B]">
        {items.slice(0, MAX_ITEMS).map((item) => {
          const isNew = Boolean(seenAt) && item.at > seenAt && !item.mine;
          // Prénom seulement : c'est une promo, on se connaît.
          const who = item.who === "Un membre" ? item.who : item.who.split(" ")[0];
          if (item.kind === "file") {
            const info = classifyFile(item.file);
            return (
              <li key={`f-${item.file.id}`}>
                <button onClick={() => onOpenFile(item.file)} className="flex min-h-14 w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-white/[0.02] active:bg-white/[0.04]">
                  <span className="relative shrink-0 rounded-lg bg-zinc-800 p-1.5 ring-1 ring-zinc-700/60">
                    <DocumentTypeIcon extension={item.file.extension} className="h-5 w-4" />
                    <FilePlus2 className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#12151B] text-emerald-400" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-zinc-200 sm:text-xs">{prettyName(item.file.name)}</span>
                    <span className="mt-1 flex items-center gap-1.5 text-[11px] text-zinc-500">
                      <StudentDocBadge info={info} compact />
                      <span className="truncate">{item.mine ? "Tu l’as ajouté" : `${who} l’a ajouté`} · {relativeTime(item.at)}</span>
                    </span>
                  </span>
                  {isNew && <NewDot />}
                </button>
              </li>
            );
          }
          return (
            <li key={`w-${item.page.id}`}>
              <button onClick={() => onOpenWiki(item.page)} className="flex min-h-14 w-full items-center gap-3 px-3.5 py-3 text-left transition hover:bg-white/[0.02] active:bg-white/[0.04]">
                <span className="relative shrink-0 rounded-lg bg-sky-500/10 p-1.5 text-sky-400 ring-1 ring-sky-400/15">
                  <BookOpen className="h-5 w-4" />
                  {!item.created && <PenLine className="absolute -bottom-1 -right-1 h-3.5 w-3.5 rounded-full bg-[#12151B] text-sky-300" />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-zinc-200 sm:text-xs">{item.page.title}</span>
                  <span className="mt-1 block truncate text-[11px] text-zinc-500">
                    Fiche {item.created ? "écrite" : "modifiée"} par {item.mine ? "toi" : who} · {relativeTime(item.at)}
                  </span>
                </span>
                {isNew && <NewDot />}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function NewDot() {
  return (
    <span className="shrink-0 rounded-md bg-emerald-400 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-zinc-950">
      Nouveau
    </span>
  );
}
