"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { LogoutButton } from "@/components/LogoutButton";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";
import { ProgressBar } from "@/components/ProgressBar";

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

type Requirement = {
  id: number;
  stage: "title" | "proposal" | "final";
  timing: "before" | "after";
  owner: "student" | "teacher";
  code: string | null;
  name: string;
  is_optional: boolean;
};

type RequirementOverride = {
  requirement_id: number;
  is_required: boolean;
};

type Submission = {
  id: number;
  requirement_id: number;
  drive_url: string | null;
  status: "missing" | "submitted" | "approved" | "needs_revision" | "resubmitted";
  remarks: string | null;
  submitted_at: string | null;
  reviewed_at: string | null;
};

type Defense = {
  id: number;
  stage: "title" | "proposal" | "final";
  schedule_datetime: string | null;
  venue_or_meet_link: string | null;
  status: "scheduled" | "done" | "cancelled";
};

const stageLabels: Record<Requirement["stage"], string> = {
  title: "Title Approval",
  proposal: "Proposal Defense",
  final: "Final Defense",
};

const timingLabels: Record<Requirement["timing"], string> = {
  before: "Before",
  after: "After",
};

export default function GroupChecklistPage() {
  const [group, setGroup] = useState<Group | null>(null);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [defenses, setDefenses] = useState<Defense[]>([]);
  const [overrides, setOverrides] = useState<RequirementOverride[]>([]);
  const [driveUrls, setDriveUrls] = useState<Record<number, string>>({});
  const [savingId, setSavingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [selectedRequirementId, setSelectedRequirementId] = useState<number | null>(null);
  const [openStages, setOpenStages] = useState<Record<Requirement["stage"], boolean>>({
    title: true,
    proposal: false,
    final: false,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = getSupabaseBrowserClient();
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) return;

        const { data: membership, error: membershipError } = await supabase
          .from("group_members")
          .select(
            "group_id, role, groups(id,title,stage,section_id,adviser_name,sections(name,program))",
          )
          .eq("user_id", user.id)
          .maybeSingle();

        if (membershipError) throw membershipError;

        const groupData = (membership?.groups ?? null) as Group | null;
        if (!cancelled) setGroup(groupData);

        if (!groupData) return;

        const [
          { data: reqData, error: reqError },
          { data: subData, error: subError },
          { data: defenseData, error: defenseError },
          { data: overrideData, error: overrideError },
        ] = await Promise.all([
          supabase
            .from("requirements")
            .select("*")
            .order("stage", { ascending: true })
            .order("timing", { ascending: true })
            .order("owner", { ascending: true })
            .order("name", { ascending: true }),
          supabase
            .from("submissions")
            .select("*")
            .eq("group_id", groupData.id)
            .order("id", { ascending: true }),
          supabase
            .from("defenses")
            .select("*")
            .eq("group_id", groupData.id)
            .order("schedule_datetime", { ascending: true }),
          supabase
            .from("requirement_overrides")
            .select("requirement_id,is_required")
            .eq("group_id", groupData.id),
        ]);

        if (reqError) throw reqError;
        if (subError) throw subError;

        if (defenseError) throw defenseError;
        if (overrideError) throw overrideError;

        if (!cancelled) {
          setRequirements((reqData ?? []) as Requirement[]);
          const subList = (subData ?? []) as Submission[];
          setSubmissions(subList);
          setDefenses((defenseData ?? []) as Defense[]);
          setOverrides((overrideData ?? []) as RequirementOverride[]);

          const initialUrls: Record<number, string> = {};
          subList.forEach((s) => {
            if (s.drive_url) initialUrls[s.requirement_id] = s.drive_url;
          });
          setDriveUrls(initialUrls);

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

  useEffect(() => {
    if (selectedRequirementId !== null) return;

    const preferred = requirements.find((req) => req.owner === "student") ?? requirements[0];
    if (preferred) setSelectedRequirementId(preferred.id);
  }, [requirements, selectedRequirementId]);

  useEffect(() => {
    if (selectedRequirementId === null) return;
    const current = requirements.find((req) => req.id === selectedRequirementId);
    if (current && current.owner === "student") return;
    const fallback = requirements.find((req) => req.owner === "student");
    if (fallback) setSelectedRequirementId(fallback.id);
  }, [requirements, selectedRequirementId]);

  useEffect(() => {
    if (!selectedRequirementId) return;
    const current = requirements.find((req) => req.id === selectedRequirementId);
    if (!current) return;
    setOpenStages((prev) => ({ ...prev, [current.stage]: true }));
  }, [requirements, selectedRequirementId]);

  function getSubmission(requirementId: number) {
    return submissions.find((s) => s.requirement_id === requirementId) ?? null;
  }

  function isRequired(req: Requirement): boolean {
    if (!req.is_optional) return true;
    return overrides.some((o) => o.requirement_id === req.id && o.is_required);
  }

  function isApproved(requirementId: number): boolean {
    const submission = getSubmission(requirementId);
    return submission?.status === "approved";
  }

  const studentRequirements = requirements.filter((r) => r.owner === "student");
  const requiredStudentRequirements = studentRequirements.filter((r) => isRequired(r));
  const submittedIds = new Set(
    submissions
      .filter((s) => s.status !== "missing")
      .map((s) => s.requirement_id),
  );
  const totalStudentReqs = requiredStudentRequirements.length;
  const completedStudentReqs = requiredStudentRequirements.filter((r) => submittedIds.has(r.id)).length;
  const progressValue = totalStudentReqs === 0 ? 0 : Math.round((completedStudentReqs / totalStudentReqs) * 100);

  const stageOrder: Requirement["stage"][] = ["title", "proposal", "final"];
  const stageCompletion = new Map<Requirement["stage"], boolean>();
  stageOrder.forEach((stage) => {
    const requiredInStage = requiredStudentRequirements.filter((r) => r.stage === stage);
    const complete = requiredInStage.every((r) => isApproved(r.id));
    stageCompletion.set(stage, complete);
  });

  function isStageLocked(stage: Requirement["stage"]): boolean {
    const index = stageOrder.indexOf(stage);
    if (index <= 0) return false;
    const previousStage = stageOrder[index - 1];
    return !stageCompletion.get(previousStage);
  }

  const selectedRequirement = requirements.find((req) => req.id === selectedRequirementId) ?? null;
  const selectedSubmission = selectedRequirement ? getSubmission(selectedRequirement.id) : null;
  const selectedRequired = selectedRequirement ? isRequired(selectedRequirement) : false;
  const selectedLocked = selectedRequirement ? isStageLocked(selectedRequirement.stage) : false;

  function getStatusMeta(status: Submission["status"] | "missing") {
    switch (status) {
      case "approved":
        return {
          label: "approved",
          icon: (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden>
              <path
                fill="currentColor"
                d="M7.7 13.4 4.8 10.5l-1.3 1.3 4.2 4.2 8-8-1.4-1.4-6.6 6.6Z"
              />
            </svg>
          ),
          className: "bg-emerald-100 text-emerald-700",
        };
      case "needs_revision":
        return {
          label: "needs revision",
          icon: (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden>
              <path
                fill="currentColor"
                d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 11H9v-2h2v2Zm0-4H9V5h2v4Z"
              />
            </svg>
          ),
          className: "bg-amber-100 text-amber-700",
        };
      case "submitted":
      case "resubmitted":
        return {
          label: status,
          icon: (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden>
              <path
                fill="currentColor"
                d="M10 2a8 8 0 1 0 0 16 8 8 0 0 0 0-16Zm1 4H9v5l4 2 .8-1.4-2.8-1.4V6Z"
              />
            </svg>
          ),
          className: "bg-sky-100 text-sky-700",
        };
      default:
        return {
          label: "missing",
          icon: (
            <svg viewBox="0 0 20 20" className="h-3.5 w-3.5" aria-hidden>
              <path
                fill="currentColor"
                d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm1-11H9V5h2v2Zm0 2H9v6h2V9Z"
              />
            </svg>
          ),
          className: "bg-zinc-100 text-zinc-600",
        };
    }
  }

  async function saveLink(requirement: Requirement) {
    setError(null);
    setMessage(null);
    if (!group) return;

    if (isStageLocked(requirement.stage)) {
      setError("This stage is locked until the previous stage is approved.");
      return;
    }

    const url = (driveUrls[requirement.id] ?? "").trim();
    if (!url) {
      setError("Please paste a Google Drive link before saving.");
      return;
    }

    setSavingId(requirement.id);
    try {
      const supabase = getSupabaseBrowserClient();
      const existing = getSubmission(requirement.id);
      const nextStatus = existing?.status === "needs_revision" ? "resubmitted" : "submitted";

      const payload = {
        group_id: group.id,
        requirement_id: requirement.id,
        drive_url: url,
        status: nextStatus,
        submitted_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from("submissions")
        .upsert(payload, { onConflict: "group_id,requirement_id" })
        .select("*")
        .single();

      if (error) throw error;

      setSubmissions((prev) => {
        const existingIndex = prev.findIndex(
          (s) => s.requirement_id === requirement.id,
        );
        if (existingIndex === -1) return [...prev, data as Submission];
        const copy = [...prev];
        copy[existingIndex] = data as Submission;
        return copy;
      });

      await supabase.from("audit_logs").insert({
        action: "submission_saved",
        entity_type: "submission",
        entity_id: String(requirement.id),
        meta: { status: nextStatus },
      });

      setMessage("Link saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSavingId(null);
    }
  }


  return (
    <AuthGate>
      {({ user }) => (
        <div className="flex flex-1 flex-col">
          <header className="border-b border-emerald-100 bg-white/70 px-6 py-5 backdrop-blur">
            <div className="mx-auto flex w-full max-w-5xl items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-900">My Group</div>
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

            {message ? (
              <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {message}
              </div>
            ) : null}

            {!group ? (
              <div className="glass-panel rounded-3xl p-6">
                <p className="text-sm text-zinc-700">
                  No group assigned yet. Ask your coordinator to add you to a
                  group.
                </p>
                <div className="mt-4">
                  <Link
                    href="/"
                    className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                  >
                    Back to dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <section className="glass-panel rounded-3xl p-6">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div>
                      <div className="text-sm font-semibold text-emerald-950">
                        {group.title ?? "Untitled Research"}
                      </div>
                      <div className="mt-2 text-xs text-emerald-700">
                        Stage: {stageLabels[group.stage]}
                      </div>
                      <div className="mt-1 text-xs text-emerald-700">
                        {group.sections?.program ?? "Program not set"}
                        {group.sections?.name ? ` • ${group.sections.name}` : ""}
                        {group.adviser_name ? ` • Adviser: ${group.adviser_name}` : ""}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="rounded-full border border-emerald-100 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800">
                        {completedStudentReqs}/{totalStudentReqs} complete
                      </div>
                      <div className="rounded-full border border-emerald-100 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800">
                        {progressValue}% overall
                      </div>
                      <div className="rounded-full border border-emerald-100 bg-white/80 px-3 py-1 text-xs font-semibold text-emerald-800">
                        {stageLabels[group.stage]}
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 rounded-2xl bg-emerald-50/70 p-4">
                    <ProgressBar value={progressValue} label="Checklist progress" />
                  </div>
                </section>

                <section className="grid gap-6 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
                  <aside className="space-y-4">
                    {(["title", "proposal", "final"] as const).map((stage) => {
                      const stageRequirements = requirements.filter(
                        (r) => r.stage === stage && r.owner === "student",
                      );
                      if (stageRequirements.length === 0) return null;
                      const locked = isStageLocked(stage);
                      const requiredInStage = stageRequirements.filter((r) => r.owner === "student" && isRequired(r));
                      const completedInStage = requiredInStage.filter((r) => isApproved(r.id)).length;
                      const isOpen = openStages[stage];

                      return (
                        <div key={stage} className="rounded-3xl border border-emerald-100 bg-white/80 p-4 shadow-sm">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenStages((prev) => ({ ...prev, [stage]: !prev[stage] }))
                            }
                            className="flex w-full items-center justify-between text-left"
                          >
                            <div>
                              <div className="text-sm font-semibold text-emerald-900">
                                {stageLabels[stage]}
                              </div>
                              <div className="mt-1 text-[11px] text-zinc-500">
                                {locked ? "Locked" : "Tap to view requirements"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                                {locked ? "Locked" : `${completedInStage}/${requiredInStage.length}`}
                              </div>
                              <span
                                className={`text-emerald-700 transition ${
                                  isOpen ? "rotate-180" : "rotate-0"
                                }`}
                              >
                                v
                              </span>
                            </div>
                          </button>
                          {isOpen ? (
                            <div className="mt-3 space-y-2">
                              {stageRequirements.map((req) => {
                                const submission = getSubmission(req.id);
                                const required = isRequired(req);
                                const statusLabel = submission?.status ?? "missing";
                                const statusMeta = getStatusMeta(statusLabel);
                                const isSelected = selectedRequirementId === req.id;

                                return (
                                  <button
                                    key={req.id}
                                    type="button"
                                    onClick={() => setSelectedRequirementId(req.id)}
                                    className={`w-full rounded-2xl border px-3 py-2 text-left text-xs transition ${
                                      isSelected
                                        ? "border-emerald-300 bg-emerald-50"
                                        : "border-emerald-100 bg-white/70 hover:border-emerald-200"
                                    }`}
                                  >
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="font-semibold text-emerald-900">
                                        {req.code ? `${req.code} — ${req.name}` : req.name}
                                      </div>
                                      <span
                                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                                          statusMeta.className
                                        }`}
                                      >
                                        {statusMeta.icon}
                                        {statusMeta.label}
                                      </span>
                                    </div>
                                    <div className="mt-1 flex items-center gap-2 text-[11px] text-zinc-500">
                                      {required ? "Required" : "Optional"}
                                      {locked ? "• Locked" : ""}
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          ) : null}
                        </div>
                      );
                    })}
                  </aside>

                  <div className="space-y-6">
                    <section className="glass-panel rounded-3xl p-6">
                      <div className="section-title">Checklist details</div>
                      {!selectedRequirement ? (
                        <div className="mt-4 text-sm text-zinc-600">
                          Select a requirement from the left to see details.
                        </div>
                      ) : (
                        <div className="mt-4 space-y-4">
                          <div>
                            <div className="text-base font-semibold text-emerald-950">
                              {selectedRequirement.code
                                ? `${selectedRequirement.code} — ${selectedRequirement.name}`
                                : selectedRequirement.name}
                            </div>
                            <div className="mt-2 flex flex-wrap gap-2 text-[11px] font-semibold text-emerald-700">
                              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5">
                                {stageLabels[selectedRequirement.stage]}
                              </span>
                              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5">
                                {timingLabels[selectedRequirement.timing]}
                              </span>
                              <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5">
                                {selectedRequirement.owner === "teacher" ? "Teacher" : "Student"}
                              </span>
                              {selectedRequirement.is_optional ? (
                                <span className="rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5">
                                  {selectedRequired ? "Required" : "Optional"}
                                </span>
                              ) : null}
                              <span className={`flex items-center gap-1 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 ${
                                getStatusMeta(selectedSubmission?.status ?? "missing").className
                              }`}>
                                {getStatusMeta(selectedSubmission?.status ?? "missing").icon}
                                {getStatusMeta(selectedSubmission?.status ?? "missing").label}
                              </span>
                            </div>
                          </div>

                          {selectedLocked ? (
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                              This stage unlocks after the previous stage is approved.
                            </div>
                          ) : null}

                          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                            <div className="text-xs font-semibold text-emerald-900">Teacher comments</div>
                            <div className="mt-2 text-sm text-zinc-600">
                              {selectedSubmission?.remarks ?? "No comments yet."}
                            </div>
                            {selectedSubmission?.reviewed_at ? (
                              <div className="mt-2 text-xs text-zinc-500">
                                Last reviewed: {new Date(selectedSubmission.reviewed_at).toLocaleString()}
                              </div>
                            ) : null}
                          </div>

                          <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                            <div className="text-xs font-semibold text-emerald-900">Drive link</div>
                            <div className="mt-2 flex flex-col gap-3">
                              <input
                                type="url"
                                value={driveUrls[selectedRequirement.id] ?? ""}
                                onChange={(event) =>
                                  setDriveUrls((prev) => ({
                                    ...prev,
                                    [selectedRequirement.id]: event.target.value,
                                  }))
                                }
                                placeholder={
                                  selectedRequirement.owner === "teacher"
                                    ? "Teacher-only form"
                                    : "Paste Google Drive link"
                                }
                                disabled={
                                  selectedRequirement.owner === "teacher" ||
                                  selectedSubmission?.status === "approved" ||
                                  selectedLocked ||
                                  (!selectedRequired && selectedRequirement.is_optional)
                                }
                                className="w-full rounded-2xl border border-emerald-100 px-3 py-2 text-sm text-zinc-800 disabled:bg-zinc-100"
                              />
                              {selectedSubmission?.drive_url ? (
                                <a
                                  href={selectedSubmission.drive_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-xs font-semibold text-emerald-700 hover:text-emerald-800"
                                >
                                  Open current link
                                </a>
                              ) : null}
                              <div className="flex flex-wrap items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => saveLink(selectedRequirement)}
                                  disabled={
                                    selectedRequirement.owner === "teacher" ||
                                    selectedSubmission?.status === "approved" ||
                                    savingId === selectedRequirement.id ||
                                    selectedLocked ||
                                    (!selectedRequired && selectedRequirement.is_optional)
                                  }
                                  className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                >
                                  {savingId === selectedRequirement.id
                                    ? "Saving..."
                                    : selectedSubmission?.status === "needs_revision"
                                    ? "Resubmit"
                                    : "Save link"}
                                </button>
                                {selectedRequirement.owner === "teacher" ? (
                                  <span className="text-xs text-zinc-500">
                                    This form is handled by teachers.
                                  </span>
                                ) : null}
                                {selectedSubmission?.status === "approved" ? (
                                  <span className="text-xs font-semibold text-emerald-600">
                                    Approved
                                  </span>
                                ) : null}
                                {!selectedRequired && selectedRequirement.is_optional ? (
                                  <span className="text-xs text-zinc-500">
                                    Optional until required by your coordinator.
                                  </span>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </section>

                    <section className="glass-panel rounded-3xl p-6">
                      <div className="section-title">Defense schedule</div>
                      <div className="mt-3 space-y-2 text-sm text-zinc-700">
                        {defenses.length === 0 ? (
                          <div className="text-xs text-zinc-500">
                            No defense schedule yet.
                          </div>
                        ) : (
                          defenses.map((defense) => (
                            <div key={defense.id} className="rounded-2xl border border-emerald-100 bg-white/80 p-3">
                              <div className="text-sm font-medium text-zinc-900">
                                {stageLabels[defense.stage]}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                {defense.schedule_datetime
                                  ? new Date(defense.schedule_datetime).toLocaleString()
                                  : "Schedule not set"}
                              </div>
                              <div className="mt-1 text-xs text-zinc-500">
                                {defense.venue_or_meet_link ?? "Venue not set"}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </section>

                  </div>
                </section>

                <div>
                  <Link
                    href="/"
                    className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
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
