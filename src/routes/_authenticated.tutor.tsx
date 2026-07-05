import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { getMyStudents, getLatestMastery } from "@/lib/data.functions";
import { Card } from "@/components/Primitives";
import { StatusBadge, statusTone } from "@/components/StatusBadge";
import { SKILL_NAMES, SKILL_GROUPS } from "@/lib/skills";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { isDemo, demoGetStudents, demoGetLatestMastery } from "@/lib/demo";

const searchSchema = z.object({
  step: fallback(z.enum(["mastery", "plan"]), "mastery").default("mastery"),
});

export const Route = createFileRoute("/_authenticated/tutor")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Tutor Dashboard — AH" },
      { name: "description", content: "Mastery update and session plan" },
    ],
  }),
  component: TutorPage,
});

type Step = "mastery" | "plan";

const STEPS: { id: Step; label: string }[] = [
  { id: "mastery", label: "Mastery Update" },
  { id: "plan", label: "Session Plan" },
];

function TutorPage() {
  const search = Route.useSearch();
  const [step, setStep] = useState<Step>(search.step);
  const [done, setDone] = useState<Set<Step>>(new Set());
  const [ref, setRef] = useState<"none" | "profile" | "map">("none");

  // Keep sub-tab in sync when cross-tab navigation updates ?step
  useEffect(() => {
    setStep(search.step);
  }, [search.step]);

  const fetchStudents = useServerFn(getMyStudents);
  const { data: sd } = useQuery({
    queryKey: ["my-students", isDemo()],
    queryFn: () => (isDemo() ? demoGetStudents() : fetchStudents({ data: undefined })),
  });
  const students = sd?.students || [];
  const active = students[0];

  const fetchMastery = useServerFn(getLatestMastery);
  const { data: md } = useQuery({
    queryKey: ["mastery", active?.id],
    enabled: !!active?.id,
    queryFn: () => (isDemo() ? demoGetLatestMastery(active!.id) : fetchMastery({ data: { studentId: active!.id } })),
  });
  const mastery: any[] = md?.mastery || [];
  const masteryByName = new Map(mastery.map((m: any) => [m.skill_name || m.skill, m]));

  const markDone = (s: Step) => setDone((prev) => new Set(prev).add(s));

  return (
    <div className="space-y-2.5">
      {/* Sub-tabs */}
      <div className="flex flex-wrap gap-1.5 items-center mb-3">
        {STEPS.map((s, i) => {
          const isActive = step === s.id;
          const isDone = done.has(s.id);
          return (
            <button
              key={s.id}
              onClick={() => setStep(s.id)}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-full border transition-all",
                isActive
                  ? "bg-foreground text-background border-foreground"
                  : isDone
                    ? "bg-[var(--status-green-bg)] text-[var(--status-green-fg)] border-[var(--status-green-fg)]"
                    : "border-[var(--input)] text-muted-foreground hover:text-foreground",
              )}
            >
              {isDone ? (
                <span className="text-[11px]">✓</span>
              ) : (
                <span className={cn("text-[11px] font-bold w-4 h-4 rounded-full inline-flex items-center justify-center", isActive ? "bg-white/25 text-background" : "bg-[var(--input)] text-muted-foreground")}>{i + 1}</span>
              )}
              {s.label}
            </button>
          );
        })}
        <span className="w-px h-5 mx-1" style={{ background: "var(--input)" }} />
        <button onClick={() => setRef(ref === "profile" ? "none" : "profile")} className={cn("inline-flex items-center px-3 py-1.5 text-xs rounded-full border border-dashed transition-all", ref === "profile" ? "bg-secondary border-solid" : "text-muted-foreground hover:text-foreground")}>Student Profile</button>
        <button onClick={() => setRef(ref === "map" ? "none" : "map")} className={cn("inline-flex items-center px-3 py-1.5 text-xs rounded-full border border-dashed transition-all", ref === "map" ? "bg-secondary border-solid" : "text-muted-foreground hover:text-foreground")}>Learning Map</button>
      </div>

      {ref === "profile" && (
        <Card title="Student profile">
          {active ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
              <div><div className="ah-metric-label">Name</div><div className="font-medium">{active.pseudonym || active.name || active.full_name || "—"}</div></div>
              <div><div className="ah-metric-label">Grade / age</div><div className="font-medium">{active.grade || active.age || "—"}</div></div>
              <div><div className="ah-metric-label">Status</div><StatusBadge tone="teal">{active.status || "active"}</StatusBadge></div>
              <div><div className="ah-metric-label">Phase</div><div className="font-medium">{active.phase || "Foundation"}</div></div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No student assigned.</p>
          )}
        </Card>
      )}

      {ref === "map" && (
        <Card title="Learning map" subtitle="Canonical skill progression for this programme.">
          {SKILL_GROUPS.map((g) => (
            <div key={g.label} className="mb-2 last:mb-0">
              <div className="ah-slabel">{g.label}</div>
              {g.skills.map((n) => {
                const m: any = masteryByName.get(n);
                const t = statusTone(m?.status);
                return (
                  <div key={n} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "0.5px dashed var(--border)" }}>
                    <span className="text-xs text-muted-foreground flex-1 truncate">{n}</span>
                    <StatusBadge tone={t.tone}>{t.label}</StatusBadge>
                  </div>
                );
              })}
            </div>
          ))}
        </Card>
      )}

      {step === "mastery" && (
        <Card title="Mastery update" subtitle="Adjust mastery level for skills practised in this session.">
          {SKILL_NAMES.slice(0, 14).map((n) => {
            const m: any = masteryByName.get(n);
            const t = statusTone(m?.status);
            return (
              <div key={n} className="flex items-center gap-2 py-1.5" style={{ borderBottom: "0.5px solid var(--border)" }}>
                <span className="text-[13px] flex-1 truncate">{n}</span>
                <select defaultValue={m?.status || "not_started"} className="text-xs px-2 py-1 rounded border bg-background">
                  <option value="not_started">Not started</option>
                  <option value="emerging">Emerging</option>
                  <option value="consolidating">Consolidating</option>
                  <option value="fluent">Fluent</option>
                </select>
                <StatusBadge tone={t.tone}>{t.label}</StatusBadge>
              </div>
            );
          })}
          <div className="flex justify-end mt-3">
            <button onClick={() => { markDone("mastery"); setStep("plan"); }} className="px-3.5 py-1.5 text-xs rounded-md bg-foreground text-background hover:opacity-85">Save & continue →</button>
          </div>
        </Card>
      )}

      {step === "plan" && (
        <>
          <Card title="Next session plan" subtitle="Prioritised drill list based on mastery gaps and retention status.">
            <div className="space-y-2">
              {[
                { num: 1, title: "Make 5 — 3+2 commutativity", desc: "Visual cards + verbal recall. 5 minute drill at session start." },
                { num: 2, title: "Cardinality — quantity invariance", desc: "Rearrangement task with 6 objects. Use container method." },
                { num: 3, title: "Subitizing — 6 and 7", desc: "Dot patterns flash cards. 8–10 reps." },
              ].map((p) => (
                <div key={p.num} className="flex gap-2 items-start py-2" style={{ borderBottom: "0.5px solid var(--border)" }}>
                  <span className="text-sm font-semibold text-[var(--status-blue-fg)] w-5">{p.num}</span>
                  <div className="flex-1">
                    <div className="text-sm font-medium">{p.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
          <Card title="Session structure">
            <div className="text-xs space-y-1.5 text-muted-foreground">
              <div><span className="text-foreground font-medium">Work block:</span> 10 minutes max</div>
              <div><span className="text-foreground font-medium">Break:</span> 3–5 minutes, structured movement</div>
              <div><span className="text-foreground font-medium">Re-entry ritual:</span> Ready-rules at start of every work block</div>
            </div>
          </Card>
          <div className="flex justify-end">
            <button onClick={() => markDone("plan")} className="px-3.5 py-1.5 text-xs rounded-md bg-foreground text-background hover:opacity-85">Finalise plan</button>
          </div>
        </>
      )}
    </div>
  );
}
