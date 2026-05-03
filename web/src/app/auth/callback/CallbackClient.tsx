"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export function CallbackClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function finish() {
      try {
        const code = searchParams.get("code");
        const nextPath = searchParams.get("next") ?? "/";

        const supabase = getSupabaseBrowserClient();

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) throw error;
        } else {
          const hash = window.location.hash.replace(/^#/, "");
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");
          const refreshToken = params.get("refresh_token");

          if (accessToken && refreshToken) {
            const { error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (error) throw error;
          }

          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }

        if (!cancelled) router.replace(nextPath);
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : "Auth callback failed");
        }
      }
    }

    void finish();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-700">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 p-6">
      <div className="text-sm text-zinc-600">Finishing sign in…</div>
    </div>
  );
}
