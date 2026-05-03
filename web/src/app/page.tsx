"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AuthGate } from "@/components/AuthGate";
import { LogoutButton } from "@/components/LogoutButton";
import { ProgressBar } from "@/components/ProgressBar";
import { ensureProfile, type Profile } from "@/lib/profile";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Requirement = {
  id: number;
  owner: "student" | "teacher";
  name?: string;
  code?: string | null;
  is_optional?: boolean;
};

type RequirementOverride = {
  requirement_id: number;
  is_required: boolean;
};

type Submission = {
  requirement_id: number;
  status: "missing" | "submitted" | "approved" | "needs_revision" | "resubmitted";
};

export default function HomePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [groupLabel, setGroupLabel] = useState<string | null>(null);
  const [nextItems, setNextItems] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;
        const p = await ensureProfile(supabase, user);
        if (!cancelled) setProfile(p);
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadProgress() {
      if (!profile || profile.role !== "student") {
        setProgress(null);
        return;
      }

      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: membership, error: membershipError } = await supabase
          .from("group_members")
          .select("groups(id,title,section_id,sections(name,program))")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membershipError) throw membershipError;
        const group = membership?.groups as { id: number; title: string | null; sections?: { name: string; program: string } | null } | null;
        if (!group) {
          if (!cancelled) {
            setProgress(0);
            setGroupLabel(null);
          }
          return;
        }

        const [
          { data: reqData, error: reqError },
          { data: subData, error: subError },
          { data: overrideData, error: overrideError },
        ] =
          await Promise.all([
            supabase.from("requirements").select("id,owner,name,code,is_optional"),
            supabase
              .from("submissions")
              .select("requirement_id,status")
              .eq("group_id", group.id),
            supabase
              .from("requirement_overrides")
              .select("requirement_id,is_required")
              .eq("group_id", group.id),
          ]);

        if (reqError) throw reqError;
        if (subError) throw subError;
        if (overrideError) throw overrideError;

        const requirements = (reqData ?? []) as Requirement[];
        const overrides = (overrideData ?? []) as RequirementOverride[];
        const requiredOverrideSet = new Set(
          overrides.filter((o) => o.is_required).map((o) => o.requirement_id),
        );
        const studentRequirements = requirements.filter((r) => r.owner === "student");
        const requiredStudentRequirements = studentRequirements.filter((r) => {
          if (!r.is_optional) return true;
          return requiredOverrideSet.has(r.id);
        });
        const submissions = (subData ?? []) as Submission[];
        const completedIds = new Set(
          submissions
            .filter((s) => s.status !== "missing")
            .map((s) => s.requirement_id),
        );
        const total = requiredStudentRequirements.length;
        const done = requiredStudentRequirements.filter((r) => completedIds.has(r.id)).length;
        const percentage = total === 0 ? 0 : Math.round((done / total) * 100);

        const pendingItems = requiredStudentRequirements
          .filter((r) => !completedIds.has(r.id))
          .slice(0, 3)
          .map((r) => (r.code ? `${r.code} — ${r.name}` : r.name ?? "Requirement"));

        if (!cancelled) {
          setProgress(percentage);
          setGroupLabel(
            group.title ??
              group.sections?.name ??
              (group.sections?.program ? `${group.sections.program} Group` : null) ??
              `Group ${group.id}`,
          );
          setNextItems(pendingItems);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      }
    }

    void loadProgress();
    return () => {
      cancelled = true;
    };
  }, [profile]);

  return (
    <AuthGate>
      {({ user }) => (
        <div className="flex flex-1 flex-col">
          <header className="border-b border-emerald-100 bg-white/70 px-6 py-5 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-900">
                  PNC Thesis Tracker
                </div>
                <div className="text-xs text-emerald-800/70">{user.email}</div>
              </div>
              <LogoutButton />
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl p-6">
            {error ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}
            <div className="glass-panel rounded-3xl p-8">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-2">
                  <div className="text-2xl font-semibold text-emerald-950">
                    Welcome back
                  </div>
                  <div className="text-sm text-emerald-900/70">
                    Role: <span className="font-semibold">{profile?.role ?? "Loading"}</span>
                    {profile?.role === "student" && profile.role_requested ? (
                      <span className="text-emerald-700"> • Request pending</span>
                    ) : null}
                  </div>
                  {groupLabel ? (
                    <div className="text-xs text-emerald-700">Group: {groupLabel}</div>
                  ) : null}
                </div>

                {profile?.role === "student" ? (
                  <div className="w-full max-w-xs space-y-4 rounded-2xl bg-emerald-50/70 p-4">
                    <ProgressBar value={progress ?? 0} label="Checklist progress" />
                    <div>
                      <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        What's next
                      </div>
                      {nextItems.length === 0 ? (
                        <div className="mt-2 text-xs text-emerald-700">
                          You're all caught up.
                        </div>
                      ) : (
                        <ul className="mt-2 space-y-1 text-xs text-emerald-700">
                          {nextItems.map((item) => (
                            <li key={item}>• {item}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  </div>
                ) : null}
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {profile?.role === "student" ? (
                  <Link
                    href="/group"
                    className="group rounded-2xl border border-emerald-100 bg-white/90 p-5 text-sm font-semibold text-emerald-950 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"
                  >
                    My group checklist
                    <div className="mt-2 text-xs font-normal text-emerald-700">
                      Submit Google Drive links and track status
                    </div>
                  </Link>
                ) : null}

                {(profile?.role === "coordinator" || profile?.role === "admin") ? (
                  <Link
                    href="/coordinator"
                    className="group rounded-2xl border border-emerald-100 bg-white/90 p-5 text-sm font-semibold text-emerald-950 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"
                  >
                    Coordinator dashboard
                    <div className="mt-2 text-xs font-normal text-emerald-700">
                      Approvals, schedules, and compliance
                    </div>
                  </Link>
                ) : null}

                {profile?.role === "student" ? (
                  <Link
                    href="/request-coordinator"
                    className="group rounded-2xl border border-emerald-100 bg-white/90 p-5 text-sm font-semibold text-emerald-950 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"
                  >
                    Request coordinator access
                    <div className="mt-2 text-xs font-normal text-emerald-700">
                      Manual approval required
                    </div>
                  </Link>
                ) : null}

                {profile?.role === "admin" ? (
                  <Link
                    href="/admin/role-requests"
                    className="group rounded-2xl border border-emerald-100 bg-white/90 p-5 text-sm font-semibold text-emerald-950 transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-lg"
                  >
                    Admin: role requests
                    <div className="mt-2 text-xs font-normal text-emerald-700">
                      Approve coordinators
                    </div>
                  </Link>
                ) : null}
              </div>
            </div>
          </main>
        </div>
      )}
    </AuthGate>
  );
}

