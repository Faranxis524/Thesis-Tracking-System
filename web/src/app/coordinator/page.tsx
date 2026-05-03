"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AuthGate } from "@/components/AuthGate";
import { LogoutButton } from "@/components/LogoutButton";
import { ensureProfile, type Profile } from "@/lib/profile";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

type Term = {
  id: number;
  name: string;
  starts_on: string | null;
  ends_on: string | null;
};

type College = {
  id: number;
  name: string;
};

type Section = {
  id: number;
  term_id: number | null;
  college_id?: number | null;
  program: string;
  name: string;
};

type Group = {
  id: number;
  title: string | null;
  stage: "title" | "proposal" | "final";
  section_id: number | null;
  status?: "pending" | "active" | null;
  sections?: {
    id: number;
    name: string;
    program: string;
    term_id: number | null;
    college_id?: number | null;
  } | null;
  adviser_name: string | null;
  term_id: number | null;
};

type RequirementSummary = {
  name: string;
  code: string | null;
  stage: "title" | "proposal" | "final";
  timing: "before" | "after";
  owner: "student" | "teacher";
};

type Requirement = RequirementSummary & {
  id: number;
};

type FormOpening = {
  id: number;
  requirement_id: number;
  term_id: number | null;
  college_id: number | null;
  section_id: number | null;
  deadline_at: string | null;
  is_open: boolean;
};

type GroupSummary = {
  title: string | null;
  section_id: number | null;
  sections?: {
    id: number;
    name: string;
    program: string;
    term_id: number | null;
  } | {
    id: number;
    name: string;
    program: string;
    term_id: number | null;
  }[] | null;
};

type SubmissionRow = {
  id: number;
  group_id: number;
  requirement_id: number;
  drive_url: string | null;
  status: "missing" | "submitted" | "approved" | "needs_revision" | "resubmitted";
  submitted_at: string | null;
  requirements?: RequirementSummary | RequirementSummary[] | null;
  groups?: GroupSummary | GroupSummary[] | null;
};

type DefenseForm = {
  group_id: string;
  stage: "title" | "proposal" | "final";
  schedule_datetime: string;
  venue_or_meet_link: string;
};

type RevisionForm = {
  group_id: string;
  stage: "proposal" | "final";
  description: string;
  due_date: string;
};

export default function CoordinatorPage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const [terms, setTerms] = useState<Term[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [groups, setGroups] = useState<Group[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionRow[]>([]);
  const [requirements, setRequirements] = useState<Requirement[]>([]);
  const [formOpenings, setFormOpenings] = useState<FormOpening[]>([]);
  const [savingFormOpenings, setSavingFormOpenings] = useState(false);

  const [termName, setTermName] = useState("");
  const [termStart, setTermStart] = useState("");
  const [termEnd, setTermEnd] = useState("");

  const [collegeName, setCollegeName] = useState("");

  const [sectionForm, setSectionForm] = useState({
    term_id: "",
    college_id: "",
    program: "",
    name: "",
  });

  const [reviewRemarks, setReviewRemarks] = useState<Record<number, string>>({});
  const [busySubmissionId, setBusySubmissionId] = useState<number | null>(null);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"submissions" | "schedules" | "forms">("submissions");

  const [defenseForm, setDefenseForm] = useState<DefenseForm>({
    group_id: "",
    stage: "proposal",
    schedule_datetime: "",
    venue_or_meet_link: "",
  });

  const [revisionForm, setRevisionForm] = useState<RevisionForm>({
    group_id: "",
    stage: "proposal",
    description: "",
    due_date: "",
  });

  const [termFilter, setTermFilter] = useState("");
  const [collegeFilter, setCollegeFilter] = useState("");
  const [sectionFilter, setSectionFilter] = useState("");
  const [stageFilter, setStageFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("selected");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formFilter, setFormFilter] = useState("all");

  const [formOpeningForm, setFormOpeningForm] = useState({
    requirement_id: "",
    term_id: "",
    college_id: "",
    deadline_at: "",
    is_open: true,
    sectionIds: [] as string[],
  });

  function getRequirement(row: SubmissionRow) {
    if (!row.requirements) return null;
    return Array.isArray(row.requirements) ? row.requirements[0] ?? null : row.requirements;
  }

  function getGroup(row: SubmissionRow) {
    if (!row.groups) return null;
    return Array.isArray(row.groups) ? row.groups[0] ?? null : row.groups;
  }

  function getGroupSectionTermId(group: GroupSummary | null) {
    if (!group?.sections) return null;
    if (Array.isArray(group.sections)) {
      return group.sections[0]?.term_id ?? null;
    }
    return group.sections.term_id;
  }

  function getGroupSectionCollegeId(group: GroupSummary | null) {
    if (!group?.sections) return null;
    if (Array.isArray(group.sections)) {
      return group.sections[0]?.college_id ?? null;
    }
    return group.sections.college_id ?? null;
  }

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

        if (p.role !== "coordinator" && p.role !== "admin") return;

        const [
          { data: termData, error: termError },
          { data: collegeData, error: collegeError },
          { data: sectionData, error: sectionError },
          { data: groupData, error: groupError },
          { data: requirementData, error: requirementError },
          { data: formOpeningData, error: formOpeningError },
          { data: submissionData, error: submissionError },
        ] =
          await Promise.all([
            supabase
              .from("terms")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase
              .from("colleges")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase
              .from("sections")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase
              .from("groups")
              .select("*, sections(id,name,program,term_id,college_id)")
              .order("created_at", { ascending: false }),
            supabase
              .from("requirements")
              .select("id,name,code,stage,timing,owner")
              .order("stage", { ascending: true })
              .order("name", { ascending: true }),
            supabase
              .from("form_openings")
              .select("*")
              .order("created_at", { ascending: false }),
            supabase
              .from("submissions")
              .select(
                "id,group_id,requirement_id,drive_url,status,submitted_at,requirements(name,code,stage,timing,owner),groups(title,section_id,sections(id,name,program,term_id,college_id))",
              )
              .in("status", ["submitted", "needs_revision", "resubmitted"]) // only reviewable items
              .order("submitted_at", { ascending: true }),
          ]);

        if (termError) throw termError;
        if (collegeError) throw collegeError;
        if (sectionError) throw sectionError;
        if (groupError) throw groupError;
        if (requirementError) throw requirementError;
        if (formOpeningError) throw formOpeningError;
        if (submissionError) throw submissionError;

        if (!cancelled) {
          setTerms((termData ?? []) as Term[]);
          setColleges((collegeData ?? []) as College[]);
          setSections((sectionData ?? []) as Section[]);
          setGroups((groupData ?? []) as Group[]);
          setRequirements((requirementData ?? []) as Requirement[]);
          setFormOpenings((formOpeningData ?? []) as FormOpening[]);
          setSubmissions((submissionData ?? []) as SubmissionRow[]);
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

  const termOptions = useMemo(() => terms, [terms]);
  const collegeOptions = useMemo(() => colleges, [colleges]);
  const sectionOptions = useMemo(() => sections, [sections]);

  const filteredGroups = useMemo(() => {
    return groups.filter((group) => {
      if (group.status && group.status !== "active") return false;
      if (termFilter && String(group.sections?.term_id ?? "") !== termFilter) return false;
      if (collegeFilter && String(group.sections?.college_id ?? "") !== collegeFilter) return false;
      if (sectionFilter && String(group.section_id ?? "") !== sectionFilter) return false;
      if (stageFilter !== "all" && group.stage !== stageFilter) return false;
      return true;
    });
  }, [groups, termFilter, collegeFilter, sectionFilter, stageFilter]);

  useEffect(() => {
    if (terms.length === 0 || termFilter) return;
    setTermFilter(String(terms[0].id));
  }, [terms, termFilter]);

  useEffect(() => {
    if (!termFilter) return;
    const availableCollegeIds = sections
      .filter((section) => String(section.term_id ?? "") === termFilter)
      .map((section) => String(section.college_id ?? ""))
      .filter((id) => id);
    if (availableCollegeIds.length === 0) return;
    if (collegeFilter && availableCollegeIds.includes(collegeFilter)) return;
    setCollegeFilter(availableCollegeIds[0]);
  }, [sections, termFilter, collegeFilter]);

  useEffect(() => {
    if (!termFilter) return;
    const currentSection = sections.find(
      (section) => String(section.id) === sectionFilter,
    );
    if (
      currentSection &&
      String(currentSection.term_id ?? "") === termFilter &&
      (!collegeFilter || String(currentSection.college_id ?? "") === collegeFilter)
    ) {
      return;
    }
    const firstSection = sections.find(
      (section) =>
        String(section.term_id ?? "") === termFilter &&
        (!collegeFilter || String(section.college_id ?? "") === collegeFilter),
    );
    if (!firstSection) return;
    setSectionFilter(String(firstSection.id));
  }, [sections, termFilter, collegeFilter, sectionFilter]);

  useEffect(() => {
    if (!sectionFilter) return;
    const currentGroup = groups.find((group) => group.id === selectedGroupId);
    if (currentGroup && String(currentGroup.section_id ?? "") === sectionFilter) {
      return;
    }
    const firstGroup = groups.find(
      (group) => String(group.section_id ?? "") === sectionFilter,
    );
    if (!firstGroup) return;
    setSelectedGroupId(firstGroup.id);
  }, [groups, sectionFilter, selectedGroupId]);

  useEffect(() => {
    if (!selectedGroupId) return;
    setDefenseForm((prev) => ({ ...prev, group_id: String(selectedGroupId) }));
    setRevisionForm((prev) => ({ ...prev, group_id: String(selectedGroupId) }));
  }, [selectedGroupId]);

  const filteredSubmissions = useMemo(() => {
    const resolvedGroupId =
      groupFilter === "selected" ? selectedGroupId : groupFilter ? Number(groupFilter) : null;

    return submissions.filter((row) => {
      const requirement = getRequirement(row);
      const group = getGroup(row);
      if (stageFilter !== "all" && requirement?.stage !== stageFilter) return false;
      const termId = getGroupSectionTermId(group);
      if (termFilter && String(termId ?? "") !== termFilter) return false;
      const collegeId = getGroupSectionCollegeId(group);
      if (collegeFilter && String(collegeId ?? "") !== collegeFilter) return false;
      if (sectionFilter && String(group?.section_id ?? "") !== sectionFilter) return false;
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (formFilter !== "all" && String(row.requirement_id) !== formFilter) return false;
      if (resolvedGroupId && row.group_id !== resolvedGroupId) return false;
      return true;
    });
  }, [
    submissions,
    termFilter,
    collegeFilter,
    sectionFilter,
    stageFilter,
    statusFilter,
    formFilter,
    groupFilter,
    selectedGroupId,
  ]);

  const selectedGroup = useMemo(() => {
    if (!selectedGroupId) return null;
    return groups.find((group) => group.id === selectedGroupId) ?? null;
  }, [groups, selectedGroupId]);

  const pendingByGroup = useMemo(() => {
    const map = new Map<number, number>();
    filteredSubmissions.forEach((row) => {
      map.set(row.group_id, (map.get(row.group_id) ?? 0) + 1);
    });
    return map;
  }, [filteredSubmissions]);

  async function logAudit(action: string, entityType: string, entityId?: string, meta?: Record<string, unknown>) {
    try {
      const supabase = getSupabaseBrowserClient();
      await supabase.from("audit_logs").insert({
        action,
        entity_type: entityType,
        entity_id: entityId ?? null,
        meta: meta ?? null,
      });
    } catch {
      // Audit log failures should not block the main action.
    }
  }

  async function createTerm() {
    setError(null);
    setInfo(null);
    const name = termName.trim();
    if (!name) {
      setError("Term name is required.");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("terms")
        .insert({
          name,
          starts_on: termStart || null,
          ends_on: termEnd || null,
        })
        .select("*")
        .single();

      if (error) throw error;
      setTerms((prev) => [data as Term, ...prev]);
      setTermName("");
      setTermStart("");
      setTermEnd("");
      await logAudit("term_created", "terms", String((data as Term).id));
      setInfo("Term created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create term failed");
    }
  }

  async function createCollege() {
    setError(null);
    setInfo(null);
    const name = collegeName.trim();
    if (!name) {
      setError("College name is required.");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("colleges")
        .insert({ name })
        .select("*")
        .single();

      if (error) throw error;
      setColleges((prev) => [data as College, ...prev]);
      setCollegeName("");
      await logAudit("college_created", "colleges", String((data as College).id));
      setInfo("College created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create college failed");
    }
  }

  async function createSection() {
    setError(null);
    setInfo(null);
    const name = sectionForm.name.trim();
    if (!sectionForm.term_id) {
      setError("Please select a term for the section.");
      return;
    }
    if (!sectionForm.college_id) {
      setError("Please select a college for the section.");
      return;
    }
    if (!name) {
      setError("Section name is required.");
      return;
    }

    const selectedCollege = colleges.find(
      (college) => String(college.id) === sectionForm.college_id,
    );

    try {
      const supabase = getSupabaseBrowserClient();
      const { data, error } = await supabase
        .from("sections")
        .insert({
          term_id: Number(sectionForm.term_id),
          college_id: Number(sectionForm.college_id),
          program: sectionForm.program.trim(),
          name,
        })
        .select("*")
        .single();

      if (error) throw error;
      setSections((prev) => [data as Section, ...prev]);
      setSectionForm((prev) => ({
        ...prev,
        name: "",
        program: selectedCollege?.name ?? prev.program,
      }));
      await logAudit("section_created", "sections", String((data as Section).id));
      setInfo("Section created.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Create section failed");
    }
  }

  async function reviewSubmission(
    row: SubmissionRow,
    status: "approved" | "needs_revision",
  ) {
    setError(null);
    setInfo(null);
    setBusySubmissionId(row.id);

    try {
      const supabase = getSupabaseBrowserClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not signed in");

      const { error } = await supabase
        .from("submissions")
        .update({
          status,
          remarks: reviewRemarks[row.id] ?? null,
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", row.id);

      if (error) throw error;
      const requirement = getRequirement(row);

      if (status === "approved" && requirement?.code === "PNC:PRE-FO-64/65") {
        await supabase
          .from("groups")
          .update({ status: "active" })
          .eq("id", row.group_id);

        setGroups((prev) =>
          prev.map((item) =>
            item.id === row.group_id ? { ...item, status: "active" } : item,
          ),
        );
      }

      setSubmissions((prev) => prev.filter((item) => item.id !== row.id));
      setReviewRemarks((prev) => ({ ...prev, [row.id]: "" }));
      await logAudit("submission_reviewed", "submissions", String(row.id), { status });
      setInfo("Review saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Review failed");
    } finally {
      setBusySubmissionId(null);
    }
  }

  async function scheduleDefense() {
    setError(null);
    setInfo(null);

    if (!defenseForm.group_id) {
      setError("Select a group for the defense.");
      return;
    }
    if (!defenseForm.schedule_datetime) {
      setError("Defense date and time are required.");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("defenses").insert({
        group_id: Number(defenseForm.group_id),
        stage: defenseForm.stage,
        schedule_datetime: defenseForm.schedule_datetime,
        venue_or_meet_link: defenseForm.venue_or_meet_link.trim() || null,
      });

      if (error) throw error;
      setDefenseForm((prev) => ({
        ...prev,
        schedule_datetime: "",
        venue_or_meet_link: "",
      }));
      await logAudit("defense_scheduled", "defenses", defenseForm.group_id, {
        stage: defenseForm.stage,
      });
      setInfo("Defense scheduled.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Schedule failed");
    }
  }

  async function addRevisionItem() {
    setError(null);
    setInfo(null);

    if (!revisionForm.group_id) {
      setError("Select a group for the revision item.");
      return;
    }
    if (!revisionForm.description.trim()) {
      setError("Revision description is required.");
      return;
    }

    try {
      const supabase = getSupabaseBrowserClient();
      const { error } = await supabase.from("revision_items").insert({
        group_id: Number(revisionForm.group_id),
        stage: revisionForm.stage,
        description: revisionForm.description.trim(),
        due_date: revisionForm.due_date || null,
      });

      if (error) throw error;
      setRevisionForm((prev) => ({
        ...prev,
        description: "",
        due_date: "",
      }));
      await logAudit("revision_added", "revision_items", revisionForm.group_id, {
        stage: revisionForm.stage,
      });
      setInfo("Revision item added.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Add revision failed");
    }
  }

  function toggleFormSection(sectionId: string) {
    setFormOpeningForm((prev) => {
      const exists = prev.sectionIds.includes(sectionId);
      return {
        ...prev,
        sectionIds: exists
          ? prev.sectionIds.filter((id) => id !== sectionId)
          : [...prev.sectionIds, sectionId],
      };
    });
  }

  async function saveFormOpenings() {
    setError(null);
    setInfo(null);

    if (!formOpeningForm.requirement_id) {
      setError("Select a form requirement.");
      return;
    }
    if (!formOpeningForm.term_id) {
      setError("Select a term.");
      return;
    }
    if (!formOpeningForm.college_id) {
      setError("Select a college.");
      return;
    }
    if (formOpeningForm.sectionIds.length === 0) {
      setError("Select at least one section.");
      return;
    }

    setSavingFormOpenings(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const payload = formOpeningForm.sectionIds.map((sectionId) => ({
        requirement_id: Number(formOpeningForm.requirement_id),
        term_id: Number(formOpeningForm.term_id),
        college_id: Number(formOpeningForm.college_id),
        section_id: Number(sectionId),
        deadline_at: formOpeningForm.deadline_at || null,
        is_open: formOpeningForm.is_open,
      }));

      const { data, error } = await supabase
        .from("form_openings")
        .upsert(payload, {
          onConflict: "requirement_id,term_id,college_id,section_id",
        })
        .select("*");

      if (error) throw error;

      if (data) {
        setFormOpenings((prev) => {
          const existingIds = new Set((data as FormOpening[]).map((item) => item.id));
          const filtered = prev.filter((item) => !existingIds.has(item.id));
          return [...(data as FormOpening[]), ...filtered];
        });
      }

      await logAudit("form_opened", "form_openings", formOpeningForm.requirement_id, {
        sections: formOpeningForm.sectionIds,
      });

      setInfo("Form openings saved.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save form openings failed");
    } finally {
      setSavingFormOpenings(false);
    }
  }

  return (
    <AuthGate>
      {({ user }) => (
        <div className="flex flex-1 flex-col">
          <header className="border-b border-emerald-100 bg-white/70 px-6 py-5 backdrop-blur">
            <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-emerald-900">
                  Coordinator Command Center
                </div>
                <div className="text-xs text-emerald-800/70">{user.email}</div>
              </div>
              <LogoutButton />
            </div>
          </header>

          <main className="mx-auto w-full max-w-6xl p-6">
            {error ? (
              <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                {error}
              </div>
            ) : null}

            {info ? (
              <div className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">
                {info}
              </div>
            ) : null}

            {profile && profile.role !== "coordinator" && profile.role !== "admin" ? (
              <div className="glass-panel rounded-3xl p-6">
                <p className="text-sm text-zinc-700">
                  Your account is not a coordinator yet.
                </p>
                <div className="mt-4 flex items-center gap-3">
                  <Link
                    href="/request-coordinator"
                    className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                  >
                    Request coordinator access
                  </Link>
                  <span className="text-xs text-zinc-400">•</span>
                  <Link
                    href="/"
                    className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                  >
                    Back to dashboard
                  </Link>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
                <aside className="space-y-4">
                  <div className="glass-panel rounded-3xl p-4">
                    <div className="section-title">Create</div>
                    <details className="mt-3 rounded-2xl border border-emerald-100 bg-white/80 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-emerald-800">
                        Add term
                      </summary>
                      <div className="mt-3 grid gap-2">
                        <input
                          value={termName}
                          onChange={(event) => setTermName(event.target.value)}
                          placeholder="AY 2025-2026 / 2nd Sem"
                          className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                        />
                        <input
                          type="date"
                          value={termStart}
                          onChange={(event) => setTermStart(event.target.value)}
                          className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                        />
                        <input
                          type="date"
                          value={termEnd}
                          onChange={(event) => setTermEnd(event.target.value)}
                          className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={createTerm}
                        className="mt-3 w-full rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        Add term
                      </button>
                    </details>
                    <details className="mt-3 rounded-2xl border border-emerald-100 bg-white/80 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-emerald-800">
                        Add college
                      </summary>
                      <div className="mt-3 grid gap-2">
                        <input
                          value={collegeName}
                          onChange={(event) =>
                            setCollegeName(event.target.value)
                          }
                          placeholder="College name"
                          className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={createCollege}
                        className="mt-3 w-full rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        Add college
                      </button>
                    </details>
                    <details className="mt-3 rounded-2xl border border-emerald-100 bg-white/80 p-3">
                      <summary className="cursor-pointer text-xs font-semibold text-emerald-800">
                        Add section
                      </summary>
                      <div className="mt-3 grid gap-2">
                        <select
                          value={sectionForm.term_id}
                          onChange={(event) =>
                            setSectionForm((prev) => ({
                              ...prev,
                              term_id: event.target.value,
                            }))
                          }
                          className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                        >
                          <option value="">Select term</option>
                          {termOptions.map((term) => (
                            <option key={term.id} value={term.id}>
                              {term.name}
                            </option>
                          ))}
                        </select>
                        <select
                          value={sectionForm.college_id}
                          onChange={(event) =>
                            setSectionForm((prev) => ({
                              ...prev,
                              college_id: event.target.value,
                              program:
                                colleges.find(
                                  (college) => String(college.id) === event.target.value,
                                )?.name ?? prev.program,
                            }))
                          }
                          className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                        >
                          <option value="">Select college</option>
                          {collegeOptions.map((college) => (
                            <option key={college.id} value={college.id}>
                              {college.name}
                            </option>
                          ))}
                        </select>
                        <input
                          value={sectionForm.name}
                          onChange={(event) =>
                            setSectionForm((prev) => ({
                              ...prev,
                              name: event.target.value,
                            }))
                          }
                          placeholder="Section name"
                          className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={createSection}
                        className="mt-3 w-full rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                      >
                        Add section
                      </button>
                    </details>
                  </div>

                  <div className="glass-panel rounded-3xl p-4">
                    <div className="section-title">Terms</div>
                    <div className="mt-3 space-y-2">
                      {terms.length === 0 ? (
                        <div className="text-xs text-emerald-700">No terms yet.</div>
                      ) : (
                        terms.map((term) => (
                          <button
                            key={term.id}
                            type="button"
                            onClick={() => {
                              setTermFilter(String(term.id));
                              setCollegeFilter("");
                              setSectionFilter("");
                              setSelectedGroupId(null);
                            }}
                            className={`w-full rounded-2xl border px-3 py-2 text-left text-xs font-semibold transition ${
                              termFilter === String(term.id)
                                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                : "border-emerald-100 bg-white/80 text-emerald-800 hover:border-emerald-200"
                            }`}
                          >
                            {term.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="glass-panel rounded-3xl p-4">
                    <div className="section-title">Colleges</div>
                    <div className="mt-3 space-y-2">
                      {!termFilter ? (
                        <div className="text-xs text-emerald-700">
                          Select a term to view colleges.
                        </div>
                      ) : collegeOptions.length === 0 ? (
                        <div className="text-xs text-emerald-700">No colleges yet.</div>
                      ) : (
                        collegeOptions.map((college) => (
                          <button
                            key={college.id}
                            type="button"
                            onClick={() => {
                              setCollegeFilter(String(college.id));
                              setSectionFilter("");
                              setSelectedGroupId(null);
                            }}
                            className={`w-full rounded-2xl border px-3 py-2 text-left text-xs transition ${
                              collegeFilter === String(college.id)
                                ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                : "border-emerald-100 bg-white/80 text-emerald-800 hover:border-emerald-200"
                            }`}
                          >
                            {college.name}
                          </button>
                        ))
                      )}
                    </div>
                  </div>

                  <div className="glass-panel rounded-3xl p-4">
                    <div className="section-title">Sections</div>
                    <div className="mt-3 space-y-2">
                      {!termFilter ? (
                        <div className="text-xs text-emerald-700">
                          Select a term to view sections.
                        </div>
                      ) : (
                        sectionOptions
                          .filter(
                            (section) =>
                              String(section.term_id ?? "") === termFilter &&
                              (!collegeFilter || String(section.college_id ?? "") === collegeFilter),
                          )
                          .map((section) => (
                            <button
                              key={section.id}
                              type="button"
                              onClick={() => {
                                setSectionFilter(String(section.id));
                                setSelectedGroupId(null);
                              }}
                              className={`w-full rounded-2xl border px-3 py-2 text-left text-xs transition ${
                                sectionFilter === String(section.id)
                                  ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                  : "border-emerald-100 bg-white/80 text-emerald-800 hover:border-emerald-200"
                              }`}
                            >
                              {section.program} • {section.name}
                            </button>
                          ))
                      )}
                    </div>
                  </div>

                  <div className="glass-panel rounded-3xl p-4">
                    <div className="section-title">Groups</div>
                    <div className="mt-3 space-y-2">
                      {!sectionFilter ? (
                        <div className="text-xs text-emerald-700">
                          Select a section to view groups.
                        </div>
                      ) : (
                        filteredGroups
                          .filter((group) => String(group.section_id ?? "") === sectionFilter)
                          .map((group) => {
                            const pendingCount = pendingByGroup.get(group.id) ?? 0;
                            return (
                              <button
                                key={group.id}
                                type="button"
                                onClick={() => {
                                  setSelectedGroupId(group.id);
                                  if (group.sections?.term_id) {
                                    setTermFilter(String(group.sections.term_id));
                                  }
                                  if (group.sections?.college_id) {
                                    setCollegeFilter(String(group.sections.college_id));
                                  }
                                  if (group.section_id) {
                                    setSectionFilter(String(group.section_id));
                                  }
                                }}
                                className={`w-full rounded-2xl border px-3 py-2 text-left text-xs transition ${
                                  selectedGroupId === group.id
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                                    : "border-emerald-100 bg-white/80 text-emerald-800 hover:border-emerald-200"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <span className="font-semibold">
                                    {group.title ?? `Group ${group.id}`}
                                  </span>
                                  {pendingCount > 0 ? (
                                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                                      {pendingCount}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="mt-1 text-[11px] text-emerald-700">
                                  {group.stage} stage
                                </div>
                              </button>
                            );
                          })
                      )}
                    </div>
                  </div>
                </aside>

                <div className="space-y-6">
                  <section className="glass-panel rounded-3xl p-6">
                    <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                      <div>
                        <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                          Selected group
                        </div>
                        <div className="mt-2 text-lg font-semibold text-emerald-950">
                          {selectedGroup?.title ?? "Select a group from the sidebar"}
                        </div>
                        {selectedGroup ? (
                          <div className="mt-1 text-xs text-emerald-700">
                            {selectedGroup.sections?.program ?? "Program not set"}
                            {selectedGroup.sections?.name ? ` • ${selectedGroup.sections.name}` : ""}
                            {selectedGroup.adviser_name ? ` • Adviser: ${selectedGroup.adviser_name}` : ""}
                          </div>
                        ) : null}
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setActiveTab("submissions")}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                            activeTab === "submissions"
                              ? "bg-emerald-600 text-white"
                              : "border border-emerald-200 bg-white text-emerald-800"
                          }`}
                        >
                          Submissions
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("schedules")}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                            activeTab === "schedules"
                              ? "bg-emerald-600 text-white"
                              : "border border-emerald-200 bg-white text-emerald-800"
                          }`}
                        >
                          Schedules
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveTab("forms")}
                          className={`rounded-full px-4 py-1.5 text-xs font-semibold transition ${
                            activeTab === "forms"
                              ? "bg-emerald-600 text-white"
                              : "border border-emerald-200 bg-white text-emerald-800"
                          }`}
                        >
                          Forms
                        </button>
                        {selectedGroup ? (
                          <Link
                            href={`/coordinator/groups/${selectedGroup.id}`}
                            className="rounded-full border border-emerald-200 px-4 py-1.5 text-xs font-semibold text-emerald-800"
                          >
                            View group detail
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </section>

                  {activeTab === "submissions" ? (
                    <section className="glass-panel rounded-3xl p-6">
                      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div className="section-title">Submissions for review</div>
                        <div className="flex flex-wrap items-center gap-2">
                          <select
                            value={groupFilter}
                            onChange={(event) => setGroupFilter(event.target.value)}
                            className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                          >
                            <option value="selected">Selected group</option>
                            <option value="">All groups</option>
                            {filteredGroups.map((group) => (
                              <option key={group.id} value={group.id}>
                                {group.title ?? `Group ${group.id}`}
                              </option>
                            ))}
                          </select>
                          <select
                            value={formFilter}
                            onChange={(event) => setFormFilter(event.target.value)}
                            className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                          >
                            <option value="all">All forms</option>
                            {requirements.map((req) => (
                              <option key={req.id} value={req.id}>
                                {req.code ? `${req.code} - ${req.name}` : req.name}
                              </option>
                            ))}
                          </select>
                          <select
                            value={statusFilter}
                            onChange={(event) => setStatusFilter(event.target.value)}
                            className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                          >
                            <option value="all">All statuses</option>
                            <option value="submitted">Submitted</option>
                            <option value="resubmitted">Resubmitted</option>
                            <option value="needs_revision">Needs revision</option>
                          </select>
                          <select
                            value={stageFilter}
                            onChange={(event) => setStageFilter(event.target.value)}
                            className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                          >
                            <option value="all">All stages</option>
                            <option value="title">Title</option>
                            <option value="proposal">Proposal</option>
                            <option value="final">Final</option>
                          </select>
                        </div>
                      </div>
                      <div className="mt-4 space-y-3">
                        {groupFilter === "selected" && !selectedGroup ? (
                          <div className="text-sm text-emerald-700">
                            Select a group to review submissions.
                          </div>
                        ) : filteredSubmissions.length === 0 ? (
                          <div className="text-sm text-emerald-700">
                            No submissions waiting for review.
                          </div>
                        ) : (
                          filteredSubmissions.map((row) => {
                            const requirement = getRequirement(row);
                            return (
                              <div
                                key={row.id}
                                className="rounded-2xl border border-emerald-100 bg-white/80 p-4"
                              >
                                <div className="text-sm font-medium text-zinc-900">
                                  {requirement?.code
                                    ? `${requirement.code} - ${requirement.name}`
                                    : requirement?.name ?? "Requirement"}
                                </div>
                                <div className="mt-1 text-xs text-zinc-500">
                                  Stage: {requirement?.stage ?? ""} • Timing: {requirement?.timing ?? ""}
                                </div>
                                <div className="mt-2 text-xs text-zinc-500">
                                  Status: {row.status}
                                </div>
                                {row.drive_url ? (
                                  <a
                                    href={row.drive_url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="mt-2 inline-block text-xs font-medium text-zinc-900 underline"
                                  >
                                    Open Drive link
                                  </a>
                                ) : null}
                                <textarea
                                  value={reviewRemarks[row.id] ?? ""}
                                  onChange={(event) =>
                                    setReviewRemarks((prev) => ({
                                      ...prev,
                                      [row.id]: event.target.value,
                                    }))
                                  }
                                  placeholder="Comment (optional)"
                                  className="mt-3 w-full rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
                                />
                                <div className="mt-3 flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => reviewSubmission(row, "approved")}
                                    disabled={busySubmissionId === row.id}
                                    className="rounded-full bg-emerald-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => reviewSubmission(row, "needs_revision")}
                                    disabled={busySubmissionId === row.id}
                                    className="rounded-full bg-amber-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-amber-700 disabled:opacity-60"
                                  >
                                    Needs revision
                                  </button>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </section>
                  ) : activeTab === "schedules" ? (
                    <section className="glass-panel rounded-3xl p-6">
                      <div className="section-title">Schedules</div>
                      <div className="mt-4 grid gap-6 lg:grid-cols-2">
                        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                          <div className="text-xs font-semibold text-emerald-800">Schedule defense</div>
                          <div className="mt-3 grid gap-3">
                            <select
                              value={defenseForm.group_id}
                              onChange={(event) =>
                                setDefenseForm((prev) => ({
                                  ...prev,
                                  group_id: event.target.value,
                                }))
                              }
                              className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                            >
                              <option value="">Select group</option>
                              {filteredGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.title ?? `Group ${group.id}`}
                                </option>
                              ))}
                            </select>
                            <select
                              value={defenseForm.stage}
                              onChange={(event) =>
                                setDefenseForm((prev) => ({
                                  ...prev,
                                  stage: event.target.value as DefenseForm["stage"],
                                }))
                              }
                              className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                            >
                              <option value="title">Title</option>
                              <option value="proposal">Proposal</option>
                              <option value="final">Final</option>
                            </select>
                            <input
                              type="datetime-local"
                              value={defenseForm.schedule_datetime}
                              onChange={(event) =>
                                setDefenseForm((prev) => ({
                                  ...prev,
                                  schedule_datetime: event.target.value,
                                }))
                              }
                              className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                            />
                            <input
                              value={defenseForm.venue_or_meet_link}
                              onChange={(event) =>
                                setDefenseForm((prev) => ({
                                  ...prev,
                                  venue_or_meet_link: event.target.value,
                                }))
                              }
                              placeholder="Venue or Meet link"
                              className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={scheduleDefense}
                            className="mt-4 w-full rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                          >
                            Save defense schedule
                          </button>
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                          <div className="text-xs font-semibold text-emerald-800">Add revision item</div>
                          <div className="mt-3 grid gap-3">
                            <select
                              value={revisionForm.group_id}
                              onChange={(event) =>
                                setRevisionForm((prev) => ({
                                  ...prev,
                                  group_id: event.target.value,
                                }))
                              }
                              className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                            >
                              <option value="">Select group</option>
                              {filteredGroups.map((group) => (
                                <option key={group.id} value={group.id}>
                                  {group.title ?? `Group ${group.id}`}
                                </option>
                              ))}
                            </select>
                            <select
                              value={revisionForm.stage}
                              onChange={(event) =>
                                setRevisionForm((prev) => ({
                                  ...prev,
                                  stage: event.target.value as RevisionForm["stage"],
                                }))
                              }
                              className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                            >
                              <option value="proposal">Proposal</option>
                              <option value="final">Final</option>
                            </select>
                            <input
                              value={revisionForm.description}
                              onChange={(event) =>
                                setRevisionForm((prev) => ({
                                  ...prev,
                                  description: event.target.value,
                                }))
                              }
                              placeholder="Revision description"
                              className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                            />
                            <input
                              type="date"
                              value={revisionForm.due_date}
                              onChange={(event) =>
                                setRevisionForm((prev) => ({
                                  ...prev,
                                  due_date: event.target.value,
                                }))
                              }
                              className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={addRevisionItem}
                            className="mt-4 w-full rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                          >
                            Add revision item
                          </button>
                        </div>
                      </div>
                    </section>
                  ) : (
                    <section className="glass-panel rounded-3xl p-6">
                      <div className="section-title">Open forms</div>
                      <div className="mt-4 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,320px)]">
                        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                          <div className="text-xs font-semibold text-emerald-800">New opening</div>
                          <div className="mt-3 grid gap-3">
                            <select
                              value={formOpeningForm.requirement_id}
                              onChange={(event) =>
                                setFormOpeningForm((prev) => ({
                                  ...prev,
                                  requirement_id: event.target.value,
                                }))
                              }
                              className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                            >
                              <option value="">Select form</option>
                              {requirements.map((req) => (
                                <option key={req.id} value={req.id}>
                                  {req.code ? `${req.code} - ${req.name}` : req.name}
                                </option>
                              ))}
                            </select>
                            <select
                              value={formOpeningForm.term_id}
                              onChange={(event) =>
                                setFormOpeningForm((prev) => ({
                                  ...prev,
                                  term_id: event.target.value,
                                  sectionIds: [],
                                }))
                              }
                              className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                            >
                              <option value="">Select term</option>
                              {termOptions.map((term) => (
                                <option key={term.id} value={term.id}>
                                  {term.name}
                                </option>
                              ))}
                            </select>
                            <select
                              value={formOpeningForm.college_id}
                              onChange={(event) =>
                                setFormOpeningForm((prev) => ({
                                  ...prev,
                                  college_id: event.target.value,
                                  sectionIds: [],
                                }))
                              }
                              className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                            >
                              <option value="">Select college</option>
                              {collegeOptions.map((college) => (
                                <option key={college.id} value={college.id}>
                                  {college.name}
                                </option>
                              ))}
                            </select>
                            <input
                              type="datetime-local"
                              value={formOpeningForm.deadline_at}
                              onChange={(event) =>
                                setFormOpeningForm((prev) => ({
                                  ...prev,
                                  deadline_at: event.target.value,
                                }))
                              }
                              className="rounded-2xl border border-emerald-100 px-3 py-2 text-xs"
                            />
                            <label className="flex items-center gap-2 text-xs text-emerald-800">
                              <input
                                type="checkbox"
                                checked={formOpeningForm.is_open}
                                onChange={(event) =>
                                  setFormOpeningForm((prev) => ({
                                    ...prev,
                                    is_open: event.target.checked,
                                  }))
                                }
                              />
                              Form is open for submissions
                            </label>
                          </div>

                          <div className="mt-4">
                            <div className="text-xs font-semibold text-emerald-800">Sections</div>
                            <div className="mt-3 grid gap-2">
                              {sectionOptions
                                .filter(
                                  (section) =>
                                    (!formOpeningForm.term_id || String(section.term_id ?? "") === formOpeningForm.term_id) &&
                                    (!formOpeningForm.college_id || String(section.college_id ?? "") === formOpeningForm.college_id),
                                )
                                .map((section) => (
                                  <label
                                    key={section.id}
                                    className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50/40 px-3 py-2 text-xs text-emerald-800"
                                  >
                                    <input
                                      type="checkbox"
                                      checked={formOpeningForm.sectionIds.includes(String(section.id))}
                                      onChange={() => toggleFormSection(String(section.id))}
                                    />
                                    {section.program} • {section.name}
                                  </label>
                                ))}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={saveFormOpenings}
                            disabled={savingFormOpenings}
                            className="mt-4 w-full rounded-full bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {savingFormOpenings ? "Saving..." : "Save openings"}
                          </button>
                        </div>

                        <div className="rounded-2xl border border-emerald-100 bg-white/80 p-4">
                          <div className="text-xs font-semibold text-emerald-800">Active openings</div>
                          <div className="mt-3 space-y-2">
                            {formOpenings.length === 0 ? (
                              <div className="text-xs text-emerald-700">No open forms yet.</div>
                            ) : (
                              formOpenings.map((opening) => {
                                const req = requirements.find((item) => item.id === opening.requirement_id);
                                const section = sections.find((item) => item.id === opening.section_id);
                                return (
                                  <div
                                    key={opening.id}
                                    className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-3 text-xs text-emerald-800"
                                  >
                                    <div className="font-semibold">
                                      {req?.code ? `${req.code} - ${req.name}` : req?.name ?? "Form"}
                                    </div>
                                    <div className="mt-1 text-[11px]">
                                      {section?.program ?? "Program"} • {section?.name ?? "Section"}
                                    </div>
                                    <div className="mt-1 text-[11px]">
                                      Deadline: {opening.deadline_at ? new Date(opening.deadline_at).toLocaleString() : "No deadline"}
                                    </div>
                                  </div>
                                );
                              })
                            )}
                          </div>
                        </div>
                      </div>
                    </section>
                  )}

                  <div>
                    <Link
                      href="/"
                      className="text-sm font-medium text-zinc-700 hover:text-zinc-900"
                    >
                      Back to dashboard
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      )}
    </AuthGate>
  );
}
