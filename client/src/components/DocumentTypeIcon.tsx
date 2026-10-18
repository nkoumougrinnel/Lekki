import React from "react";
import { FileText } from "lucide-react";
import { FileExtension } from "@/types/lekki";

interface DocumentTypeIconProps {
  extension: FileExtension | string;
  className?: string;
}

/** Distinct, scalable document marks used in previews and file lists. */
export function DocumentTypeIcon({ extension, className = "h-5 w-5" }: DocumentTypeIconProps) {
  const normalizedExtension = extension.toLowerCase().replace(/^\./, "");

  const fileTypeMarks: Record<string, { color: string; label: string; fontSize: number }> = {
    pdf: { color: "#E5484D", label: "PDF", fontSize: 9 },
    docx: { color: "#3B82F6", label: "W", fontSize: 17 },
    pptx: { color: "#F97316", label: "P", fontSize: 17 },
    md: { color: "#10B981", label: "MD", fontSize: 12 },
    txt: { color: "#64748B", label: "TXT", fontSize: 9 },
  };
  const mark = fileTypeMarks[normalizedExtension];

  if (mark) {
    const { color, label, fontSize } = mark;

    return (
      <svg
        aria-hidden="true"
        viewBox="0 0 48 56"
        fill="none"
        className={`${className} shrink-0`}
      >
        <path d="M8 2.5h21l11 11V51a2.5 2.5 0 0 1-2.5 2.5h-29A2.5 2.5 0 0 1 6 51V5a2.5 2.5 0 0 1 2-2.5Z" fill="#F4F7FB" />
        <path d="M29 2.5v9a2 2 0 0 0 2 2h9" fill={color} fillOpacity=".22" />
        <path d="M29 2.5v9a2 2 0 0 0 2 2h9" stroke={color} strokeOpacity=".5" strokeWidth="1.5" />
        <path d="M6 22h36v25H6z" fill={color} />
        <text x="24" y="40" textAnchor="middle" fill="white" fontFamily="Arial, sans-serif" fontSize={fontSize} fontWeight="700">{label}</text>
        <path d="M13 9h9M13 15h10" stroke={color} strokeOpacity=".45" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  return <FileText aria-hidden="true" className={`${className} shrink-0 text-zinc-400`} />;
}