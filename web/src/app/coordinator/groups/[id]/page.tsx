"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { AuthGate } from "@/components/AuthGate";
import { LogoutButton } from "@/components/LogoutButton";
import { ensureProfile, type Profile } from "@/lib/profile";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Group = {
  id: number;
  title: string | null;
  stage: "title" | "proposal" | "final";
  section_id: number | null;
  sections?: {
    name: string;
    program: string;
  } | null;
  adviser_name: string | null;
};

type Member = {
  role: "leader" | "member";
  profiles: {
    id: string;
    email: string | null;
    full_name: string | null;
  } | null;
};

type Submission = {
  id: number;
  drive_url: string | null;
  status: "missing" | "submitted" | "approved" | "needs_revision" | "resubmitted";
  submitted_at: string | null;
  reviewed_at: string | null;
  remarks: string | null;
  requirements: {
    name: string;
    code: string | null;
    stage: "title" | "proposal" | "final";
    timing: "before" | "after";
    owner: "student" | "teacher";
  } | null;
};

type Requirement = {
  id: number;
  stage: "title" | "proposal" | "final";
  owner: "student" | "teacher";
  code: string | null;
  name: string;
  is_optional: boolean;
};

type RequirementOverride = {
  requirement_id: number;
  is_required: boolean;
};

type Defense = {
  id: number;
  stage: "title" | "proposal" | "final";
  schedule_datetime: string | null;
  venue_or_meet_link: string | null;
  status: "scheduled" | "done" | "cancelled";
};

type RevisionItem = {
  id: number;
  stage: "proposal" | "final";
  description: string;
  due_date: string | null;
  status: "open" | "submitted" | "accepted";
  evidence_drive_url: string | null;
};

const stageLabels: Record<Group["stage"], string> = {
  title: "Title Approval",
  proposal: "Proposal Defense",
  final: "Final Defense",
};

export default function CoordinatorGroupDetailPage() {
  const params = useParams();
  const groupId = Number(params.id);

  const [profile, setProfile] = useState<Profile | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [defenses, setDefenses] = useState<Defense[]>([]);
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [overrides, setOverrides] = useState<RequirementOverride[]>([]);
  const [savingOverrideId, setSavingOverrideId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (!groupId) return;
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const myProfile = await ensureProfile(supabase, user);
        if (!cancelled) setProfile(myProfile);

        if (myProfile.role !== "coordinator" && myProfile.role !== "admin") {
          return;
        }

        const [
          groupRes,
          membersRes,
          submissionsRes,
          defensesRes,
          revisionsRes,
          requirementsRes,
          overridesRes,
        ] =
          await Promise.all([
            supabase
              .from("groups")
              .select("*, sections(name,program)")
              .eq("id", groupId)
              .single(),
            supabase
              .from("group_members")
              .select("role, profiles(id,email,full_name)")
              .eq("group_id", groupId)
              .order("role", { ascending: true }),
            supabase
              .from("submissions")
              .select(
                "id,drive_url,status,submitted_at,reviewed_at,remarks,requirements(name,code,stage,timing,owner)",
              )
              .eq("group_id", groupId)
              .order("submitted_at", { ascending: false }),
            supabase
              .from("defenses")
              .select("*")
              .eq("group_id", groupId)
              .order("schedule_datetime", { ascending: true }),
            supabase
              .from("revision_items")
              .select("*")
              .eq("group_id", groupId)
              .order("due_date", { ascending: true }),
            supabase
              .from("requirements")
              .select("id,stage,owner,code,name,is_optional")
              .order("stage", { ascending: true })
              .order("name", { ascending: true }),
            supabase
              .from("requirement_overrides")
              .select("requirement_id,is_required")
              .eq("group_id", groupId),
          ]);

        if (groupRes.error) throw groupRes.error;
        if (membersRes.error) throw membersRes.error;
        if (submissionsRes.error) throw submissionsRes.error;
        if (defensesRes.error) throw defensesRes.error;
        if (revisionsRes.error) throw revisionsRes.error;
        if (requirementsRes.error) throw requirementsRes.error;
        if (overridesRes.error) throw overridesRes.error;

        if (!cancelled) {
          setGroup(groupRes.data as Group);
          setMembers((membersRes.data ?? []) as Member[]);
          setSubmissions((submissionsRes.data ?? []) as Submission[]);
          setDefenses((defensesRes.data ?? []) as Defense[]);
          setRevisions((revisionsRes.data ?? []) as RevisionItem[]);
          setRequirements((requirementsRes.data ?? []) as Requirement[]);
          setOverrides((overridesRes.data ?? []) as RequirementOverride[]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [groupId]);

  const overrideSet = new Set(
    overrides.filter((o) => o.is_required).map((o) => o.requirement_id),
  );

  async function toggleOverride(requirementId: number, nextRequired: boolean) {
    if (!groupId) return;
    setSavingOverrideId(requirementId);
    try {
      const supabase = getSupabaseBrowserClient();
      if (nextRequired) {
        const { error } = await supabase
          .from("requirement_overrides")
          .upsert({ group_id: groupId, requirement_id: requirementId, is_required: true });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("requirement_overrides")
          .delete()
          .eq("group_id", groupId)
          .eq("requirement_id", requirementId);
        if (error) throw error;
      }

      setOverrides((prev) => {
        const filtered = prev.filter((o) => o.requirement_id !== requirementId);
        return nextRequired
          ? [...filtered, { requirement_id: requirementId, is_required: true }]
          : filtered;
      });

      await supabase.from("audit_logs").insert({
        action: "requirement_override",
        entity_type: "requirement_overrides",
        entity_id: String(requirementId),
        meta: { required: nextRequired },
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    } finally {
      setSavingOverrideId(null);
    }
  }

  return (
    <AuthGate>
      {({ user }) => (
        <div className="flex flex-1 flex-col">
          <header className="border-b border-emerald-100 bg-white/70 px-6 py-5 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-900">Group Detail</div>
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

            {profile && profile.role !== "coordinator" && profile.role !== "admin" ? (
              <div className="glass-panel rounded-3xl p-6">
                <p className="text-sm text-emerald-800">Coordinator access required.</p>
                <div className="mt-4">
                  <Link
                    href="/coordinator"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    Back to coordinator dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <section className="glass-panel rounded-3xl p-6">
                  <div className="text-sm font-semibold text-emerald-950">
                    {group?.title ?? "Group"}
                  </div>
                  <div className="mt-2 text-xs text-emerald-700">
                    Stage: {group ? stageLabels[group.stage] : ""}
                  </div>
                  <div className="mt-1 text-xs text-emerald-700">
                    {group?.sections?.program ?? "Program not set"}
                    {group?.sections?.name ? ` • ${group.sections.name}` : ""}
                    {group?.adviser_name ? ` • Adviser: ${group.adviser_name}` : ""}
                  </div>
                </section>

                <section className="glass-panel rounded-3xl p-6">
                  <div className="section-title">Members</div>
                  <div className="mt-3 space-y-2">
                    {members.length === 0 ? (
                      <div className="text-xs text-emerald-700">No members yet.</div>
                    ) : (
                      members.map((member, index) => (
                        <div
                          key={`${member.profiles?.id ?? index}`}
                          className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-white/80 p-3"
                        >
                          <div>
                            <div className="text-sm font-medium text-zinc-900">
                              {member.profiles?.full_name ?? member.profiles?.email ?? "Member"}
                            </div>
                            <div className="text-xs text-zinc-500">
                              {member.profiles?.email}
                            </div>
                          </div>
                          <div className="text-xs uppercase tracking-wide text-emerald-600">
                            {member.role}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="glass-panel rounded-3xl p-6">
                  <div className="section-title">Submissions</div>
                  <div className="mt-3 space-y-3">
                    {submissions.length === 0 ? (
                      <div className="text-xs text-emerald-700">No submissions yet.</div>
                    ) : (
                      submissions.map((submission) => (
                        <div
                          key={submission.id}
                          className="rounded-2xl border border-emerald-100 bg-white/80 p-4"
                        >
                          <div className="text-sm font-medium text-zinc-900">
                            {submission.requirements?.code
                              ? `${submission.requirements.code} - ${submission.requirements.name}`
                              : submission.requirements?.name ?? "Requirement"}
                          </div>
                          <div className="mt-1 text-xs text-emerald-700">
                            Stage: {submission.requirements?.stage ?? ""} • Timing: {submission.requirements?.timing ?? ""}
                          </div>
                          <div className="mt-1 text-xs text-emerald-700">
                            Status: {submission.status}
                          </div>
                          {submission.remarks ? (
                            <div className="mt-2 text-xs text-emerald-700">
                              Remarks: {submission.remarks}
                            </div>
                          ) : null}
                          {submission.drive_url ? (
                            <a
                              href={submission.drive_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-xs font-semibold text-emerald-800 underline"
                            >
                              Open Drive link
                            </a>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="glass-panel rounded-3xl p-6">
                  <div className="section-title">Optional requirements</div>
                  <div className="mt-3 space-y-2">
                    {requirements.filter((req) => req.is_optional && req.owner === "student").length === 0 ? (
                      <div className="text-xs text-emerald-700">No optional items.</div>
                    ) : (
                      requirements
                        .filter((req) => req.is_optional && req.owner === "student")
                        .map((req) => {
                          const isRequired = overrideSet.has(req.id);
                          return (
                            <div
                              key={req.id}
                              className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-white/80 p-3"
                            >
                              <div>
                                <div className="text-sm font-medium text-zinc-900">
                                  {req.code ? `${req.code} — ${req.name}` : req.name}
                                </div>
                                <div className="text-xs text-emerald-700">Stage: {stageLabels[req.stage]}</div>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleOverride(req.id, !isRequired)}
                                disabled={savingOverrideId === req.id}
                                className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
                                  isRequired
                                    ? "bg-emerald-600 text-white"
                                    : "bg-emerald-100 text-emerald-800"
                                } disabled:opacity-60`}
                              >
                                {savingOverrideId === req.id
                                  ? "Saving…"
                                  : isRequired
                                    ? "Required"
                                    : "Optional"}
                              </button>
                            </div>
                          );
                        })
                    )}
                  </div>
                </section>

                <section className="glass-panel rounded-3xl p-6">
                  <div className="section-title">Defense timeline</div>
                  <div className="mt-3 space-y-2">
                    {defenses.length === 0 ? (
                      <div className="text-xs text-emerald-700">No defenses scheduled.</div>
                    ) : (
                      defenses.map((defense) => (
                        <div key={defense.id} className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
                          <div className="text-sm font-medium text-zinc-900">
                            {stageLabels[defense.stage]}
                          </div>
                          <div className="mt-1 text-xs text-emerald-700">
                            {defense.schedule_datetime
                              ? new Date(defense.schedule_datetime).toLocaleString()
                              : "Schedule not set"}
                          </div>
                          <div className="mt-1 text-xs text-emerald-700">
                            {defense.venue_or_meet_link ?? "Venue not set"}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <section className="glass-panel rounded-3xl p-6">
                  <div className="section-title">Revision items</div>
                  <div className="mt-3 space-y-2">
                    {revisions.length === 0 ? (
                      <div className="text-xs text-emerald-700">No revision items.</div>
                    ) : (
                      revisions.map((revision) => (
                        <div key={revision.id} className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
                          <div className="text-sm font-medium text-zinc-900">
                            {revision.description}
                          </div>
                          <div className="mt-1 text-xs text-emerald-700">
                            Stage: {stageLabels[revision.stage]} • Status: {revision.status}
                          </div>
                          <div className="mt-1 text-xs text-emerald-700">
                            Due: {revision.due_date ?? "No due date"}
                          </div>
                          {revision.evidence_drive_url ? (
                            <a
                              href={revision.evidence_drive_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-2 inline-block text-xs font-semibold text-emerald-800 underline"
                            >
                              Open evidence link
                            </a>
                          ) : null}
                        </div>
                      ))
                    )}
                  </div>
                </section>

                <div>
                  <Link
                    href="/coordinator"
                    className="text-sm font-semibold text-emerald-700 hover:text-emerald-900"
                  >
                    Back to coordinator dashboard
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
