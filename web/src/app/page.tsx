import Link from "next/link";
import { ArrowRight, GraduationCap, ShieldCheck, Sparkles } from "lucide-react";

const steps = [
  {
    title: "Title defense",
    description: "Leader submits the title package and teacher approves the research direction.",
  },
  {
    title: "Proposal defense",
    description: "Proposal files unlock once the title stage is approved.",
  },
  {
    title: "Final defense",
    description: "Final documents and defense complete the thesis journey.",
  },
];

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-emerald-100 text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-7xl flex-col px-6 py-8 lg:px-10">
        <header className="flex items-center justify-between rounded-3xl border border-emerald-100 bg-white/80 px-5 py-4 shadow-sm backdrop-blur">
          <div>
            <div className="text-sm font-semibold uppercase tracking-[0.24em] text-emerald-700">PNC Thesis Tracker</div>
            <div className="text-xs text-slate-500">Leader and teacher workflow</div>
          </div>
          <div className="flex gap-3">
            <Link href="/login" className="rounded-full border border-emerald-200 px-4 py-2 text-sm font-medium text-emerald-800 hover:bg-emerald-50">
              Sign in
            </Link>
            <Link href="/register" className="rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-emerald-700">
              Create account
            </Link>
          </div>
        </header>

        <div className="grid flex-1 gap-8 py-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-700 shadow-sm">
              <Sparkles className="h-4 w-4" />
              A cleaner thesis defense experience
            </div>
            <h1 className="max-w-2xl text-5xl font-semibold tracking-tight text-emerald-950 lg:text-6xl">
              One system for <span className="text-emerald-600">leaders</span> and <span className="text-emerald-600">teachers</span>.
            </h1>
            <p className="max-w-2xl text-lg leading-8 text-slate-600">
              A focused workflow for title defense, proposal defense, and final defense with clear stage unlocking, better dashboards, and role-based access.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link href="/register" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-200 transition hover:-translate-y-0.5 hover:bg-emerald-700">
                Leader onboarding <ArrowRight className="h-4 w-4" />
              </Link>
              <Link href="/teacher/dashboard" className="inline-flex items-center gap-2 rounded-full border border-emerald-200 bg-white px-6 py-3 text-sm font-semibold text-emerald-800 transition hover:-translate-y-0.5 hover:bg-emerald-50">
                Teacher dashboard
              </Link>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              {[
                { label: "Two roles", value: "Leader + Teacher" },
                { label: "Stages", value: "Title → Proposal → Final" },
                { label: "Focus", value: "Clear, guided progress" },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-emerald-100 bg-white p-4 shadow-sm">
                  <div className="text-xs uppercase tracking-wide text-slate-500">{item.label}</div>
                  <div className="mt-2 text-sm font-semibold text-emerald-950">{item.value}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4 rounded-[2rem] border border-emerald-100 bg-white/90 p-6 shadow-2xl shadow-emerald-100/60 backdrop-blur">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-emerald-100 p-3 text-emerald-700">
                <GraduationCap className="h-6 w-6" />
              </div>
              <div>
                <div className="text-sm font-semibold text-emerald-900">Flow overview</div>
                <div className="text-xs text-slate-500">Guided review from start to finish</div>
              </div>
            </div>

            <div className="space-y-4">
              {steps.map((step, index) => (
                <div key={step.title} className="flex gap-4 rounded-2xl border border-emerald-100 p-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-semibold text-emerald-950">{step.title}</div>
                    <div className="mt-1 text-sm leading-6 text-slate-600">{step.description}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
              <div className="flex items-center gap-2 font-semibold">
                <ShieldCheck className="h-4 w-4" />
                Role-based access
              </div>
              <p className="mt-2 leading-6">
                Leaders manage their own research group. Teachers manage setup, openings, reviews, and defense progress.
              </p>
            </div>
          </div>
        </div>

        <footer className="pb-4 text-center text-xs text-slate-500">
          Built for a cleaner thesis workflow.
        </footer>
      </section>
    </main>
  );
}

