import React from "react";
import { BookOpen, ChevronRight } from "lucide-react";

export interface WikiBreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface WikiBreadcrumbsProps {
  items: WikiBreadcrumbItem[];
  onRootClick: () => void;
}

export function WikiBreadcrumbs({ items, onRootClick }: WikiBreadcrumbsProps) {
  return (
    <nav aria-label="Fil d’Ariane du wiki" className="min-w-0 max-w-full overflow-x-auto">
      <ol className="flex min-h-8 w-max min-w-full items-center gap-1 whitespace-nowrap text-xs">
        <li className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={onRootClick}
            className="inline-flex h-8 items-center gap-2 rounded-lg px-2.5 font-semibold text-zinc-300 transition-colors hover:bg-zinc-800/80 hover:text-emerald-300"
          >
            <BookOpen className="h-3.5 w-3.5 text-emerald-400" />
            <span>Wiki</span>
          </button>
        </li>
        {items.map((item, index) => {
          const isCurrent = index === items.length - 1 && !item.onClick;
          return (
            <li key={`${item.label}-${index}`} className="flex min-w-0 shrink-0 items-center gap-1">
              <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-zinc-600" />
              {item.onClick ? (
                <button
                  type="button"
                  onClick={item.onClick}
                  className="inline-flex h-8 max-w-48 items-center truncate rounded-lg px-2.5 font-medium text-zinc-400 transition-colors hover:bg-zinc-800/80 hover:text-emerald-300"
                >
                  {item.label}
                </button>
              ) : (
                <span
                  aria-current={isCurrent ? "page" : undefined}
                  className={`inline-flex h-8 max-w-56 items-center truncate rounded-lg px-2.5 ${
                    isCurrent
                      ? "bg-emerald-500/10 font-semibold text-emerald-300"
                      : "font-medium text-zinc-300"
                  }`}
                >
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}