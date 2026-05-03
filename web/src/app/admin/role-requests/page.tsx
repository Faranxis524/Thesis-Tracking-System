"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { LogoutButton } from "@/components/LogoutButton";
import { ensureProfile, type Profile } from "@/lib/profile";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type RequestedProfile = Pick<
  Profile,
  "id" | "email" | "full_name" | "role" | "role_requested" | "created_at"
>;

export default function RoleRequestsPage() {
  const [me, setMe] = useState<Profile | null>(null);
  const [requests, setRequests] = useState<RequestedProfile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const myProfile = await ensureProfile(supabase, user);
        if (cancelled) return;
        setMe(myProfile);

        if (myProfile.role !== "admin") return;

        const { data, error } = await supabase
          .from("profiles")
          .select("id,email,full_name,role,role_requested,created_at")
          .eq("role_requested", true)
          .order("created_at", { ascending: true });

        if (error) throw error;
        if (!cancelled) setRequests((data ?? []) as RequestedProfile[]);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function approve(userId: string) {
    setBusyIds((m) => ({ ...m, [userId]: true }));
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase
        .from("profiles")
        .update({ role: "coordinator", role_requested: false })
        .eq("id", userId);
      if (error) throw error;
      setRequests((prev) => prev.filter((r) => r.id !== userId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Approve failed");
    } finally {
      setBusyIds((m) => ({ ...m, [userId]: false }));
    }
  }

  return (
    <AuthGate>
      {({ user }) => (
        <div className="flex flex-1 flex-col">
          <header className="border-b border-emerald-100 bg-white/70 px-6 py-5 backdrop-blur">
            <div className="mx-auto flex w-full max-w-4xl items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-900">Role Requests</div>
                <div className="text-xs text-emerald-800/70">{user.email}</div>
              </div>
              <LogoutButton />
            </div>
          </header>

          <main className="mx-auto w-full max-w-4xl p-6">
            {error ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {me && me.role !== "admin" ? (
              <div className="glass-panel rounded-3xl p-6">
                <p className="text-sm text-emerald-800">Admin access required.</p>
                <div className="mt-4">
                  <Link
                    href="/"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    Back to dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-3xl p-6">
                <div className="section-title">Pending approvals</div>
                <p className="mt-2 text-sm text-emerald-800">
                  Approve users who requested coordinator access.
                </p>

                <div className="mt-6 space-y-3">
                  {requests.length === 0 ? (
                    <div className="text-sm text-emerald-700">No pending requests.</div>
                  ) : (
                    requests.map((r) => (
                      <div
                        key={r.id}
                        className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-white/80 p-4"
                      >
                        <div>
                          <div className="text-sm font-medium text-zinc-900">
                            {r.full_name ?? r.email ?? r.id}
                          </div>
                          <div className="text-xs text-zinc-500">{r.email}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => approve(r.id)}
                          disabled={!!busyIds[r.id]}
                          className="rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                        >
                          {busyIds[r.id] ? "Approving…" : "Approve"}
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <div className="mt-6">
                  <Link
                    href="/"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    Back to dashboard
                  </Link>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </AuthGate>
  );
}
