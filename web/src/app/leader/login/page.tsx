"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const LEADER_EMAIL_DOMAIN = "leader.pnc";

function usernameToEmail(username: string) {
  return `${username.toLowerCase()}@${LEADER_EMAIL_DOMAIN}`;
}

export default function LeaderLoginPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const nextPath = searchParams.get("next") ?? "/leader";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleLogin() {
    setError(null);
    if (!username.trim() || !password) {
      setError("Enter your username and password.");
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithPassword({
        email: usernameToEmail(username.trim()),
        password,
      });
      if (error) throw error;
      router.replace(nextPath);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-emerald-50 px-6">
      <div className="w-full max-w-md rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl">
        <h1 className="text-xl font-semibold text-emerald-900">Leader Login</h1>
        <p className="mt-2 text-sm text-emerald-700">
          Sign in using the username and password you registered.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 space-y-3">
          <input
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            placeholder="Username"
            className="w-full rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            className="w-full rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
          />
        </div>

        <button
          type="button"
          onClick={handleLogin}
          disabled={busy}
          className="mt-6 w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Signing in..." : "Sign in"}
        </button>

        <div className="mt-4 text-center text-xs text-emerald-700">
          Need an account?{" "}
          <a href="/leader/register" className="font-semibold text-emerald-800">
            Register as leader
          </a>
        </div>
      </div>
    </div>
  );
}
