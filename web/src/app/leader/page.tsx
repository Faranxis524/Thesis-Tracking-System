"use client";

import { useEffect, useMemo, useState } from "react";
import { LeaderAuthGate } from "@/components/LeaderAuthGate";
import { LogoutButton } from "@/components/LogoutButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Profile = {
  id: string;
  full_name: string | null;
  last_name: string | null;
  term_id: number | null;
  college_id: number | null;
  section_id: number | null;
  role: string;
};

type Group = {
  id: number;
  title: string | null;
  adviser_name: string | null;
  stage: "title" | "proposal" | "final";
};

type GroupMemberName = {
  id: number;
  full_name: string;
  role: "leader" | "member";
};

type Requirement = {
  id: number;
  code: string | null;
  name: string;
  stage: "title" | "proposal" | "final";
};

type Submission = {
  requirement_id: number;
  status: "missing" | "submitted" | "approved" | "needs_revision" | "resubmitted";
  drive_url: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
};

type FormOpening = {
  requirement_id: number;
  deadline_at: string | null;
  is_open: boolean;
  term_id: number | null;
  college_id: number | null;
  section_id: number | null;
};

type Defense = {
  stage: "title" | "proposal" | "final";
  status: "scheduled" | "done" | "cancelled";
};

const STAGES: Array<{ key: "title" | "proposal" | "final"; label: string }> = [
  { key: "title", label: "Title Approval" },
  { key: "proposal", label: "Proposal Defense" },
  { key: "final", label: "Final Defense" },
];

export default function LeaderDashboardPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [group, setGroup] = useState<Group | null>(null);
  const [memberNames, setMemberNames] = useState<GroupMemberName[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [formOpenings, setFormOpenings] = useState<FormOpening[]>([]);
  const [defenses, setDefenses] = useState<Defense[]>([]);
  const [driveLinks, setDriveLinks] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [editTarget, setEditTarget] = useState<null | "title" | "adviser" | "leader" | "members">(null);
  const [editValue, setEditValue] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("id,full_name,last_name,term_id,college_id,section_id,role")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;
        if (!profileData) throw new Error("Profile not found.");
        if (profileData.role !== "leader") {
          throw new Error("Leader access required.");
        }

        const { data: groupMembership, error: membershipError } = await supabase
          .from("group_members")
          .select("group_id, groups(id,title,adviser_name,stage)")
          .eq("user_id", user.id)
          .maybeSingle();

        if (membershipError) throw membershipError;

        const groupData = (groupMembership?.groups ?? null) as Group | null;

        const [
          { data: memberData, error: memberError },
          { data: requirementData, error: requirementError },
          { data: submissionData, error: submissionError },
          { data: formOpeningData, error: formOpeningError },
          { data: defenseData, error: defenseError },
        ] = await Promise.all([
          groupData
            ? supabase
                .from("group_member_names")
                .select("id,full_name,role")
                .eq("group_id", groupData.id)
                .order("role", { ascending: false })
            : supabase.from("group_member_names").select("id").limit(0),
          supabase.from("requirements").select("id,code,name,stage").order("stage", { ascending: true }),
          groupData
            ? supabase
                .from("submissions")
                .select("requirement_id,status,drive_url,submitted_at,reviewed_at")
                .eq("group_id", groupData.id)
            : supabase.from("submissions").select("requirement_id").limit(0),
          supabase.from("form_openings").select("*").eq("is_open", true),
          groupData
            ? supabase.from("defenses").select("stage,status").eq("group_id", groupData.id)
            : supabase.from("defenses").select("id").limit(0),
        ]);

        if (memberError) throw memberError;
        if (requirementError) throw requirementError;
        if (submissionError) throw submissionError;
        if (formOpeningError) throw formOpeningError;
        if (defenseError) throw defenseError;

        if (!cancelled) {
          setProfile(profileData as Profile);
          setGroup(groupData);
          setMemberNames((memberData ?? []) as GroupMemberName[]);
          setRequirements((requirementData ?? []) as Requirement[]);
          const submissionList = (submissionData ?? []) as Submission[];
          setSubmissions(submissionList);
          setFormOpenings((formOpeningData ?? []) as FormOpening[]);
          setDefenses((defenseData ?? []) as Defense[]);

          const initialLinks: Record<number, string> = {};
          submissionList.forEach((submission) => {
            if (submission.drive_url) initialLinks[submission.requirement_id] = submission.drive_url;
          });
          setDriveLinks(initialLinks);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Load failed");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const leaderName = profile?.last_name ?? profile?.full_name ?? "Leader";

  const availableFormOpenings = useMemo(() => {
    if (!profile) return [];
    return formOpenings.filter((opening) =>
      String(opening.term_id ?? "") === String(profile.term_id ?? "") &&
      String(opening.college_id ?? "") === String(profile.college_id ?? "") &&
      String(opening.section_id ?? "") === String(profile.section_id ?? ""),
    );
  }, [formOpenings, profile]);

  const submissionsByRequirement = useMemo(() => {
    const map = new Map<number, Submission>();
    submissions.forEach((submission) => map.set(submission.requirement_id, submission));
    return map;
  }, [submissions]);

  function getStatus(requirementId: number, deadline: string | null) {
    const submission = submissionsByRequirement.get(requirementId);
    if (submission) return submission.status;
    if (deadline && new Date(deadline).getTime() < Date.now()) return "overdue";
    return "pending";
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "approved":
        return "bg-emerald-100 text-emerald-700";
      case "needs_revision":
        return "bg-amber-100 text-amber-700";
      case "submitted":
      case "resubmitted":
        return "bg-sky-100 text-sky-700";
      case "overdue":
        return "bg-red-100 text-red-700";
      default:
        return "bg-zinc-100 text-zinc-600";
    }
  }

  const groupingRequirement = requirements.find((req) => req.code === "PNC:PRE-FO-64/65") ?? null;
  const groupingStatus = groupingRequirement
    ? submissionsByRequirement.get(groupingRequirement.id)?.status ?? "missing"
    : "missing";
  const leaderUnlocked = groupingStatus === "approved";

  const titleDefenseDone = defenses.some(
    (defense) => defense.stage === "title" && defense.status === "done",
  );
  const advisingRequirement = requirements.find((req) => req.code === "PNC:PRE-FO-61") ?? null;
  const advisingStatus = advisingRequirement
    ? submissionsByRequirement.get(advisingRequirement.id)?.status ?? "missing"
    : "missing";
  const titleUnlocked = titleDefenseDone && advisingStatus === "approved";

  const milestones = STAGES.map((stage) => {
    const stageRequirements = requirements.filter((req) => req.stage === stage.key);
    const openRequirementIds = new Set(
      availableFormOpenings
        .map((opening) => opening.requirement_id)
        .filter((id) => stageRequirements.some((req) => req.id === id)),
    );

    const stageItems = stageRequirements.filter((req) => openRequirementIds.has(req.id));
    const isComplete =
      stageItems.length > 0 &&
      stageItems.every(
        (req) => submissionsByRequirement.get(req.id)?.status === "approved",
      );

    return {
      label: stage.label,
      items: stageItems,
      complete: isComplete,
    };
  });

  async function saveSubmission(requirementId: number, deadline: string | null) {
    setError(null);
    setInfo(null);
    if (!group) return;

    const url = (driveLinks[requirementId] ?? "").trim();
    if (!url) {
      setError("Please paste a Google Drive link before saving.");
      return;
    }

    const status = getStatus(requirementId, deadline);
    if (status === "overdue") {
      setError("Submission is overdue. Please contact your coordinator.");
      return;
    }

    setSavingId(requirementId);
    try {
      const supabase = getSupabaseBrowserClient();
      const existing = submissionsByRequirement.get(requirementId);
      const nextStatus = existing?.status === "needs_revision" ? "resubmitted" : "submitted";

      const { data, error } = await supabase
        .from("submissions")
        .upsert(
          {
            group_id: group.id,
            requirement_id: requirementId,
            drive_url: url,
            status: nextStatus,
            submitted_at: new Date().toISOString(),
          },
          { onConflict: "group_id,requirement_id" },
        )
        .select("requirement_id,status,drive_url,submitted_at,reviewed_at")
        .single();

      if (error) throw error;

      setSubmissions((prev) => {
        const filtered = prev.filter((item) => item.requirement_id !== requirementId);
        return [...filtered, data as Submission];
      });
      setInfo("Submission saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Submission failed");
    } finally {
      setSavingId(null);
    }
  }

  function openEdit(target: "title" | "adviser" | "leader" | "members") {
    if (target === "title") setEditValue(group?.title ?? "");
    if (target === "adviser") setEditValue(group?.adviser_name ?? "");
    if (target === "leader") {
      const leaderEntry = memberNames.find((member) => member.role === "leader");
      setEditValue(leaderEntry?.full_name ?? "");
    }
    if (target === "members") {
      const memberList = memberNames
        .filter((member) => member.role === "member")
        .map((member) => member.full_name)
        .join("\n");
      setEditValue(memberList);
    }
    setEditTarget(target);
  }

  async function saveEdit() {
    if (!editTarget || !group) return;
    setError(null);
    setInfo(null);

    try {
      const supabase = getSupabaseBrowserClient();
      if (editTarget === "title") {
        const { error } = await supabase
          .from("groups")
          .update({ title: editValue.trim() || null })
          .eq("id", group.id);
        if (error) throw error;
        setGroup((prev) => (prev ? { ...prev, title: editValue.trim() || null } : prev));
      }

      if (editTarget === "adviser") {
        const { error } = await supabase
          .from("groups")
          .update({ adviser_name: editValue.trim() || null })
          .eq("id", group.id);
        if (error) throw error;
        setGroup((prev) => (prev ? { ...prev, adviser_name: editValue.trim() || null } : prev));
      }

      if (editTarget === "leader") {
        const leaderEntry = memberNames.find((member) => member.role === "leader");
        if (leaderEntry) {
          const { error } = await supabase
            .from("group_member_names")
            .update({ full_name: editValue.trim() })
            .eq("id", leaderEntry.id);
          if (error) throw error;
          setMemberNames((prev) =>
            prev.map((member) =>
              member.id === leaderEntry.id
                ? { ...member, full_name: editValue.trim() }
                : member,
            ),
          );
        }
      }

      if (editTarget === "members") {
        const names = editValue
          .split("\n")
          .map((name) => name.trim())
          .filter((name) => name);
        if (names.length > 4) {
          setError("Maximum of 4 members allowed (leader + 4 = 5 total).");
          return;
        }

        const { error: deleteError } = await supabase
          .from("group_member_names")
          .delete()
          .eq("group_id", group.id)
          .eq("role", "member");
        if (deleteError) throw deleteError;

        if (names.length > 0) {
          const { error: insertError } = await supabase
            .from("group_member_names")
            .insert(
              names.map((name) => ({
                group_id: group.id,
                full_name: name,
                role: "member",
              })),
            );
          if (insertError) throw insertError;
        }

        const { data: refreshed } = await supabase
          .from("group_member_names")
          .select("id,full_name,role")
          .eq("group_id", group.id)
          .order("role", { ascending: false });

        setMemberNames((refreshed ?? []) as GroupMemberName[]);
      }

      setEditTarget(null);
      setInfo("Updated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed");
    }
  }

  return (
    <LeaderAuthGate>
      {() => (
        <div className="flex flex-1 flex-col">
          <header className="border-b border-emerald-100 bg-white/70 px-6 py-5 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-900">
                  Welcome {leaderName}
                </div>
                <div className="text-xs text-emerald-800/70">Leader workspace</div>
              </div>
              <LogoutButton redirectTo="/leader/login" />
            </div>
          </header>

          <main className="mx-auto w-full max-w-5xl p-6 space-y-6">
            {error ? (
              <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {info ? (
              <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {info}
              </div>
            ) : null}

            <section className="glass-panel rounded-3xl p-6">
              <div className="section-title">Milestones</div>
              <div className="mt-4 flex flex-wrap items-center gap-6">
                {milestones.map((stage) => (
                  <div key={stage.label} className="flex items-center gap-3">
                    <div
                      className={`text-xs font-semibold ${
                        stage.complete ? "text-emerald-700" : "text-zinc-400"
                      }`}
                    >
                      {stage.label}
                    </div>
                    <div className="flex items-center gap-2">
                      {stage.items.length === 0 ? (
                        <span className="h-3 w-3 rounded-full bg-zinc-200" />
                      ) : (
                        stage.items.map((item) => {
                          const status = submissionsByRequirement.get(item.id)?.status;
                          const isApproved = status === "approved";
                          return (
                            <span
                              key={item.id}
                              className={`h-3 w-3 rounded-full ${
                                isApproved ? "bg-emerald-500" : "bg-zinc-200"
                              }`}
                            />
                          );
                        })
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-panel rounded-3xl p-6">
              <div className="section-title">Research Profile</div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                {[
                  {
                    label: "Research Title",
                    value: group?.title ?? "Not set",
                    locked: !titleUnlocked,
                    target: "title" as const,
                  },
                  {
                    label: "Adviser",
                    value: group?.adviser_name ?? "Not set",
                    locked: !titleUnlocked,
                    target: "adviser" as const,
                  },
                  {
                    label: "Leader",
                    value:
                      memberNames.find((member) => member.role === "leader")?.full_name ??
                      "Not set",
                    locked: !leaderUnlocked,
                    target: "leader" as const,
                  },
                  {
                    label: "Members",
                    value:
                      memberNames
                        .filter((member) => member.role === "member")
                        .map((member) => member.full_name)
                        .join(", ") || "Not set",
                    locked: !leaderUnlocked,
                    target: "members" as const,
                  },
                ].map((item) => (
                  <div
                    key={item.label}
                    className={`rounded-2xl border p-4 ${
                      item.locked ? "border-zinc-200 bg-zinc-50 text-zinc-400" : "border-emerald-100 bg-white"
                    }`}
                  >
                    <div className="text-xs font-semibold text-emerald-800">
                      {item.label}
                    </div>
                    <div className="mt-2 text-sm text-zinc-900">{item.value}</div>
                    <button
                      type="button"
                      onClick={() => openEdit(item.target)}
                      disabled={item.locked}
                      className="mt-3 rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      Update
                    </button>
                  </div>
                ))}
              </div>
            </section>

            <section className="glass-panel rounded-3xl p-6">
              <div className="section-title">Open forms</div>
              <div className="mt-4 space-y-3">
                {availableFormOpenings.length === 0 ? (
                  <div className="text-sm text-emerald-700">
                    No forms are open yet.
                  </div>
                ) : (
                  availableFormOpenings.map((opening) => {
                    const requirement = requirements.find(
                      (req) => req.id === opening.requirement_id,
                    );
                    if (!requirement) return null;
                    const status = getStatus(requirement.id, opening.deadline_at);
                    const existing = submissionsByRequirement.get(requirement.id);

                    return (
                      <div
                        key={opening.requirement_id}
                        className="rounded-2xl border border-emerald-100 bg-white/80 p-4"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <div className="text-sm font-semibold text-emerald-900">
                              {requirement.code
                                ? `${requirement.code} - ${requirement.name}`
                                : requirement.name}
                            </div>
                            <div className="mt-1 text-xs text-emerald-700">
                              Deadline: {opening.deadline_at ? new Date(opening.deadline_at).toLocaleString() : "No deadline"}
                            </div>
                          </div>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getStatusBadge(status)}`}
                          >
                            {status}
                          </span>
                        </div>

                        {existing?.reviewed_at ? (
                          <div className="mt-2 text-xs text-emerald-700">
                            Reviewed: {new Date(existing.reviewed_at).toLocaleString()}
                          </div>
                        ) : null}

                        <div className="mt-3 flex flex-col gap-2">
                          <input
                            type="url"
                            value={driveLinks[requirement.id] ?? ""}
                            onChange={(event) =>
                              setDriveLinks((prev) => ({
                                ...prev,
                                [requirement.id]: event.target.value,
                              }))
                            }
                            placeholder="Paste Google Drive link"
                            className="w-full rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
                          />
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => saveSubmission(requirement.id, opening.deadline_at)}
                              disabled={savingId === requirement.id || status === "overdue"}
                              className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-60"
                            >
                              {savingId === requirement.id ? "Saving..." : "Submit link"}
                            </button>
                            {existing?.status === "approved" ? (
                              <span className="text-xs font-semibold text-emerald-600">Approved</span>
                            ) : null}
                            {existing?.status === "needs_revision" ? (
                              <span className="text-xs font-semibold text-amber-600">Revise</span>
                            ) : null}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </section>
          </main>

          {editTarget ? (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
              <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl">
                <div className="text-sm font-semibold text-emerald-900">Update {editTarget}</div>
                <textarea
                  value={editValue}
                  onChange={(event) => setEditValue(event.target.value)}
                  rows={editTarget === "members" ? 5 : 2}
                  className="mt-4 w-full rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
                />
                {editTarget === "members" ? (
                  <div className="mt-2 text-xs text-emerald-700">
                    One name per line. Maximum of 4 members.
                  </div>
                ) : null}
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setEditTarget(null)}
                    className="rounded-full border border-emerald-200 px-4 py-1.5 text-xs font-semibold text-emerald-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={saveEdit}
                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white"
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </LeaderAuthGate>
  );
}
