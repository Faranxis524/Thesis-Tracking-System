"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type LeaderAuthGateProps = {
  children: (params: { user: User }) => React.ReactNode;
};

export function LeaderAuthGate({ children }: LeaderAuthGateProps) {
  const router = useRouter();
  const pathname = usePathname();
  const supabaseRef = useRef<ReturnType<typeof getSupabaseBrowserClient> | null>(
    null,
  );

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const supabase = getSupabaseBrowserClient();
    supabaseRef.current = supabase;

    async function load() {
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser();
        if (cancelled) return;
        if (error) throw error;
        if (!user) {
          router.replace(`/leader/login?next=${encodeURIComponent(pathname ?? "/")}`);
          return;
        }
        setUser(user);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unknown auth error");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void load();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      if (!session?.user) {
        setUser(null);
        router.replace(`/leader/login?next=${encodeURIComponent(pathname ?? "/")}`);
        return;
      }
      setUser(session.user);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [pathname, router]);

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-zinc-600">
        Loading...
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md rounded-lg border border-zinc-200 bg-white p-4 text-sm text-zinc-700">
          {error}
        </div>
      </div>
    );
  }

  if (!user) return null;
  return <>{children({ user })}</>;
}
