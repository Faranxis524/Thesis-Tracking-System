"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSupabaseBrowserClient } from "@/lib/supabase/browser";

const LEADER_EMAIL_DOMAIN = "leader.pnc";

type Term = {
  id: number;
  name: string;
};

type College = {
  id: number;
  name: string;
};

type Section = {
  id: number;
  term_id: number | null;
  college_id: number | null;
  name: string;
  program: string;
};

function usernameToEmail(username: string) {
  return `${username.toLowerCase()}@${LEADER_EMAIL_DOMAIN}`;
}

function buildFullName(lastName: string, firstName: string, middleName: string, suffix: string) {
  const middle = middleName.trim() ? ` ${middleName.trim()}` : "";
  const suffixPart = suffix.trim() ? ` ${suffix.trim()}` : "";
  return `${lastName.trim()}, ${firstName.trim()}${middle}${suffixPart}`.trim();
}

export default function LeaderRegisterPage() {
  const router = useRouter();
  const [terms, setTerms] = useState<Term[]>([]);
  const [colleges, setColleges] = useState<College[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({
    lastName: "",
    firstName: "",
    middleName: "",
    suffix: "",
    username: "",
    password: "",
    termId: "",
    collegeId: "",
    sectionId: "",
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const supabase = getSupabaseBrowserClient();
        const [{ data: termData }, { data: collegeData }, { data: sectionData }] =
          await Promise.all([
            supabase.from("terms").select("id,name").order("created_at", { ascending: false }),
            supabase.from("colleges").select("id,name").order("created_at", { ascending: false }),
            supabase
              .from("sections")
              .select("id,term_id,college_id,name,program")
              .order("created_at", { ascending: false }),
          ]);

        if (!cancelled) {
          setTerms((termData ?? []) as Term[]);
          setColleges((collegeData ?? []) as College[]);
          setSections((sectionData ?? []) as Section[]);
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : "Failed to load data");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleRegister() {
    setError(null);

    if (!form.lastName.trim() || !form.firstName.trim()) {
      setError("Last name and first name are required.");
      return;
    }
    if (!form.username.trim() || !form.password) {
      setError("Username and password are required.");
      return;
    }
    if (!form.termId || !form.collegeId || !form.sectionId) {
      setError("Please select a term, college, and section.");
      return;
    }

    setBusy(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const email = usernameToEmail(form.username.trim());
      const fullName = buildFullName(
        form.lastName,
        form.firstName,
        form.middleName,
        form.suffix,
      );

      const { data, error } = await supabase.auth.signUp({
        email,
        password: form.password,
      });
      if (error) throw error;

      const userId = data.user?.id;
      if (!userId) throw new Error("Registration failed. Try again.");

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({
          id: userId,
          email,
          username: form.username.trim(),
          full_name: fullName,
          first_name: form.firstName.trim(),
          middle_name: form.middleName.trim() || null,
          last_name: form.lastName.trim(),
          suffix: form.suffix.trim() || null,
          role: "leader",
          term_id: Number(form.termId),
          college_id: Number(form.collegeId),
          section_id: Number(form.sectionId),
        }, { onConflict: "id" });

      if (profileError) throw profileError;

      const { error: groupError } = await supabase.rpc("create_leader_group", {
        leader_id: userId,
        p_term_id: Number(form.termId),
        p_section_id: Number(form.sectionId),
        p_college_id: Number(form.collegeId),
      });

      if (groupError) throw groupError;

      router.replace("/leader");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setBusy(false);
    }
  }

  const filteredSections = sections.filter((section) => {
    if (form.termId && String(section.term_id ?? "") !== form.termId) return false;
    if (form.collegeId && String(section.college_id ?? "") !== form.collegeId) return false;
    return true;
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-emerald-50 px-6">
      <div className="w-full max-w-xl rounded-3xl border border-emerald-100 bg-white p-8 shadow-xl">
        <h1 className="text-xl font-semibold text-emerald-900">Leader Registration</h1>
        <p className="mt-2 text-sm text-emerald-700">
          Create your leader account to start the research workflow.
        </p>

        {error ? (
          <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <input
            value={form.lastName}
            onChange={(event) => setForm((prev) => ({ ...prev, lastName: event.target.value }))}
            placeholder="Last name"
            className="rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
          />
          <input
            value={form.firstName}
            onChange={(event) => setForm((prev) => ({ ...prev, firstName: event.target.value }))}
            placeholder="First name"
            className="rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
          />
          <input
            value={form.middleName}
            onChange={(event) => setForm((prev) => ({ ...prev, middleName: event.target.value }))}
            placeholder="Middle name (optional)"
            className="rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
          />
          <input
            value={form.suffix}
            onChange={(event) => setForm((prev) => ({ ...prev, suffix: event.target.value }))}
            placeholder="Suffix (optional)"
            className="rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <input
            value={form.username}
            onChange={(event) => setForm((prev) => ({ ...prev, username: event.target.value }))}
            placeholder="Username"
            className="rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
          />
          <input
            type="password"
            value={form.password}
            onChange={(event) => setForm((prev) => ({ ...prev, password: event.target.value }))}
            placeholder="Password"
            className="rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
          />
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <select
            value={form.termId}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                termId: event.target.value,
                sectionId: "",
              }))
            }
            className="rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
          >
            <option value="">Select term</option>
            {terms.map((term) => (
              <option key={term.id} value={term.id}>
                {term.name}
              </option>
            ))}
          </select>
          <select
            value={form.collegeId}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                collegeId: event.target.value,
                sectionId: "",
              }))
            }
            className="rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
          >
            <option value="">Select college</option>
            {colleges.map((college) => (
              <option key={college.id} value={college.id}>
                {college.name}
              </option>
            ))}
          </select>
          <select
            value={form.sectionId}
            onChange={(event) => setForm((prev) => ({ ...prev, sectionId: event.target.value }))}
            className="rounded-2xl border border-emerald-100 px-3 py-2 text-sm"
          >
            <option value="">Select section</option>
            {filteredSections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.program} • {section.name}
              </option>
            ))}
          </select>
        </div>

        <button
          type="button"
          onClick={handleRegister}
          disabled={busy}
          className="mt-6 w-full rounded-full bg-emerald-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:opacity-60"
        >
          {busy ? "Creating account..." : "Create leader account"}
        </button>

        <div className="mt-4 text-center text-xs text-emerald-700">
          Already registered?{" "}
          <a href="/leader/login" className="font-semibold text-emerald-800">
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}
