import { Link } from "@tanstack/react-router";
import { LekkiMark } from "@/components/brand/LekkiLogo";

// Full-screen card shared by the auth pages; it sets its own color tokens so it stays readable under any theme.
export function AuthLayout({ title, subtitle, footer, children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#FBFAF6] px-4 py-10">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 -top-24 h-[24rem] w-[24rem] rounded-full bg-[#D8EAD9] opacity-60 blur-3xl" />
        <div className="absolute -right-20 top-1/3 h-[20rem] w-[20rem] rounded-full bg-[#F6E7C8] opacity-50 blur-3xl" />
      </div>

      <div className="relative w-full max-w-[26rem]">
        <div className="mb-7 text-center">
          <Link to="/" className="inline-flex transition-opacity hover:opacity-80">
            <LekkiMark size={44} />
          </Link>
          <h1 className="mt-4 font-heading text-[1.7rem] font-semibold leading-tight tracking-[-0.03em] text-[#16241D]">
            {title}
          </h1>
          {subtitle && (
            <p className="mx-auto mt-2 max-w-[22rem] text-[13.5px] leading-relaxed text-[#5C6B62]">
              {subtitle}
            </p>
          )}
        </div>

        <div className="rounded-2xl border border-[#E7E4D9] bg-white p-6 shadow-[0_1px_2px_rgba(22,36,29,0.04),0_24px_50px_-38px_rgba(22,36,29,0.4)] sm:p-7">
          {children}
        </div>

        {footer && <div className="mt-5 text-center text-[13px] text-[#5C6B62]">{footer}</div>}

        <p className="mt-6 text-center text-[11px] text-[#8A968E]">
          © {new Date().getFullYear()} Lekki · Né à SUP’PTIC, Yaoundé.
        </p>
      </div>
    </div>
  );
}