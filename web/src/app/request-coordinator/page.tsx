"use client";

import { useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { LogoutButton } from "@/components/LogoutButton";
import { ensureProfile } from "@/lib/profile";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

export default function RequestCoordinatorPage() {
  const [status, setStatus] = useState<"idle" | "saving" | "done" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  async function onRequest() {
    setStatus("saving");
    setMessage(null);
    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      await ensureProfile(supabase, user);

      const { error } = await supabase
        .from("profiles")
        .update({ role_requested: true })
        .eq("id", user.id);

      if (error) throw error;
      setStatus("done");
      setMessage("Request submitted. An admin will review it.");
    } catch (e) {
      setStatus("error");
      setMessage(e instanceof Error ? e.message : "Failed to submit request");
    }
  }

  return (
    <AuthGate>
      {({ user }) => (
        <div className="flex flex-1 flex-col bg-zinc-50">
          <header className="flex items-center justify-between border-b border-zinc-200 bg-white px-6 py-4">
            <div>
              <div className="text-sm font-medium text-zinc-900">
                Request Coordinator Access
              </div>
              <div className="text-xs text-zinc-500">{user.email}</div>
            </div>
            <LogoutButton />
          </header>

          <main className="mx-auto w-full max-w-2xl p-6">
            <div className="rounded-lg border border-zinc-200 bg-white p-6">
              <p className="text-sm text-zinc-700">
                Coordinators can approve submissions, schedule defenses, and track
                revision compliance.
              </p>

              {message ? (
                <div className="mt-4 rounded-md border border-zinc-200 bg-zinc-50 p-3 text-sm text-zinc-700">
                  {message}
                </div>
              ) : null}

              <div className="mt-6 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onRequest}
                  disabled={status === "saving" || status === "done"}
                  className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800 disabled:opacity-60"
                >
                  {status === "saving" ? "Submitting…" : "Request access"}
                </button>
                <Link
                  href="/"
                  className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                >
                  Back to dashboard
                </Link>
              </div>
            </div>
          </main>
        </div>
      )}
    </AuthGate>
  );
}
