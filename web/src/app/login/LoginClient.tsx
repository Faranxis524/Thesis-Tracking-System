"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function LoginClient() {
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next") ?? "/";
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onGoogleSignIn() {
    setError(null);
    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent(
        nextPath,
      )}`;

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo },
      });

      if (error) throw error;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign in");
      setBusy(false);
    }
  }

  return (
    <div
      className="relative flex min-h-screen items-center justify-center overflow-hidden"
      style={{
        backgroundImage: "url('/pnc-bg.jpg')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-emerald-950/60" />
      <div className="relative w-full max-w-5xl px-6 py-10">
        <div className="overflow-hidden rounded-[28px] border border-emerald-100/60 bg-white/90 shadow-2xl backdrop-blur">
          <div className="grid gap-0 md:grid-cols-[1.2fr_1fr]">
            <div
              className="relative hidden min-h-[460px] md:block"
              style={{
                backgroundImage: "linear-gradient(135deg, rgba(6, 95, 60, 0.65), rgba(16, 185, 129, 0.25)), url('/pnc-bg.jpg')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            >
              <div className="absolute inset-0 bg-emerald-950/25" />
              <div className="relative flex h-full flex-col justify-end p-8 text-white">
                <div className="text-xs font-semibold uppercase tracking-[0.28em] text-emerald-100">
                  Thesis Tracker
                </div>
                <h1 className="mt-4 text-3xl font-semibold leading-tight">
                  Stay aligned with
                  <span className="block text-emerald-100">every submission.</span>
                </h1>
                <p className="mt-4 text-sm text-emerald-100/90">
                  Track approvals, defense schedules, and required documents in one place.
                </p>
              </div>
            </div>

            <div className="p-8 md:p-10">
              <div className="flex flex-col items-center text-center">
                <img
                  src="/ucpnc-header.png"
                  alt="University of Cabuyao"
                  className="h-14 w-auto"
                />
                <div className="mt-4 text-2xl font-semibold text-emerald-900 font-serif">
                  Thesis/Capstone Document Tracking System
                </div>
                <div className="mt-3 text-[13px] font-semibold uppercase tracking-[0.3em] text-emerald-700">
                  Student Login
                </div>
              </div>

              {error ? (
                <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {error}
                </div>
              ) : null}

              <button
                type="button"
                onClick={onGoogleSignIn}
                disabled={busy}
                className="mt-6 w-full rounded-full bg-emerald-600 px-5 py-3.5 text-base font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
              >
                {busy ? "Redirecting..." : "Continue with Google"}
              </button>

              <div className="mt-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 text-sm text-emerald-800">
                Coordinators are manually approved by an admin.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
