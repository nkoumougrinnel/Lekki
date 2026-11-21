import React from "react";
import { Link } from "wouter";

export function LekkiMark({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const box = size === "lg" ? "h-12 w-12" : size === "sm" ? "h-7 w-7" : "h-9 w-9";
  return <img src="/logo.svg" alt="Lekki" className={`${box} rounded-[10px]`} />;
}

const ink = "#16241D";

export function AuthLayout({
  children,
  title,
  subtitle,
}: {
  children: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="min-h-screen overflow-y-auto bg-[#FBFAF6] text-[#16241D] antialiased">
      <div className="relative flex min-h-screen flex-col">
        {/* Halos pastel, comme sur la page d'accueil */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-32 -top-24 h-[26rem] w-[26rem] rounded-full bg-[#D8EAD9] opacity-60 blur-3xl" />
          <div className="absolute -right-24 top-1/3 h-[22rem] w-[22rem] rounded-full bg-[#F6E7C8] opacity-50 blur-3xl" />
        </div>

        <header className="relative z-10 flex items-center justify-between px-6 py-6 sm:px-10">
          <Link href="/" className="flex items-center gap-2.5">
            <LekkiMark />
            <span className="font-display text-lg font-semibold tracking-tight" style={{ color: ink }}>
              Lekki
            </span>
          </Link>
          <Link
            href="/"
            className="text-sm text-[#5C6B62] transition-colors hover:text-[#16241D]"
          >
            Accueil
          </Link>
        </header>

        <main className="relative z-10 flex flex-1 items-center justify-center px-6 pb-16 pt-4">
          <div className="w-full max-w-[26rem]">
            <div className="mb-7 text-center">
              <h1 className="font-display text-[1.75rem] leading-tight tracking-tight" style={{ color: ink }}>
                {title}
              </h1>
              <p className="mx-auto mt-2 max-w-[22rem] text-sm leading-relaxed text-[#5C6B62]">
                {subtitle}
              </p>
            </div>

            <div className="rounded-2xl border border-[#E7E4D9] bg-white p-6 shadow-[0_1px_2px_rgba(22,36,29,0.04),0_18px_40px_-28px_rgba(22,36,29,0.35)] sm:p-7">
              {children}
            </div>

            <p className="mt-6 text-center text-xs text-[#8A968E]">
              © {new Date().getFullYear()} Lekki · Né à SUP’PTIC, Yaoundé.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}

export function AuthField({
  id,
  label,
  type = "text",
  value,
  onChange,
  autoComplete,
  placeholder,
  required = true,
  trailing,
}: {
  id: string;
  label: string;
  type?: string;
  value: string;
  onChange: (value: string) => void;
  autoComplete?: string;
  placeholder?: string;
  required?: boolean;
  trailing?: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[13px] font-medium text-[#3C4A41]">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoComplete={autoComplete}
          placeholder={placeholder}
          required={required}
          className="w-full rounded-xl border border-[#E2DFD3] bg-[#FCFBF7] px-3.5 py-2.5 pr-10 text-sm text-[#16241D] placeholder:text-[#A3ADA6] outline-none transition-colors focus:border-[#2E7D5B] focus:bg-white focus:ring-2 focus:ring-[#2E7D5B]/15"
        />
        {trailing}
      </div>
    </div>
  );
}

export function AuthSubmit({
  children,
  disabled,
}: {
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="submit"
      disabled={disabled}
      className="w-full rounded-xl py-2.5 text-sm font-semibold text-[#FBFAF6] transition-colors hover:bg-[#24382D] disabled:cursor-not-allowed disabled:opacity-60"
      style={{ backgroundColor: ink }}
    >
      {children}
    </button>
  );
}
