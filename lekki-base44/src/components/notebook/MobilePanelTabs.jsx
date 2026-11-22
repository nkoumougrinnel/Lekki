import { FileText, MessageSquareText, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { value: "sources", label: "Sources", icon: FileText },
  { value: "chat", label: "Conversation", icon: MessageSquareText },
  { value: "studio", label: "Studio", icon: Sparkles },
];

export function MobilePanelTabs({ value, onChange, sourceCount }) {
  return (
    <div className="flex shrink-0 gap-1 border-b border-[#E7E4D9] bg-[#FBFAF6] px-3 py-2 md:hidden">
      {tabs.map(({ value: tab, label, icon: Icon }) => (
        <button
          key={tab}
          type="button"
          onClick={() => onChange(tab)}
          className={cn(
            "flex flex-1 items-center justify-center gap-1.5 rounded-full px-2 py-1.5 text-[12px] font-medium transition-colors",
            value === tab
              ? "bg-[#16241D] text-[#FBFAF6]"
              : "text-[#5C6B62] hover:bg-[#16241D]/[0.06]",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {label}
          {tab === "sources" && sourceCount > 0 && (
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px]",
                value === tab ? "bg-white/20" : "bg-[#E7E4D9] text-[#5C6B62]",
              )}
            >
              {sourceCount}
            </span>
          )}
        </button>
      ))}
    </div>
  );
}