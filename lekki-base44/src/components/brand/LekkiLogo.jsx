import { cn } from "@/lib/utils";

// Le logo Lekki : carré menthe, cœur encre, « L » menthe et point laiton.
export function LekkiMark({ size = 34, className }) {
  return (
    <svg
      viewBox="0 0 120 120"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      <rect width="120" height="120" rx="26" fill="#7FCFA5" />
      <rect x="16" y="16" width="88" height="88" rx="18" fill="#0F1714" />
      <path d="M38 34h13v38h23v13H38z" fill="#7FCFA5" />
      <circle cx="86" cy="34" r="7" fill="#D6A457" />
    </svg>
  );
}

export default function LekkiLogo({ size = 34, className, wordmarkClassName }) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <LekkiMark size={size} />
      <span
        className={cn(
          "font-heading text-[1.15rem] font-semibold tracking-[-0.02em] text-[#0F1714]",
          wordmarkClassName,
        )}
      >
        Lekki
      </span>
    </span>
  );
}