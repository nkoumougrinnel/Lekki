export const KIND_META = {
  pdf: { label: "PDF", tone: "bg-[#FBEAE7] text-[#B4482F]" },
  docx: { label: "DOC", tone: "bg-[#E8EEF8] text-[#3D63A8]" },
  pptx: { label: "PPT", tone: "bg-[#FBF3E1] text-[#A5771F]" },
  txt: { label: "TXT", tone: "bg-[#F1EFE6] text-[#5C6B62]" },
  md: { label: "MD", tone: "bg-[#EAF2E7] text-[#2E7D5B]" },
  note: { label: "NOTE", tone: "bg-[#EAF2E7] text-[#2E7D5B]" },
};

export const ACCENTS = {
  sage: { dot: "bg-[#2E7D5B]", soft: "bg-[#EAF2E7]", ink: "text-[#2E7D5B]" },
  amber: { dot: "bg-[#C99A3F]", soft: "bg-[#FBF3E1]", ink: "text-[#8A6B2E]" },
  clay: { dot: "bg-[#B4644B]", soft: "bg-[#F8E9E3]", ink: "text-[#9C4F37]" },
  sky: { dot: "bg-[#4A7C8C]", soft: "bg-[#E6F0F3]", ink: "text-[#3A6572]" },
};

export const ESPACE_EMOJIS = ["📚", "🧪", "📐", "🌍", "💡", "🎓", "🧠", "⚙️"];

export function accentOf(value) {
  return ACCENTS[value] || ACCENTS.sage;
}

export function kindFromName(name = "") {
  const extension = String(name).split(".").pop()?.toLowerCase();
  if (["pdf", "docx", "pptx", "txt", "md"].includes(extension)) return extension;
  if (extension === "doc") return "docx";
  if (extension === "ppt") return "pptx";
  return "txt";
}

export function formatBytes(bytes) {
  const value = Number(bytes) || 0;
  if (value < 1024) return `${value} o`;
  if (value < 1024 * 1024) return `${Math.round(value / 1024)} Ko`;
  return `${(value / (1024 * 1024)).toFixed(1)} Mo`;
}

export function formatRelative(dateString) {
  if (!dateString) return "Nouveau";
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "Nouveau";
  const diff = Date.now() - date.getTime();
  const minutes = Math.round(diff / 60000);
  if (minutes < 1) return "à l’instant";
  if (minutes < 60) return `il y a ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `il y a ${hours} h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `il y a ${days} j`;
  return date.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
}

export function initialsOf(name = "", email = "") {
  const base = name.trim() || email.split("@")[0] || "L";
  return base
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

export function firstNameOf(name = "", email = "") {
  const base = name.trim() || email.split("@")[0] || "";
  return base.split(/\s+/)[0] || "";
}