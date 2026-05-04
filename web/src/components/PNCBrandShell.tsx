import Image from "next/image";
import type { ReactNode } from "react";

type Props = {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  className?: string;
};

/**
 * Branding assets (place these files in `web/public/`):
 * - pnc-logo.png (required)
 * - pnc-bg.jpg (optional)
 */
const BRAND = {
  logo: "/pnc-logo.png",
  background: "/pnc-bg.jpg",
} as const;

export default function PNCBrandShell({
  children,
  title = "PNC Thesis Tracker",
  subtitle = "Research Document Management System",
  className,
}: Props) {
  return (
    <div
      className={[
        "relative min-h-screen",
        "bg-gradient-to-br from-emerald-50 via-white to-emerald-100",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center bg-no-repeat opacity-25"
        style={{ backgroundImage: `url(${BRAND.background})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-b from-white/70 via-white/70 to-white/85" aria-hidden="true" />

      <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex flex-col items-center gap-4">
          <div className="text-center">
            <div className="mx-auto inline-flex items-center gap-3 rounded-3xl border border-emerald-100 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
              <div className="relative h-12 w-12 overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-emerald-100">
                <Image src={BRAND.logo} alt="PNC logo" fill priority className="object-contain p-1.5" />
              </div>
              <div className="text-left leading-tight">
                <div className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-800">{title}</div>
                <div className="text-xs text-slate-600">{subtitle}</div>
              </div>
            </div>
          </div>
        </header>

        <div className="flex flex-1 items-center justify-center py-10">{children}</div>

        <footer className="pb-4 text-center text-xs text-slate-500">Built for a cleaner thesis workflow.</footer>
      </div>
    </div>
  );
}

